import { useState, useCallback, useRef } from 'react';
import { ScanConfig, DuplicateGroup, MatchMode, ScanProgress, FileInfo } from '../types';
import { DeduplicationEngine, formatFileSize, calculateDuplicateRate } from '../utils/deduplication';
import { exportDuplicateReport } from '../utils/export';
import { databaseService } from '../services/database';

// 检测是否在 Tauri 桌面环境中运行
const isTauri = () => typeof window !== 'undefined' && (window as any).__TAURI_IPC__ !== undefined;

// 浏览器模式下使用 webkitdirectory 属性（非标准，需类型断言）
const webkitDirProps = { webkitdirectory: '' } as any;

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
  const [scanPath, setScanPath] = useState<string>('');

  // 浏览器模式：隐藏的 <input type="file" webkitdirectory>
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [browserFiles, setBrowserFiles] = useState<File[]>([]);

  // 选择扫描文件夹（兼容 Tauri 和浏览器）
  const handleSelectFolder = useCallback(async () => {
    if (isTauri()) {
      // Tauri 环境下使用原生对话框
      const { open } = await import('@tauri-apps/api/dialog');
      try {
        const selected = await open({
          directory: true,
          multiple: false,
          title: '选择要扫描的文件夹',
        });
        if (selected && typeof selected === 'string') {
          setScanPath(selected);
        }
      } catch (err) {
        console.error('选择文件夹失败:', err);
        alert('选择文件夹失败，请重试');
      }
    } else {
      // 浏览器模式：触发隐藏的 <input type="file" webkitdirectory>
      folderInputRef.current?.click();
    }
  }, []);

  // 浏览器模式：处理文件夹选择
  const handleFolderFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // 取第一个文件的相对路径前缀作为文件夹名
    const firstFile = fileList[0];
    const relativePath = (firstFile as any).webkitRelativePath || '';
    const folderName = relativePath.split('/')[0] || '选定文件夹';

    setScanPath(folderName);
    setBrowserFiles(Array.from(fileList));
  }, []);

  // 开始扫描（兼容 Tauri 和浏览器）
  const startScan = useCallback(async () => {
    if (!scanPath) {
      alert('请先选择要扫描的文件夹');
      return;
    }

    setIsScanning(true);
    setDuplicateGroups([]);
    setSelectedGroups(new Set());

    try {
      let files: FileInfo[] = [];

      if (isTauri()) {
        // ======== Tauri 桌面模式 ========
        const { invoke } = await import('@tauri-apps/api/tauri');
        setProgress({
          currentFile: '正在扫描目录...',
          processedCount: 0,
          totalCount: 100,
          percentage: 0,
          status: 'scanning',
        });

        const scanResult = await invoke<any>('scan_directory', {
          path: scanPath,
          recursive: config.recursive,
        });

        files = (scanResult.files || [])
          .filter((f: any) => !f.is_dir)
          .map((f: any) => ({
            path: f.path,
            name: f.name,
            size: f.size,
            modified: f.modified,
            created: f.created,
            isDir: f.is_dir,
            extension: f.extension,
          }));
      } else {
        // ======== 浏览器模式 ========
        setProgress({
          currentFile: '正在读取文件列表...',
          processedCount: 10,
          totalCount: 100,
          percentage: 10,
          status: 'scanning',
        });

        if (browserFiles.length === 0) {
          throw new Error('未选择任何文件');
        }

        // 反转路径排序，让文件按目录层级集中
        const sortedFiles = [...browserFiles].sort((a, b) =>
          ((a as any).webkitRelativePath || a.name).localeCompare((b as any).webkitRelativePath || b.name)
        );

        files = sortedFiles.map((f) => {
          const relPath = (f as any).webkitRelativePath || f.name;
          return {
            path: relPath,
            name: f.name,
            size: f.size,
            modified: Math.floor(f.lastModified / 1000),
            created: 0,
            isDir: false,
            extension: f.name.includes('.') ? f.name.split('.').pop() || '' : '',
          };
        });
      }

      setProgress({
        currentFile: `共发现 ${files.length} 个文件，正在计算哈希...`,
        processedCount: 50,
        totalCount: 100,
        percentage: 50,
        status: 'hashing',
      });

      // 使用去重引擎分析
      const engine = new DeduplicationEngine(config);
      const groups = await engine.scanForDuplicates(files, (pct, curFile) => {
        setProgress({
          currentFile: curFile,
          processedCount: Math.round(pct),
          totalCount: 100,
          percentage: 50 + Math.round(pct / 2),
          status: 'hashing',
        });
      });

      setDuplicateGroups(groups);

      // === 写入 SQLite files 表（仅 Tauri 模式） ===
      if (isTauri()) {
        setProgress({
          currentFile: '正在保存文件记录到数据库...',
          processedCount: 90,
          totalCount: 100,
          percentage: 90,
          status: 'hashing',
        });

        try {
          await databaseService.initialize();
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const modTime = new Date(f.modified * 1000).toISOString();
            await databaseService.upsertFile({
              file_path: f.path,
              file_name: f.name,
              file_size: f.size,
              modified_time: modTime,
              file_hash: '',
              status: 'pending',
            });

            if (i % 10 === 0) {
              setProgress({
                currentFile: `保存文件记录 ${i + 1}/${files.length}...`,
                processedCount: 90 + Math.round((i / files.length) * 5),
                totalCount: 100,
                percentage: 90 + Math.round((i / files.length) * 5),
                status: 'hashing',
              });
            }
          }
          console.log(`已保存 ${files.length} 条文件记录到数据库`);
        } catch (dbErr) {
          console.error('写入数据库失败:', dbErr);
        }

        // === 更新 file_manifest.json 中的哈希值（仅 Tauri 模式） ===
        try {
          const { invoke } = await import('@tauri-apps/api/tauri');
          for (const group of groups) {
            for (const file of group.files) {
              if (file.hash) {
                await invoke('update_file_manifest', {
                  folderPath: scanPath,
                  filePath: file.path,
                  hash: file.hash,
                });
              }
            }
          }
          console.log('已更新 file_manifest.json 哈希值');
        } catch (manifestErr) {
          console.error('更新 manifest 失败:', manifestErr);
        }
      } else {
        console.log(`浏览器模式：共 ${files.length} 个文件，${groups.length} 个重复组`);
      }

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
  }, [config, scanPath]);

  const toggleGroupSelection = useCallback((groupId: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
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
    try {
      // 收集选中组中除第一个文件外的所有文件
      const filesToBackup: string[] = [];
      duplicateGroups
        .filter(g => selectedGroups.has(g.groupId))
        .forEach(g => {
          // 保留第一个文件，移动其余副本
          g.files.slice(1).forEach(f => filesToBackup.push(f.path));
        });

      if (filesToBackup.length > 0) {
        if (isTauri()) {
          const { invoke } = await import('@tauri-apps/api/tauri');
          await invoke('move_to_backup', {
            files: filesToBackup,
            backupDir: `${scanPath}/.backup_${Date.now()}`,
          });
          console.log('已移动文件到备份:', filesToBackup.length);
        } else {
          console.log('浏览器模式跳过备份操作，待移动文件:', filesToBackup.length);
        }
      }
    } catch (err) {
      console.error('备份失败:', err);
    }
    setShowBackupModal(false);
    startScan();
  }, [selectedGroups, duplicateGroups, scanPath, startScan]);

  const handleExportReport = useCallback(() => {
    exportDuplicateReport(duplicateGroups);
  }, [duplicateGroups]);

  const totalSavedSpace = duplicateGroups.reduce((sum, g) => sum + g.savedSpace, 0);
  const duplicateRate = calculateDuplicateRate(duplicateGroups, duplicateGroups.reduce((sum, g) => sum + g.files.length, 0));

  return (
    <div className="p-8">
      {/* 浏览器模式：隐藏的文件夹选择器 */}
      <input
        ref={folderInputRef}
        type="file"
        {...webkitDirProps}
        multiple
        onChange={handleFolderFilesSelected}
        style={{ display: 'none' }}
      />

      <h2 className="text-2xl font-bold mb-6 text-white">文件去重</h2>
      <p className="text-gray-400 mb-6">
        基于内容哈希和文件名相似度识别重复文件，支持三种匹配模式
      </p>

      {/* 配置面板 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">扫描配置</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">扫描文件夹</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scanPath}
                readOnly
                placeholder="请选择要扫描的文件夹..."
                className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-gray-300"
              />
              <button
                onClick={handleSelectFolder}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                选择
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">匹配模式</label>
            <select
              value={config.matchMode}
              onChange={(e) => onUpdateConfig({ matchMode: e.target.value as MatchMode })}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-300"
            >
              <option value="both">双维度匹配（推荐）</option>
              <option value="content">仅内容匹配</option>
              <option value="name">仅文件名匹配</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={startScan}
              disabled={isScanning || !scanPath}
              className="w-full px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {isScanning ? '扫描中...' : '开始扫描'}
            </button>
          </div>
        </div>
        {config.matchMode !== 'content' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              文件名相似度阈值: {Math.round(config.nameSimilarityThreshold * 100)}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={config.nameSimilarityThreshold * 100}
              onChange={(e) => onUpdateConfig({ nameSimilarityThreshold: Number(e.target.value) / 100 })}
              className="w-full max-w-md"
            />
          </div>
        )}
      </div>

      {/* 进度条 */}
      {progress && progress.status !== 'complete' && progress.status !== 'error' && (
        <div className="card mb-6">
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

      {/* 统计信息 */}
      {duplicateGroups.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="text-sm text-gray-400">重复文件组</div>
            <div className="text-2xl font-bold text-primary">{duplicateGroups.length}</div>
          </div>
          <div className="stat-card">
            <div className="text-sm text-gray-400">可节省空间</div>
            <div className="text-2xl font-bold text-green-400">{formatFileSize(totalSavedSpace)}</div>
          </div>
          <div className="stat-card">
            <div className="text-sm text-gray-400">已选择</div>
            <div className="text-2xl font-bold text-white">{selectedGroups.size}</div>
          </div>
          <div className="stat-card">
            <div className="text-sm text-gray-400">重复率</div>
            <div className="text-2xl font-bold text-amber-400">{duplicateRate.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {duplicateGroups.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button onClick={selectAllGroups} className="px-4 py-2 border border-gray-700 rounded hover:bg-gray-800 text-gray-300">
            全选
          </button>
          <button onClick={deselectAllGroups} className="px-4 py-2 border border-gray-700 rounded hover:bg-gray-800 text-gray-300">
            取消全选
          </button>
          <button
            onClick={handleMoveToBackup}
            disabled={selectedGroups.size === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            移动到备份 ({selectedGroups.size})
          </button>
          <button onClick={handleExportReport} className="px-4 py-2 border border-gray-700 rounded hover:bg-gray-800 text-gray-300">
            导出报告
          </button>
        </div>
      )}

      {/* 重复文件组列表 */}
      {duplicateGroups.length > 0 && (
        <div className="space-y-4">
          {duplicateGroups.map(group => (
            <div key={group.groupId} className="card overflow-hidden p-0">
              <div className="px-4 py-3 bg-gray-800/50 flex justify-between items-center border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedGroups.has(group.groupId)}
                    onChange={() => toggleGroupSelection(group.groupId)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-white">
                    {group.matchType === 'content' ? '内容匹配' : group.matchType === 'name' ? '文件名匹配' : '双维度匹配'}
                  </span>
                  <span className="text-sm text-gray-400">
                    {group.duplicateCount} 个文件
                  </span>
                </div>
                <span className="text-sm text-green-400">
                  可节省 {formatFileSize(group.savedSpace)}
                </span>
              </div>
              <div className="divide-y divide-gray-800">
                {group.files.map((file, index) => (
                  <div key={index} className="px-4 py-3 flex justify-between items-center hover:bg-gray-800/30">
                    <div>
                      <div className="font-medium text-white">{file.name}</div>
                      <div className="text-sm text-gray-500">{file.path}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-300">{formatFileSize(file.size)}</div>
                      <div className="text-xs text-gray-500">
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-bold mb-4 text-white">确认移动到备份</h3>
            <p className="text-gray-400 mb-4">
              将移动 {selectedGroups.size} 个重复文件组到备份目录。此操作不会直接删除文件。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-2 border border-gray-600 rounded hover:bg-gray-700 text-gray-300"
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
