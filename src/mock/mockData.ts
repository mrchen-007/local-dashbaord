// Mock数据生成器
// 用于本地测试去重和版本比对功能

import { FileInfo, DuplicateGroup, FileVersion, VersionInfo } from '../types';

/**
 * 生成模拟文件列表
 * 包含重复文件和不同版本文件
 */
export function generateMockFiles(): FileInfo[] {
  const now = Date.now() / 1000;
  const day = 86400; // 一天的秒数

  return [
    // ===== 重复文件组1: 合同文件 =====
    {
      path: 'D:/项目资料/沙河二中/合同管理/施工合同.xlsx',
      name: '施工合同.xlsx',
      size: 1024000,
      modified: now - day * 30,
      created: now - day * 60,
      isDir: false,
      extension: 'xlsx',
    },
    {
      path: 'D:/项目资料/沙河二中/合同管理/备份/施工合同_副本.xlsx',
      name: '施工合同_副本.xlsx',
      size: 1024000,
      modified: now - day * 30,
      created: now - day * 30,
      isDir: false,
      extension: 'xlsx',
    },
    {
      path: 'D:/项目资料/沙河二中/结算资料/施工合同.xlsx',
      name: '施工合同.xlsx',
      size: 1024000,
      modified: now - day * 25,
      created: now - day * 60,
      isDir: false,
      extension: 'xlsx',
    },

    // ===== 重复文件组2: 付款计划 =====
    {
      path: 'D:/项目资料/沙河二中/付款/4月份付款计划.xlsx',
      name: '4月份付款计划.xlsx',
      size: 512000,
      modified: now - day * 15,
      created: now - day * 15,
      isDir: false,
      extension: 'xlsx',
    },
    {
      path: 'D:/项目资料/沙河二中/付款/4月份付款计划 - Copy.xlsx',
      name: '4月份付款计划 - Copy.xlsx',
      size: 512000,
      modified: now - day * 15,
      created: now - day * 15,
      isDir: false,
      extension: 'xlsx',
    },

    // ===== 重复文件组3: PDF报告 =====
    {
      path: 'D:/项目资料/沙河二中/汇报材料/项目进展报告.pdf',
      name: '项目进展报告.pdf',
      size: 2048000,
      modified: now - day * 5,
      created: now - day * 5,
      isDir: false,
      extension: 'pdf',
    },
    {
      path: 'D:/项目资料/沙河二中/汇报材料/项目进展报告(1).pdf',
      name: '项目进展报告(1).pdf',
      size: 2048000,
      modified: now - day * 5,
      created: now - day * 5,
      isDir: false,
      extension: 'pdf',
    },
    {
      path: 'D:/项目资料/沙河二中/备份/项目进展报告.pdf',
      name: '项目进展报告.pdf',
      size: 2048000,
      modified: now - day * 3,
      created: now - day * 5,
      isDir: false,
      extension: 'pdf',
    },

    // ===== 版本文件组1: 成本分析报告 =====
    {
      path: 'D:/项目资料/西工大/成本管理/成本分析报告v1.xlsx',
      name: '成本分析报告v1.xlsx',
      size: 768000,
      modified: now - day * 60,
      created: now - day * 60,
      isDir: false,
      extension: 'xlsx',
    },
    {
      path: 'D:/项目资料/西工大/成本管理/成本分析报告v2.xlsx',
      name: '成本分析报告v2.xlsx',
      size: 800000,
      modified: now - day * 30,
      created: now - day * 60,
      isDir: false,
      extension: 'xlsx',
    },
    {
      path: 'D:/项目资料/西工大/成本管理/成本分析报告v3.xlsx',
      name: '成本分析报告v3.xlsx',
      size: 856000,
      modified: now - day * 7,
      created: now - day * 60,
      isDir: false,
      extension: 'xlsx',
    },

    // ===== 版本文件组2: 工期计划 =====
    {
      path: 'D:/项目资料/榆横废渣场/进度管理/工期计划_初稿.xlsx',
      name: '工期计划_初稿.xlsx',
      size: 1536000,
      modified: now - day * 90,
      created: now - day * 90,
      isDir: false,
      extension: 'xlsx',
    },
    {
      path: 'D:/项目资料/榆横废渣场/进度管理/工期计划_修改版.xlsx',
      name: '工期计划_修改版.xlsx',
      size: 1600000,
      modified: now - day * 45,
      created: now - day * 90,
      isDir: false,
      extension: 'xlsx',
    },
    {
      path: 'D:/项目资料/榆横废渣场/进度管理/工期计划_送审版.xlsx',
      name: '工期计划_送审版.xlsx',
      size: 1650000,
      modified: now - day * 20,
      created: now - day * 90,
      isDir: false,
      extension: 'xlsx',
    },
    {
      path: 'D:/项目资料/榆横废渣场/进度管理/工期计划_最终版.xlsx',
      name: '工期计划_最终版.xlsx',
      size: 1680000,
      modified: now - day * 3,
      created: now - day * 90,
      isDir: false,
      extension: 'xlsx',
    },

    // ===== 版本文件组3: 商务汇报 =====
    {
      path: 'D:/项目资料/北门川/商务汇报/商务汇报材料2024-01-15.pptx',
      name: '商务汇报材料2024-01-15.pptx',
      size: 5120000,
      modified: now - day * 120,
      created: now - day * 120,
      isDir: false,
      extension: 'pptx',
    },
    {
      path: 'D:/项目资料/北门川/商务汇报/商务汇报材料2024-06-01.pptx',
      name: '商务汇报材料2024-06-01.pptx',
      size: 5500000,
      modified: now - day * 30,
      created: now - day * 120,
      isDir: false,
      extension: 'pptx',
    },
    {
      path: 'D:/项目资料/北门川/商务汇报/商务汇报材料2025-01-10.pptx',
      name: '商务汇报材料2025-01-10.pptx',
      size: 5800000,
      modified: now - day * 5,
      created: now - day * 120,
      isDir: false,
      extension: 'pptx',
    },

    // ===== 独立文件（不重复，无版本）=====
    {
      path: 'D:/项目资料/榆能乙二醇/合同/中标通知书.pdf',
      name: '中标通知书.pdf',
      size: 256000,
      modified: now - day * 180,
      created: now - day * 180,
      isDir: false,
      extension: 'pdf',
    },
    {
      path: 'D:/项目资料/榆能乙二醇/图纸/总平面图.dwg',
      name: '总平面图.dwg',
      size: 15000000,
      modified: now - day * 150,
      created: now - day * 150,
      isDir: false,
      extension: 'dwg',
    },
    {
      path: 'D:/项目资料/沙河二中/资料/施工方案.docx',
      name: '施工方案.docx',
      size: 3200000,
      modified: now - day * 40,
      created: now - day * 40,
      isDir: false,
      extension: 'docx',
    },
  ];
}

