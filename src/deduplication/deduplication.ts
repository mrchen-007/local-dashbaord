// 去重引擎模块
// 基于哈希分组 + 文件名相似度实现文件去重

import { FileInfo, DuplicateGroup, ScanConfig } from '../shared/types';
import { calculateSHA256, HashCache } from './hash';
import { isParsableDocument, extractTextForHash } from '../extraction/documentParser';
import { calculateNameSimilarity } from './similarity';

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

/**
 * 计算重复率
 */
export function calculateDuplicateRate(groups: DuplicateGroup[], totalFiles: number): number {
  if (totalFiles === 0) return 0;
  
  const duplicateFiles = groups.reduce((sum, group) => sum + group.files.length - 1, 0);
  return (duplicateFiles / totalFiles) * 100;
}

/**
 * 去重引擎类
 * 支持三种匹配模式：内容匹配、文件名匹配、双维度匹配
 */
export class DeduplicationEngine {
  private config: ScanConfig;
  private hashCache: HashCache;

  constructor(config: ScanConfig) {
    this.config = config;
    this.hashCache = new HashCache();
  }

  /**
   * 执行重复文件扫描
   * 根据配置的匹配模式选择不同的去重策略
   */
  async scanForDuplicates(
    files: FileInfo[],
    onProgress?: (percentage: number, currentFile: string) => void
  ): Promise<DuplicateGroup[]> {
    switch (this.config.matchMode) {
      case 'content':
        return this.scanByContentHash(files, onProgress);
      case 'name':
        return this.scanByFileName(files, onProgress);
      case 'both':
        return this.scanByBothCriteria(files, onProgress);
      default:
        return this.scanByContentHash(files, onProgress);
    }
  }

  /**
   * 按内容哈希去重
   * 为每个文件计算 SHA-256 哈希值，按哈希值分组
   */
  private async scanByContentHash(
    files: FileInfo[],
    onProgress?: (percentage: number, currentFile: string) => void
  ): Promise<DuplicateGroup[]> {
    const hashGroups = new Map<string, FileInfo[]>();
    const totalFiles = files.length;

    // 计算每个文件的哈希值
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      
      if (onProgress) {
        const percentage = Math.round((i / totalFiles) * 100);
        onProgress(percentage, `正在计算哈希: ${file.name}`);
      }

      try {
        let hash = this.hashCache.get(file.path);
        if (!hash) {
          if (isParsableDocument(file.path)) {
            // 对于可解析文档，提取内容文本后计算哈希
            const textContent = await extractTextForHash(file.path);
            hash = await calculateSHA256(textContent);
          } else {
            // 对于普通文件，使用文件路径和大小作为快速指纹
            hash = file.hash || await calculateSHA256(file.path);
          }
          this.hashCache.set(file.path, hash);
        }

        file.hash = hash;
        file.contentHash = hash;

        // 按哈希值分组
        const group = hashGroups.get(hash) || [];
        group.push(file);
        hashGroups.set(hash, group);
      } catch (error) {
        console.warn(`计算文件哈希失败: ${file.path}`, error);
      }
    }

