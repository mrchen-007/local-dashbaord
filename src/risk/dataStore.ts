// Zustand 全局状态管理
// 管理项目数据、风险结果和加载状态
// 使用 zustand 库实现
import { create } from 'zustand';
import { Project, RiskResult } from '../shared/types';
import { calculateRisks, aggregateRiskStats } from './riskEngine';
import { databaseService } from '../shared/database';
import { aggregateToProjects } from '../shared/etl';

interface DataStoreState {
  projects: Project[];
  riskResults: RiskResult[];
  riskStats: {
    totalProjects: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
  };
  isLoading: boolean;
  lastUpdate: string;
  hasNewData: boolean;
  error: string | null;

  fetchData: () => Promise<void>;
  refreshData: () => Promise<void>;
  setHasNewData: (v: boolean) => void;
  clearError: () => void;
}

/**
 * 生成模拟项目数据（用于前端展示和测试）
 */
function generateMockProjects(): Project[] {
  const mockProjects: Project[] = [
    {
      id: 'P001', name: '沙河二中改扩建工程', contractNo: 'HT-2024-001',
      contractAmount: 28500000, totalCost: 26200000, laborCost: 8500000,
      materialCost: 12000000, equipmentCost: 3200000, subcontractAmount: 2500000,
      settlementAmount: 28200000, settlementDate: '2025-06-15', totalPaid: 26800000,
      estimatedProfitRate: 0.12, actualProfitRate: 0.08, plannedEndDate: '2025-04-30',
      progressPercent: 95, warrantyRatio: 0.03, warrantyDueDate: '2026-04-30',
      mainSubcontractor: '河北建工集团', mainSubcontractorAmount: 2500000,
      riskLevel: 'low', updatedAt: '2025-06-01',
    },
    {
      id: 'P002', name: '友谊校区图书馆改造', contractNo: 'HT-2024-002',
      contractAmount: 18600000, totalCost: 19200000, laborCost: 7800000,
      materialCost: 8500000, equipmentCost: 1800000, subcontractAmount: 1100000,
      settlementAmount: 18400000, settlementDate: '2025-05-20', totalPaid: 17500000,
      estimatedProfitRate: 0.15, actualProfitRate: -0.03, plannedEndDate: '2025-03-15',
      progressPercent: 100, warrantyRatio: 0.03, warrantyDueDate: '2026-03-15',
      mainSubcontractor: '西安中天建设', mainSubcontractorAmount: 1100000,
      riskLevel: 'high', updatedAt: '2025-05-20',
    },
    {
      id: 'P003', name: '长安校区实验楼建设', contractNo: 'HT-2024-003',
      contractAmount: 52000000, totalCost: 48500000, laborCost: 16000000,
      materialCost: 22000000, equipmentCost: 6500000, subcontractAmount: 4000000,
      settlementAmount: 51800000, settlementDate: '2025-08-30', totalPaid: 49500000,
      estimatedProfitRate: 0.10, actualProfitRate: 0.06, plannedEndDate: '2025-09-30',
      progressPercent: 85, warrantyRatio: 0.03, warrantyDueDate: '2026-09-30',
      mainSubcontractor: '陕西建工集团', mainSubcontractorAmount: 28000000,
      riskLevel: 'medium', updatedAt: '2025-06-10',
    },
    {
      id: 'P004', name: '高新区智慧园区项目', contractNo: 'HT-2024-004',
      contractAmount: 15800000, totalCost: 16200000, laborCost: 7500000,
      materialCost: 6000000, equipmentCost: 1500000, subcontractAmount: 1200000,
      settlementAmount: 15600000, settlementDate: '2025-04-10', totalPaid: 16800000,
      estimatedProfitRate: 0.18, actualProfitRate: -0.04, plannedEndDate: '2025-02-28',
      progressPercent: 100, warrantyRatio: 0.05, warrantyDueDate: '2025-02-28',
      mainSubcontractor: '华为技术有限公司', mainSubcontractorAmount: 1200000,
      riskLevel: 'high', updatedAt: '2025-04-15',
    },
    {
      id: 'P005', name: '经开区道路管网工程', contractNo: 'HT-2024-005',
      contractAmount: 42000000, totalCost: 38800000, laborCost: 12000000,
      materialCost: 18000000, equipmentCost: 5000000, subcontractAmount: 3800000,
      settlementAmount: 41800000, settlementDate: '2025-07-20', totalPaid: 39600000,
      estimatedProfitRate: 0.08, actualProfitRate: 0.07, plannedEndDate: '2025-07-15',
      progressPercent: 92, warrantyRatio: 0.03, warrantyDueDate: '2026-07-15',
      mainSubcontractor: '中交一公局', mainSubcontractorAmount: 3800000,
      riskLevel: 'low', updatedAt: '2025-06-20',
    },
    {
      id: 'P006', name: '滨江新区安置房项目', contractNo: 'HT-2024-006',
      contractAmount: 86000000, totalCost: 82500000, laborCost: 28000000,
      materialCost: 35000000, equipmentCost: 9500000, subcontractAmount: 10000000,
      settlementAmount: 85500000, settlementDate: '2025-09-30', totalPaid: 81000000,
      estimatedProfitRate: 0.10, actualProfitRate: 0.04, plannedEndDate: '2025-10-31',
      progressPercent: 78, warrantyRatio: 0.03, warrantyDueDate: '2026-10-31',
      mainSubcontractor: '浙江宝业集团', mainSubcontractorAmount: 10000000,
      riskLevel: 'medium', updatedAt: '2025-06-25',
    },
    {
      id: 'P007', name: '人民医院门诊楼扩建', contractNo: 'HT-2024-007',
      contractAmount: 35000000, totalCost: 33800000, laborCost: 11000000,
      materialCost: 15000000, equipmentCost: 4200000, subcontractAmount: 3600000,
      settlementAmount: 34800000, settlementDate: '2025-05-15', totalPaid: 33000000,
      estimatedProfitRate: 0.14, actualProfitRate: 0.03, plannedEndDate: '2025-04-30',
      progressPercent: 98, warrantyRatio: 0.03, warrantyDueDate: '2026-04-30',
      mainSubcontractor: '江苏南通二建', mainSubcontractorAmount: 3600000,
      riskLevel: 'medium', updatedAt: '2025-05-20',
    },
    {
      id: 'P008', name: '城东污水处理厂工程', contractNo: 'HT-2024-008',
      contractAmount: 65000000, totalCost: 61000000, laborCost: 18000000,
      materialCost: 28000000, equipmentCost: 8500000, subcontractAmount: 6500000,
      settlementAmount: 64800000, settlementDate: '2025-08-15', totalPaid: 61500000,
      estimatedProfitRate: 0.11, actualProfitRate: 0.06, plannedEndDate: '2025-08-31',
      progressPercent: 88, warrantyRatio: 0.03, warrantyDueDate: '2026-08-31',
      mainSubcontractor: '中国水环境集团', mainSubcontractorAmount: 6500000,
      riskLevel: 'low', updatedAt: '2025-07-01',
    },
  ];

  return mockProjects;
}

