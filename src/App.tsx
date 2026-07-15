import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Theme, ScanConfig, MatchMode, Page } from './shared/types';
import Sidebar from './shared/Sidebar';
import ErrorBoundary from './shared/ErrorBoundary';
import PageSkeleton from './shared/PageSkeleton';
import { ProjectProvider } from './projects/ProjectContext';
import ProjectScopeBanner from './projects/ProjectScopeBanner';

const Dashboard = lazy(() => import('./risk/Dashboard'));
const DataNetwork = lazy(() => import('./risk/DataNetwork'));
const DeduplicationPage = lazy(() => import('./deduplication/DeduplicationPage'));
const VersionComparePage = lazy(() => import('./deduplication/VersionComparePage'));
const DataExtractionPage = lazy(() => import('./extraction/DataExtractionPage'));
const DiagnosticsPage = lazy(() => import('./shared/DiagnosticsPage'));
const ProjectCenterPage = lazy(() => import('./projects/ProjectCenterPage'));
const ProjectWorkspacePage = lazy(() => import('./projects/ProjectWorkspacePage'));
const ProjectReportCenterPage = lazy(() => import('./projects/ProjectReportCenterPage'));

function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentPage, setCurrentPage] = useState<Page>('project-center');
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
    setCurrentPage(page);
  }, []);

  const handleNavigateWithParams = useCallback((page: string) => {
    setCurrentPage(page as Page);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'project-center':
        return <ProjectCenterPage onOpenProject={() => handleNavigate('dashboard')} />;
      case 'dashboard':
        return <ProjectWorkspacePage />;
      case 'deduplication':
        return <DeduplicationPage config={scanConfig} onUpdateConfig={updateScanConfig} />;
      case 'version':
        return <VersionComparePage />;
      case 'extraction':
        return <DataExtractionPage />;
      case 'risk-report':
        return <ProjectReportCenterPage />;
      case 'data-network':
        return <DataNetwork />;
      case 'diagnostics':
        return <DiagnosticsPage />;
      default:
        return <Dashboard onNavigate={handleNavigateWithParams} />;
    }
  };

  return (
    <ProjectProvider>
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
          {currentPage !== 'project-center' && <ProjectScopeBanner />}
          <ErrorBoundary onNavigate={handleNavigate as (page: string) => void}>
            <Suspense fallback={<PageSkeleton />}>
              {renderPage()}
            </Suspense>
          </ErrorBoundary>
        </main>
        </div>
      </ErrorBoundary>
    </ProjectProvider>
  );
}

export default App;
