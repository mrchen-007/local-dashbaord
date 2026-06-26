// 真实数据Mock
// 基于 D:\02.chenwenke2024\09.联营项目\018西北工业大学友谊校区建设工程 目录

import { FileInfo, DuplicateGroup, FileVersion } from '../types';

// 真实文件列表（部分采样）
export const realFiles: FileInfo[] = [
  // ===== 合同相关文件 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\01合同管理\\西北工业大学友谊校区建设工程施工合同.pdf',
    name: '西北工业大学友谊校区建设工程施工合同.pdf',
    size: 88978082,
    modified: 1750128189,
    created: 1750128189,
    isDir: false,
    extension: '.pdf',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\01合同管理\\西北工业大学友谊校区建设工程施工合同副本(2).pdf',
    name: '西北工业大学友谊校区建设工程施工合同副本(2).pdf',
    size: 88978082,
    modified: 1750128189,
    created: 1750128189,
    isDir: false,
    extension: '.pdf',
  },

  // ===== 结算相关文件 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\05产值报送\\学生素质教育中心项目-甲批报送审核台账.xls',
    name: '学生素质教育中心项目-甲批报送审核台账.xls',
    size: 29696,
    modified: 1749549374,
    created: 1749549374,
    isDir: false,
    extension: '.xls',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\09.收集资料\\学生素质教育中心项目-甲批报送审核台账.xls',
    name: '学生素质教育中心项目-甲批报送审核台账.xls',
    size: 29696,
    modified: 1749549374,
    created: 1749549374,
    isDir: false,
    extension: '.xls',
  },

  // ===== 结算单（最终版）=====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\06结算管理\\2026.01 电气安装任务书结算单.xlsx',
    name: '2026.01 电气安装任务书结算单.xlsx',
    size: 40000,
    modified: 1738042542,
    created: 1738042542,
    isDir: false,
    extension: '.xlsx',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\06结算管理\\2026.01 电气安装任务书结算单-最终.xlsx',
    name: '2026.01 电气安装任务书结算单-最终.xlsx',
    size: 44512,
    modified: 1769588142,
    created: 1769588142,
    isDir: false,
    extension: '.xlsx',
  },

  // ===== 钢材结算单（版本）=====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\06结算管理\\2026.01 钢材结算单.xls',
    name: '2026.01 钢材结算单.xls',
    size: 25000,
    modified: 1737350000,
    created: 1737350000,
    isDir: false,
    extension: '.xls',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\06结算管理\\2026.01 钢材结算单最终-普通.xls',
    name: '2026.01 钢材结算单最终-普通.xls',
    size: 29696,
    modified: 1737360672,
    created: 1737360672,
    isDir: false,
    extension: '.xls',
  },

  // ===== 商务交底文件 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\07合同及商务交底\\【商务交底】西北工业大学友谊校区学生素质教育中心项目施工-7.17.pdf',
    name: '【商务交底】西北工业大学友谊校区学生素质教育中心项目施工-7.17.pdf',
    size: 888760,
    modified: 1760339957,
    created: 1760339957,
    isDir: false,
    extension: '.pdf',
  },

  // ===== 二次经营策划书 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\08二次经营策划及复量\\1.二次经营策划书\\1.二次经营策划书\\二次经营策划书.pdf',
    name: '二次经营策划书.pdf',
    size: 8016252,
    modified: 1763712459,
    created: 1763712459,
    isDir: false,
    extension: '.pdf',
  },

  // ===== 会议纪要 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\08二次经营策划及复量\\1.二次经营策划书\\2.会议记录\\会议纪要(1).doc',
    name: '会议纪要(1).doc',
    size: 24064,
    modified: 1763712071,
    created: 1763712071,
    isDir: false,
    extension: '.doc',
  },

  // ===== 钢筋增加量附件 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\09.收集资料\\钢筋增加量附件.xls',
    name: '钢筋增加量附件.xls',
    size: 1302528,
    modified: 1781248248,
    created: 1781248248,
    isDir: false,
    extension: '.xls',
  },

  // ===== 管理制度文件 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\02合作项目商务业务交底资料2025.6\\01陕西建工第九建设集团有限公司合作项目管理制度\\附件：陕西建工第九建设集团有限公司合作项目管理制度\\附件：陕西建工第九建设集团有限公司合作项目管理制度.pdf',
    name: '附件：陕西建工第九建设集团有限公司合作项目管理制度.pdf',
    size: 163807,
    modified: 1714454564,
    created: 1714454564,
    isDir: false,
    extension: '.pdf',
  },

  // ===== 结算管理办法 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\02合作项目商务业务交底资料2025.6\\02陕西建工第九建设集团有限公司工程项目结算管理办法\\关于印发《陕西建工第九建设集团有限公司工程项目结算管理办法》的通知.pdf',
    name: '关于印发《陕西建工第九建设集团有限公司工程项目结算管理办法》的通知.pdf',
    size: 236936,
    modified: 1714468018,
    created: 1714468018,
    isDir: false,
    extension: '.pdf',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\02合作项目商务业务交底资料2025.6\\02陕西建工第九建设集团有限公司工程项目结算管理办法\\附件：陕西建工第九建设集团有限公司工程项目结算管理办法.pdf',
    name: '附件：陕西建工第九建设集团有限公司工程项目结算管理办法.pdf',
    size: 157226,
    modified: 1715138216,
    created: 1715138216,
    isDir: false,
    extension: '.pdf',
  },

  // ===== 商务管理办法 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\02合作项目商务业务交底资料2025.6\\03陕西建工第九建设集团有限公司项目商务管理办法\\关于印发《陕西建工第九建设集团有限公司项目商务管理办法》的通知.pdf',
    name: '关于印发《陕西建工第九建设集团有限公司项目商务管理办法》的通知.pdf',
    size: 235853,
    modified: 1714469176,
    created: 1714469176,
    isDir: false,
    extension: '.pdf',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\02合作项目商务业务交底资料2025.6\\03陕西建工第九建设集团有限公司项目商务管理办法\\附件\\附件：陕西建工第九建设集团有限公司项目商务管理办法.pdf',
    name: '附件：陕西建工第九建设集团有限公司项目商务管理办法.pdf',
    size: 290562,
    modified: 1715140784,
    created: 1715140784,
    isDir: false,
    extension: '.pdf',
  },

  // ===== 附件文件 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\02合作项目商务业务交底资料2025.6\\03陕西建工第九建设集团有限公司项目商务管理办法\\附件\\附件1：二次经营策划等相关程序和表格.doc',
    name: '附件1：二次经营策划等相关程序和表格.doc',
    size: 922946,
    modified: 1731495966,
    created: 1731495966,
    isDir: false,
    extension: '.doc',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\02合作项目商务业务交底资料2025.6\\03陕西建工第九建设集团有限公司项目商务管理办法\\附件\\附件2：成本分析报告.zip',
    name: '附件2：成本分析报告.zip',
    size: 96556,
    modified: 1714469188,
    created: 1714469188,
    isDir: false,
    extension: '.zip',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\02合作项目商务业务交底资料2025.6\\03陕西建工第九建设集团有限公司项目商务管理办法\\附件\\附件3：项目商务例会报告.doc',
    name: '附件3：项目商务例会报告.doc',
    size: 132608,
    modified: 1714469194,
    created: 1714469194,
    isDir: false,
    extension: '.doc',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\02合作项目商务业务交底资料2025.6\\03陕西建工第九建设集团有限公司项目商务管理办法\\附件\\附件4：项目竣工结算商务策划书.doc',
    name: '附件4：项目竣工结算商务策划书.doc',
    size: 115712,
    modified: 1714469196,
    created: 1714469196,
    isDir: false,
    extension: '.doc',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\02合作项目商务业务交底资料2025.6\\03陕西建工第九建设集团有限公司项目商务管理办法\\附件\\附表5：《商务管理检查表》.xlsx',
    name: '附表5：《商务管理检查表》.xlsx',
    size: 77432,
    modified: 1714469200,
    created: 1714469200,
    isDir: false,
    extension: '.xlsx',
  },

  // ===== 图片文件（合同及商务交底）=====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\07合同及商务交底\\29023f84d44b347d5cab0d07cc46d61d.jpg',
    name: '29023f84d44b347d5cab0d07cc46d61d.jpg',
    size: 1506512,
    modified: 1760401695,
    created: 1760401695,
    isDir: false,
    extension: '.jpg',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\07合同及商务交底\\51524acfdc7524ef297c50e462a2328f.jpg',
    name: '51524acfdc7524ef297c50e462a2328f.jpg',
    size: 200820,
    modified: 1760401707,
    created: 1760401707,
    isDir: false,
    extension: '.jpg',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\07合同及商务交底\\93fde1909abe609cb02589220acea05c.jpg',
    name: '93fde1909abe609cb02589220acea05c.jpg',
    size: 188398,
    modified: 1760401701,
    created: 1760401701,
    isDir: false,
    extension: '.jpg',
  },

  // ===== 工程量图片 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\08二次经营策划及复量\\2.工程复量\\工程量清单差异表\\img_251121155722-0001.jpg',
    name: 'img_251121155722-0001.jpg',
    size: 253887,
    modified: 1763711540,
    created: 1763711540,
    isDir: false,
    extension: '.jpg',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\08二次经营策划及复量\\2.工程复量\\工程量清单漏项表\\img_251121155722-0002.jpg',
    name: 'img_251121155722-0002.jpg',
    size: 247292,
    modified: 1763711550,
    created: 1763711550,
    isDir: false,
    extension: '.jpg',
  },

  // ===== 签到表和照片 =====
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\08二次经营策划及复量\\1.二次经营策划书\\3.签到表\\2bd508e3-760a-4148-8820-ea56fd0df982.png',
    name: '2bd508e3-760a-4148-8820-ea56fd0df982.png',
    size: 139185,
    modified: 1763713409,
    created: 1763713409,
    isDir: false,
    extension: '.png',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\08二次经营策划及复量\\1.二次经营策划书\\4.照片\\4058c01017d1065ec938e597d8f498c4.jpg',
    name: '4058c01017d1065ec938e597d8f498c4.jpg',
    size: 530151,
    modified: 1763712405,
    created: 1763712405,
    isDir: false,
    extension: '.jpg',
  },
  {
    path: 'D:\\02.chenwenke2024\\09.联营项目\\018西北工业大学友谊校区建设工程\\018西北工业大学友谊校区建设工程\\08二次经营策划及复量\\1.二次经营策划书\\4.照片\\cd7ed04aad92c38d9566f7124fdc7004.jpg',
    name: 'cd7ed04aad92c38d9566f7124fdc7004.jpg',
    size: 598291,
    modified: 1763712400,
    created: 1763712400,
    isDir: false,
    extension: '.jpg',
  },
];

