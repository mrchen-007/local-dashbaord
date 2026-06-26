// 数据提取页面
// 用于从文件清单中提取数据并存入数据库

import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { fileParserService, FileManifest, ParseResult } from './fileParser';
import { entityExtractorService, ExtractionResult } from './entityExtractor';
import { databaseService, ProcessingStats } from '../shared/database';

type ProcessingStage = 'idle' | 'loading' | 'parsing' | 'extracting' | 'saving' | 'complete' | 'error';

export default function DataExtractionPage() {
  const [folderPath, setFolderPath] = useState<string>('');
  const [manifest, setManifest] = useState<FileManifest | null>(null);
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    // 阶段1：解析文件
    setStage('parsing');
    setProgress({ current: 0, total: files.length, message: '正在解析文件...' });

    const parseResults: ParseResult[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await fileParserService.parseDocument(files[i].path);
        parseResults.push(result);
      } catch (err) {
        console.warn(`解析失败: ${files[i].path}`, err);
      }
      setProgress({ current: i + 1, total: files.length, message: `解析文件 ${i + 1}/${files.length}` });
    }

    // 阶段2：抽取字段
    setStage('extracting');
    setProgress({ current: 0, total: parseResults.length, message: '正在抽取字段...' });

    const extractResults: ExtractionResult[] = [];
    for (let i = 0; i < parseResults.length; i++) {
      try {
        const result = await entityExtractorService.extractFields(
          parseResults[i].file_path,
          parseResults[i].content
        );
        extractResults.push(result);
      } catch (err) {
        console.warn(`抽取失败: ${parseResults[i].file_path}`, err);
      }
      setProgress({ current: i + 1, total: parseResults.length, message: `抽取字段 ${i + 1}/${parseResults.length}` });
    }

    // 阶段3：保存到数据库
    setStage('saving');
    setProgress({ current: 0, total: extractResults.length, message: '正在保存数据...' });

    for (let i = 0; i < extractResults.length; i++) {
      try {
        const r = extractResults[i];
        const fileId = await databaseService.upsertFile({
          file_path: r.file_path,
          file_name: r.file_path.split('\\').pop() || r.file_path.split('/').pop() || r.file_path,
          file_size: 0,
          modified_time: '',
          status: 'extracted',
        });

        await databaseService.saveParsedContent({
          file_id: fileId,
          file_path: r.file_path,
          content_text: JSON.stringify(r.fields),
          parse_duration_ms: r.duration_ms,
        });
      } catch (err) {
        console.warn(`保存失败: ${extractResults[i].file_path}`, err);
      }
      setProgress({ current: i + 1, total: extractResults.length, message: `保存数据 ${i + 1}/${extractResults.length}` });
    }

    setStage('complete');
    setProgress({ current: extractResults.length, total: extractResults.length, message: '处理完成' });

    // 刷新统计
    const s = await databaseService.getProcessingStats();
    setStats(s);
  }, [manifest]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 text-white">数据提取</h2>
      <p className="text-gray-400 mb-6">
        从文件清单中解析文档内容，使用 AI 抽取关键字段并存入数据库
      </p>

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
          <div className="mt-4">
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
        <div className="card mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">{progress.message}</span>
            <span className="text-gray-400">{progress.current}/{progress.total}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
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
            <span className="text-green-400 font-medium">处理完成！所有文件已解析、抽取并保存到数据库</span>
          </div>
        </div>
      )}

      {/* 抽取结果预览 */}
      {stage === 'complete' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-white">抽取结果预览</h3>
          <div className="text-sm text-gray-400">
            已完成的抽取结果可通过数据库查询获取完整数据
          </div>
        </div>
      )}
    </div>
  );
}
