import { useState, useCallback, useEffect } from 'react';
import { Theme, ScanConfig, MatchMode, Page } from './shared/types';
import Sidebar from './shared/Sidebar';
import FileFingerprintPage from './deduplication/FileFingerprintPage';
import DeduplicationPage from './deduplication/DeduplicationPage';
import VersionComparePage from './deduplication/VersionComparePage';
import TestPage from './deduplication/TestPage';
import DataExtractionPage from './extraction/DataExtractionPage';
import Dashboard from './risk/Dashboard';
import RiskReport from './risk/RiskReport';

function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    recursive: true,
    matchMode: 'both' as MatchMode,
    nameSimilarityThreshold: 0.8,
    includeHidden: false,
    maxFileSize: 500,
  });

  // 监听 Dashboard 中的"查看详情"导航事件
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.page === 'risk-report' && detail?.projectId) {
        setSelectedProjectId(detail.projectId);
        setCurrentPage('risk-report');
      }
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, [theme]);

  const updateScanConfig = useCallback((updates: Partial<ScanConfig>) => {
    setScanConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleNavigate = useCallback((page: Page) => {
    setSelectedProjectId(null);
    setCurrentPage(page);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'fingerprint':
        return <FileFingerprintPage config={scanConfig} />;
      case 'deduplication':
        return <DeduplicationPage config={scanConfig} onUpdateConfig={updateScanConfig} />;
      case 'version':
        return <VersionComparePage />;
      case 'test':
        return <TestPage />;
      case 'extraction':
        return <DataExtractionPage />;
      case 'risk-report':
        return <RiskReport projectId={selectedProjectId} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Sidebar
        currentPage={currentPage}
        theme={theme}
        onNavigate={handleNavigate}
        onToggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
