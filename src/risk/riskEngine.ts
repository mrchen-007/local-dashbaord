// 风险引擎
// 实现 6 条风险规则，基于项目数据计算风险等级
// 阈值从 config.ts 读取

import { Project, RiskResult, RiskDetail, RiskLevel } from '../shared/types';
import { RISK_CONFIG } from './config';

/**
 * 计算所有项目的风险评估
 */
export function calculateRisks(projects: Project[]): RiskResult[] {
  return projects.map(project => {
    const details: RiskDetail[] = [];

    // 规则1：超结算风险
    const paymentDetail = checkOverPayment(project);
    if (paymentDetail) details.push(paymentDetail);

    // 规则2：成本倒挂风险
    const costDetail = checkCostOverrun(project);
    if (costDetail) details.push(costDetail);

    // 规则3：工期超期风险
    const scheduleDetail = checkScheduleOverdue(project);
    if (scheduleDetail) details.push(scheduleDetail);

    // 规则4：成本偏差异常
    const deviationDetails = checkCostDeviation(project);
    details.push(...deviationDetails);

    // 规则5：质保金回收风险
    const warrantyDetail = checkWarrantyRisk(project);
    if (warrantyDetail) details.push(warrantyDetail);

    // 规则6：分包商集中度风险
    const subDetail = checkSubcontractorConcentration(project);
    if (subDetail) details.push(subDetail);

    // 计算总体风险等级
    const highCount = details.filter(d => d.level === 'high').length;
    const mediumCount = details.filter(d => d.level === 'medium').length;
    const lowCount = details.filter(d => d.level === 'low').length;

    let overallRisk: RiskLevel = 'low';
    if (highCount > 0) overallRisk = 'high';
    else if (mediumCount > 0) overallRisk = 'medium';

    return {
      projectId: project.id,
      projectName: project.name,
      overallRisk,
      riskDetails: details,
      highCount,
      mediumCount,
      lowCount,
    };
  });
}

/**
 * 规则1: 超结算风险
 * 累计已付款 > 结算金额 × 1.05 → 高风险
 * 累计已付款 > 结算金额 → 中风险
 */
function checkOverPayment(project: Project): RiskDetail | null {
  if (!project.settlementAmount || project.settlementAmount <= 0) return null;

  const ratio = project.totalPaid / project.settlementAmount;

  if (ratio > RISK_CONFIG.OVER_PAYMENT_RATIO_HIGH) {
    return {
      ruleCode: 'R001',
      ruleName: '超结算风险',
      level: 'high',
      description: `累计已付款 ${project.totalPaid.toFixed(2)} 超出结算金额 ${project.settlementAmount.toFixed(2)} 的 ${(ratio * 100).toFixed(1)}%`,
      currentValue: `已付款/结算金额=${(ratio * 100).toFixed(1)}%`,
      thresholdValue: `阈值: >${RISK_CONFIG.OVER_PAYMENT_RATIO_HIGH * 100}%`,
    };
  }

  if (ratio > RISK_CONFIG.OVER_PAYMENT_RATIO_MEDIUM) {
    return {
      ruleCode: 'R001',
      ruleName: '超结算风险',
      level: 'medium',
      description: `累计已付款 ${project.totalPaid.toFixed(2)} 已接近结算金额 ${project.settlementAmount.toFixed(2)}`,
      currentValue: `已付款/结算金额=${(ratio * 100).toFixed(1)}%`,
      thresholdValue: `阈值: >${RISK_CONFIG.OVER_PAYMENT_RATIO_MEDIUM * 100}%`,
    };
  }

  return null;
}

/**
 * 规则2: 成本倒挂风险
 * 总成本 > 合同金额 → 高风险
 * 总成本 > 合同金额 × 0.95 → 中风险
 */
function checkCostOverrun(project: Project): RiskDetail | null {
  if (!project.contractAmount || project.contractAmount <= 0) return null;

  const ratio = project.totalCost / project.contractAmount;

  if (ratio > RISK_CONFIG.COST_OVERRUN_HIGH) {
    return {
      ruleCode: 'R002',
      ruleName: '成本倒挂风险',
      level: 'high',
      description: `总成本 ${project.totalCost.toFixed(2)} 已超过合同金额 ${project.contractAmount.toFixed(2)}`,
      currentValue: `成本/合同=${(ratio * 100).toFixed(1)}%`,
      thresholdValue: `阈值: >${RISK_CONFIG.COST_OVERRUN_HIGH * 100}%`,
    };
  }

  if (ratio > RISK_CONFIG.COST_OVERRUN_MEDIUM) {
    return {
      ruleCode: 'R002',
      ruleName: '成本倒挂风险',
      level: 'medium',
      description: `总成本 ${project.totalCost.toFixed(2)} 已接近合同金额 ${project.contractAmount.toFixed(2)}`,
      currentValue: `成本/合同=${(ratio * 100).toFixed(1)}%`,
      thresholdValue: `阈值: >${RISK_CONFIG.COST_OVERRUN_MEDIUM * 100}%`,
    };
  }

  return null;
}

/**
 * 规则3: 工期超期风险
 * 当前日期 > 计划竣工日期 → 高风险
 * 距竣工不足30天且进度<90% → 中风险
 */
