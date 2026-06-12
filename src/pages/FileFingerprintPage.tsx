import { useState, useCallback } from 'react';
import { ScanConfig, FileInfo, ScanProgress } from '../types';
import { calculateSHA256 } from '../utils/hash';
import { formatFileSize } from '../utils/deduplication';

interface FileFingerprintPageProps {
  config: ScanConfig;
}

interface FingerprintResult {
  file: FileInfo;
  hash: string;
  algorithm: string;
}

export default function FileFingerprintPage({ config }: FileFingerprintPageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FingerprintResult[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  }, []);

  const calculateFingerprints = useCallback(async () => {
    if (files.length === 0) return;

    setIsCalculating(true);
    setResults([]);
    const totalCount = files.length;
    let processedCount = 0;

    for (const file of files) {
      setProgress({
        currentFile: file.name,
        processedCount,
        totalCount,
        percentage: (processedCount / totalCount) * 100,
        status: 'hashing',
      });

      try {
        // 使用 hash-wasm 计算 SHA-256
        const hash = await calculateSHA256(file, (fileProgress) => {
          setProgress({
            currentFile: file.name,
            processedCount,
            totalCount,
            percentage: ((processedCount + fileProgress / 100) / totalCount) * 100,
            status: 'hashing',
          });
        });

        setResults(prev => [...prev, {
          file: {
            path: file.name,
            name: file.name,
            size: file.size,
            modified: file.lastModified / 1000,
            created: file.lastModified / 1000,
            isDir: false,
            extension: file.name.split('.').pop() || '',
          },
          hash,
          algorithm: 'SHA-256',
        }]);
      } catch (error) {
        console.error(`计算 ${file.name} 哈希失败:`, error);
      }

      processedCount++;
    }

    setProgress({
      currentFile: '',
      processedCount: totalCount,
      totalCount,
      percentage: 100,
      status: 'complete',
    });
    setIsCalculating(false);
  }, [files]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setResults([]);
    setProgress(null);
  }, []);

  const copyHash = useCallback((hash: string) => {
    navigator.clipboard.writeText(hash);
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">文件指纹</h2>
      <p className="text-gray-500 mb-6">
        计算文件的 SHA-256 哈希值，用于精确识别文件内容
      </p>

      {/* 拖拽区域 */}
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isCalculating ? 'border-gray-300 bg-gray-50' : 'border-primary bg-blue-50 hover:bg-blue-100'
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
      >
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-gray-600 mb-2">拖拽文件到此处，或</p>
        <label className="inline-block">
          <span className="px-4 py-2 bg-primary text-white rounded cursor-pointer hover:bg-primary-dark">
            选择文件
          </span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={isCalculating}
          />
        </label>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">已选择 {files.length} 个文件</h3>
            <div className="flex gap-2">
              <button
                onClick={calculateFingerprints}
                disabled={isCalculating}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
              >
                {isCalculating ? '计算中...' : '开始计算'}
              </button>
              <button
                onClick={clearAll}
                disabled={isCalculating}
                className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                清空
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="px-4 py-2 border-b last:border-b-0 flex justify-between">
                  <span className="truncate">{file.name}</span>
                  <span className="text-gray-500 text-sm">{formatFileSize(file.size)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 进度条 */}
      {progress && progress.status !== 'complete' && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="truncate">{progress.currentFile}</span>
            <span>{Math.round(progress.percentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 结果列表 */}
      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">计算结果</h3>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">文件名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">大小</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">算法</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">哈希值</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-3 text-sm">{result.file.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatFileSize(result.file.size)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{result.algorithm}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 truncate max-w-xs">
                      {result.hash}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => copyHash(result.hash)}
                        className="text-primary hover:text-primary-dark text-sm"
                      >
                        复制
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