/**
 * 生成模拟的重复文件组
 */
export function generateMockDuplicateGroups(): DuplicateGroup[] {
  const files = generateMockFiles();

  return [
    {
      groupId: 'dup_001',
      hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
      files: files.filter(f =>
        f.name === '施工合同.xlsx' || f.name === '施工合同_副本.xlsx'
      ),
      duplicateCount: 3,
      savedSpace: 1024000 * 2,
      matchType: 'both',
    },
    {
      groupId: 'dup_002',
      hash: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1',
      files: files.filter(f =>
        f.name.includes('4月份付款计划')
      ),
      duplicateCount: 2,
      savedSpace: 512000,
      matchType: 'both',
    },
    {
      groupId: 'dup_003',
      hash: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2',
      files: files.filter(f =>
        f.name.includes('项目进展报告')
      ),
      duplicateCount: 3,
      savedSpace: 2048000 * 2,
      matchType: 'content',
    },
  ];
}

/**
 * 生成模拟的版本组
 */
export function generateMockVersions(): FileVersion[] {
  const files = generateMockFiles();

  return [
    {
      baseName: '成本分析报告',
      versions: [
        {
          path: files[7].path,
          name: files[7].name,
          modified: files[7].modified,
          size: files[7].size,
          versionTag: 'v1',
          isLatest: false,
        },
        {
          path: files[8].path,
          name: files[8].name,
          modified: files[8].modified,
          size: files[8].size,
          versionTag: 'v2',
          isLatest: false,
        },
        {
          path: files[9].path,
          name: files[9].name,
          modified: files[9].modified,
          size: files[9].size,
          versionTag: 'v3',
          isLatest: true,
        },
      ],
      latestVersion: {
        path: files[9].path,
        name: files[9].name,
        modified: files[9].modified,
        size: files[9].size,
        versionTag: 'v3',
        isLatest: true,
      },
      totalVersions: 3,
    },
    {
      baseName: '工期计划',
      versions: [
        {
          path: files[10].path,
          name: files[10].name,
          modified: files[10].modified,
          size: files[10].size,
          versionTag: '初稿',
          isLatest: false,
        },
        {
          path: files[11].path,
          name: files[11].name,
          modified: files[11].modified,
          size: files[11].size,
          versionTag: '修改版',
          isLatest: false,
        },
        {
          path: files[12].path,
          name: files[12].name,
          modified: files[12].modified,
          size: files[12].size,
          versionTag: '送审版',
          isLatest: false,
        },
        {
          path: files[13].path,
          name: files[13].name,
          modified: files[13].modified,
          size: files[13].size,
          versionTag: '最终版',
          isLatest: true,
        },
      ],
      latestVersion: {
        path: files[13].path,
        name: files[13].name,
        modified: files[13].modified,
        size: files[13].size,
        versionTag: '最终版',
        isLatest: true,
      },
      totalVersions: 4,
    },
    {
      baseName: '商务汇报材料',
      versions: [
        {
          path: files[14].path,
          name: files[14].name,
          modified: files[14].modified,
          size: files[14].size,
          versionTag: '2024-01-15',
          isLatest: false,
        },
        {
          path: files[15].path,
          name: files[15].name,
          modified: files[15].modified,
          size: files[15].size,
          versionTag: '2024-06-01',
          isLatest: false,
        },
        {
          path: files[16].path,
          name: files[16].name,
          modified: files[16].modified,
          size: files[16].size,
          versionTag: '2025-01-10',
          isLatest: true,
        },
      ],
      latestVersion: {
        path: files[16].path,
        name: files[16].name,
        modified: files[16].modified,
        size: files[16].size,
        versionTag: '2025-01-10',
        isLatest: true,
      },
      totalVersions: 3,
    },
  ];
}

/**
 * 生成扫描进度模拟数据
 */
export function generateMockProgress(current: number, total: number): {
  currentFile: string;
  processedCount: number;
  totalCount: number;
  percentage: number;
} {
  const files = generateMockFiles();
  const currentIndex = Math.min(current, files.length - 1);

  return {
    currentFile: files[currentIndex].name,
    processedCount: current,
    totalCount: total,
    percentage: (current / total) * 100,
  };
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
