// Mock数据生成器
// 用于本地测试去重和版本比对功能

import { FileInfo, DuplicateGroup, FileVersion } from '../shared/types';

/**
 * 生成模拟文件列表
 * 包含重复文件和不同版本文件
 */
export function generateMockFiles(): FileInfo[] {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  const files: FileInfo[] = [];

  // === 合同类文件（含重复） ===
  const contractFiles = [
    { name: '施工合同.pdf', size: 2457600, modified: now - 30 * day, hash: 'a1b2c3d4' },
    { name: '施工合同(1).pdf', size: 2457600, modified: now - 20 * day, hash: 'a1b2c3d4' },
    { name: '施工合同-副本.pdf', size: 2457600, modified: now - 15 * day, hash: 'a1b2c3d4' },
    { name: '施工合同-最终版.pdf', size: 2457600, modified: now - 5 * day, hash: 'e5f6g7h8' },
    { name: '施工合同V2.pdf', size: 2460000, modified: now - 2 * day, hash: 'i9j0k1l2' },
  ];
  contractFiles.forEach(f => {
    files.push({
      path: `D:\\合同\\${f.name}`,
      name: f.name,
      size: f.size,
      modified: f.modified,
      created: f.modified,
      isDir: false,
      extension: 'pdf',
      hash: f.hash,
      contentHash: f.hash,
    });
  });

  // === 结算报告类（含版本） ===
  const settlementFiles = [
    { name: '结算报告-初稿.xlsx', size: 512000, modified: now - 45 * day, hash: 'm3n4o5p6' },
    { name: '结算报告-修改稿.xlsx', size: 524288, modified: now - 30 * day, hash: 'q7r8s9t0' },
    { name: '结算报告-终稿.xlsx', size: 524288, modified: now - 10 * day, hash: 'u1v2w3x4' },
    { name: '结算报告-终稿(1).xlsx', size: 524288, modified: now - 5 * day, hash: 'u1v2w3x4' },
  ];
  settlementFiles.forEach(f => {
    files.push({
      path: `D:\\结算\\${f.name}`,
      name: f.name,
      size: f.size,
      modified: f.modified,
      created: f.modified,
      isDir: false,
      extension: 'xlsx',
      hash: f.hash,
      contentHash: f.hash,
    });
  });

  // === PDF 图纸类 ===
  const drawingFiles = [
    { name: '结构施工图-一层.pdf', size: 8388608, modified: now - 60 * day, hash: 'y5z6a7b8' },
    { name: '结构施工图-二层.pdf', size: 8388608, modified: now - 60 * day, hash: 'c9d0e1f2' },
    { name: '结构施工图-一层-备份.pdf', size: 8388608, modified: now - 55 * day, hash: 'y5z6a7b8' },
  ];
  drawingFiles.forEach(f => {
    files.push({
      path: `D:\\图纸\\${f.name}`,
      name: f.name,
      size: f.size,
      modified: f.modified,
      created: f.modified,
      isDir: false,
      extension: 'pdf',
      hash: f.hash,
      contentHash: f.hash,
    });
  });

  // === 其他独立文件 ===
  const otherFiles = [
    { name: '会议纪要-2024年1月.docx', size: 102400, modified: now - 50 * day, hash: 'g3h4i5j6' },
    { name: '会议纪要-2024年2月.docx', size: 112640, modified: now - 20 * day, hash: 'k7l8m9n0' },
    { name: '材料清单.xlsx', size: 204800, modified: now - 10 * day, hash: 'o1p2q3r4' },
    { name: '工程量清单.pdf', size: 1572864, modified: now - 3 * day, hash: 's5t6u7v8' },
    { name: '设计方案.pdf', size: 5120000, modified: now - 1 * day, hash: 'w9x0y1z2' },
  ];
  otherFiles.forEach(f => {
    files.push({
      path: `D:\\其他\\${f.name}`,
      name: f.name,
      size: f.size,
      modified: f.modified,
      created: f.modified,
      isDir: false,
      extension: f.name.split('.').pop() || '',
      hash: f.hash,
      contentHash: f.hash,
    });
  });

  return files;
}

/**
 * 生成模拟重复文件组
 */
