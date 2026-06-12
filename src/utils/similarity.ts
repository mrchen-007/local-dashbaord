// 文件名相似度计算工具
// 使用 string-similarity 库实现模糊匹配

import { compareTwoStrings, findBestMatch } from 'string-similarity';

/**
 * 计算两个文件名的相似度
 * 返回 0-1 之间的值，1 表示完全相同
 * 使用 string-similarity 库实现
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  // 使用 string-similarity 库计算相似度
  return compareTwoStrings(normalizeFilename(name1), normalizeFilename(name2));
}

/**
 * 标准化文件名
 * 移除扩展名、版本号、特殊字符等
 */
export function normalizeFilename(name: string): string {
  // 移除扩展名
  const withoutExt = name.replace(/\.[^/.]+$/, '');

  // 转换为小写
  let normalized = withoutExt.toLowerCase();

  // 移除常见版本标记
  normalized = normalized.replace(
    /[_\-\s]?(v\d+|版本\d*|修改版|最终版|送审版|定稿版|初稿|终稿|副本|copy|备份|backup)\d*[_\-\s]?/gi,
    ' '
  );

  // 移除日期格式 (如 2024-01-01, 20240101)
  normalized = normalized.replace(/\d{4}[-_]?\d{2}[-_]?\d{2}/g, '');

  // 移除多余空白和特殊字符
  normalized = normalized
    .replace(/[^\w\u4e00-\u9fa5]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * 检测文件名中的版本关键词
 * 返回版本标记（如 V1、V2、修改版等）
 */
export function detectVersionTag(filename: string): string | null {
  // 版本关键词模式
  const versionPatterns = [
    /[_\-\s]?(v\d+)[_\-\s]?/i,
    /[_\-\s]?(版本\d*)[_\-\s]?/,
    /[_\-\s]?(修改版)[_\-\s]?/,
    /[_\-\s]?(最终版)[_\-\s]?/,
    /[_\-\s]?(送审版)[_\-\s]?/,
    /[_\-\s]?(定稿版)[_\-\s]?/,
    /[_\-\s]?(初稿)[_\-\s]?/,
    /[_\-\s]?(终稿)[_\-\s]?/,
    /[_\-\s]?(副本)[_\-\s]?/,
    /[_\-\s]?(copy)\s*\d*[_\-\s]?/i,
    /[_\-\s]?(备份)\d*[_\-\s]?/,
    /[_\-\s]?(backup)\d*[_\-\s]?/i,
  ];

  for (const pattern of versionPatterns) {
    const match = filename.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * 提取版本号
 * 支持 V1、V01、版本1 等格式
 */
export function extractVersionNumber(filename: string): number | null {
  const tag = detectVersionTag(filename);
  if (!tag) return null;

  // 提取数字部分
  const numMatch = tag.match(/\d+/);
  if (numMatch) {
    return parseInt(numMatch[0], 10);
  }

  // 特殊版本标记映射
  const versionMap: Record<string, number> = {
    '初稿': 1,
    '终稿': 999,
    '定稿版': 999,
    '最终版': 999,
    '送审版': 500,
    '修改版': 500,
    '副本': 0,
    'copy': 0,
    '备份': 0,
    'backup': 0,
  };

  return versionMap[tag.toLowerCase()] ?? null;
}

/**
 * 判断是否为同一文件的不同版本
 * 基于文件名相似度和版本关键词
 */
export function isSameFileVersion(name1: string, name2: string, threshold: number = 0.8): boolean {
  // 1. 计算文件名相似度
  const similarity = calculateNameSimilarity(name1, name2);

  // 2. 如果相似度低于阈值，不是同一文件
  if (similarity < threshold) {
    return false;
  }

  // 3. 检查是否有版本关键词
  const tag1 = detectVersionTag(name1);
  const tag2 = detectVersionTag(name2);

  // 4. 如果都有版本关键词，很可能是同一文件的不同版本
  if (tag1 && tag2) {
    return true;
  }

  // 5. 如果相似度很高（>0.9），即使没有版本关键词也认为是同一文件
  if (similarity > 0.9) {
    return true;
  }

  return false;
}

/**
 * 在文件列表中查找相似文件
 * 返回相似度超过阈值的文件对
 */
export function findSimilarFiles(
  filenames: string[],
  threshold: number = 0.8
): Array<{ file1: string; file2: string; similarity: number }> {
  const results: Array<{ file1: string; file2: string; similarity: number }> = [];
  const processed = new Set<string>();

  // 使用 string-similarity 库的 findBestMatch 进行批量匹配
  for (let i = 0; i < filenames.length; i++) {
    const file1 = filenames[i];
    if (processed.has(file1)) continue;

    // 使用 string-similarity 库查找最佳匹配
    const matches = findBestMatch(file1, filenames.slice(i + 1));

    for (const match of matches.ratings) {
      if (match.rating >= threshold) {
        results.push({
          file1,
          file2: match.target,
          similarity: match.rating,
        });
        processed.add(match.target);
      }
    }
  }

  return results;
}

/**
 * 按文件名相似度分组
 * 返回分组后的文件列表
 */
export function groupBySimilarity(
  filenames: string[],
  threshold: number = 0.8
): string[][] {
  const groups: string[][] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < filenames.length; i++) {
    const file1 = filenames[i];
    if (assigned.has(file1)) continue;

    const group = [file1];
    assigned.add(file1);

    for (let j = i + 1; j < filenames.length; j++) {
      const file2 = filenames[j];
      if (assigned.has(file2)) continue;

      const similarity = calculateNameSimilarity(file1, file2);
      if (similarity >= threshold) {
        group.push(file2);
        assigned.add(file2);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}

/**
 * 计算两个文件的综合相似度
 * 结合文件名相似度和内容相似度（如有）
 */
export function calculateOverallSimilarity(
  name1: string,
  name2: string,
  contentSimilarity?: number,
  nameWeight: number = 0.4,
  contentWeight: number = 0.6
): number {
  const nameSim = calculateNameSimilarity(name1, name2);

  if (contentSimilarity === undefined) {
    return nameSim;
  }

  return nameSim * nameWeight + contentSimilarity * contentWeight;
}
