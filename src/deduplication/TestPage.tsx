import { useState, useCallback, useEffect } from 'react';
import { ScanProgress } from '../shared/types';
import { calculateNameSimilarity, detectVersionTag } from './similarity';
import { VersionManager } from './versionManager';

export default function TestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [testFiles, setTestFiles] = useState<{ path: string; name: string; size: number; modified: number }[]>([]);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    // 初始化测试文件列表
    const now = Math.floor(Date.now() / 1000);
    const day = 86400;
    setTestFiles([
      { path: '/test/施工合同.pdf', name: '施工合同.pdf', size: 2457600, modified: now - 30 * day },
      { path: '/test/施工合同(1).pdf', name: '施工合同(1).pdf', size: 2457600, modified: now - 20 * day },
      { path: '/test/施工合同-副本.pdf', name: '施工合同-副本.pdf', size: 2457600, modified: now - 15 * day },
      { path: '/test/施工合同-最终版.pdf', name: '施工合同-最终版.pdf', size: 2457600, modified: now - 5 * day },
      { path: '/test/施工合同V2.pdf', name: '施工合同V2.pdf', size: 2460000, modified: now - 2 * day },
      { path: '/test/结算报告-初稿.xlsx', name: '结算报告-初稿.xlsx', size: 512000, modified: now - 45 * day },
      { path: '/test/结算报告-修改稿.xlsx', name: '结算报告-修改稿.xlsx', size: 524288, modified: now - 30 * day },
      { path: '/test/结算报告-终稿.xlsx', name: '结算报告-终稿.xlsx', size: 524288, modified: now - 10 * day },
      { path: '/test/会议纪要-2024年1月.docx', name: '会议纪要-2024年1月.docx', size: 102400, modified: now - 50 * day },
      { path: '/test/会议纪要-2024年2月.docx', name: '会议纪要-2024年2月.docx', size: 112640, modified: now - 20 * day },
    ]);
  }, []);

  const addResult = (msg: string) => {
    setTestResults(prev => [...prev, msg]);
  };

  // 测试哈希计算
  const testHashCalculation = async () => {
    addResult('=== 哈希计算测试 ===');
    addResult('需要在 Tauri 环境中通过 Web Worker 或 Rust 命令测试');
    addResult('浏览器环境暂不支持文件系统访问\n');
  };

  // 测试文件名相似度
  const testSimilarity = () => {
    addResult('\n=== 文件名相似度测试 ===');

    const testPairs = [
      ['施工合同.pdf', '施工合同(1).pdf'],
      ['施工合同.pdf', '施工合同-副本.pdf'],
      ['施工合同.pdf', '结算报告-终稿.xlsx'],
      ['施工合同-最终版.pdf', '施工合同V2.pdf'],
      ['结算报告-初稿.xlsx', '结算报告-修改稿.xlsx'],
    ];

    for (const [name1, name2] of testPairs) {
      const similarity = calculateNameSimilarity(name1, name2);
      const tag1 = detectVersionTag(name1);
      const tag2 = detectVersionTag(name2);
      addResult(`"${name1}" ↔ "${name2}"`);
      addResult(`  相似度: ${(similarity * 100).toFixed(1)}%`);
      if (tag1 || tag2) {
        addResult(`  版本标签: "${tag1 || '-'}" ↔ "${tag2 || '-'}"`);
      }
    }
  };

  // 测试版本管理
  const testVersionManager = () => {
    addResult('\n=== 版本管理测试 ===');

    const now = Math.floor(Date.now() / 1000);
    const day = 86400;

    const versionFiles = [
      { path: '/test/结算报告-初稿.xlsx', name: '结算报告-初稿.xlsx', size: 512000, modified: now - 45 * day },
      { path: '/test/结算报告-修改稿.xlsx', name: '结算报告-修改稿.xlsx', size: 524288, modified: now - 30 * day },
      { path: '/test/结算报告-终稿.xlsx', name: '结算报告-终稿.xlsx', size: 524288, modified: now - 10 * day },
    ];

    const vm = new VersionManager(versionFiles.map(f => ({
      ...f,
      created: f.modified,
      isDir: false,
      extension: f.name.split('.').pop() || '',
    })));

    const versions = vm.analyzeVersions();
    addResult(`发现 ${versions.length} 个版本组`);

    for (const v of versions) {
      addResult(`\n版本组: ${v.baseName}`);
      addResult(`  版本数量: ${v.totalVersions}`);
      addResult(`  最新版本: ${v.latestVersion.name}`);

      const plan = vm.createKeepLatestPlan(v);
      addResult(`  保留: ${plan.keepFile.name}`);
      addResult(`  可删除: ${plan.removeFiles.length} 个文件`);
      addResult(`  可节省: ${(plan.totalSavedSpace / 1024).toFixed(1)} KB`);
    }
  };

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setTestResults([]);

    setProgress({ currentFile: '正在运行测试...', processedCount: 0, totalCount: 4, percentage: 0, status: 'hashing' });

    // 测试1: 哈希计算
    await new Promise(r => setTimeout(r, 500));
    await testHashCalculation();
    setProgress({ currentFile: '哈希计算完成', processedCount: 1, totalCount: 4, percentage: 25, status: 'hashing' });

    // 测试2: 文件名相似度
    await new Promise(r => setTimeout(r, 300));
    testSimilarity();
    setProgress({ currentFile: '相似度计算完成', processedCount: 2, totalCount: 4, percentage: 50, status: 'hashing' });

    // 测试3: 版本管理
    await new Promise(r => setTimeout(r, 300));
    testVersionManager();
    setProgress({ currentFile: '版本分析完成', processedCount: 3, totalCount: 4, percentage: 75, status: 'hashing' });

    // 测试4: 报告生成
    await new Promise(r => setTimeout(r, 300));
    addResult('\n=== 报告生成测试 ===');
    addResult('报告生成功能需要通过 UI 操作触发');
    addResult('exportTestReport() - 导出完整 Excel 报告');
    addResult('exportTextReport() - 导出文本格式报告');

    setProgress({ currentFile: '', processedCount: 4, totalCount: 4, percentage: 100, status: 'complete' });
    setIsRunning(false);
  }, []);

  const handleExportReport = () => {
    // Cannot run through Tauri in browser, just inform user
    alert('报告导出功能需要在 Tauri 环境中运行');
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 text-white">本地功能测试</h2>
      <p className="text-gray-400 mb-6">
        验证哈希计算、文件名相似度、版本管理等核心功能
      </p>

      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {isRunning ? '测试中...' : '运行全部测试'}
          </button>
          <button
            onClick={handleExportReport}
            className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            导出报告
          </button>
          <button
            onClick={() => setShowLog(!showLog)}
            className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            {showLog ? '隐藏日志' : '显示日志'}
          </button>
        </div>

        {progress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">{progress.currentFile}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-white">测试文件列表</h3>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-400 font-medium">文件名</th>
                  <th className="text-right py-2 text-gray-400 font-medium">大小</th>
                </tr>
              </thead>
              <tbody>
                {testFiles.map((f, i) => (
                  <tr key={i} className="border-b border-gray-700/50">
                    <td className="py-2 text-white">{f.name}</td>
                    <td className="py-2 text-gray-400 text-right">{(f.size / 1024).toFixed(1)} KB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-white">测试统计</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{testFiles.length}</div>
              <div className="text-sm text-gray-400">测试文件数</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{testResults.length}</div>
              <div className="text-sm text-gray-400">测试结果行数</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">3</div>
              <div className="text-sm text-gray-400">测试模块</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">{isRunning ? '运行中' : '就绪'}</div>
              <div className="text-sm text-gray-400">状态</div>
            </div>
          </div>
        </div>
      </div>

      {showLog && testResults.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-white">测试输出</h3>
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
              {testResults.join('\n')}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
