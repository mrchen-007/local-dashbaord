import { listProjectFiles, scanProject, type ProjectFileRecord, type ProjectScanResult } from '../api/tauriApi';

export const projectFileService = {
  scan: (projectId: number, recursive: boolean): Promise<ProjectScanResult> => scanProject(projectId, recursive),
  list: (projectId: number, limit?: number): Promise<ProjectFileRecord[]> => listProjectFiles(projectId, limit),
};
