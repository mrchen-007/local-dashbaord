import { useState, useCallback } from 'react';
import { ScanConfig, FileVersion, ScanProgress } from '../types';
import { VersionManager, formatTimestamp, getTimeDifference } from '../utils/versionManager';
import { formatFileSize } from '../utils/deduplication';
import { exportVersionReport } from '../utils/export';

interface VersionComparePageProps {
  config: ScanConfig;
}

export default function VersionComparePage({ config }: VersionComparePageProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<{ start?: Date; end?: Date }>({});
  const [showBackupModal, setShowBackupModal] = useState(false);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setVersions([]);
    setSelectedVersions(new Set());

    const manager = new VersionManager();

    // 模拟文件列表
    const mockFiles = [
      { path: '合同v1.xlsx', name: '合同v1.xlsx', size: 1024, modified: Date.now() / 1000 - 86400, created: Date.now() / 1000 - 86400, isDir: false, extension: 'xlsx' },
      { path: '合同v2.xlsx', name: '合同v2.xlsx', size: 1024, modified: Date.now() / 1000, created: Date.now() / 1000, isDir: false, extension: 'xlsx' },
      { path: '报告_修改版.pdf', name: '报告_修改版.pdf', size: 2048, modified: Date.now() / 1000 - 172800, created: Date.now() / 1000 - 172800, isDir: false, extension: 'pdf' },
      { path: '报告_最终版.pdf', name: '报告_最终版.pdf', size: 2048, modified: Date.now() / 1000, created: Date.now() / 1000, isDir: false, extension: 'pdf' },
    ];

    try {
      // 模拟扫描进度
      for (let i = 0; i <= 100; i += 10) {
        setProgress({
          currentFile: `扫描文件 ${i}/100`,
          processedCount: i,
          totalCount: 100,
          percentage: i,
          status: 'scanning',
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const result = manager.analyzeVersions(mockFiles, config.nameSimilarityThreshold);

      // 应用时间范围筛选
      const filtered = timeRange.start || timeRange.end
        ? manager.filterByTimeRange(result, timeRange.start, timeRange.end)
        : result;

      setVersions(filtered);
      setProgress({
        currentFile: '',
        processedCount: 100,
        totalCount: 100,
        percentage: 100,
        status: 'complete',
      });
    } catch (error) {
      console.error('扫描失败:', error);
      setProgress({
        currentFile: '',
        processedCount: 0,
        totalCount: 100,
        percentage: 0,
        status: 'error',
      });
    }

    setIsScanning(false);
  }, [config, timeRange]);

  const toggleVersionSelection = useCallback((path: string) => {
    setSelectedVersions(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const selectAllOutdated = useCallback(() => {
    const outdated = new Set<string>();
    versions.forEach(v => {
      v.versions.forEach(ver => {
        if (!ver.isLatest) {
          outdated.add(ver.path);
        }
      });
    });
    setSelectedVersions(outdated);
  }, [versions]);

  const handleMoveToBackup = useCallback(() => {
    setShowBackupModal(true);
  }, []);

  const confirmMoveToBackup = useCallback(async () => {
    console.log('移动到备份目录:', Array.from(selectedVersions));
    setShowBackupModal(false);
    startScan();
  }, [selectedVersions, startScan]);

  const handleExportReport = useCallback(() => {
    exportVersionReport(versions);
  }, [versions]);

  const manager = new VersionManager();
  const stats = manager.calculateVersionStats(versions);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">版本比对</h2>
      <p className="text-gray-500 mb-6">
        识别文件的不同版本，标记过期文件，支持按时间范围筛选
      </p>

      {/* 配置面板 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">筛选配置</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
            <input
              type="date"
              value={timeRange.start?.toISOString().split('T')[0] || ''}
              onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value) : undefined }))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
            <input
              type="date"
              value={timeRange.end?.toISOString().split('T')[0] || ''}
              onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value) : undefined }))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={startScan}
              disabled={isScanning}
              className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            >
              {isScanning ? '扫描中...' : '开始扫描'}
            </button>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      {progress && progress.status !== 'complete' && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
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

      {/* 统计信息 */}
      {versions.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">版本组数</div>
            <div className="text-2xl font-bold text-primary">{stats.totalGroups}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">总版本数</div>
            <div className="text-2xl font-bold">{stats.totalVersions}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">过期版本</div>
            <div className="text-2xl font-bold text-orange-500">{stats.outdatedCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">可节省空间</div>
            <div className="text-2xl font-bold text-green-600">{formatFileSize(stats.outdatedSize)}</div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {versions.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={selectAllOutdated}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            选择所有过期版本
          </button>
          <button
            onClick={handleMoveToBackup}
            disabled={selectedVersions.size === 0}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            移动到备份 ({selectedVersions.size})
          </button>
          <button
            onClick={handleExportReport}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            导出报告
          </button>
        </div>
      )}

      {/* 版本组列表 */}
      {versions.length > 0 && (
        <div className="space-y-4">
          {versions.map((version, index) => (
            <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50">
                <div className="font-medium">{version.baseName}</div>
                <div className="text-sm text-gray-500">
                  {version.totalVersions} 个版本，最新版本: {version.latestVersion.name}
                </div>
              </div>
              <div className="divide-y">
                {version.versions.map((ver, verIndex) => (
                  <div
                    key={verIndex}
                    className={`px-4 py-3 flex justify-between items-center ${
                      ver.isLatest ? 'bg-green-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {!ver.isLatest && (
                        <input
                          type="checkbox"
                          checked={selectedVersions.has(ver.path)}
                          onChange={() => toggleVersionSelection(ver.path)}
                          className="w-4 h-4"
                        />
                      )}
                      <div>
                        <div className="font-medium">
                          {ver.name}
                          {ver.isLatest && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                              最新
                            </span>
                          )}
                          {!ver.isLatest && (
                            <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">
                              过期
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{ver.path}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatFileSize(ver.size)}</div>
                      <div className="text-xs text-gray-400">
                        {formatTimestamp(ver.modified)}
                      </div>
                      {verIndex > 0 && (
                        <div className="text-xs text-gray-400">
                          比最新版本早 {getTimeDifference(ver.modified, version.latestVersion.modified)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {versions.length === 0 && progress?.status === 'complete' && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg">未发现文件版本</p>
        </div>
      )}

      {/* 备份确认弹窗 */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">确认移动到备份</h3>
            <p className="text-gray-600 mb-4">
              将移动 {selectedVersions.size} 个过期版本到备份目录。此操作不会直接删除文件。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={confirmMoveToBackup}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
