import {
  archiveProject,
  bindProjectDirectory,
  createProject,
  getProject,
  listProjects,
  updateProject,
  type CreateProjectInput,
  type ProjectRecord,
  type UpdateProjectInput,
} from '../api/tauriApi';

export const projectService = {
  list: (): Promise<ProjectRecord[]> => listProjects(),
  get: (id: number): Promise<ProjectRecord | null> => getProject(id),
  create: (input: CreateProjectInput): Promise<ProjectRecord> => createProject(input),
  update: (id: number, input: UpdateProjectInput): Promise<ProjectRecord> => updateProject(id, input),
  bindDirectory: (id: number, sourceRoot: string): Promise<ProjectRecord> => bindProjectDirectory(id, sourceRoot),
  archive: (id: number): Promise<ProjectRecord> => archiveProject(id),
};
