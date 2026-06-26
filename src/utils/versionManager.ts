// 时效比对模块
// 识别文件版本，构建时间线，标记最新版本

import { FileInfo, FileVersion, VersionInfo, KeepLatestPlan } from '../types';
import { detectVersionTag, extractVersionNumber, isSameFileVersion } from './similarity';

/**
 * 版本管理器类
 * 用于识别和管理文件的不同版本
 */
export class VersionManager {
  /**
   * 分析文件列表，识别版本关系
   * 返回文件版本列表
   */
  analyzeVersions(
    files: FileInfo[],
    similarityThreshold: number = 0.8
  ): FileVersion[] {
    // 1. 按文件名相似度分组
    const groups = this.groupFilesBySimilarity(files, similarityThreshold);

    // 2. 对每个组进行版本分析
    const versions: FileVersion[] = [];

    groups.forEach((group, index) => {
      const version = this.analyzeGroupVersions(group, index);
      if (version) {
        versions.push(version);
      }
    });

    // 3. 按最新版本时间排序
    versions.sort((a, b) => {
      return b.latestVersion.modified - a.latestVersion.modified;
    });

    return versions;
  }

  /**
   * 按文件名相似度分组
   */
  private groupFilesBySimilarity(files: FileInfo[], threshold: number): FileInfo[][] {
    const groups: FileInfo[][] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file1 = files[i];
      if (assigned.has(file1.path)) continue;

      const group = [file1];
      assigned.add(file1.path);

      for (let j = i + 1; j < files.length; j++) {
        const file2 = files[j];
        if (assigned.has(file2.path)) continue;

        // 使用 string-similarity 判断是否为同一文件的不同版本
        if (isSameFileVersion(file1.name, file2.name, threshold)) {
          group.push(file2);
          assigned.add(file2.path);
        }
      }

      // 只有多个文件才构成版本组
      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * 分析单个组的版本信息
   */
  private analyzeGroupVersions(files: FileInfo[], groupIndex: number): FileVersion | null {
    if (files.length < 2) return null;

    // 1. 为每个文件提取版本信息
    const versionInfos: VersionInfo[] = files.map(file => this.extractVersionInfo(file));

    // 2. 按修改时间排序
    versionInfos.sort((a, b) => b.modified - a.modified);

    // 3. 标记最新版本
    if (versionInfos.length > 0) {
      versionInfos[0].isLatest = true;
    }

    // 4. 提取基础名称（去掉版本标记）
    const baseName = this.extractBaseName(files[0].name);

    return {
      baseName,
      versions: versionInfos,
      latestVersion: versionInfos[0],
      totalVersions: versionInfos.length,
    };
  }

  /**
   * 提取文件的版本信息
   */
  private extractVersionInfo(file: FileInfo): VersionInfo {
    const versionTag = detectVersionTag(file.name);
    const versionNumber = extractVersionNumber(file.name);

    return {
      path: file.path,
      name: file.name,
      modified: file.modified,
      size: file.size,
      versionTag: versionTag || this.inferVersionFromTime(file),
      isLatest: false, // 将在后续标记
    };
  }

  /**
   * 从修改时间推断版本
   * 当没有明确版本标记时使用
   */
  private inferVersionFromTime(file: FileInfo): string {
    const date = new Date(file.modified * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 提取基础名称
   * 移除版本标记和扩展名
   */
  private extractBaseName(filename: string): string {
    // 移除扩展名
    let baseName = filename.replace(/\.[^/.]+$/, '');

    // 移除版本标记
    baseName = baseName.replace(
      /[_\-\s]?(v\d+|版本\d*|修改版|最终版|送审版|定稿版|初稿|终稿|副本|copy|备份|backup)\d*[_\-\s]?/gi,
      ''
    );

    // 移除日期格式
    baseName = baseName.replace(/\d{4}[-_]?\d{2}[-_]?\d{2}/g, '');

    // 清理多余空白和特殊字符
    baseName = baseName
      .replace(/[^\w\u4e00-\u9fa5]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return baseName || filename;
  }

  /**
   * 按时间范围筛选版本
   */
  filterByTimeRange(
    versions: FileVersion[],
    startDate?: Date,
    endDate?: Date
  ): FileVersion[] {
    if (!startDate && !endDate) return versions;

    return versions
      .map(version => {
        const filteredVersions = version.versions.filter(v => {
          const modifiedDate = new Date(v.modified * 1000);

          if (startDate && modifiedDate < startDate) return false;
          if (endDate && modifiedDate > endDate) return false;

          return true;
        });

        if (filteredVersions.length < 2) return null;

        // 重新标记最新版本
        filteredVersions.forEach(v => (v.isLatest = false));
        filteredVersions[0].isLatest = true;

        return {
          ...version,
          versions: filteredVersions,
          latestVersion: filteredVersions[0],
          totalVersions: filteredVersions.length,
        };
      })
      .filter((v): v is FileVersion => v !== null);
  }

  /**
   * 标记过期文件
   * 返回需要清理的旧版本文件列表
   */
  identifyOutdatedFiles(versions: FileVersion[]): FileInfo[] {
    const outdatedFiles: FileInfo[] = [];

    versions.forEach(version => {
      // 跳过最新版本
      const oldVersions = version.versions.filter(v => !v.isLatest);

      oldVersions.forEach(v => {
        outdatedFiles.push({
          path: v.path,
          name: v.name,
          size: v.size,
          modified: v.modified,
          created: v.modified, // 假设创建时间与修改时间相同
          isDir: false,
          extension: v.name.split('.').pop() || '',
        });
      });
    });

    return outdatedFiles;
  }

  /**
   * 生成保留最新版本的建议
   * 返回每个版本组的保留/删除建议
   */
  generateKeepLatestPlan(versions: FileVersion[]): KeepLatestPlan[] {
    return versions.map(version => ({
      baseName: version.baseName,
      keepFile: {
        path: version.latestVersion.path,
        name: version.latestVersion.name,
        size: version.latestVersion.size,
        modified: version.latestVersion.modified,
        versionTag: version.latestVersion.versionTag,
      },
      removeFiles: version.versions
        .filter(v => !v.isLatest)
        .map(v => ({
          path: v.path,
          name: v.name,
          size: v.size,
          modified: v.modified,
          versionTag: v.versionTag,
          daysOlder: Math.floor((version.latestVersion.modified - v.modified) / 86400),
        })),
      totalSavedSpace: version.versions
        .filter(v => !v.isLatest)
        .reduce((sum, v) => sum + v.size, 0),
    }));
  }

  /**
   * 识别同一文件的重复版本（基于文件名日期）
   * 如：报告2024-01.pdf, 报告2024-06.pdf, 报告2025-01.pdf
   */
  identifyDatedVersions(files: FileInfo[]): FileVersion[] {
    // 提取日期模式
    const datePattern = /(\d{4}[-_]?\d{2}[-_]?\d{2})/;
    const groups = new Map<string, FileInfo[]>();

    files.forEach(file => {
      const match = file.name.match(datePattern);
      if (match) {
        // 移除日期得到基础名称
        const baseName = file.name.replace(datePattern, '').trim();
        const group = groups.get(baseName) || [];
        group.push(file);
        groups.set(baseName, group);
      }
    });

    // 只返回有多个日期版本的组
    const result: FileVersion[] = [];
    groups.forEach((groupFiles, baseName) => {
      if (groupFiles.length > 1) {
        // 按修改时间排序
        groupFiles.sort((a, b) => b.modified - a.modified);

        const versions: VersionInfo[] = groupFiles.map((f, i) => ({
          path: f.path,
          name: f.name,
          modified: f.modified,
          size: f.size,
          versionTag: f.name.match(datePattern)?.[1] || '',
          isLatest: i === 0,
        }));

        result.push({
          baseName,
          versions,
          latestVersion: versions[0],
          totalVersions: versions.length,
        });
      }
    });

    return result;
  }

  /**
   * 计算版本统计信息
   */
  calculateVersionStats(versions: FileVersion[]): {
    totalGroups: number;
    totalVersions: number;
    outdatedCount: number;
    totalSize: number;
    outdatedSize: number;
  } {
    let totalVersions = 0;
    let outdatedCount = 0;
    let totalSize = 0;
    let outdatedSize = 0;

    versions.forEach(version => {
      totalVersions += version.totalVersions;

      version.versions.forEach(v => {
        totalSize += v.size;

        if (!v.isLatest) {
          outdatedCount++;
          outdatedSize += v.size;
        }
      });
    });

    return {
      totalGroups: versions.length,
      totalVersions,
      outdatedCount,
      totalSize,
      outdatedSize,
    };
  }
}

/**
 * 格式化时间戳为可读日期
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 计算时间差
 */
export function getTimeDifference(timestamp1: number, timestamp2: number): string {
  const diff = Math.abs(timestamp2 - timestamp1);
  const days = Math.floor(diff / (24 * 60 * 60));
  const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));

  if (days > 0) {
    return `${days}天${hours}小时`;
  }
  return `${hours}小时`;
}
