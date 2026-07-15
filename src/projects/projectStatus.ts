import type { ProjectStatus } from '../api/tauriApi';

const transitions: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['scanning', 'archived'],
  scanning: ['extracting', 'draft', 'archived'],
  extracting: ['reviewing', 'scanning', 'archived'],
  reviewing: ['ready', 'extracting', 'archived'],
  ready: ['scanning', 'archived'],
  archived: ['draft'],
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  draft: '草稿',
  scanning: '扫描中',
  extracting: '提取中',
  reviewing: '复核中',
  ready: '可用',
  archived: '已归档',
};

export function canTransitionProjectStatus(from: ProjectStatus, to: ProjectStatus): boolean {
  return transitions[from].includes(to);
}
