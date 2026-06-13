import { useState, useCallback, useEffect } from 'react';
import { DuplicateGroup, FileVersion, ScanProgress } from '../types';
import {
  generateMockFiles,
  generateMockDuplicateGroups,
  generateMockVersions,
  formatFileSize,
  formatTimestamp,
} from '../mock/mockData';
import {
  realFiles,
  generateRealDuplicateGroups,
  generateRealVersions,
  formatRealFileSize,
  formatRealTimestamp,
} from '../mock/realData';
import { calculateNameSimilarity, detectVersionTag } from '../utils/similarity';

type TestModule = 'files' | 'similarity' | 'duplicates' | 'versions' | 'hash';
type DataSource = 'mock' | 'real';

export default function TestPage() {
  const [activeModule, setActiveModule] = useState<TestModule>('files');
  const [dataSource, setDataSource] = useState<DataSource>('real');
  const [mockFiles, setMockFiles] = useState(generateMockFiles());
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  // 根据数据源获取文件列表
  const currentFiles = dataSource === 'real' ? realFiles : mockFiles;
  const currentFormatSize = dataSource === 'real' ? formatRealFileSize : formatFileSize;
  const currentFormatTime = dataSource === 'real' ? formatRealTimestamp : formatTimestamp;

  // 测试文件名相似度
  const testSimilarity = useCallback(() => {
    const testPairs = [
      ['施工合同.xlsx', '施工合同_副本.xlsx'],
      ['成本分析报告v1.xlsx', '成本分析报告v2.xlsx'],
      ['工期计划_初稿.xlsx', '工期计划_最终版.xlsx'],
      ['4月份付款计划.xlsx', '4月份付款计划 - Copy.xlsx'],
      ['项目进展报告.pdf', '项目进展报告(1).pdf'],
      ['完全不同的文件.doc', '另一个文件.pdf'],
    ];

    const results: string[] = ['=== 文件名相似度测试 ===\n'];

    testPairs.forEach(([name1, name2]) => {
      const similarity = calculateNameSimilarity(name1, name2);
      const tag1 = detectVersionTag(name1);
      const tag2 = detectVersionTag(name2);

      results.push(`文件1: ${name1}`);
      results.push(`文件2: ${name2}`);
      results.push(`相似度: ${(similarity * 100).toFixed(1)}%`);
      results.push(`版本标记1: ${tag1 || '无'}`);
      results.push(`版本标记2: ${tag2 || '无'}`);
      results.push('---');
    });

    setTestResults(results);
  }, []);

  // 测试重复文件检测
  const testDuplicateDetection = useCallback(() => {
    setProgress({
      currentFile: '正在分析文件...',
      processedCount: 0,
      totalCount: 100,
      percentage: 0,
      status: 'scanning',
    });

    // 模拟扫描进度
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      const currentIndex = Math.min(Math.floor(progress / 100 * currentFiles.length), currentFiles.length - 1);
      setProgress({
        currentFile: currentFiles[currentIndex].name,
        processedCount: progress,
        totalCount: 100,
        percentage: progress,
        status: 'hashing',
      });

      if (progress >= 100) {
        clearInterval(interval);
        const groups = dataSource === 'real' ? generateRealDuplicateGroups() : generateMockDuplicateGroups();
        setDuplicateGroups(groups);
        setProgress({
          currentFile: '完成',
          processedCount: 100,
          totalCount: 100,
          percentage: 100,
          status: 'complete',
        });
      }
    }, 300);
  }, [dataSource, currentFiles]);

  // 测试版本比对
  const testVersionComparison = useCallback(() => {
    setProgress({
      currentFile: '正在扫描版本...',
      processedCount: 0,
      totalCount: 100,
      percentage: 0,
      status: 'scanning',
    });

    // 模拟扫描进度
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      const currentIndex = Math.min(Math.floor(progress / 100 * currentFiles.length), currentFiles.length - 1);
      setProgress({
        currentFile: currentFiles[currentIndex].name,
        processedCount: progress,
        totalCount: 100,
        percentage: progress,
        status: 'analyzing',
      });

      if (progress >= 100) {
        clearInterval(interval);
        const versionList = dataSource === 'real' ? generateRealVersions() : generateMockVersions();
        setVersions(versionList);
        setProgress({
          currentFile: '完成',
          processedCount: 100,
          totalCount: 100,
          percentage: 100,
          status: 'complete',
        });
      }
    }, 250);
  }, [dataSource, currentFiles]);

  // 测试哈希计算（模拟）
  const testHashCalculation = useCallback(() => {
    const results: string[] = ['=== 哈希计算测试 ===\n'];
    results.push('注意: 浏览器环境中无法直接计算文件哈希');
    results.push('需要通过 Tauri 后端或 Web Worker 进行\n');

    // 模拟哈希值
    const mockHashes = [
      { name: '施工合同.xlsx', hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456' },
      { name: '施工合同_副本.xlsx', hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456' },
      { name: '成本分析报告v1.xlsx', hash: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a' },
      { name: '成本分析报告v2.xlsx', hash: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567ab2' },
    ];

    mockHashes.forEach(({ name, hash }) => {
      results.push(`文件: ${name}`);
      results.push(`SHA-256: ${hash}`);
      results.push('---');
    });

    results.push('\n相同哈希 = 相同内容');
    results.push('施工合同.xlsx 和 施工合同_副本.xlsx 哈希相同，确认为重复文件');

    setTestResults(results);
  }, []);

  // 计算统计信息
  const totalSavedSpace = duplicateGroups.reduce((sum, g) => sum + g.savedSpace, 0);
  const totalOutdatedVersions = versions.reduce(
    (sum, v) => sum + v.versions.filter(ver => !ver.isLatest).length,
    0
  );

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-2">本地测试页面</h2>
      <p className="text-gray-500 mb-6">使用真实项目数据测试各个模块功能</p>

      {/* 数据源选择 */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-medium">数据源:</span>
        <button
          onClick={() => setDataSource('real')}
          className={`px-4 py-2 rounded ${dataSource === 'real' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
        >
          真实数据 (西北工业大学项目)
        </button>
        <button
          onClick={() => setDataSource('mock')}
          className={`px-4 py-2 rounded ${dataSource === 'mock' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Mock数据
        </button>
      </div>

      {/* 模块选择 */}
      <div className="flex gap-2 mb-6">
        {(['files', 'similarity', 'duplicates', 'versions', 'hash'] as TestModule[]).map(module => (
          <button
            key={module}
            onClick={() => setActiveModule(module)}
            className={`px-4 py-2 rounded ${
              activeModule === module
                ? 'bg-primary text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {module === 'files' && '文件列表'}
            {module === 'similarity' && '相似度测试'}
            {module === 'duplicates' && '重复检测'}
            {module === 'versions' && '版本比对'}
            {module === 'hash' && '哈希计算'}
          </button>
        ))}
      </div>

      {/* 进度条 */}
      {progress && progress.status !== 'complete' && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>{progress.currentFile}</span>
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

      {/* 文件列表模块 */}
      {activeModule === 'files' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {dataSource === 'real' ? '西北工业大学友谊校区建设工程' : '模拟文件'} ({currentFiles.length} 个文件)
          </h3>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">文件名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">大小</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">修改时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">路径</th>
                </tr>
              </thead>
              <tbody>
                {currentFiles.map((file, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{file.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{currentFormatSize(file.size)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{currentFormatTime(file.modified)}</td>
                    <td className="px-4 py-3 text-sm text-gray-400 truncate max-w-xs">{file.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 相似度测试模块 */}
      {activeModule === 'similarity' && (
        <div>
          <button
            onClick={testSimilarity}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark mb-4"
          >
            运行相似度测试
          </button>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
            {testResults.join('\n')}
          </pre>
        </div>
      )}

      {/* 重复检测模块 */}
      {activeModule === 'duplicates' && (
        <div>
          <button
            onClick={testDuplicateDetection}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark mb-4"
          >
            运行重复检测
          </button>

          {duplicateGroups.length > 0 && (
            <>
              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-500">重复文件组</div>
                  <div className="text-2xl font-bold text-primary">{duplicateGroups.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-500">可节省空间</div>
                  <div className="text-2xl font-bold text-green-600">{formatFileSize(totalSavedSpace)}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-500">匹配类型</div>
                  <div className="text-2xl font-bold">双维度</div>
                </div>
              </div>

              {/* 重复文件组 */}
              <div className="space-y-4">
                {duplicateGroups.map(group => (
                  <div key={group.groupId} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 flex justify-between">
                      <span className="font-medium">
                        组 {group.groupId} - {group.duplicateCount} 个文件
                      </span>
                      <span className="text-green-600">
                        可节省 {formatFileSize(group.savedSpace)}
                      </span>
                    </div>
                    <div className="divide-y">
                      {group.files.map((file, i) => (
                        <div key={i} className="px-4 py-3 flex justify-between">
                          <div>
                            <div className="font-medium">{file.name}</div>
                            <div className="text-sm text-gray-500">{file.path}</div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 版本比对模块 */}
      {activeModule === 'versions' && (
        <div>
          <button
            onClick={testVersionComparison}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark mb-4"
          >
            运行版本比对
          </button>

          {versions.length > 0 && (
            <>
              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-500">版本组数</div>
                  <div className="text-2xl font-bold text-primary">{versions.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-500">过期版本</div>
                  <div className="text-2xl font-bold text-orange-500">{totalOutdatedVersions}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-500">最新版本</div>
                  <div className="text-2xl font-bold text-green-600">{versions.length}</div>
                </div>
              </div>

              {/* 版本组 */}
              <div className="space-y-4">
                {versions.map((version, index) => (
                  <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50">
                      <div className="font-medium">{version.baseName}</div>
                      <div className="text-sm text-gray-500">
                        {version.totalVersions} 个版本
                      </div>
                    </div>
                    <div className="divide-y">
                      {version.versions.map((ver, verIndex) => (
                        <div
                          key={verIndex}
                          className={`px-4 py-3 flex justify-between ${
                            ver.isLatest ? 'bg-green-50' : ''
                          }`}
                        >
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
                            <div className="text-sm text-gray-500">标记: {ver.versionTag}</div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div>{formatFileSize(ver.size)}</div>
                            <div>{formatTimestamp(ver.modified)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 哈希计算模块 */}
      {activeModule === 'hash' && (
        <div>
          <button
            onClick={testHashCalculation}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark mb-4"
          >
            运行哈希计算测试
          </button>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
            {testResults.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
