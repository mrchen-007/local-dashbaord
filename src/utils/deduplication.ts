// 去重引擎模块
// 基于哈希分组 + 文件名相似度实现文件去重

import { FileInfo, DuplicateGroup, MatchMode, ScanConfig } from '../types';
import { calculateSHA256, HashCache } from './hash';
import { isParsableDocument, extractTextForHash } from './documentParser';
import { calculateNameSimilarity, isSameFileVersion } from './similarity';

/**
 * 去重引擎类
 * 实现三种匹配模式：内容哈希、文件名相似度、双维度匹配
 */
export class DeduplicationEngine {
  private hashCache: HashCache;
  private config: ScanConfig;

  constructor(config: ScanConfig) {
    this.config = config;
    this.hashCache = new HashCache();
  }

  /**
   * 扫描并识别重复文件
   * 返回重复文件组列表
   */
  async scanForDuplicates(
    files: FileInfo[],
    onProgress?: (progress: number, currentFile: string) => void
  ): Promise<DuplicateGroup[]> {
    const { matchMode, nameSimilarityThreshold } = this.config;

    // 1. 计算所有文件的哈希值
    const filesWithHash = await this.calculateFileHashes(files, onProgress);

    // 2. 根据匹配模式进行分组
    let duplicateGroups: DuplicateGroup[];

    switch (matchMode) {
      case 'content':
        duplicateGroups = this.groupByContentHash(filesWithHash);
        break;
      case 'name':
        duplicateGroups = this.groupByFileName(filesWithHash, nameSimilarityThreshold);
        break;
      case 'both':
      default:
        duplicateGroups = this.groupByBothCriteria(filesWithHash, nameSimilarityThreshold);
        break;
    }

    // 3. 过滤掉只有一份文件的组（不是重复）
    duplicateGroups = duplicateGroups.filter(group => group.files.length > 1);

    // 4. 计算每组可节省的空间
    duplicateGroups.forEach(group => {
      group.savedSpace = this.calculateSavedSpace(group.files);
    });

    return duplicateGroups;
  }

  /**
   * 计算文件哈希值
   * 支持缓存和断点续算
   */
  private async calculateFileHashes(
    files: FileInfo[],
    onProgress?: (progress: number, currentFile: string) => void
  ): Promise<FileInfo[]> {
    const result: FileInfo[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      onProgress?.(((i + 1) / totalFiles) * 100, file.name);

      try {
        // 检查缓存
        const cacheKey = `${file.path}_${file.size}_${file.modified}`;
        let hash = this.hashCache.get(cacheKey);

        if (!hash) {
          // 根据文件类型选择哈希计算方式
          if (isParsableDocument(file.name)) {
            // 对于可解析的文档，提取内容后计算哈希
            // 这样可以忽略元数据差异
            const fileObj = await this.createFileObject(file.path);
            const content = await extractTextForHash(fileObj);
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            hash = await calculateSHA256(new Blob([data]).arrayBuffer());
          } else {
            // 对于其他文件，直接计算二进制内容哈希
            const fileObj = await this.createFileObject(file.path);
            hash = await calculateSHA256(fileObj);
          }

          // 缓存结果
          this.hashCache.set(cacheKey, hash);
        }

        result.push({ ...file, hash });
      } catch (error) {
        console.error(`计算文件 ${file.name} 哈希失败:`, error);
        result.push(file);
      }
    }

    return result;
  }

  /**
   * 按内容哈希分组
   * 仅匹配模式：content
   */
  private groupByContentHash(files: FileInfo[]): DuplicateGroup[] {
    const hashGroups = new Map<string, FileInfo[]>();

    // 按哈希值分组
    files.forEach(file => {
      if (!file.hash) return;

      const group = hashGroups.get(file.hash) || [];
      group.push(file);
      hashGroups.set(file.hash, group);
    });

    // 转换为 DuplicateGroup 格式
    const result: DuplicateGroup[] = [];
    let groupId = 0;

    hashGroups.forEach((groupFiles, hash) => {
      if (groupFiles.length > 1) {
        result.push({
          groupId: `content_${groupId++}`,
          hash,
          files: groupFiles,
          duplicateCount: groupFiles.length,
          savedSpace: 0, // 将在后续计算
          matchType: 'content',
        });
      }
    });

    return result;
  }

