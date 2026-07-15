// Tauri API 统一调用层
// 所有 Tauri invoke 调用的单一入口，提供统一错误处理和重试机制

import { invoke } from '@tauri-apps/api/tauri';

const MAX_RETRIES = 3;

// ==================== 类型定义 ====================

export interface ManifestFile {
  path: string;
  size_bytes: number;
  modified_time: string;
  hash: string;
}

export interface FileManifest {
  scan_time: string;
  folder_path: string;
  files: ManifestFile[];
}

export interface ParseResult {
  file_path: string;
  content: string;
  metadata: Record<string, unknown>;
  duration_ms: number;
}

export interface ExtractionSchema {
  name: string;
  type: 'string' | 'number' | 'date' | 'percentage';
  description: string;
  required: boolean;
}

export interface ExtractionResult {
  file_path: string;
  fields: Record<string, unknown>;
  confidence: number;
  duration_ms: number;
  warnings: string[];
}

export interface ScanDirectoryResult {
  files: Array<{
    path: string;
    name: string;
    size: number;
    modified: number;
    created: number;
    isDir: boolean;
    extension: string;
  }>;
}

interface TauriScanDirectoryResult {
  files: Array<{
    path: string;
    name: string;
    size: number;
    modified: number;
    created: number;
    is_dir: boolean;
    extension: string;
  }>;
}

export interface UieServiceStatus {
  status: string;
  model_loaded: boolean;
  model_name?: string;
}

export interface FileOperationItem {
  source_path: string;
  destination_path?: string;
  status: 'succeeded' | 'failed' | 'skipped';
  error?: string;
}

export interface FileOperationResult {
  operation_id: string;
  items: FileOperationItem[];
}

export type ProjectStatus = 'draft' | 'scanning' | 'extracting' | 'reviewing' | 'ready' | 'archived';

export interface ProjectRecord {
  id: number;
  code?: string;
  name: string;
  sourceRoot?: string;
  owner?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  code?: string;
  name: string;
  owner?: string;
}

export interface UpdateProjectInput {
  code?: string;
  name?: string;
  owner?: string;
  status?: ProjectStatus;
}

export interface ProjectScanResult {
  taskId: number;
  files: ScanDirectoryResult['files'];
  totalCount: number;
  totalSize: number;
}

export interface ProjectFileRecord {
  id: number;
  projectId: number;
  absolutePath: string;
  relativePath: string;
  fileName: string;
  extension: string;
  fileSize: number;
  modifiedTime: string;
  contentHash?: string;
  scanStatus: string;
  parseStatus: string;
  errorMessage?: string;
}

// ==================== 错误处理工具 ====================

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

function isNetworkError(error: unknown): boolean {
  const msg = extractErrorMessage(error).toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('connection') ||
    msg.includes('refused') ||
    msg.includes('abort') ||
    msg.includes('offline') ||
    msg.includes('fetch failed') ||
    msg.includes('econnrefused') ||
    msg.includes('enetunreach') ||
    msg.includes('econnreset')
  );
}

async function withRetry<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isNetworkError(error) || attempt === maxRetries) {
        throw new Error(`${errorMessage}: ${extractErrorMessage(error)}`);
      }

      // 网络错误时指数退避重试
      const delayMs = 500 * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`${errorMessage}: ${extractErrorMessage(lastError)}`);
}

// ==================== API 函数 ====================

/**
 * 扫描指定目录，返回文件列表
 */
export async function scanDirectory(
  path: string,
  recursive: boolean
): Promise<ScanDirectoryResult> {
  const result = await withRetry(
    () => invoke<TauriScanDirectoryResult>('scan_directory', { path, recursive }),
    '扫描目录失败，请检查路径是否正确'
  );
  return {
    ...result,
    files: result.files.map((file) => ({
      ...file,
      isDir: file.is_dir,
    })),
  };
}

/**
 * 获取指定目录的文件清单
 */
export async function getManifest(folderPath: string): Promise<FileManifest> {
  return withRetry(
    () => invoke<FileManifest>('get_manifest', { folderPath }),
    '加载文件清单失败，请检查目录路径'
  );
}

/**
 * 解析单个文件内容
 */
export async function parseFile(filePath: string): Promise<ParseResult> {
  return withRetry(
    () => invoke<ParseResult>('parse_file', { filePath }),
    '文件解析失败，请检查文件格式是否支持'
  );
}

/**
 * 从文档文本中抽取字段
 */