function checkScheduleOverdue(project: Project): RiskDetail | null {
  if (!project.plannedEndDate) return null;

  const now = new Date();
  const plannedEnd = new Date(project.plannedEndDate);
  const diffDays = Math.floor((now.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > RISK_CONFIG.SCHEDULE_OVERDUE_DAYS_HIGH) {
    return {
      ruleCode: 'R003',
      ruleName: '工期超期风险',
      level: 'high',
      description: `计划竣工日期 ${project.plannedEndDate}，已超期 ${diffDays} 天`,
      currentValue: `超期 ${diffDays} 天`,
      thresholdValue: '计划竣工日期已过',
    };
  }

  if (diffDays >= RISK_CONFIG.SCHEDULE_OVERDUE_DAYS_MEDIUM && diffDays <= 0) {
    if ((project.progressPercent || 0) < 90) {
      return {
        ruleCode: 'R003',
        ruleName: '工期超期风险',
        level: 'medium',
        description: `距计划竣工日期 ${project.plannedEndDate} 仅剩 ${Math.abs(diffDays)} 天，当前进度 ${project.progressPercent}%`,
        currentValue: `进度 ${project.progressPercent}%`,
        thresholdValue: '进度<90%且距竣工<30天',
      };
    }
  }

  return null;
}

/**
 * 规则4: 成本偏差异常
 * 人工成本占比 > 40% → 中风险
 * 材料成本占比 > 60% → 中风险
 * 设备成本占比 > 30% → 中风险
 */
function checkCostDeviation(project: Project): RiskDetail[] {
  const details: RiskDetail[] = [];
  if (!project.totalCost || project.totalCost <= 0) return details;

  const laborRatio = project.laborCost / project.totalCost;
  const materialRatio = project.materialCost / project.totalCost;
  const equipmentRatio = project.equipmentCost / project.totalCost;

  if (laborRatio > RISK_CONFIG.LABOR_COST_RATIO_WARN) {
    details.push({
      ruleCode: 'R004',
      ruleName: '成本偏差异常',
      level: 'medium',
      description: `人工成本占比 ${(laborRatio * 100).toFixed(1)}%，高于预警阈值 ${RISK_CONFIG.LABOR_COST_RATIO_WARN * 100}%`,
      currentValue: `人工占比=${(laborRatio * 100).toFixed(1)}%`,
      thresholdValue: `阈值: >${RISK_CONFIG.LABOR_COST_RATIO_WARN * 100}%`,
    });
  }

  if (materialRatio > RISK_CONFIG.MATERIAL_COST_RATIO_WARN) {
    details.push({
      ruleCode: 'R004',
      ruleName: '成本偏差异常',
      level: 'medium',
      description: `材料成本占比 ${(materialRatio * 100).toFixed(1)}%，高于预警阈值 ${RISK_CONFIG.MATERIAL_COST_RATIO_WARN * 100}%`,
      currentValue: `材料占比=${(materialRatio * 100).toFixed(1)}%`,
      thresholdValue: `阈值: >${RISK_CONFIG.MATERIAL_COST_RATIO_WARN * 100}%`,
    });
  }

  if (equipmentRatio > RISK_CONFIG.EQUIPMENT_COST_RATIO_WARN) {
    details.push({
      ruleCode: 'R004',
      ruleName: '成本偏差异常',
      level: 'medium',
      description: `设备成本占比 ${(equipmentRatio * 100).toFixed(1)}%，高于预警阈值 ${RISK_CONFIG.EQUIPMENT_COST_RATIO_WARN * 100}%`,
      currentValue: `设备占比=${(equipmentRatio * 100).toFixed(1)}%`,
      thresholdValue: `阈值: >${RISK_CONFIG.EQUIPMENT_COST_RATIO_WARN * 100}%`,
    });
  }

  return details;
}

/**
 * 规则5: 质保金回收风险
 * 质保金到期未收回 → 高风险
 */
function checkWarrantyRisk(project: Project): RiskDetail | null {
  if (!project.warrantyDueDate) return null;

  const now = new Date();
  const dueDate = new Date(project.warrantyDueDate);

  if (now > dueDate) {
    return {
      ruleCode: 'R005',
      ruleName: '质保金回收风险',
      level: 'high',
      description: `质保金到期日 ${project.warrantyDueDate} 已过，尚未回收`,
      currentValue: `到期日: ${project.warrantyDueDate}`,
      thresholdValue: '质保金应及时收回',
    };
  }

  return null;
}

/**
 * 规则6: 分包商集中度风险
 * 单分包商金额 > 总成本 50% → 中风险
 */
function checkSubcontractorConcentration(project: Project): RiskDetail | null {
  if (!project.mainSubcontractorAmount || !project.totalCost || project.totalCost <= 0) return null;

  const ratio = project.mainSubcontractorAmount / project.totalCost;

  if (ratio > RISK_CONFIG.SUBCONTRACTOR_CONCENTRATION_WARN) {
    return {
      ruleCode: 'R006',
      ruleName: '分包商集中度风险',
      level: 'medium',
      description: `主分包商 ${project.mainSubcontractor} 占比 ${(ratio * 100).toFixed(1)}%，高于预警阈值 ${RISK_CONFIG.SUBCONTRACTOR_CONCENTRATION_WARN * 100}%`,
      currentValue: `分包商占比=${(ratio * 100).toFixed(1)}%`,
      thresholdValue: `阈值: >${RISK_CONFIG.SUBCONTRACTOR_CONCENTRATION_WARN * 100}%`,
    };
  }

  return null;
}

/**
 * 聚合风险统计数据
 */
export function aggregateRiskStats(results: RiskResult[]) {
  return {
    totalProjects: results.length,
    highRiskCount: results.filter(r => r.overallRisk === 'high').length,
    mediumRiskCount: results.filter(r => r.overallRisk === 'medium').length,
    lowRiskCount: results.filter(r => r.overallRisk === 'low').length,
    highRiskProjects: results.filter(r => r.overallRisk === 'high').map(r => r.projectName),
    mediumRiskProjects: results.filter(r => r.overallRisk === 'medium').map(r => r.projectName),
  };
}
