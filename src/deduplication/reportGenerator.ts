// 测试报告生成器
// 生成详细的测试结果报告，包含文件路径和相似度详情

import * as XLSX from 'xlsx';
import { DuplicateGroup, FileVersion, FileInfo } from '../shared/types';
import { calculateNameSimilarity, detectVersionTag } from './similarity';

interface SimilarityDetail {
  file1: string;
  path1: string;
  file2: string;
  path2: string;
  similarity: number;
  matchType: string;
}

interface DuplicateReport {
  groupId: string;
  matchType: string;
  files: Array<{
    name: string;
    path: string;
    size: number;
    modified: string;
  }>;
  savedSpace: number;
  hash: string;
}

interface VersionReport {
  baseName: string;
  versions: Array<{
    name: string;
    path: string;
    size: number;
    modified: string;
    versionTag: string;
    isLatest: boolean;
  }>;
  latestVersion: string;
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 格式化时间戳
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 计算文件相似度详情
 */
export function calculateSimilarityDetails(files: FileInfo[]): SimilarityDetail[] {
  const details: SimilarityDetail[] = [];

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const file1 = files[i];
      const file2 = files[j];

      const similarity = calculateNameSimilarity(file1.name, file2.name);
      const tag1 = detectVersionTag(file1.name);
      const tag2 = detectVersionTag(file2.name);

      // 只记录相似度超过50%的文件对
      if (similarity >= 0.5) {
        let matchType = '文件名相似';
        if (tag1 && tag2) matchType = '版本关系';
        if (file1.size === file2.size) matchType = '可能重复';

        details.push({
          file1: file1.name,
          path1: file1.path,
          file2: file2.name,
          path2: file2.path,
          similarity: similarity,
          matchType: matchType,
        });
      }
    }
  }

  // 按相似度降序排序
  return details.sort((a, b) => b.similarity - a.similarity);
}

/**
 * 生成重复文件报告数据
 */
export function generateDuplicateReportData(groups: DuplicateGroup[]): DuplicateReport[] {
  return groups.map(group => ({
    groupId: group.groupId,
    matchType: group.matchType === 'both' ? '双维度匹配' :
               group.matchType === 'content' ? '内容匹配' : '文件名匹配',
    files: group.files.map(f => ({
      name: f.name,
      path: f.path,
      size: f.size,
      modified: formatTime(f.modified),
    })),
    savedSpace: group.savedSpace,
    hash: group.hash,
  }));
}

/**
 * 生成版本报告数据
 */
export function generateVersionReportData(versions: FileVersion[]): VersionReport[] {
  return versions.map(v => ({
    baseName: v.baseName,
    versions: v.versions.map(ver => ({
      name: ver.name,
      path: ver.path,
      size: ver.size,
      modified: formatTime(ver.modified),
      versionTag: ver.versionTag,
      isLatest: ver.isLatest,
    })),
    latestVersion: v.latestVersion.name,
  }));
}

/**
 * 导出完整测试报告为Excel
 */