export async function extractFields(
  filePath: string,
  text: string
): Promise<ExtractionResult> {
  return withRetry(
    () =>
      invoke<ExtractionResult>('extract_fields', {
        filePath,
        text,
      }),
    '字段抽取失败，请稍后重试'
  );
}

/**
 * 检查 UI 抽取服务是否可用
 */
export async function checkUieService(): Promise<boolean> {
  try {
    const result = await withRetry(
      () => invoke<UieServiceStatus>('check_uie_service'),
      '检查服务状态失败'
    );
    return result.status === 'ok' && result.model_loaded;
  } catch {
    return false;
  }
}

/**
 * 移动文件到备份目录
 */
export async function moveToBackup(
  files: string[],
  backupDir: string
): Promise<FileOperationResult> {
  return withRetry(
    () => invoke<FileOperationResult>('move_to_backup', { files, backupDir }),
    '移动文件到备份目录失败，请检查磁盘空间或文件权限'
  );
}

/**
 * 从备份目录恢复文件
 */
export async function restoreFromBackup(
  backupDir: string,
  files?: string[],
  conflictStrategy: 'skip' | 'rename' = 'skip'
): Promise<FileOperationResult> {
  return withRetry(
    () => invoke<FileOperationResult>('restore_from_backup', { backupDir, files, conflictStrategy }),
    '从备份恢复文件失败，请检查备份目录是否存在'
  );
}

/**
 * 更新文件清单中的哈希值
 */
export async function updateFileManifest(
  folderPath: string,
  filePath: string,
  hash: string
): Promise<void> {
  return withRetry(
    () => invoke('update_file_manifest', { folderPath, filePath, hash }),
    '更新文件清单失败'
  );
}

export async function listProjects(): Promise<ProjectRecord[]> {
  return withRetry(
    () => invoke<ProjectRecord[]>('list_projects'),
    '加载项目列表失败'
  );
}

export async function getProject(id: number): Promise<ProjectRecord | null> {
  return withRetry(
    () => invoke<ProjectRecord | null>('get_project', { id }),
    '加载项目失败'
  );
}

export async function createProject(input: CreateProjectInput): Promise<ProjectRecord> {
  return withRetry(
    () => invoke<ProjectRecord>('create_project', { input }),
    '创建项目失败'
  );
}

export async function updateProject(id: number, input: UpdateProjectInput): Promise<ProjectRecord> {
  return withRetry(
    () => invoke<ProjectRecord>('update_project', { id, input }),
    '更新项目失败'
  );
}

export async function bindProjectDirectory(id: number, sourceRoot: string): Promise<ProjectRecord> {
  return withRetry(
    () => invoke<ProjectRecord>('bind_project_directory', { id, sourceRoot }),
    '绑定资料目录失败'
  );
}

export async function archiveProject(id: number): Promise<ProjectRecord> {
  return withRetry(
    () => invoke<ProjectRecord>('archive_project', { id }),
    '归档项目失败'
  );
}

export async function scanProject(projectId: number, recursive: boolean): Promise<ProjectScanResult> {
  const result = await withRetry(
    () => invoke<ProjectScanResult>('scan_project', { projectId, recursive }),
    '扫描项目资料失败'
  );
  return {
    ...result,
    files: result.files.map((file) => ({ ...file, isDir: false })),
  };
}

export async function listProjectFiles(projectId: number, limit = 200): Promise<ProjectFileRecord[]> {
  return withRetry(
    () => invoke<ProjectFileRecord[]>('list_project_files', { projectId, limit }),
    '读取项目文件失败'
  );
}

/**
 * 执行 SQL 写操作
 */
export async function dbExecute(
  query: string,
  values?: unknown[]
): Promise<void> {
  return withRetry(
    () => invoke('db_execute', { query, values }),
    '数据库执行失败，请检查 SQL 语句或数据库连接'
  );
}

/**
 * 执行 SQL 读操作
 */
export async function dbSelect<T>(
  query: string,
  values?: unknown[]
): Promise<T[]> {
  return withRetry(
    () => invoke<T[]>('db_select', { query, values }),
    '数据库查询失败，请检查 SQL 语句或数据库连接'
  );
}

// ==================== 统一导出对象 ====================

export const tauriApi = {
  scanDirectory,
  getManifest,
  parseFile,
  extractFields,
  moveToBackup,
  restoreFromBackup,
  checkUieService,
  listProjects,
  getProject,
  createProject,
  updateProject,
  bindProjectDirectory,
  archiveProject,
  scanProject,
  listProjectFiles,
  dbExecute,
  dbSelect,
  updateFileManifest,
};

export default tauriApi;
