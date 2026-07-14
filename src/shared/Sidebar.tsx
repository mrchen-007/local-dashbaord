import { memo } from 'react';
import { Theme, Page } from './types';

interface SidebarProps {
  currentPage: Page;
  theme: Theme;
  collapsed: boolean;
  onNavigate: (page: Page) => void;
  onToggleTheme: () => void;
  onToggleCollapsed: () => void;
}

const menuItems = [
  {
    id: 'dashboard' as Page,
    label: '数据看板',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'risk-report' as Page,
    label: '风险报告',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'data-network' as Page,
    label: '数据网',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: 'deduplication' as Page,
    label: '文件去重',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
  {
    id: 'fingerprint' as Page,
    label: '文件指纹',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
      </svg>
    ),
  },
  {
    id: 'version' as Page,
    label: '版本比对',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'extraction' as Page,
    label: '数据提取',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    id: 'diagnostics' as Page,
    label: '运行诊断',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3a1.5 1.5 0 00-1.5 1.5v.75a7.5 7.5 0 00-2.16 1.25l-.65-.38a1.5 1.5 0 00-2.05.55l-.75 1.3a1.5 1.5 0 00.55 2.05l.65.38a7.5 7.5 0 000 2.5l-.65.38a1.5 1.5 0 00-.55 2.05l.75 1.3a1.5 1.5 0 002.05.55l.65-.38a7.5 7.5 0 002.16 1.25v.75a1.5 1.5 0 001.5 1.5h1.5a1.5 1.5 0 001.5-1.5v-.75a7.5 7.5 0 002.16-1.25l.65.38a1.5 1.5 0 002.05-.55l.75-1.3a1.5 1.5 0 00-.55-2.05l-.65-.38a7.5 7.5 0 000-2.5l.65-.38a1.5 1.5 0 00.55-2.05l-.75-1.3a1.5 1.5 0 00-2.05-.55l-.65.38a7.5 7.5 0 00-2.16-1.25V4.5a1.5 1.5 0 00-1.5-1.5h-1.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
      </svg>
    ),
  },
  {
    id: 'test' as Page,
    label: '本地测试',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const Sidebar = memo(function Sidebar({ currentPage, theme, collapsed, onNavigate, onToggleTheme, onToggleCollapsed }: SidebarProps) {
  return (
    <aside className={`flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-r border-gray-700`}>
      <div className={`p-6 transition-opacity duration-300 ${collapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : ''}`}>
        <h1 className="text-xl font-bold text-primary">工程稽查系统</h1>
        <p className="text-sm text-gray-500 mt-1">数据去重 & 风险监控</p>
      </div>

      <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-4'}`}>
        {/* 监控管理分组 */}
        <div className={`text-xs text-gray-500 uppercase tracking-wider px-3 mb-2 mt-2 transition-opacity duration-300 ${collapsed ? 'opacity-0 h-0 overflow-hidden' : ''}`}>监控管理</div>
        {menuItems.filter(m => ['dashboard', 'risk-report', 'data-network'].includes(m.id)).map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`relative w-full flex items-center rounded-lg mb-1 transition-colors group ${
              collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
            } ${
              currentPage === item.id
                ? 'bg-primary text-white'
                : theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {item.icon}
            <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : ''}`}>{item.label}</span>
            {collapsed && (
              <span className={`absolute left-full ml-2 px-2 py-1 rounded text-xs whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-white'}`}>
                {item.label}
              </span>
            )}
          </button>
        ))}

        {/* 文件工具分组 */}
        <div className={`text-xs text-gray-500 uppercase tracking-wider px-3 mb-2 mt-6 transition-opacity duration-300 ${collapsed ? 'opacity-0 h-0 overflow-hidden' : ''}`}>文件工具</div>
        {menuItems.filter(m => !['dashboard', 'risk-report', 'data-network'].includes(m.id)).map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`relative w-full flex items-center rounded-lg mb-1 transition-colors group ${
              collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
            } ${
              currentPage === item.id
                ? 'bg-primary text-white'
                : theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {item.icon}
            <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : ''}`}>{item.label}</span>
            {collapsed && (
              <span className={`absolute left-full ml-2 px-2 py-1 rounded text-xs whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-white'}`}>
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className={`border-t border-gray-700 ${collapsed ? 'p-2' : 'p-4'}`}>
        <button
          onClick={onToggleTheme}
          className={`w-full flex items-center rounded-lg text-gray-400 hover:bg-gray-700 transition-colors ${collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-4 py-2'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {theme === 'dark' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            )}
          </svg>
          <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : ''}`}>{theme === 'dark' ? '切换亮色' : '切换暗色'}</span>
        </button>

        <button
          onClick={onToggleCollapsed}
          className={`w-full flex items-center rounded-lg text-gray-400 hover:bg-gray-700 transition-colors mt-1 ${collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-4 py-2'}`}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
          <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : ''}`}>{collapsed ? '展开' : '收起'}</span>
        </button>
      </div>
    </aside>
  );
});

export default Sidebar;