  /**
   * 按文件名相似度分组
   * 仅匹配模式：name
   */
  private groupByFileName(files: FileInfo[], threshold: number): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const assigned = new Set<string>();

    let groupId = 0;

    for (let i = 0; i < files.length; i++) {
      const file1 = files[i];
      if (assigned.has(file1.path)) continue;

      const groupFiles = [file1];
      assigned.add(file1.path);

      for (let j = i + 1; j < files.length; j++) {
        const file2 = files[j];
        if (assigned.has(file2.path)) continue;

        // 使用 string-similarity 计算文件名相似度
        const similarity = calculateNameSimilarity(file1.name, file2.name);

        if (similarity >= threshold) {
          groupFiles.push(file2);
          assigned.add(file2.path);
        }
      }

      if (groupFiles.length > 1) {
        groups.push({
          groupId: `name_${groupId++}`,
          hash: '', // 文件名匹配不需要哈希
          files: groupFiles,
          duplicateCount: groupFiles.length,
          savedSpace: 0,
          matchType: 'name',
        });
      }
    }

    return groups;
  }

  /**
   * 双维度匹配
   * 同时满足内容哈希相同和文件名相似度阈值
   * 默认匹配模式：both
   */
  private groupByBothCriteria(files: FileInfo[], threshold: number): DuplicateGroup[] {
    // 1. 先按内容哈希分组
    const hashGroups = new Map<string, FileInfo[]>();
    files.forEach(file => {
      if (!file.hash) return;
      const group = hashGroups.get(file.hash) || [];
      group.push(file);
      hashGroups.set(file.hash, group);
    });

    const result: DuplicateGroup[] = [];
    let groupId = 0;

    // 2. 在每个哈希组内，进一步按文件名相似度筛选
    hashGroups.forEach((groupFiles, hash) => {
      if (groupFiles.length < 2) return;

      // 在哈希组内按文件名相似度分组
      const nameSubgroups: FileInfo[][] = [];
      const assigned = new Set<string>();

      for (let i = 0; i < groupFiles.length; i++) {
        const file1 = groupFiles[i];
        if (assigned.has(file1.path)) continue;

        const subgroup = [file1];
        assigned.add(file1.path);

        for (let j = i + 1; j < groupFiles.length; j++) {
          const file2 = groupFiles[j];
          if (assigned.has(file2.path)) continue;

          const similarity = calculateNameSimilarity(file1.name, file2.name);
          if (similarity >= threshold) {
            subgroup.push(file2);
            assigned.add(file2.path);
          }
        }

        if (subgroup.length > 1) {
          nameSubgroups.push(subgroup);
        }
      }

      // 将子组添加到结果
      nameSubgroups.forEach(subgroup => {
        result.push({
          groupId: `both_${groupId++}`,
          hash,
          files: subgroup,
          duplicateCount: subgroup.length,
          savedSpace: 0,
          matchType: 'both',
        });
      });
    });

    return result;
  }

  /**
   * 计算可节省的空间
   * 保留最大的文件，其余为可节省空间
   */
  private calculateSavedSpace(files: FileInfo[]): number {
    if (files.length < 2) return 0;

    // 找出最大文件的大小
    const maxSize = Math.max(...files.map(f => f.size));

    // 计算总大小减去最大文件大小
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    return totalSize - maxSize;
  }

  /**
   * 创建文件对象（用于浏览器环境）
   * 在 Tauri 环境中，需要通过 API 读取文件内容
   */
  private async createFileObject(path: string): Promise<File> {
    // 在实际 Tauri 环境中，这里需要调用 Tauri API 读取文件
    // 这里返回一个空的 File 对象作为占位符
    return new File([], path.split('/').pop() || 'unknown');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: 0, // 实际实现中需要跟踪缓存大小
      hitRate: 0, // 实际实现中需要跟踪命中率
    };
  }

  /**
   * 导出缓存数据
   */
  exportCache(): Record<string, { hash: string; timestamp: number }> {
    return this.hashCache.export();
  }

  /**
   * 导入缓存数据
   */
  importCache(data: Record<string, { hash: string; timestamp: number }>): void {
    this.hashCache.import(data);
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 计算重复率
 */
export function calculateDuplicateRate(groups: DuplicateGroup[], totalFiles: number): number {
  if (totalFiles === 0) return 0;

  const duplicateFiles = groups.reduce((sum, group) => sum + (group.files.length - 1), 0);
  return (duplicateFiles / totalFiles) * 100;
}