export function generateMockDuplicateGroups(): DuplicateGroup[] {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  return [
    {
      groupId: 'content-1',
      hash: 'a1b2c3d4',
      files: [
        {
          path: 'D:\\合同\\施工合同.pdf',
          name: '施工合同.pdf',
          size: 2457600,
          modified: now - 30 * day,
          created: now - 30 * day,
          isDir: false,
          extension: 'pdf',
          hash: 'a1b2c3d4',
        },
        {
          path: 'D:\\合同\\施工合同(1).pdf',
          name: '施工合同(1).pdf',
          size: 2457600,
          modified: now - 20 * day,
          created: now - 20 * day,
          isDir: false,
          extension: 'pdf',
          hash: 'a1b2c3d4',
        },
        {
          path: 'D:\\合同\\施工合同-副本.pdf',
          name: '施工合同-副本.pdf',
          size: 2457600,
          modified: now - 15 * day,
          created: now - 15 * day,
          isDir: false,
          extension: 'pdf',
          hash: 'a1b2c3d4',
        },
      ],
      duplicateCount: 3,
      savedSpace: 4915200,
      matchType: 'content',
    },
    {
      groupId: 'content-2',
      hash: 'u1v2w3x4',
      files: [
        {
          path: 'D:\\结算\\结算报告-终稿.xlsx',
          name: '结算报告-终稿.xlsx',
          size: 524288,
          modified: now - 10 * day,
          created: now - 10 * day,
          isDir: false,
          extension: 'xlsx',
          hash: 'u1v2w3x4',
        },
        {
          path: 'D:\\结算\\结算报告-终稿(1).xlsx',
          name: '结算报告-终稿(1).xlsx',
          size: 524288,
          modified: now - 5 * day,
          created: now - 5 * day,
          isDir: false,
          extension: 'xlsx',
          hash: 'u1v2w3x4',
        },
      ],
      duplicateCount: 2,
      savedSpace: 524288,
      matchType: 'content',
    },
    {
      groupId: 'content-3',
      hash: 'y5z6a7b8',
      files: [
        {
          path: 'D:\\图纸\\结构施工图-一层.pdf',
          name: '结构施工图-一层.pdf',
          size: 8388608,
          modified: now - 60 * day,
          created: now - 60 * day,
          isDir: false,
          extension: 'pdf',
          hash: 'y5z6a7b8',
        },
        {
          path: 'D:\\图纸\\结构施工图-一层-备份.pdf',
          name: '结构施工图-一层-备份.pdf',
          size: 8388608,
          modified: now - 55 * day,
          created: now - 55 * day,
          isDir: false,
          extension: 'pdf',
          hash: 'y5z6a7b8',
        },
      ],
      duplicateCount: 2,
      savedSpace: 8388608,
      matchType: 'content',
    },
  ];
}

/**
 * 生成模拟版本数据
 */
export function generateMockVersions(): FileVersion[] {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  return [
    {
      baseName: '结算报告',
      versions: [
        {
          path: 'D:\\结算\\结算报告-初稿.xlsx',
          name: '结算报告-初稿.xlsx',
          modified: now - 45 * day,
          size: 512000,
          versionTag: '初稿',
          isLatest: false,
        },
        {
          path: 'D:\\结算\\结算报告-修改稿.xlsx',
          name: '结算报告-修改稿.xlsx',
          modified: now - 30 * day,
          size: 524288,
          versionTag: '修改稿',
          isLatest: false,
        },
        {
          path: 'D:\\结算\\结算报告-终稿.xlsx',
          name: '结算报告-终稿.xlsx',
          modified: now - 10 * day,
          size: 524288,
          versionTag: '终稿',
          isLatest: true,
        },
      ],
      latestVersion: {
        path: 'D:\\结算\\结算报告-终稿.xlsx',
        name: '结算报告-终稿.xlsx',
        modified: now - 10 * day,
        size: 524288,
        versionTag: '终稿',
        isLatest: true,
      },
      totalVersions: 3,
    },
    {
      baseName: '施工合同',
      versions: [
        {
          path: 'D:\\合同\\施工合同.pdf',
          name: '施工合同.pdf',
          modified: now - 30 * day,
          size: 2457600,
          versionTag: '原始版本',
          isLatest: false,
        },
        {
          path: 'D:\\合同\\施工合同V2.pdf',
          name: '施工合同V2.pdf',
          modified: now - 2 * day,
          size: 2460000,
          versionTag: 'V2',
          isLatest: true,
        },
      ],
      latestVersion: {
        path: 'D:\\合同\\施工合同V2.pdf',
        name: '施工合同V2.pdf',
        modified: now - 2 * day,
        size: 2460000,
        versionTag: 'V2',
        isLatest: true,
      },
      totalVersions: 2,
    },
  ];
}
