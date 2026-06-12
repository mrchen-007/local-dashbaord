import { useState, useCallback } from 'react';
import { ScanConfig, DuplicateGroup, MatchMode, ScanProgress } from '../types';
import { DeduplicationEngine, formatFileSize, calculateDuplicateRate } from '../utils/deduplication';
import { exportDuplicateReport } from '../utils/export';
import { generateMockFiles, generateMockDuplicateGroups } from '../mock/mockData';

interface DeduplicationPageProps {
  config: ScanConfig;
  onUpdateConfig: (updates: Partial<ScanConfig>) => void;
}

export default function DeduplicationPage({ config, onUpdateConfig }: DeduplicationPageProps) {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [showBackupModal, setShowBackupModal] = useState(false);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    setDuplicateGroups([]);
    setSelectedGroups(new Set());

    // 使用mock数据进行测试
    const mockFiles = generateMockFiles();

    try {
      // 模拟扫描进度
      for (let i = 0; i <= 100; i += 10) {
        const currentIndex = Math.min(Math.floor(i / 100 * mockFiles.length), mockFiles.length - 1);
        setProgress({
          currentFile: mockFiles[currentIndex].name,
          processedCount: i,
          totalCount: 100,
          percentage: i,
          status: 'hashing',
        });
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 使用预生成的mock重复组
      const groups = generateMockDuplicateGroups();
      setDuplicateGroups(groups);

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
  }, [config]);

  const toggleGroupSelection = useCallback((groupId: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const selectAllGroups = useCallback(() => {
    setSelectedGroups(new Set(duplicateGroups.map(g => g.groupId)));
  }, [duplicateGroups]);

  const deselectAllGroups = useCallback(() => {
    setSelectedGroups(new Set());
  }, []);

  const handleMoveToBackup = useCallback(() => {
    setShowBackupModal(true);
  }, []);

  const confirmMoveToBackup = useCallback(async () => {
    // 实际应用中调用 Tauri 后端移动文件
    console.log('移动到备份目录:', Array.from(selectedGroups));
    setShowBackupModal(false);
    // 重新扫描
    startScan();
  }, [selectedGroups, startScan]);

  const handleExportReport = useCallback(() => {
    exportDuplicateReport(duplicateGroups);
  }, [duplicateGroups]);

  const totalSavedSpace = duplicateGroups.reduce((sum, g) => sum + g.savedSpace, 0);
  const duplicateRate = calculateDuplicateRate(duplicateGroups, duplicateGroups.reduce((sum, g) => sum + g.files.length, 0));

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">文件去重</h2>
      <p className="text-gray-500 mb-6">
        基于内容哈希和文件名相似度识别重复文件，支持三种匹配模式
      </p>

      {/* 配置面板 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">扫描配置</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">匹配模式</label>
            <select
              value={config.matchMode}
              onChange={(e) => onUpdateConfig({ matchMode: e.target.value as MatchMode })}
              className="w-full p-2 border rounded"
            >
              <option value="both">双维度匹配（推荐）</option>
              <option value="content">仅内容匹配</option>
              <option value="name">仅文件名匹配</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文件名相似度阈值: {Math.round(config.nameSimilarityThreshold * 100)}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={config.nameSimilarityThreshold * 100}
              onChange={(e) => onUpdateConfig({ nameSimilarityThreshold: Number(e.target.value) / 100 })}
              className="w-full"
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
      {duplicateGroups.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">重复文件组</div>
            <div className="text-2xl font-bold text-primary">{duplicateGroups.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">可节省空间</div>
            <div className="text-2xl font-bold text-green-600">{formatFileSize(totalSavedSpace)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">已选择</div>
            <div className="text-2xl font-bold">{selectedGroups.size}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">重复率</div>
            <div className="text-2xl font-bold text-orange-500">{duplicateRate.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {duplicateGroups.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={selectAllGroups}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            全选
          </button>
          <button
            onClick={deselectAllGroups}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            取消全选
          </button>
          <button
            onClick={handleMoveToBackup}
            disabled={selectedGroups.size === 0}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            移动到备份 ({selectedGroups.size})
          </button>
          <button
            onClick={handleExportReport}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            导出报告
          </button>
        </div>
      )}

      {/* 重复文件组列表 */}
      {duplicateGroups.length > 0 && (
        <div className="space-y-4">
          {duplicateGroups.map(group => (
            <div key={group.groupId} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedGroups.has(group.groupId)}
                    onChange={() => toggleGroupSelection(group.groupId)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">
                    {group.matchType === 'content' ? '内容匹配' : group.matchType === 'name' ? '文件名匹配' : '双维度匹配'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {group.duplicateCount} 个文件
                  </span>
                </div>
                <span className="text-sm text-green-600">
                  可节省 {formatFileSize(group.savedSpace)}
                </span>
              </div>
              <div className="divide-y">
                {group.files.map((file, index) => (
                  <div key={index} className="px-4 py-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-gray-500">{file.path}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{formatFileSize(file.size)}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(file.modified * 1000).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {duplicateGroups.length === 0 && progress?.status === 'complete' && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg">未发现重复文件</p>
        </div>
      )}

      {/* 备份确认弹窗 */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">确认移动到备份</h3>
            <p className="text-gray-600 mb-4">
              将移动 {selectedGroups.size} 个重复文件组到备份目录。此操作不会直接删除文件。
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