    // 过滤出有重复的组（文件数 > 1），生成 DuplicateGroup
    return this.buildDuplicateGroups(hashGroups, 'content');
  }

  /**
   * 按文件名相似度去重
   * 使用编辑距离算法计算文件名相似度，按相似度阈值分组
   */
  private async scanByFileName(
    files: FileInfo[],
    onProgress?: (percentage: number, currentFile: string) => void
  ): Promise<DuplicateGroup[]> {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<number>();

    // 使用交集优化：按文件大小预分组，只在大致相等的大小范围内比较
    const sizeGroups = new Map<number, number[]>();
    files.forEach((file, index) => {
      // 按大小取整到最近的 1KB 进行分组
      const sizeKey = Math.round(file.size / 1024);
      const group = sizeGroups.get(sizeKey) || [];
      group.push(index);
      sizeGroups.set(sizeKey, group);
    });

    for (const [_, indices] of sizeGroups) {
      for (let i = 0; i < indices.length; i++) {
        if (processed.has(indices[i])) continue;

        const group: FileInfo[] = [files[indices[i]]];
        processed.add(indices[i]);

        for (let j = i + 1; j < indices.length; j++) {
          if (processed.has(indices[j])) continue;

          const similarity = calculateNameSimilarity(
            files[indices[i]].name,
            files[indices[j]].name
          );

          if (similarity >= this.config.nameSimilarityThreshold) {
            group.push(files[indices[j]]);
            processed.add(indices[j]);
          }
        }

        if (group.length > 1) {
          // 计算组内总节省空间（保留最大文件，删除其余）
          const sortedBySize = [...group].sort((a, b) => b.size - a.size);
          const savedSpace = sortedBySize.slice(1).reduce((sum, f) => sum + f.size, 0);

          groups.push({
            groupId: `name-${groups.length + 1}`,
            hash: '',
            files: group,
            duplicateCount: group.length,
            savedSpace,
            matchType: 'name',
          });
        }
      }
    }

    if (onProgress) {
      onProgress(100, '文件名匹配完成');
    }

    return groups;
  }

  /**
   * 双维度去重
   * 先按哈希值分组，再验证文件名相似度（可选）
   */
  private async scanByBothCriteria(
    files: FileInfo[],
    onProgress?: (percentage: number, currentFile: string) => void
  ): Promise<DuplicateGroup[]> {
    // 第一步：按哈希值分组
    const contentGroups = await this.scanByContentHash(files, onProgress);

    // 第二步：在哈希分组基础上，用文件名相似度做二次过滤
    const bothGroups: DuplicateGroup[] = [];

    for (const group of contentGroups) {
      // 如果组内文件数 >= 3，进一步按文件名相似度细分
      if (group.files.length >= 3) {
        const subGroups = new Map<string, FileInfo[]>();

        for (const file of group.files) {
          let matched = false;
          for (const [, subGroup] of subGroups) {
            const similarity = calculateNameSimilarity(
              subGroup[0].name,
              file.name
            );
            if (similarity >= this.config.nameSimilarityThreshold) {
              subGroup.push(file);
              matched = true;
              break;
            }
          }

          if (!matched) {
            subGroups.set(file.path, [file]);
          }
        }

        // 生成双维度重复组
        for (const [_, subGroup] of subGroups) {
          if (subGroup.length > 1) {
            const sortedBySize = [...subGroup].sort((a, b) => b.size - a.size);
            const savedSpace = sortedBySize.slice(1).reduce((sum, f) => sum + f.size, 0);

            bothGroups.push({
              groupId: `both-${bothGroups.length + 1}`,
              hash: group.hash,
              files: subGroup,
              duplicateCount: subGroup.length,
              savedSpace,
              matchType: 'both',
            });
          }
        }
      } else {
        // 组内文件数 <= 2，直接保留
        bothGroups.push(group);
      }
    }

    return bothGroups;
  }

  /**
   * 构建重复组
   */
  private buildDuplicateGroups(
    hashGroups: Map<string, FileInfo[]>,
    matchType: 'content' | 'name' | 'both'
  ): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    let groupIndex = 0;

    for (const [hash, files] of hashGroups) {
      if (files.length > 1) {
        // 按修改时间倒序排序，最新的在前面
        files.sort((a, b) => b.modified - a.modified);

        // 计算可节省空间（保留第一个，删除其余）
        const savedSpace = files.slice(1).reduce((sum, f) => sum + f.size, 0);

        groups.push({
          groupId: `${matchType}-${++groupIndex}`,
          hash,
          files,
          duplicateCount: files.length,
          savedSpace,
          matchType,
        });
      }
    }

    // 按节省空间降序排序
    return groups.sort((a, b) => b.savedSpace - a.savedSpace);
  }
}
