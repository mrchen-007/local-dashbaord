// 时效比对模块
// 识别文件版本，构建时间线，标记最新版本

import { FileInfo, FileVersion, VersionInfo, KeepLatestPlan } from '../shared/types';
import { detectVersionTag, extractVersionNumber } from './similarity';

/**
 * 版本管理器类
 * 用于识别和管理文件的不同版本
 */
export class VersionManager {
  private files: FileInfo[];

  constructor(files: FileInfo[]) {
    this.files = files;
  }

  /**
   * 分析文件版本
   * 按基础文件名分组，识别版本标签，构建版本时间线
   */
  analyzeVersions(): FileVersion[] {
    const versionGroups = this.groupByBaseName();

    return versionGroups.map(group => {
      // 为每个文件检测版本标签
      const versionsWithTags = group.map(file => ({
        ...file,
        versionTag: detectVersionTag(file.name) || '原始版本',
        versionNumber: extractVersionNumber(file.name),
        isLatest: false,
      }));

      // 按修改时间排序
      versionsWithTags.sort((a, b) => b.modified - a.modified);

      // 标记最新版本
      if (versionsWithTags.length > 0) {
        versionsWithTags[0].isLatest = true;
      }

      const versionInfos: VersionInfo[] = versionsWithTags.map(v => ({
        path: v.path,
        name: v.name,
        modified: v.modified,
        size: v.size,
        versionTag: v.versionTag,
        isLatest: v.isLatest,
      }));

      return {
        baseName: this.extractBaseName(group[0].name),
        versions: versionInfos,
        latestVersion: versionInfos[0],
        totalVersions: versionInfos.length,
      };
    });
  }

  /**
   * 按基础文件名分组
   * 基础文件名：去除版本标签和扩展名后的名字
   */
  private groupByBaseName(): FileInfo[][] {
    const groups = new Map<string, FileInfo[]>();

    for (const file of this.files) {
      const baseName = this.extractBaseName(file.name);
      const group = groups.get(baseName) || [];
      group.push(file);
      groups.set(baseName, group);
    }

    return Array.from(groups.values()).filter(g => g.length > 1);
  }

  /**
   * 提取基础文件名（去除版本标签和扩展名）
   */
  private extractBaseName(filename: string): string {
    let name = filename.replace(/\.[^.]+$/, '');

    // 去除版本标签
    const tag = detectVersionTag(name);
    if (tag) {
      name = name.replace(tag, '').trim();
    }

    // 去除尾部的 - _ 等分隔符
    name = name.replace(/[-_()（）\s]+$/, '');

    return name;
  }

  /**
   * 创建保留最新版本的执行计划
   */
  createKeepLatestPlan(version: FileVersion): KeepLatestPlan {
    const sorted = [...version.versions].sort((a, b) => b.modified - a.modified);
    const keep = sorted[0];
    const remove = sorted.slice(1).map(v => ({
      path: v.path,
      name: v.name,
      size: v.size,
      modified: v.modified,
      versionTag: v.versionTag,
      daysOlder: Math.round((keep.modified - v.modified) / 86400),
    }));

    const totalSavedSpace = remove.reduce((sum, v) => sum + v.size, 0);

    return {
      baseName: version.baseName,
      keepFile: {
        path: keep.path,
        name: keep.name,
        size: keep.size,
        modified: keep.modified,
        versionTag: keep.versionTag,
      },
      removeFiles: remove,
      totalSavedSpace,
    };
  }

  /**
   * 创建保留最旧版本的执行计划
   */
  createKeepOldestPlan(version: FileVersion): KeepLatestPlan {
    const sorted = [...version.versions].sort((a, b) => a.modified - b.modified);
    const keep = sorted[0];
    const remove = sorted.slice(1).map(v => ({
      path: v.path,
      name: v.name,
      size: v.size,
      modified: v.modified,
      versionTag: v.versionTag,
      daysOlder: Math.round((v.modified - keep.modified) / 86400),
    }));

    const totalSavedSpace = remove.reduce((sum, v) => sum + v.size, 0);

    return {
      baseName: version.baseName,
      keepFile: {
        path: keep.path,
        name: keep.name,
        size: keep.size,
        modified: keep.modified,
        versionTag: keep.versionTag,
      },
      removeFiles: remove,
      totalSavedSpace,
    };
  }
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 计算时间差（天数）
 */
export function getTimeDifference(timestamp: number): string {
  const diff = Date.now() - timestamp * 1000;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 1) return '今天';
  if (days < 30) return `${days}天前`;
  if (days < 365) return `${Math.floor(days / 30)}个月前`;
  return `${Math.floor(days / 365)}年前`;
}
