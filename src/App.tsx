import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Theme, ScanConfig, MatchMode, Page } from './shared/types';
import Sidebar from './shared/Sidebar';
import ErrorBoundary from './shared/ErrorBoundary';
import PageSkeleton from './shared/PageSkeleton';

const Dashboard = lazy(() => import('./risk/Dashboard'));
const RiskReport = lazy(() => import('./risk/RiskReport'));
const DataNetwork = lazy(() => import('./risk/DataNetwork'));
const DeduplicationPage = lazy(() => import('./deduplication/DeduplicationPage'));
const FileFingerprintPage = lazy(() => import('./deduplication/FileFingerprintPage'));
const VersionComparePage = lazy(() => import('./deduplication/VersionComparePage'));
const TestPage = lazy(() => import('./deduplication/TestPage'));
const DataExtractionPage = lazy(() => import('./extraction/DataExtractionPage'));
const DiagnosticsPage = lazy(() => import('./shared/DiagnosticsPage'));

function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });
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

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    } catch {
      // ignore storage errors
    }
  }, [sidebarCollapsed]);

  const updateScanConfig = useCallback((updates: Partial<ScanConfig>) => {
    setScanConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleNavigate = useCallback((page: Page) => {
    setSelectedProjectId(null);
    setCurrentPage(page);
  }, []);

  const handleNavigateWithParams = useCallback((page: string, params?: Record<string, string>) => {
    if (page === 'risk-report' && params?.projectId) {
      setSelectedProjectId(params.projectId);
      setCurrentPage('risk-report');
    } else {
      setSelectedProjectId(null);
      setCurrentPage(page as Page);
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigateWithParams} />;
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
      case 'data-network':
        return <DataNetwork />;
      case 'diagnostics':
        return <DiagnosticsPage />;
      default:
        return <Dashboard onNavigate={handleNavigateWithParams} />;
    }
  };

  return (
    <ErrorBoundary onNavigate={handleNavigate as (page: string) => void}>
      <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Sidebar
          currentPage={currentPage}
          theme={theme}
          collapsed={sidebarCollapsed}
          onNavigate={handleNavigate}
          onToggleTheme={toggleTheme}
          onToggleCollapsed={toggleSidebarCollapsed}
        />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary onNavigate={handleNavigate as (page: string) => void}>
            <Suspense fallback={<PageSkeleton />}>
              {renderPage()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
