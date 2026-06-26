// Zustand 全局状态管理
// 管理项目数据、风险结果和加载状态
// 使用 zustand 库实现

import { create } from 'zustand';
import { Project, RiskResult } from '../types';
import { calculateRisks, aggregateRiskStats } from '../engine/riskEngine';
import { databaseService } from '../services/database';

interface DataStoreState {
  // 数据
  projects: Project[];
  riskResults: RiskResult[];
  riskStats: ReturnType<typeof aggregateRiskStats>;

  // 状态
  isLoading: boolean;
  error: string | null;
  lastUpdate: string;
  hasNewData: boolean;

  // 操作
  fetchData: () => Promise<void>;
  refreshData: () => Promise<void>;
  setHasNewData: (hasNew: boolean) => void;
  clearError: () => void;
}

// 从数据库中提取项目数据
async function loadProjectsFromDB(): Promise<Project[]> {
  try {
    // 从 extracted_fields 表获取所有已抽取的记录
    // 使用 databaseService 查询
    const summary = await databaseService.getExtractionSummary();

    if (!summary || summary.length === 0) {
      return [];
    }

    // 将数据库记录映射为 Project 类型
    const projects: Project[] = summary.map((row: any, index: number) => ({
      id: `proj_${index}`,
      name: row.file_name?.replace(/\.\w+$/, '') || `项目${index + 1}`,
      contractNo: row.contract_no || '',
      contractAmount: row.contract_amount || 0,
      totalCost: (row.labor_cost || 0) + (row.material_cost || 0) + (row.equipment_cost || 0),
      laborCost: row.labor_cost || 0,
      materialCost: row.material_cost || 0,
      equipmentCost: row.equipment_cost || 0,
      subcontractAmount: row.subcontract_amount || 0,
      settlementAmount: row.settlement_amount || 0,
      settlementDate: row.settlement_date || '',
      totalPaid: (row.subcontract_amount || 0) * 0.8, // 估算已付款
      estimatedProfitRate: row.contract_amount ? ((row.contract_amount - (row.labor_cost || 0) - (row.material_cost || 0) - (row.equipment_cost || 0)) / row.contract_amount) : 0,
      actualProfitRate: row.settlement_amount ? ((row.settlement_amount - (row.labor_cost || 0) - (row.material_cost || 0) - (row.equipment_cost || 0)) / row.settlement_amount) : 0,
      plannedEndDate: '',
      progressPercent: 0,
      warrantyRatio: row.warranty_ratio || 0,
      warrantyDueDate: '',
      mainSubcontractor: '',
      mainSubcontractorAmount: 0,
      riskLevel: 'low',
      updatedAt: row.extracted_at || new Date().toISOString(),
    }));

    return projects;
  } catch (err) {
    console.warn('从数据库加载项目数据失败，使用模拟数据:', err);
    return [];
  }
}

