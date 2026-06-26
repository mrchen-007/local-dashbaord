// 热更新提示条组件
// 当检测到新数据时显示在页面顶部
// 点击"立即同步"触发刷新

import { useDataStore } from '../store/dataStore';

export default function UpdateBar() {
  const { hasNewData, refreshData, isLoading, lastUpdate } = useDataStore();

  if (!hasNewData) return null;

  return (
    <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between animate-slide-in">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-amber-400 text-sm">
          新数据可用
          {lastUpdate && (
            <span className="text-gray-500 ml-2">
              (上次更新: {new Date(lastUpdate).toLocaleTimeString('zh-CN')})
            </span>
          )}
        </span>
      </div>
      <button
        onClick={refreshData}
        disabled={isLoading}
        className="px-4 py-1.5 bg-amber-500 text-white rounded text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors"
      >
        {isLoading ? '同步中...' : '立即同步'}
      </button>
    </div>
  );
}