export function exportTestReport(
  files: FileInfo[],
  duplicateGroups: DuplicateGroup[],
  versions: FileVersion[],
  dataSource: string
): void {
  // 使用 xlsx 库创建工作簿
  const workbook = XLSX.utils.book_new();

  // ===== 1. 概览工作表 =====
  const overviewData = [
    { '项目': '数据源', '值': dataSource },
    { '项目': '总文件数', '值': files.length },
    { '项目': '总大小', '值': formatSize(files.reduce((sum, f) => sum + f.size, 0)) },
    { '项目': '重复文件组数', '值': duplicateGroups.length },
    { '项目': '可节省空间', '值': formatSize(duplicateGroups.reduce((sum, g) => sum + g.savedSpace, 0)) },
    { '项目': '版本文件组数', '值': versions.length },
    { '项目': '过期版本数', '值': versions.reduce((sum, v) => sum + v.versions.filter(ver => !ver.isLatest).length, 0) },
    { '项目': '报告生成时间', '值': new Date().toLocaleString('zh-CN') },
  ];
  const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, '概览');

  // ===== 2. 文件列表工作表 =====
  const fileListData = files.map((f, i) => ({
    '序号': i + 1,
    '文件名': f.name,
    '文件路径': f.path,
    '文件大小': formatSize(f.size),
    '大小(字节)': f.size,
    '修改时间': formatTime(f.modified),
    '扩展名': f.extension,
  }));
  const fileListSheet = XLSX.utils.json_to_sheet(fileListData);
  XLSX.utils.book_append_sheet(workbook, fileListSheet, '文件列表');

  // ===== 3. 相似度详情工作表 =====
  const similarityDetails = calculateSimilarityDetails(files);
  const similarityData = similarityDetails.map((d, i) => ({
    '序号': i + 1,
    '文件1': d.file1,
    '路径1': d.path1,
    '文件2': d.file2,
    '路径2': d.path2,
    '相似度': `${(d.similarity * 100).toFixed(1)}%`,
    '相似度分数': d.similarity,
    '匹配类型': d.matchType,
  }));
  const similaritySheet = XLSX.utils.json_to_sheet(similarityData);
  XLSX.utils.book_append_sheet(workbook, similaritySheet, '相似度详情');

  // ===== 4. 重复文件报告工作表 =====
  const duplicateReports = generateDuplicateReportData(duplicateGroups);
  const duplicateData: Record<string, unknown>[] = [];
  duplicateReports.forEach(report => {
    report.files.forEach((file, i) => {
      duplicateData.push({
        '组ID': report.groupId,
        '组内序号': i + 1,
        '文件名': file.name,
        '文件路径': file.path,
        '文件大小': file.size,
        '修改时间': file.modified,
        '匹配类型': report.matchType,
      });
    });
  });
  const duplicateSheet = XLSX.utils.json_to_sheet(duplicateData);
  XLSX.utils.book_append_sheet(workbook, duplicateSheet, '重复文件');

  // ===== 5. 版本报告工作表 =====
  const versionReports = generateVersionReportData(versions);
  const versionData: Record<string, unknown>[] = [];
  versionReports.forEach(report => {
    report.versions.forEach((ver, i) => {
      versionData.push({
        '基准文件名': report.baseName,
        '版本序号': i + 1,
        '文件名': ver.name,
        '文件路径': ver.path,
        '文件大小': ver.size,
        '修改时间': ver.modified,
        '版本标签': ver.versionTag,
        '是否为最新': ver.isLatest ? '是' : '否',
      });
    });
  });
  const versionSheet = XLSX.utils.json_to_sheet(versionData);
  XLSX.utils.book_append_sheet(workbook, versionSheet, '版本信息');

  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `测试报告_${timestamp}.xlsx`;

  // 使用 xlsx 库写入文件
  XLSX.writeFile(workbook, filename);
}

/**
 * 导出纯文本格式报告
 */
export function exportTextReport(
  files: FileInfo[],
  duplicateGroups: DuplicateGroup[],
  versions: FileVersion[]
): string {
  const lines: string[] = [];
  const separator = '='.repeat(80);
  const subSeparator = '-'.repeat(60);

  lines.push(separator);
  lines.push('工程数据稽查系统 - 本地测试报告');
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push(separator);

  // 1. 概览
  lines.push('\n📊 概览');
  lines.push(subSeparator);
  lines.push(`总文件数: ${files.length}`);
  lines.push(`总大小: ${formatSize(files.reduce((sum, f) => sum + f.size, 0))}`);
  lines.push(`重复文件组数: ${duplicateGroups.length}`);
  lines.push(`可节省空间: ${formatSize(duplicateGroups.reduce((sum, g) => sum + g.savedSpace, 0))}`);
  lines.push(`版本文件组数: ${versions.length}`);

  // 2. 重复文件组
  if (duplicateGroups.length > 0) {
    lines.push('\n🔁 重复文件组');
    lines.push(subSeparator);
    duplicateGroups.forEach((group, i) => {
      lines.push(`\n[组 ${i + 1}] 匹配方式: ${group.matchType}`);
      lines.push(`哈希值: ${group.hash || 'N/A'}`);
      lines.push(`文件列表:`);
      group.files.forEach((file, j) => {
        const marker = j === 0 ? '📌 (保留)' : '🗑️ (可删除)';
        lines.push(`  ${j + 1}. ${marker} ${file.path} (${formatSize(file.size)})`);
      });
      lines.push(`可节省: ${formatSize(group.savedSpace)}`);
    });
  }

  // 3. 版本分组
  if (versions.length > 0) {
    lines.push('\n📋 版本分组');
    lines.push(subSeparator);
    versions.forEach((v, i) => {
      lines.push(`\n[版本组 ${i + 1}] 基准名: ${v.baseName}`);
      lines.push(`版本数量: ${v.totalVersions}`);
      v.versions.forEach((ver, j) => {
        const marker = ver.isLatest ? '🆕 (最新)' : '📅 (旧版)';
        lines.push(`  ${j + 1}. ${marker} ${ver.path} (标签: ${ver.versionTag})`);
      });
    });
  }

  // 4. 相似度详情（仅展示前20条）
  const details = calculateSimilarityDetails(files).slice(0, 20);
  if (details.length > 0) {
    lines.push('\n🔍 相似度详情 (前20条)');
    lines.push(subSeparator);
    details.forEach((d, i) => {
      lines.push(`  ${i + 1}. "${d.file1}" ↔ "${d.file2}"`);
      lines.push(`     相似度: ${(d.similarity * 100).toFixed(1)}% | 类型: ${d.matchType}`);
    });
  }

  lines.push(`\n${separator}`);
  lines.push('测试完成');

  return lines.join('\n');
}