/**
 * 生成重复文件组（基于真实数据）
 */
export function generateRealDuplicateGroups(): DuplicateGroup[] {
  return [
    {
      groupId: 'dup_real_001',
      hash: 'real_hash_contract_001',
      files: [
        realFiles[0], // 施工合同.pdf
        realFiles[1], // 施工合同副本(2).pdf
      ],
      duplicateCount: 2,
      savedSpace: 88978082, // 约85MB
      matchType: 'both',
    },
    {
      groupId: 'dup_real_002',
      hash: 'real_hash_ledger_002',
      files: [
        realFiles[2], // 学生素质教育中心项目-甲批报送审核台账.xls (05产值报送)
        realFiles[3], // 学生素质教育中心项目-甲批报送审核台账.xls (09.收集资料)
      ],
      duplicateCount: 2,
      savedSpace: 29696,
      matchType: 'content',
    },
  ];
}

/**
 * 生成版本文件组（基于真实数据）
 */
export function generateRealVersions(): FileVersion[] {
  return [
    {
      baseName: '2026.01 电气安装任务书结算单',
      versions: [
        {
          path: realFiles[4].path,
          name: realFiles[4].name,
          modified: realFiles[4].modified,
          size: realFiles[4].size,
          versionTag: '初始版',
          isLatest: false,
        },
        {
          path: realFiles[5].path,
          name: realFiles[5].name,
          modified: realFiles[5].modified,
          size: realFiles[5].size,
          versionTag: '最终',
          isLatest: true,
        },
      ],
      latestVersion: {
        path: realFiles[5].path,
        name: realFiles[5].name,
        modified: realFiles[5].modified,
        size: realFiles[5].size,
        versionTag: '最终',
        isLatest: true,
      },
      totalVersions: 2,
    },
    {
      baseName: '2026.01 钢材结算单',
      versions: [
        {
          path: realFiles[6].path,
          name: realFiles[6].name,
          modified: realFiles[6].modified,
          size: realFiles[6].size,
          versionTag: '初始版',
          isLatest: false,
        },
        {
          path: realFiles[7].path,
          name: realFiles[7].name,
          modified: realFiles[7].modified,
          size: realFiles[7].size,
          versionTag: '最终',
          isLatest: true,
        },
      ],
      latestVersion: {
        path: realFiles[7].path,
        name: realFiles[7].name,
        modified: realFiles[7].modified,
        size: realFiles[7].size,
        versionTag: '最终',
        isLatest: true,
      },
      totalVersions: 2,
    },
  ];
}

/**
 * 格式化文件大小
 */
export function formatRealFileSize(bytes: number): string {
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
export function formatRealTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
