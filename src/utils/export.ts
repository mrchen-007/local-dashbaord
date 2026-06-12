// 报告导出工具
// 使用 xlsx 库将重复清单和版本比对表导出为 Excel 文件

import * as XLSX from 'xlsx';
import { DuplicateGroup, FileVersion } from '../types';
import { formatFileSize } from './deduplication';
import { formatTimestamp } from './versionManager';

/**
 * 导出重复文件报告为 Excel
 */
export function exportDuplicateReport(groups: DuplicateGroup[]): void {
  // 使用 xlsx 库创建工作簿
  const workbook = XLSX.utils.book_new();

  // 创建重复文件汇总表
  const summaryData = groups.map((group, index) => ({
    '序号': index + 1,
    '组ID': group.groupId,
    '匹配类型': getMatchTypeLabel(group.matchType),
    '重复数量': group.duplicateCount,
    '可节省空间': formatFileSize(group.savedSpace),
    '哈希值': group.hash || '-',
  }));

  // 使用 xlsx 库添加汇总工作表
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, '汇总');

  // 创建详细文件列表
  const detailData: Record<string, unknown>[] = [];
  groups.forEach(group => {
    group.files.forEach((file, fileIndex) => {
      detailData.push({
        '组ID': group.groupId,
        '文件序号': fileIndex + 1,
        '文件名': file.name,
        '文件路径': file.path,
        '文件大小': formatFileSize(file.size),
        '修改时间': formatTimestamp(file.modified),
        '是否为最新': fileIndex === 0 ? '是' : '否',
      });
    });
  });

  // 使用 xlsx 库添加详细工作表
  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  XLSX.utils.book_append_sheet(workbook, detailSheet, '详细列表');

  // 生成文件并下载
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `重复文件报告_${timestamp}.xlsx`;

  // 使用 xlsx 库写入文件
  XLSX.writeFile(workbook, filename);
}

/**
 * 导出版本比对报告为 Excel
 */
export function exportVersionReport(versions: FileVersion[]): void {
  // 使用 xlsx 库创建工作簿
  const workbook = XLSX.utils.book_new();

  // 创建版本汇总表
  const summaryData = versions.map((version, index) => ({
    '序号': index + 1,
    '基础名称': version.baseName,
    '版本数量': version.totalVersions,
    '最新版本': version.latestVersion.name,
    '最新修改时间': formatTimestamp(version.latestVersion.modified),
    '过期版本数': version.versions.filter(v => !v.isLatest).length,
  }));

  // 使用 xlsx 库添加汇总工作表
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, '汇总');

  // 创建版本时间线
  const timelineData: Record<string, unknown>[] = [];
  versions.forEach(version => {
    version.versions.forEach(v => {
      timelineData.push({
        '基础名称': version.baseName,
        '版本名称': v.name,
        '文件路径': v.path,
        '版本标记': v.versionTag,
        '修改时间': formatTimestamp(v.modified),
        '文件大小': formatFileSize(v.size),
        '状态': v.isLatest ? '最新版本' : '过期版本',
      });
    });
  });

  // 使用 xlsx 库添加时间线工作表
  const timelineSheet = XLSX.utils.json_to_sheet(timelineData);
  XLSX.utils.book_append_sheet(workbook, timelineSheet, '版本时间线');

  // 生成文件并下载
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `版本比对报告_${timestamp}.xlsx`;

  // 使用 xlsx 库写入文件
  XLSX.writeFile(workbook, filename);
}

/**
 * 导出综合报告（包含重复文件和版本信息）
 */
export function exportCombinedReport(
  duplicates: DuplicateGroup[],
  versions: FileVersion[]
): void {
  // 使用 xlsx 库创建工作簿
  const workbook = XLSX.utils.book_new();

  // 1. 概览工作表
  const overviewData = [
    { '指标': '重复文件组数', '值': duplicates.length },
    { '指标': '总重复文件数', '值': duplicates.reduce((sum, g) => sum + g.duplicateCount, 0) },
    { '指标': '可节省空间', '值': formatFileSize(duplicates.reduce((sum, g) => sum + g.savedSpace, 0)) },
    { '指标': '版本组数', '值': versions.length },
    { '指标': '过期版本数', '值': versions.reduce((sum, v) => sum + v.versions.filter(ver => !ver.isLatest).length, 0) },
  ];

  // 使用 xlsx 库添加概览工作表
  const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, '概览');

  // 2. 重复文件工作表
  const duplicateData: Record<string, unknown>[] = [];
  duplicates.forEach(group => {
    group.files.forEach((file, fileIndex) => {
      duplicateData.push({
        '类型': '重复文件',
        '组ID': group.groupId,
        '匹配方式': getMatchTypeLabel(group.matchType),
        '文件名': file.name,
        '文件路径': file.path,
        '文件大小': formatFileSize(file.size),
        '修改时间': formatTimestamp(file.modified),
        '状态': fileIndex === 0 ? '保留' : '待处理',
      });
    });
  });

  // 使用 xlsx 库添加重复文件工作表
  const duplicateSheet = XLSX.utils.json_to_sheet(duplicateData);
  XLSX.utils.book_append_sheet(workbook, duplicateSheet, '重复文件');

  // 3. 版本信息工作表
  const versionData: Record<string, unknown>[] = [];
  versions.forEach(version => {
    version.versions.forEach(v => {
      versionData.push({
        '类型': '版本文件',
        '基础名称': version.baseName,
        '版本名称': v.name,
        '版本标记': v.versionTag,
        '文件路径': v.path,
        '文件大小': formatFileSize(v.size),
        '修改时间': formatTimestamp(v.modified),
        '状态': v.isLatest ? '最新版本' : '过期版本',
      });
    });
  });

  // 使用 xlsx 库添加版本信息工作表
  const versionSheet = XLSX.utils.json_to_sheet(versionData);
  XLSX.utils.book_append_sheet(workbook, versionSheet, '版本信息');

  // 生成文件并下载
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `文件分析报告_${timestamp}.xlsx`;

  // 使用 xlsx 库写入文件
  XLSX.writeFile(workbook, filename);
}

/**
 * 获取匹配类型标签
 */
function getMatchTypeLabel(matchType: string): string {
  const labels: Record<string, string> = {
    content: '内容匹配',
    name: '文件名匹配',
    both: '双维度匹配',
  };
  return labels[matchType] || matchType;
}
