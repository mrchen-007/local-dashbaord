// 文件名相似度计算工具
// 使用 string-similarity 库计算文件名编辑距离相似度

import { compareTwoStrings, findBestMatch } from 'string-similarity';

// 版本关键词列表
const VERSION_KEYWORDS = [
  'V1', 'V2', 'V3', 'V4', 'V5',
  'v1', 'v2', 'v3', 'v4', 'v5',
  '版本', '修改版', '修订版', '最终版', '定稿版',
  '送审版', '报批版', '初审版', '复审版', '终审版',
  '初稿', '修改稿', '终稿', '定稿',
  '第1版', '第2版', '第3版',
  '副本', '备份',
  '-副本', '-备份',
  '(1)', '(2)', '(3)',
  '（1）', '（2）', '（3）',
];

// 版本号正则
const VERSION_NUMBER_REGEX = /[Vv](\d+(?:\.\d+)?)/;

/**
 * 计算两个文件名的相似度
 * 使用 string-similarity 库实现
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  // 移除文件扩展名
  const base1 = name1.replace(/\.[^.]+$/, '');
  const base2 = name2.replace(/\.[^.]+$/, '');

  // 使用 string-similarity 库计算相似度
  return compareTwoStrings(base1, base2);
}

/**
 * 检测文件名中的版本标签
 */
export function detectVersionTag(filename: string): string | null {
  const baseName = filename.replace(/\.[^.]+$/, '');

  // 按顺序检查版本关键词
  for (const keyword of VERSION_KEYWORDS) {
    if (baseName.includes(keyword)) {
      return keyword;
    }
  }

  // 检查版本号格式
  const match = baseName.match(VERSION_NUMBER_REGEX);
  if (match) {
    return match[0];
  }

  return null;
}

/**
 * 从文件名中提取版本号
 */
export function extractVersionNumber(filename: string): number {
  const match = filename.match(VERSION_NUMBER_REGEX);
  if (match) {
    return parseFloat(match[1]);
  }

  // 关键词版本映射
  const keywordOrder = [
    '初稿', '修改稿', '终稿', '定稿',
    '初审版', '复审版', '终审版',
    '送审版', '报批版',
    '修改版', '修订版', '最终版', '定稿版',
  ];

  for (let i = 0; i < keywordOrder.length; i++) {
    if (filename.includes(keywordOrder[i])) {
      return i + 1;
    }
  }

  return 0;
}

/**
 * 判断两个文件是否为同一文件的不同版本
 */
export function isSameFileVersion(name1: string, name2: string): boolean {
  const similarity = calculateNameSimilarity(name1, name2);
  const tag1 = detectVersionTag(name1);
  const tag2 = detectVersionTag(name2);

  // 相似度高且都带有版本标签
  if (similarity > 0.7 && tag1 && tag2) {
    return true;
  }

  return false;
}

/**
 * 查找与目标文件最相似的文件
 */
export function findMostSimilar(targetName: string, candidates: string[]): { bestMatch: string; similarity: number } {
  const results = findBestMatch(targetName, candidates);
  const best = results.bestMatch;

  return {
    bestMatch: best.target,
    similarity: best.rating,
  };
}
