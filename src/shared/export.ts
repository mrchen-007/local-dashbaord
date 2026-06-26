// 报告导出工具
// 使用 xlsx 库将重复清单和版本比对表导出为 Excel 文件

import * as XLSX from 'xlsx';
import { DuplicateGroup, FileVersion } from './types';
import { formatFileSize } from '../deduplication/deduplication';
import { formatTimestamp } from '../deduplication/versionManager';

/**
 * 获取匹配类型标签
 */
function getMatchTypeLabel(matchType: string): string {
  switch (matchType) {
    case 'both': return '双维度匹配';
    case 'content': return '内容匹配';
    case 'name': return '文件名匹配';
    default: return matchType;
  }
}

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

  // 版本组汇总
  const summaryData = versions.map((v, index) => ({
    '序号': index + 1,
    '基准文件名': v.baseName,
    '版本数量': v.totalVersions,
    '最新版本': v.latestVersion.name,
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, '版本汇总');

  // 详细版本列表
  const detailData: Record<string, unknown>[] = [];
  versions.forEach(v => {
    v.versions.forEach((ver, i) => {
      detailData.push({
        '基准文件名': v.baseName,
        '版本序号': i + 1,
        '文件名': ver.name,
        '版本标签': ver.versionTag,
        '是否为最新': ver.isLatest ? '是' : '否',
        '文件大小': formatFileSize(ver.size),
        '修改时间': formatTimestamp(ver.modified),
      });
    });
  });
  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  XLSX.utils.book_append_sheet(workbook, detailSheet, '版本列表');

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `版本比对报告_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
