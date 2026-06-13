// 文件信息接口
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  modified: number;
  created: number;
  isDir: boolean;
  extension: string;
  hash?: string;
  contentHash?: string;
  ssdeepHash?: string;
}

// 扫描结果接口
export interface ScanResult {
  files: FileInfo[];
  totalCount: number;
  totalSize: number;
}

// 重复文件组接口
export interface DuplicateGroup {
  groupId: string;
  hash: string;
  files: FileInfo[];
  duplicateCount: number;
  savedSpace: number;
  matchType: 'content' | 'name' | 'both';
}

// 文件版本接口
export interface FileVersion {
  baseName: string;
  versions: VersionInfo[];
  latestVersion: VersionInfo;
  totalVersions: number;
}

// 版本信息接口
export interface VersionInfo {
  path: string;
  name: string;
  modified: number;
  size: number;
  versionTag: string;
  isLatest: boolean;
}

// 扫描进度接口
export interface ScanProgress {
  currentFile: string;
  processedCount: number;
  totalCount: number;
  percentage: number;
  status: 'scanning' | 'hashing' | 'analyzing' | 'complete' | 'error';
}

// 备份记录接口
export interface BackupRecord {
  timestamp: number;
  backupDir: string;
  files: string[];
  originalDir: string;
}

// 匹配模式类型
export type MatchMode = 'both' | 'name' | 'content';

// 主题类型
export type Theme = 'light' | 'dark';

// 扫描配置接口
export interface ScanConfig {
  recursive: boolean;
  matchMode: MatchMode;
  nameSimilarityThreshold: number;
  includeHidden: boolean;
  maxFileSize: number; // MB
}

// 保留最新版本计划接口
export interface KeepLatestPlan {
  baseName: string;
  keepFile: {
    path: string;
    name: string;
    size: number;
    modified: number;
    versionTag: string;
  };
  removeFiles: Array<{
    path: string;
    name: string;
    size: number;
    modified: number;
    versionTag: string;
    daysOlder: number;
  }>;
  totalSavedSpace: number;
}
