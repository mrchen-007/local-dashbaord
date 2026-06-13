import { useState, useCallback } from 'react';
import { Theme, ScanConfig, MatchMode } from './types';
import Sidebar from './components/Sidebar';
import FileFingerprintPage from './pages/FileFingerprintPage';
import DeduplicationPage from './pages/DeduplicationPage';
import VersionComparePage from './pages/VersionComparePage';
import TestPage from './pages/TestPage';
import DataExtractionPage from './pages/DataExtractionPage';

type Page = 'fingerprint' | 'deduplication' | 'version' | 'test' | 'extraction';

function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [currentPage, setCurrentPage] = useState<Page>('deduplication');
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    recursive: true,
    matchMode: 'both' as MatchMode,
    nameSimilarityThreshold: 0.8,
    includeHidden: false,
    maxFileSize: 500,
  });

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, [theme]);

  const updateScanConfig = useCallback((updates: Partial<ScanConfig>) => {
    setScanConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'fingerprint':
        return <FileFingerprintPage config={scanConfig} />;
      case 'deduplication':
        return <DeduplicationPage config={scanConfig} onUpdateConfig={updateScanConfig} />;
      case 'version':
        return <VersionComparePage config={scanConfig} />;
      case 'test':
        return <TestPage />;
      case 'extraction':
        return <DataExtractionPage />;
      default:
        return <DeduplicationPage config={scanConfig} onUpdateConfig={updateScanConfig} />;
    }
  };

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Sidebar
        currentPage={currentPage}
        theme={theme}
        onNavigate={setCurrentPage}
        onToggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