// 生成模拟项目数据（用于开发和展示）
function generateMockProjects(): Project[] {
  const now = new Date();
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

  return [
    {
      id: 'proj_1', name: '沙河二中改扩建工程', contractNo: '2024-001',
      contractAmount: 85600000, totalCost: 78200000,
      laborCost: 23500000, materialCost: 32800000, equipmentCost: 8900000,
      subcontractAmount: 13000000, settlementAmount: 82000000,
      settlementDate: '2025-06-30', totalPaid: 85000000,
      estimatedProfitRate: 0.086, actualProfitRate: 0.046,
      plannedEndDate: '2025-03-15', progressPercent: 0.95,
      warrantyRatio: 0.05, warrantyDueDate: '2026-06-30',
      mainSubcontractor: '中建三局', mainSubcontractorAmount: 13000000,
      riskLevel: 'high', updatedAt: fmtDate(now),
    },
    {
      id: 'proj_2', name: '友谊校区体育馆建设项目', contractNo: '2024-002',
      contractAmount: 32000000, totalCost: 29800000,
      laborCost: 9800000, materialCost: 12500000, equipmentCost: 4500000,
      subcontractAmount: 3000000, settlementAmount: 31500000,
      settlementDate: '2025-08-15', totalPaid: 30000000,
      estimatedProfitRate: 0.069, actualProfitRate: 0.054,
      plannedEndDate: '2025-10-01', progressPercent: 0.72,
      warrantyRatio: 0.05, warrantyDueDate: '2026-08-15',
      mainSubcontractor: '陕西建工', mainSubcontractorAmount: 3000000,
      riskLevel: 'medium', updatedAt: fmtDate(now),
    },
    {
      id: 'proj_3', name: '长安校区图书馆改造', contractNo: '2024-003',
      contractAmount: 15000000, totalCost: 11200000,
      laborCost: 4200000, materialCost: 5800000, equipmentCost: 1200000,
      subcontractAmount: 8000000, settlementAmount: 14800000,
      settlementDate: '2025-04-30', totalPaid: 14800000,
      estimatedProfitRate: 0.253, actualProfitRate: 0.241,
      plannedEndDate: '2025-02-28', progressPercent: 1.0,
      warrantyRatio: 0.03, warrantyDueDate: '2025-12-31',
      mainSubcontractor: '西安装饰集团', mainSubcontractorAmount: 8000000,
      riskLevel: 'medium', updatedAt: fmtDate(now),
    },
    {
      id: 'proj_4', name: '科技实验楼建设项目', contractNo: '2024-004',
      contractAmount: 45000000, totalCost: 41800000,
      laborCost: 12000000, materialCost: 18500000, equipmentCost: 6300000,
      subcontractAmount: 5000000, settlementAmount: 44500000,
      settlementDate: '2025-10-31', totalPaid: 40000000,
      estimatedProfitRate: 0.071, actualProfitRate: 0.061,
      plannedEndDate: '2025-12-31', progressPercent: 0.55,
      warrantyRatio: 0.05, warrantyDueDate: '2027-10-31',
      mainSubcontractor: '上海宝冶', mainSubcontractorAmount: 5000000,
      riskLevel: 'low', updatedAt: fmtDate(now),
    },
    {
      id: 'proj_5', name: '学生公寓抗震加固工程', contractNo: '2024-005',
      contractAmount: 8800000, totalCost: 9500000,
      laborCost: 4500000, materialCost: 3200000, equipmentCost: 1800000,
      subcontractAmount: 2000000, settlementAmount: 8600000,
      settlementDate: '2025-05-15', totalPaid: 9200000,
      estimatedProfitRate: -0.080, actualProfitRate: -0.105,
      plannedEndDate: '2025-01-31', progressPercent: 1.0,
      warrantyRatio: 0.05, warrantyDueDate: '2025-10-31',
      mainSubcontractor: '中建八局', mainSubcontractorAmount: 2000000,
      riskLevel: 'high', updatedAt: fmtDate(now),
    },
    {
      id: 'proj_6', name: '校园智慧化提升工程', contractNo: '2024-006',
      contractAmount: 6800000, totalCost: 5200000,
      laborCost: 1800000, materialCost: 2600000, equipmentCost: 800000,
      subcontractAmount: 3500000, settlementAmount: 6700000,
      settlementDate: '2025-03-20', totalPaid: 6700000,
      estimatedProfitRate: 0.235, actualProfitRate: 0.224,
      plannedEndDate: '2025-03-01', progressPercent: 1.0,
      warrantyRatio: 0.03, warrantyDueDate: '2026-03-20',
      mainSubcontractor: '华为技术', mainSubcontractorAmount: 3500000,
      riskLevel: 'medium', updatedAt: fmtDate(now),
    },
    {
      id: 'proj_7', name: '市政管网改造工程', contractNo: '2024-007',
      contractAmount: 22500000, totalCost: 23800000,
      laborCost: 8500000, materialCost: 9800000, equipmentCost: 5500000,
      subcontractAmount: 12000000, settlementAmount: 22000000,
      settlementDate: '2025-09-15', totalPaid: 23500000,
      estimatedProfitRate: -0.058, actualProfitRate: -0.082,
      plannedEndDate: '2025-06-30', progressPercent: 0.88,
      warrantyRatio: 0.05, warrantyDueDate: '2026-09-15',
      mainSubcontractor: '市政建设集团', mainSubcontractorAmount: 12000000,
      riskLevel: 'high', updatedAt: fmtDate(now),
    },
    {
      id: 'proj_8', name: '绿化景观提升工程', contractNo: '2024-008',
      contractAmount: 3500000, totalCost: 2800000,
      laborCost: 1200000, materialCost: 1100000, equipmentCost: 500000,
      subcontractAmount: 800000, settlementAmount: 3480000,
      settlementDate: '2025-02-28', totalPaid: 3480000,
      estimatedProfitRate: 0.200, actualProfitRate: 0.194,
      plannedEndDate: '2025-02-15', progressPercent: 1.0,
      warrantyRatio: 0.03, warrantyDueDate: '2026-02-28',
      mainSubcontractor: '园林绿化公司', mainSubcontractorAmount: 800000,
      riskLevel: 'low', updatedAt: fmtDate(now),
    },
  ];
}

export const useDataStore = create<DataStoreState>((set, get) => ({
  // 初始状态
  projects: [],
  riskResults: [],
  riskStats: { totalProjects: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, totalRiskItems: 0 },
  isLoading: false,
  error: null,
  lastUpdate: '',
  hasNewData: false,

  // 获取数据（从数据库 + 风险计算）
  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      // 尝试从数据库加载
      let projects = await loadProjectsFromDB();

      // 如果数据库无数据，使用模拟数据
      if (projects.length === 0) {
        console.log('数据库无项目数据，使用模拟数据展示');
        projects = generateMockProjects();
      }

      // 计算风险
      const riskResults = calculateRisks(projects);
      const riskStats = aggregateRiskStats(riskResults);

      // 将风险等级写回项目数据
      const projectsWithRisk = projects.map((p, i) => ({
        ...p,
        riskLevel: riskResults[i]?.overallRisk || 'low',
      }));

      set({
        projects: projectsWithRisk,
        riskResults,
        riskStats,
        isLoading: false,
        lastUpdate: new Date().toISOString(),
        hasNewData: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: `数据加载失败: ${err.message || err}`,
      });
    }
  },

  // 刷新数据
  refreshData: async () => {
    await get().fetchData();
  },

  // 设置新数据可用标志
  setHasNewData: (hasNew: boolean) => {
    set({ hasNewData: hasNew });
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));
