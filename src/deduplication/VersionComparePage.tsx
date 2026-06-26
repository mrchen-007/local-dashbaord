import { useState, useCallback } from 'react';
import { FileVersion, ScanProgress } from '../shared/types';
import { VersionManager, formatTimestamp, getTimeDifference } from './versionManager';
import { formatFileSize } from './deduplication';
import { exportVersionReport } from '../shared/export';
import { generateMockFiles } from './mockData';

export default function VersionComparePage() {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setVersions([]);

    setProgress({
      currentFile: '正在加载模拟数据...',
      processedCount: 0,
      totalCount: 100,
      percentage: 10,
      status: 'scanning',
    });

    // 模拟扫描延迟
    await new Promise(r => setTimeout(r, 500));

    const files = generateMockFiles();
    
    setProgress({
      currentFile: `共 ${files.length} 个文件，正在分析版本...`,
      processedCount: 50,
      totalCount: 100,
      percentage: 50,
      status: 'hashing',
    });

    // 使用版本管理器分析版本
    const vm = new VersionManager(files);
    const versionResults = vm.analyzeVersions();

    // 也可以使用预生成的版本数据
    // const versionResults = generateMockVersions();

    setVersions(versionResults);

    setProgress({
      currentFile: '',
      processedCount: 100,
      totalCount: 100,
      percentage: 100,
      status: 'complete',
    });

    setIsScanning(false);
  }, []);

  const handleExport = useCallback(() => {
    if (versions.length > 0) {
      exportVersionReport(versions);
    }
  }, [versions]);

  const totalSavable = versions.reduce((sum, v) => {
    const outdated = v.versions.filter(ver => !ver.isLatest);
    return sum + outdated.reduce((s, ver) => s + ver.size, 0);
  }, 0);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 text-white">版本比对</h2>
      <p className="text-gray-400 mb-6">
        识别重复文件的版本关系，标注最新版本，支持一键清理旧版本
      </p>

      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={startScan}
            disabled={isScanning}
            className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {isScanning ? '分析中...' : '开始分析'}
          </button>
          <button
            onClick={handleExport}
            disabled={versions.length === 0}
            className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            导出报告
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showTimeline}
              onChange={(e) => setShowTimeline(e.target.checked)}
              className="rounded"
            />
            显示时间轴
          </label>
        </div>

        {progress && progress.status !== 'complete' && progress.status !== 'error' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400 truncate">{progress.currentFile}</span>
              <span className="text-gray-400">{Math.round(progress.percentage)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {versions.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-lg font-bold text-white">{versions.length}</div>
              <div className="text-xs text-gray-400">版本组</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-lg font-bold text-yellow-400">
                {versions.reduce((s, v) => s + v.versions.filter(ver => !ver.isLatest).length, 0)}
              </div>
              <div className="text-xs text-gray-400">旧版本</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-lg font-bold text-green-400">{formatFileSize(totalSavable)}</div>
              <div className="text-xs text-gray-400">可节省空间</div>
            </div>
          </div>
        )}
      </div>

      {versions.length > 0 && (
        <div className="space-y-6">
          {versions.map((v, i) => (
            <div key={i} className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  版本组 {i + 1}: {v.baseName}
                </h3>
                <span className="text-sm text-gray-400">
                  {v.totalVersions} 个版本 | 最新: {v.latestVersion.name}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 text-gray-400 font-medium">文件名</th>
                      <th className="text-right py-2 text-gray-400 font-medium">大小</th>
                      <th className="text-right py-2 text-gray-400 font-medium">修改时间</th>
                      <th className="text-center py-2 text-gray-400 font-medium">版本标签</th>
                      <th className="text-center py-2 text-gray-400 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.versions
                      .sort((a, b) => b.modified - a.modified)
                      .map((ver, j) => (
                        <tr key={j} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-2 text-white">{ver.name}</td>
                          <td className="py-2 text-gray-400 text-right">{formatFileSize(ver.size)}</td>
                          <td className="py-2 text-gray-400 text-right">
                            {formatTimestamp(ver.modified)}
                            <span className="ml-2 text-xs text-gray-500">
                              ({getTimeDifference(ver.modified)})
                            </span>
                          </td>
                          <td className="py-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              ver.isLatest ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'
                            }`}>
                              {ver.versionTag}
                            </span>
                          </td>
                          <td className="py-2 text-center">
                            {ver.isLatest ? (
                              <span className="text-green-400 text-xs">最新</span>
                            ) : (
                              <span className="text-gray-500 text-xs">旧版</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {showTimeline && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700"></div>
                    {[...v.versions]
                      .sort((a, b) => b.modified - a.modified)
                      .map((ver, j) => (
                        <div key={j} className="relative pl-10 pb-4 last:pb-0">
                          <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                            ver.isLatest
                              ? 'bg-green-500 border-green-500'
                              : 'bg-gray-700 border-gray-500'
                          }`}></div>
                          <div className="text-sm">
                            <span className="text-white">{ver.name}</span>
                            <span className="text-gray-500 ml-2">{formatTimestamp(ver.modified)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
