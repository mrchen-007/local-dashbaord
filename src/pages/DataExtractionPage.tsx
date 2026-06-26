// 数据提取页面
// 用于从文件清单中提取数据并存入数据库

import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { fileParserService, FileManifest, ManifestFile, ParseResult } from '../services/fileParser';
import { entityExtractorService, ExtractionResult, ExtractionSchema } from '../services/entityExtractor';
import { databaseService, ProcessingStats } from '../services/database';

type ProcessingStage = 'idle' | 'loading' | 'parsing' | 'extracting' | 'saving' | 'complete' | 'error';

interface ProcessingProgress {
  current: number;
  total: number;
  currentFile: string;
  stage: ProcessingStage;
}

export default function DataExtractionPage() {
  const [manifest, setManifest] = useState<FileManifest | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [progress, setProgress] = useState<ProcessingProgress>({
    current: 0,
    total: 0,
    currentFile: '',
    stage: 'idle',
  });
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uieServiceStatus, setUieServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // 检查 UIE 服务状态
  useEffect(() => {
    const checkService = async () => {
      try {
        const health = await entityExtractorService.checkServiceHealth();
        setUieServiceStatus(health.status === 'ok' ? 'online' : 'offline');
      } catch {
        setUieServiceStatus('offline');
      }
    };
    checkService();
  }, []);

  // 选择文件夹
  const handleSelectFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择包含 file_manifest.json 的文件夹',
      });

      if (selected && typeof selected === 'string') {
        setSelectedFolder(selected);
        setErrorMessage('');

        // 读取文件清单
        try {
          const manifestData = await fileParserService.getManifest(selected);
          setManifest(manifestData);
          setProgress({
            current: 0,
            total: manifestData.files.length,
            currentFile: '',
            stage: 'idle',
          });
        } catch (error) {
          setErrorMessage(`读取清单失败: ${error}`);
          setManifest(null);
        }
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
    }
  }, []);

  // 开始数据提取
  const handleStartExtraction = useCallback(async () => {
    if (!manifest) return;

    setErrorMessage('');
    setProgress({
      current: 0,
      total: manifest.files.length,
      currentFile: '',
      stage: 'loading',
    });

    try {
      // 初始化数据库
      await databaseService.initialize();

      const files = manifest.files;
      const total = files.length;

      // 阶段1: 文件解析
      setProgress({ current: 0, total, currentFile: '', stage: 'parsing' });

      for (let i = 0; i < total; i++) {
        const file = files[i];
        setProgress({
          current: i + 1,
          total,
          currentFile: file.path,
          stage: 'parsing',
        });

        // 检查缓存
        const isCached = await databaseService.isFileProcessed(file.path, file.modified_time);
        if (isCached) {
          console.log(`跳过已处理文件: ${file.path}`);
          continue;
        }

        // 更新文件状态为解析中
        await databaseService.upsertFile({
          file_path: file.path,
          file_name: file.path.split(/[/\\]/).pop() || file.path,
          file_size: file.size_bytes,
          modified_time: file.modified_time,
          file_hash: file.hash,
          status: 'parsing',
        });

        // 解析文件
        const parseResult = await fileParserService.parseFile(file.path);

        if (parseResult.success) {
          // 获取文件ID
          const fileRecord = await databaseService.getFile(file.path);
          if (fileRecord?.id) {
            // 保存解析内容
            await databaseService.saveParsedContent({
              file_id: fileRecord.id,
              file_path: file.path,
              content_text: parseResult.content,
              content_metadata: JSON.stringify(parseResult.metadata),
              page_count: parseResult.page_count,
              parse_duration_ms: parseResult.parse_duration_ms,
            });

            // 更新状态为已解析
            await databaseService.updateFileStatus(file.path, 'parsed');
          }
        } else {
          // 记录错误
          await databaseService.updateFileStatus(file.path, 'error', parseResult.error);
        }
      }

      // 阶段2: 信息抽取
      setProgress({ current: 0, total, currentFile: '', stage: 'extracting' });

      for (let i = 0; i < total; i++) {
        const file = files[i];
        setProgress({
          current: i + 1,
          total,
          currentFile: file.path,
          stage: 'extracting',
        });

        const fileRecord = await databaseService.getFile(file.path);
        if (!fileRecord || fileRecord.status === 'error') continue;

        // 更新状态为抽取中
        await databaseService.updateFileStatus(file.path, 'extracting');

        // 获取解析内容
        const parsedContents = await databaseService.getExtractionSummary();
        // TODO: 从解析内容中获取文本

        // 调用 UIE 服务抽取信息
        const extractResult = await entityExtractorService.extractFields(''); // TODO: 传入实际文本

        if (extractResult.success && extractResult.results) {
          const schema = entityExtractorService.mapToSchema(extractResult.results);

          await databaseService.saveExtractedFields({
            file_id: fileRecord.id!,
            file_path: file.path,
            ...schema,
            extraction_duration_ms: extractResult.duration_ms,
          });

          // 更新状态为已抽取
          await databaseService.updateFileStatus(file.path, 'extracted');
        } else {
          await databaseService.updateFileStatus(file.path, 'error', extractResult.error);
        }
      }

      // 获取统计信息
      const finalStats = await databaseService.getProcessingStats();
      setStats(finalStats);

      setProgress({
        current: total,
        total,
        currentFile: '',
        stage: 'complete',
      });
    } catch (error) {
      setErrorMessage(`提取失败: ${error}`);
      setProgress(prev => ({ ...prev, stage: 'error' }));
    }
  }, [manifest]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">数据提取</h1>

      {/* 服务状态 */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="flex items-center gap-2">
          <span className="font-medium">UIE 服务状态:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            uieServiceStatus === 'online' ? 'bg-green-100 text-green-800' :
            uieServiceStatus === 'offline' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {uieServiceStatus === 'online' ? '在线' :
             uieServiceStatus === 'offline' ? '离线' : '检查中...'}
          </span>
          {uieServiceStatus === 'offline' && (
            <span className="text-sm text-gray-500">
              请运行: python python/start_uie_service.py
            </span>
          )}
        </div>
      </div>

      {/* 文件夹选择 */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSelectFolder}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            选择文件夹
          </button>
          <span className="text-gray-600">
            {selectedFolder || '请选择包含 file_manifest.json 的文件夹'}
          </span>
        </div>
      </div>

      {/* 文件清单预览 */}
      {manifest && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">文件清单</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm text-blue-600">扫描时间</div>
              <div className="font-medium">{manifest.scan_time}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm text-blue-600">文件数量</div>
              <div className="font-medium">{manifest.files.length} 个</div>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm text-blue-600">总大小</div>
              <div className="font-medium">
                {formatFileSize(manifest.files.reduce((sum, f) => sum + f.size_bytes, 0))}
              </div>
            </div>
          </div>

          {/* 文件列表 */}
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">文件名</th>
                  <th className="px-4 py-2 text-right">大小</th>
                  <th className="px-4 py-2 text-left">修改时间</th>
                </tr>
              </thead>
              <tbody>
                {manifest.files.slice(0, 20).map((file, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">{file.path.split(/[/\\]/).pop()}</td>
                    <td className="px-4 py-2 text-right">{formatFileSize(file.size_bytes)}</td>
                    <td className="px-4 py-2">{file.modified_time}</td>
                  </tr>
                ))}
                {manifest.files.length > 20 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-center text-gray-500">
                      ... 还有 {manifest.files.length - 20} 个文件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 开始提取按钮 */}
          <div className="mt-4">
            <button
              onClick={handleStartExtraction}
              disabled={progress.stage !== 'idle' && progress.stage !== 'complete' && progress.stage !== 'error'}
              className={`px-6 py-2 rounded font-medium ${
                progress.stage === 'idle' || progress.stage === 'complete' || progress.stage === 'error'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {progress.stage === 'idle' ? '开始提取' :
               progress.stage === 'complete' ? '重新提取' :
               progress.stage === 'error' ? '重试' : '提取中...'}
            </button>
          </div>
        </div>
      )}

      {/* 进度显示 */}
      {progress.stage !== 'idle' && progress.stage !== 'complete' && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">
            {progress.stage === 'parsing' ? '解析文件中...' :
             progress.stage === 'extracting' ? '抽取信息中...' :
             progress.stage === 'saving' ? '保存数据中...' : '处理中...'}
          </h2>

          {/* 进度条 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{progress.currentFile.split(/[/\\]/).pop()}</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 完成状态 */}
      {progress.stage === 'complete' && stats && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-green-800 mb-4">提取完成</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-green-600">总文件数</div>
              <div className="text-2xl font-bold">{stats.total_files}</div>
            </div>
            <div>
              <div className="text-sm text-green-600">成功提取</div>
              <div className="text-2xl font-bold">{stats.extracted_count}</div>
            </div>
            <div>
              <div className="text-sm text-red-600">失败</div>
              <div className="text-2xl font-bold">{stats.error_count}</div>
            </div>
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
