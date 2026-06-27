// 文件信息接口
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  modified: number;
  created: number;
  isDir: boolean;
  extension: string;
  hash?: string;
  contentHash?: string;
  ssdeepHash?: string;
}

// 扫描结果接口
export interface ScanResult {
  files: FileInfo[];
  totalCount: number;
  totalSize: number;
}

// 重复文件组接口
export interface DuplicateGroup {
  groupId: string;
  hash: string;
  files: FileInfo[];
  duplicateCount: number;
  savedSpace: number;
  matchType: 'content' | 'name' | 'both';
}

// 文件版本接口
export interface FileVersion {
  baseName: string;
  versions: VersionInfo[];
  latestVersion: VersionInfo;
  totalVersions: number;
}

// 版本信息接口
export interface VersionInfo {
  path: string;
  name: string;
  modified: number;
  size: number;
  versionTag: string;
  isLatest: boolean;
}

// 扫描进度接口
export interface ScanProgress {
  currentFile: string;
  processedCount: number;
  totalCount: number;
  percentage: number;
  status: 'scanning' | 'hashing' | 'analyzing' | 'complete' | 'error';
}

// 备份记录接口
export interface BackupRecord {
  timestamp: number;
  backupDir: string;
  files: string[];
  originalDir: string;
}

// 匹配模式类型
export type MatchMode = 'both' | 'name' | 'content';

// 主题类型
export type Theme = 'light' | 'dark';

// 扫描配置接口
export interface ScanConfig {
  recursive: boolean;
  matchMode: MatchMode;
  nameSimilarityThreshold: number;
  includeHidden: boolean;
  maxFileSize: number; // MB
}

// 保留最新版本计划接口
export interface KeepLatestPlan {
  baseName: string;
  keepFile: {
    path: string;
    name: string;
    size: number;
    modified: number;
    versionTag: string;
  };
  removeFiles: Array<{
    path: string;
    name: string;
    size: number;
    modified: number;
    versionTag: string;
    daysOlder: number;
  }>;
  totalSavedSpace: number;
}

// ========== 第三阶段：风险引擎 & 数据看板 类型定义 ==========

// 风险等级
export type RiskLevel = 'high' | 'medium' | 'low';

// 风险规则类型
export interface RiskRule {
  code: string;
  name: string;
  description: string;
  level: RiskLevel;
}

// 风险详情
export interface RiskDetail {
  ruleCode: string;
  ruleName: string;
  level: RiskLevel;
  description: string;
  currentValue: string;
  thresholdValue: string;
}

// 风险计算结果
export interface RiskResult {
  projectId: string;
  projectName: string;
  overallRisk: RiskLevel;
  riskDetails: RiskDetail[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

// 项目数据
export interface Project {
  id: string;
  name: string;
  contractNo: string;
  contractAmount: number;
  totalCost: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  subcontractAmount: number;
  settlementAmount: number;
  settlementDate: string;
  totalPaid: number;
  estimatedProfitRate: number;
  actualProfitRate: number;
  plannedEndDate: string;
  progressPercent: number;
  warrantyRatio: number;
  warrantyDueDate: string;
  mainSubcontractor: string;
  mainSubcontractorAmount: number;
  riskLevel: RiskLevel;
  updatedAt: string;
}

// 付款记录
export interface Payment {
  id: number;
  projectId: string;
  paymentAmount: number;
  paymentDate: string;
  paymentType: string;
}

// 分包商
export interface Subcontractor {
  id: number;
  projectId: string;
  name: string;
  contractAmount: number;
  paidAmount: number;
}

// 进度计划
export interface Schedule {
  id: number;
  projectId: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  progressPercent: number;
}

// 看板统计
export interface DashboardStats {
  totalProjects: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalContractAmount: number;
  totalSettlementAmount: number;
}

// 页面类型扩展
export type Page = 'dashboard' | 'fingerprint' | 'deduplication' | 'version' | 'test' | 'extraction' | 'risk-report' | 'data-network';
