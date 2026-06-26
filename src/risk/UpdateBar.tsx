// 热更新提示条组件
// 当检测到新数据时显示在页面顶部
// 点击"立即同步"触发刷新

import { useDataStore } from './dataStore';

export default function UpdateBar() {
  const { hasNewData, lastUpdate, refreshData, isLoading } = useDataStore();

  if (!hasNewData) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 flex items-center justify-between animate-slide-in shadow-lg">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>
          新数据可用
          {lastUpdate && (
            <span className="text-blue-200 text-sm ml-2">
              （上次更新：{new Date(lastUpdate).toLocaleTimeString('zh-CN')}）
            </span>
          )}
        </span>
      </div>
      <button
        onClick={refreshData}
        disabled={isLoading}
        className="px-4 py-1.5 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50 transition-colors"
      >
        {isLoading ? '同步中...' : '立即同步'}
      </button>
    </div>
  );
}
