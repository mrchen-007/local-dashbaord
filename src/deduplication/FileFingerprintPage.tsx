import { useState, useCallback } from 'react';
import { ScanConfig, FileInfo, ScanProgress } from '../shared/types';
import { calculateSHA256 } from './hash';
import { formatFileSize } from './deduplication';

interface FileFingerprintPageProps {
  config: ScanConfig;
}

interface FingerprintResult {
  file: FileInfo;
  hash: string;
  duration: number;
  status: 'success' | 'error';
  error?: string;
}

export default function FileFingerprintPage({ config }: FileFingerprintPageProps) {
  const [results, setResults] = useState<FingerprintResult[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCalculate = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setResults([]);

    // 使用内置测试数据
    const testFiles: FileInfo[] = [
      {
        path: '测试文件1.txt',
        name: '测试文件1.txt',
        size: 1024,
        modified: Math.floor(Date.now() / 1000),
        created: Math.floor(Date.now() / 1000),
        isDir: false,
        extension: 'txt',
      },
      {
        path: '测试文件2.pdf',
        name: '测试文件2.pdf',
        size: 2048,
        modified: Math.floor(Date.now() / 1000),
        created: Math.floor(Date.now() / 1000),
        isDir: false,
        extension: 'pdf',
      },
      {
        path: '测试文件3.docx',
        name: '测试文件3.docx',
        size: 4096,
        modified: Math.floor(Date.now() / 1000),
        created: Math.floor(Date.now() / 1000),
        isDir: false,
        extension: 'docx',
      },
    ];

    const fingerprintResults: FingerprintResult[] = [];

    for (let i = 0; i < testFiles.length; i++) {
      const file = testFiles[i];

      setProgress({
        currentFile: `正在计算: ${file.name}`,
        processedCount: i + 1,
        totalCount: testFiles.length,
        percentage: Math.round(((i) / testFiles.length) * 100),
        status: 'hashing',
      });

      const startTime = performance.now();

      try {
        // 使用 hash-wasm 计算 SHA-256
        const hash = await calculateSHA256(`test-content-${file.name}`);

        fingerprintResults.push({
          file,
          hash,
          duration: performance.now() - startTime,
          status: 'success',
        });
      } catch (error) {
        fingerprintResults.push({
          file,
          hash: '',
          duration: performance.now() - startTime,
          status: 'error',
          error: String(error),
        });
      }
    }

    setResults(fingerprintResults);

    setProgress({
        currentFile: '',
        processedCount: testFiles.length,
        totalCount: testFiles.length,
        percentage: 100,
        status: 'complete',
      });
    setIsProcessing(false);
  }, [isProcessing]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 text-white">文件指纹计算</h2>
      <p className="text-gray-400 mb-6">
        使用 hash-wasm 库计算文件的 SHA-256 哈希值，生成唯一文件指纹
      </p>

      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleCalculate}
            disabled={isProcessing}
            className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {isProcessing ? '计算中...' : '开始测试'}
          </button>
          <span className="text-sm text-gray-400">
            {config.recursive ? '递归扫描' : '仅当前目录'}
          </span>
        </div>

        {progress && progress.status !== 'complete' && progress.status !== 'error' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400 truncate">{progress.currentFile}</span>
              <span className="text-gray-400">{progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-white">计算结果</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">文件名</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">SHA-256</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">大小</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">耗时(ms)</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-white">{r.file.name}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">{r.hash || '-'}</td>
                    <td className="py-3 px-4 text-gray-400 text-right">{formatFileSize(r.file.size)}</td>
                    <td className="py-3 px-4 text-gray-400 text-right">{r.duration.toFixed(1)}</td>
                    <td className="py-3 px-4 text-center">
                      {r.status === 'success' ? (
                        <span className="text-green-400">✓</span>
                      ) : (
                        <span className="text-red-400" title={r.error}>✗</span>
                      )}
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