export const useDataStore = create<DataStoreState>((set, get) => ({
  projects: [],
  riskResults: [],
  riskStats: { totalProjects: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0 },
  isLoading: false,
  lastUpdate: '',
  hasNewData: false,
  error: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });

    try {
      let projects: Project[];

      // 【Sprint 1 优化】增强数据获取逻辑：优先真实数据，智能fallback
      try {
        if (typeof window !== 'undefined' && (window as any).__TAURI_IPC__) {
          console.log('[DataStore] Tauri环境检测通过，初始化数据库...');
          await databaseService.initialize();
          
          // 先检查projects表是否有数据
          const existingProjects = await databaseService.getProjects();
          
          if (existingProjects && existingProjects.length > 0) {
            console.log(`[DataStore] ✓ 从projects表加载 ${existingProjects.length} 条记录`);
            projects = existingProjects;
          } else {
            console.log('[DataStore] projects表为空，尝试运行ETL聚合...');
            
            try {
              await aggregateToProjects();
              console.log('[DataStore] ✓ ETL聚合完成');
            } catch (etlError) {
              console.warn('[DataStore] ✗ ETL聚合失败:', etlError);
            }
            
            const afterETL = await databaseService.getProjects();
            
            if (afterETL && afterETL.length > 0) {
              console.log(`[DataStore] ✓ ETL后获取到 ${afterETL.length} 条项目数据`);
              projects = afterETL;
            } else {
              console.warn('[DataStore] ETL后仍无数据，检查extracted_fields表...');
              
              try {
                const hasExtractedData = await databaseService.hasExtractedFields();
                if (!hasExtractedData) {
                  console.warn('[DataStore] ⚠ extracted_fields表也为空，请先运行数据提取流程');
                }
              } catch (checkError) {
                console.warn('[DataStore] 无法检查extracted_fields表:', checkError);
              }
              
              console.warn('[DataStore] ⚠ 回退到模拟数据');
              projects = generateMockProjects();
            }
          }
        } else {
          console.log('[DataStore] 非Tauri环境，使用模拟数据');
          projects = generateMockProjects();
        }
      } catch (dbError) {
        console.error('[DataStore] ✗ 数据库加载失败:', dbError);
        set({ error: `数据库错误: ${dbError}` });
        projects = generateMockProjects();
      }

      console.log(`[DataStore] 最终加载 ${projects.length} 个项目`);
      
      // 计算风险
      const riskResults = calculateRisks(projects);
      const stats = aggregateRiskStats(riskResults);
      
      console.log(`[DataStore] 风险统计: 高=${stats.highRiskCount}, 中=${stats.mediumRiskCount}, 低=${stats.lowRiskCount}`);

      set({
        projects,
        riskResults,
        riskStats: {
          totalProjects: stats.totalProjects,
          highRiskCount: stats.highRiskCount,
          mediumRiskCount: stats.mediumRiskCount,
          lowRiskCount: stats.lowRiskCount,
        },
        isLoading: false,
        lastUpdate: new Date().toISOString(),
      });
    } catch (error) {
      set({
        isLoading: false,
        error: `数据加载失败: ${error}`,
      });
    }
  },

  refreshData: async () => {
    await get().fetchData();
    set({ hasNewData: false });
  },

  setHasNewData: (v: boolean) => set({ hasNewData: v }),
  clearError: () => set({ error: null }),
}));
