// 数据提取页面
// 用于从文件清单中提取数据并存入数据库

import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { fileParserService, FileManifest, ManifestFile, ParseResult } from './fileParser';
import { entityExtractorService, ExtractionResult } from './entityExtractor';
import { databaseService, ProcessingStats } from '../shared/database';
import { mapUIEFieldsToDB } from './fieldMapper';
import { isTauri } from '../shared/environment';
import { processInParallel, TaskResult } from '../shared/concurrency';
import ProgressBar from '../shared/ProgressBar';
import FieldReviewPanel from './FieldReviewPanel';

type ProcessingStage = 'idle' | 'loading' | 'parsing' | 'extracting' | 'saving' | 'complete' | 'error';

interface ProcessingSummary {
  total: number;
  succeeded: number;
  failed: number;
}

interface ParsedFile {
  manifestFile: ManifestFile;
  result: ParseResult;
}

interface ExtractedFile {
  parsedFile: ParsedFile;
  result: ExtractionResult;
}

function successfulValues<T>(results: TaskResult<T>[]): T[] {
  return results.filter((result): result is { ok: true; value: T } => result.ok).map(result => result.value);
}

export default function DataExtractionPage() {
  const [folderPath, setFolderPath] = useState<string>('');
  const [manifest, setManifest] = useState<FileManifest | null>(null);
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [concurrency, setConcurrency] = useState(5);
  const [summary, setSummary] = useState<ProcessingSummary | null>(null);
  const [reviewRefresh, setReviewRefresh] = useState(0);

  // 初始化数据库连接
  useEffect(() => {
    const init = async () => {
      try {
        await databaseService.initialize();
        const s = await databaseService.getProcessingStats();
        setStats(s);
      } catch (err) {
        console.error('数据库初始化失败:', err);
      }
    };
    init();
  }, []);

  // 选择文件夹
  const handleSelectFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择扫描文件夹',
      });
      if (selected && typeof selected === 'string') {
        setFolderPath(selected);
        setManifest(null);
        setStage('idle');
        setError(null);
      }
    } catch (err) {
      console.error('选择文件夹失败:', err);
    }
  }, []);

  // 加载文件清单
  const handleLoadManifest = useCallback(async () => {
    if (!folderPath) return;

    setStage('loading');
    setError(null);

    try {
      const m = await fileParserService.loadManifest(folderPath);
      setManifest(m);
      setProgress({ current: 0, total: m.files.length, message: `发现 ${m.files.length} 个文件` });
      setStage('idle');
    } catch (err) {
      setError(`加载文件清单失败: ${err}`);
      setStage('error');
    }
  }, [folderPath]);

  // 执行完整处理流程：解析 → 抽取 → 保存
  const handleProcessAll = useCallback(async () => {
    if (!manifest || manifest.files.length === 0) return;

    setError(null);
    const files = manifest.files;
    await databaseService.batchUpsertFiles(files.map(file => ({
      file_path: file.path,
      file_name: file.path.split('\\').pop() || file.path.split('/').pop() || file.path,
      file_size: file.size_bytes,
      modified_time: file.modified_time,
      file_hash: file.hash || undefined,
      status: 'pending' as const,
    })));
    const runId = await databaseService.startProcessingRun('extraction', files.length, {
      folderPath,
      concurrency,
    });

    // 阶段1：解析文件
    setStage('parsing');
    setProgress({ current: 0, total: files.length, message: '正在解析文件...' });

    const parseTaskResults = await processInParallel(
      files,
      async (manifestFile) => ({
        manifestFile,
        result: await fileParserService.parseDocument(manifestFile.path),
      }),
      concurrency,
      (cur, total) => setProgress({ current: cur, total, message: `解析文件 ${cur}/${total}` })
    );
    const parsedFiles = successfulValues<ParsedFile>(parseTaskResults);
    const parseFailures = parseTaskResults.filter(result => !result.ok);
    await Promise.all(parseTaskResults.map((result, index) => result.ok
      ? Promise.resolve()
      : databaseService.updateFileStatus(files[index].path, 'error', result.error)
    ));

    // 阶段2：抽取字段
    setStage('extracting');
    setProgress({ current: 0, total: parsedFiles.length, message: '正在抽取字段...' });

    const extractionTaskResults = await processInParallel(
      parsedFiles,
      async (parsedFile) => ({
        parsedFile,
        result: await entityExtractorService.extractFields(parsedFile.result.file_path, parsedFile.result.content),
      }),
      concurrency,
      (cur, total) => setProgress({ current: cur, total, message: `抽取字段 ${cur}/${total}` })
    );
    const extractedFiles = successfulValues<ExtractedFile>(extractionTaskResults);
    const extractionFailures = extractionTaskResults.filter(result => !result.ok);
    await Promise.all(extractionTaskResults.map((result, index) => result.ok
      ? Promise.resolve()
      : databaseService.updateFileStatus(parsedFiles[index].manifestFile.path, 'error', result.error)
    ));

    // 阶段3：保存到数据库
    setStage('saving');
    setProgress({ current: 0, total: extractedFiles.length, message: '正在保存数据...' });

    const saveTaskResults = await processInParallel(
      extractedFiles,
      async ({ parsedFile, result }) => {
        const fileId = await databaseService.upsertFile({
          file_path: parsedFile.manifestFile.path,
          file_name: parsedFile.manifestFile.path.split('\\').pop() || parsedFile.manifestFile.path.split('/').pop() || parsedFile.manifestFile.path,
          file_size: parsedFile.manifestFile.size_bytes,
          modified_time: parsedFile.manifestFile.modified_time,
          status: 'extracted',
        });

        await databaseService.saveParsedContent({
          file_id: fileId,
          file_path: parsedFile.manifestFile.path,
          content_text: parsedFile.result.content,
          content_metadata: JSON.stringify(parsedFile.result.metadata),
          parse_duration_ms: parsedFile.result.duration_ms,
        });

        const mappedFields = mapUIEFieldsToDB(result.fields);
        if (Object.keys(mappedFields).length > 0) {
          await databaseService.saveExtractedFields({
              file_id: fileId,
              file_path: parsedFile.manifestFile.path,
              contract_no: mappedFields.contract_no as string,
              contract_amount: mappedFields.contract_amount as number,
              party_a: mappedFields.party_a as string,
              party_b: mappedFields.party_b as string,
              sign_date: mappedFields.sign_date as string,
              labor_cost: mappedFields.labor_cost as number,
              material_cost: mappedFields.material_cost as number,
              equipment_cost: mappedFields.equipment_cost as number,
              subcontract_amount: mappedFields.subcontract_amount as number,
              settlement_amount: mappedFields.settlement_amount as number,
              settlement_date: mappedFields.settlement_date as string,
              warranty_ratio: mappedFields.warranty_ratio as number,
              extraction_duration_ms: result.duration_ms,
              confidence_score: result.confidence,
          });
        }
        await databaseService.saveFieldObservations(
          fileId,
          parsedFile.manifestFile.path,
          result.fields,
          mappedFields,
          result.confidence,
          parsedFile.result.content.slice(0, 500)
        );
      },
      10,
      (cur, total) => setProgress({ current: cur, total, message: `保存数据 ${cur}/${total}` })
    );

    const saveFailures = saveTaskResults.filter(result => !result.ok);
    await Promise.all(saveTaskResults.map((result, index) => result.ok
      ? Promise.resolve()
      : databaseService.updateFileStatus(extractedFiles[index].parsedFile.manifestFile.path, 'error', result.error)
    ));

    const failed = parseFailures.length + extractionFailures.length + saveFailures.length;
    const succeeded = saveTaskResults.filter(result => result.ok).length;
    await databaseService.completeProcessingRun(runId, succeeded, failed);
    setReviewRefresh(value => value + 1);
    setSummary({ total: files.length, succeeded, failed });
    setStage(failed === files.length ? 'error' : 'complete');
    setProgress({ current: succeeded + failed, total: files.length, message: failed === 0 ? '处理完成' : '处理部分完成' });
    if (failed > 0) setError(`处理完成但有 ${failed} 个文件失败；可在统计卡片中查看错误数量后重试。`);

    // 刷新统计
    const s = await databaseService.getProcessingStats();
    setStats(s);
  }, [manifest, concurrency]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 text-white">数据提取</h2>
      <p className="text-gray-400 mb-6">
        从文件清单中解析文档内容，使用 AI 抽取关键字段并存入数据库
      </p>

      {!isTauri() && (
        <div className="card mb-6 border-amber-500 bg-amber-900/20">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-amber-400 font-medium">当前为浏览器环境，数据提取功能需在 Tauri 桌面环境中运行</p>
              <p className="text-amber-500 text-sm mt-1">请执行 <code className="bg-amber-900/50 px-2 py-0.5 rounded">npm run tauri dev</code> 启动桌面应用</p>
            </div>
          </div>
        </div>
      )}

      {/* 文件夹选择 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">选择扫描目录</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={folderPath}
            readOnly
            placeholder="请选择包含 file_manifest.json 的目录..."
            className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-gray-300"
          />
          <button
            onClick={handleSelectFolder}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            选择目录
          </button>
          <button
            onClick={handleLoadManifest}
            disabled={!folderPath}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
          >
            加载清单
          </button>
        </div>
      </div>

      {/* 统计 */}
      {stats && (
        <div className="grid grid-cols-7 gap-3 mb-6">
          <div className="stat-card">
            <div className="text-xs text-gray-400">总文件</div>
            <div className="text-lg font-bold text-white">{stats.total_files}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-gray-400">待处理</div>
            <div className="text-lg font-bold text-gray-400">{stats.pending_count}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-gray-400">解析中</div>
            <div className="text-lg font-bold text-yellow-400">{stats.parsing_count}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-gray-400">已解析</div>
            <div className="text-lg font-bold text-blue-400">{stats.parsed_count}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-gray-400">抽取中</div>
            <div className="text-lg font-bold text-purple-400">{stats.extracting_count}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-gray-400">已完成</div>
            <div className="text-lg font-bold text-green-400">{stats.extracted_count}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-gray-400">错误</div>
            <div className="text-lg font-bold text-red-400">{stats.error_count}</div>
          </div>
        </div>
      )}

      {/* 清单信息 */}
      {manifest && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">文件清单</h3>
            <span className="text-sm text-gray-400">
              扫描时间: {manifest.scan_time} | 共 {manifest.files.length} 个文件
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400 font-medium">文件路径</th>
                  <th className="text-right py-2 text-gray-400 font-medium">大小</th>
                  <th className="text-left py-2 text-gray-400 font-medium">修改时间</th>
                </tr>
              </thead>
              <tbody>
                {manifest.files.slice(0, 50).map((f, i) => (
                  <tr key={i} className="border-b border-gray-700/50">
                    <td className="py-1.5 text-gray-300 truncate max-w-md">{f.path}</td>
                    <td className="py-1.5 text-gray-400 text-right">{(f.size_bytes / 1024).toFixed(1)} KB</td>
                    <td className="py-1.5 text-gray-500">{f.modified_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">并发数: {concurrency}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                disabled={stage === 'parsing' || stage === 'extracting' || stage === 'saving'}
                className="w-32 accent-primary"
              />
            </div>
            <button
              onClick={handleProcessAll}
              disabled={stage === 'parsing' || stage === 'extracting' || stage === 'saving'}
              className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            >
              {stage === 'parsing' ? '解析中...' : stage === 'extracting' ? '抽取中...' : stage === 'saving' ? '保存中...' : '开始处理全部文件'}
            </button>
          </div>
        </div>
      )}

      {/* 进度 */}
      {stage !== 'idle' && stage !== 'complete' && stage !== 'error' && (
        <ProgressBar
          current={progress.current}
          total={progress.total}
          message={progress.message}
          label={`${progress.current}/${progress.total}`}
        />
      )}

      {/* 错误 */}
      {error && (
        <div className="card mb-6 border-red-500">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* 完成提示 */}
      {stage === 'complete' && (
        <div className="card mb-6 border-green-500">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-400 font-medium">
              处理完成：成功 {summary?.succeeded ?? 0} 个，共 {summary?.total ?? 0} 个文件
              {summary && summary.failed > 0 ? `；失败 ${summary.failed} 个` : ''}
            </span>
          </div>
        </div>
      )}

      <FieldReviewPanel refreshKey={reviewRefresh} />
    </div>
  );
}
