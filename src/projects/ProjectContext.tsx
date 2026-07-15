import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ProjectRecord } from '../api/tauriApi';

interface ProjectContextValue {
  currentProject: ProjectRecord | null;
  setCurrentProject: (project: ProjectRecord | null) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);
  const value = useMemo(() => ({ currentProject, setCurrentProject }), [currentProject]);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useCurrentProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useCurrentProject 必须在 ProjectProvider 内使用');
  }
  return context;
}
