import { describe, expect, it } from 'vitest';
import { calculateRisks } from './riskEngine';
import { Project } from '../shared/types';

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1', name: '测试项目', contractNo: 'HT-1', contractAmount: 1_000_000,
  totalCost: 900_000, laborCost: 100_000, materialCost: 500_000, equipmentCost: 100_000,
  subcontractAmount: 200_000, settlementAmount: 900_000, settlementDate: '', totalPaid: 0,
  estimatedProfitRate: 0.1, actualProfitRate: 0, plannedEndDate: '', progressPercent: 0,
  warrantyRatio: 0, warrantyDueDate: '', mainSubcontractor: '', mainSubcontractorAmount: 0,
  riskLevel: 'low', updatedAt: '', ...overrides,
});

describe('risk engine', () => {
  it('marks cost above contract as high risk', () => {
    const [result] = calculateRisks([project({ totalCost: 1_010_000 })]);
    expect(result.overallRisk).toBe('high');
    expect(result.riskDetails.some(detail => detail.ruleCode === 'R002' && detail.level === 'high')).toBe(true);
  });

  it('does not invent settlement risk when settlement data is missing', () => {
    const [result] = calculateRisks([project({ settlementAmount: 0, totalPaid: 5_000_000 })]);
    expect(result.riskDetails.some(detail => detail.ruleCode === 'R001')).toBe(false);
  });
});
