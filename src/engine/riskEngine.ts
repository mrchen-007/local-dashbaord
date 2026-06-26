// 风险引擎
// 实现 6 条风险规则，基于项目数据计算风险等级
// 阈值从 config.ts 读取

import { Project, RiskResult, RiskDetail, RiskLevel } from '../types';
import { RISK_CONFIG } from '../config';

/**
 * 计算项目的整体风险等级
 * 取所有规则中的最高等级
 */
function getOverallRisk(details: RiskDetail[]): RiskLevel {
  if (details.some(d => d.level === 'high')) return 'high';
  if (details.some(d => d.level === 'medium')) return 'medium';
  return 'low';
}

/**
 * 规则1: 超结算风险
 * 累计已付款 > 结算金额 × 1.05 → 高
 * 累计已付款 > 结算金额 → 中
 */
function checkOverPayment(project: Project): RiskDetail | null {
  if (!project.settlementAmount || project.settlementAmount <= 0) return null;

  const ratio = project.totalPaid / project.settlementAmount;

  if (ratio > RISK_CONFIG.OVER_PAYMENT_RATIO_HIGH) {
    return {
      ruleCode: 'OVER_PAYMENT',
      ruleName: '超结算风险',
      level: 'high',
      description: `累计已付款(${project.totalPaid.toFixed(2)})超过结算金额(${project.settlementAmount.toFixed(2)})的 ${(RISK_CONFIG.OVER_PAYMENT_RATIO_HIGH * 100).toFixed(0)}%`,
      currentValue: `已付/结算 = ${(ratio * 100).toFixed(1)}%`,
      thresholdValue: `> ${(RISK_CONFIG.OVER_PAYMENT_RATIO_HIGH * 100).toFixed(0)}%`,
    };
  }

  if (ratio > RISK_CONFIG.OVER_PAYMENT_RATIO_MEDIUM) {
    return {
      ruleCode: 'OVER_PAYMENT',
      ruleName: '超结算风险',
      level: 'medium',
      description: `累计已付款(${project.totalPaid.toFixed(2)})已超过结算金额(${project.settlementAmount.toFixed(2)})`,
      currentValue: `已付/结算 = ${(ratio * 100).toFixed(1)}%`,
      thresholdValue: `> ${(RISK_CONFIG.OVER_PAYMENT_RATIO_MEDIUM * 100).toFixed(0)}%`,
    };
  }

  return null;
}

/**
 * 规则2: 成本倒挂风险
 * 总成本 > 合同金额 → 高
 * 总成本 > 合同金额 × 0.95 → 中
 */
function checkCostOverrun(project: Project): RiskDetail | null {
  if (!project.contractAmount || project.contractAmount <= 0) return null;

  const ratio = project.totalCost / project.contractAmount;

  if (ratio > RISK_CONFIG.COST_OVERRUN_HIGH) {
    return {
      ruleCode: 'COST_OVERRUN',
      ruleName: '成本倒挂风险',
      level: 'high',
      description: `总成本(${project.totalCost.toFixed(2)})已超过合同金额(${project.contractAmount.toFixed(2)})`,
      currentValue: `成本/合同 = ${(ratio * 100).toFixed(1)}%`,
      thresholdValue: `> ${(RISK_CONFIG.COST_OVERRUN_HIGH * 100).toFixed(0)}%`,
    };
  }

  if (ratio > RISK_CONFIG.COST_OVERRUN_MEDIUM) {
    return {
      ruleCode: 'COST_OVERRUN',
      ruleName: '成本倒挂风险',
      level: 'medium',
      description: `总成本(${project.totalCost.toFixed(2)})接近合同金额(${project.contractAmount.toFixed(2)})的 ${(RISK_CONFIG.COST_OVERRUN_MEDIUM * 100).toFixed(0)}%`,
      currentValue: `成本/合同 = ${(ratio * 100).toFixed(1)}%`,
      thresholdValue: `> ${(RISK_CONFIG.COST_OVERRUN_MEDIUM * 100).toFixed(0)}%`,
    };
  }

  return null;
}

/**
 * 规则3: 工期超期风险
 * 当前日期 > 计划竣工日期 → 高
 * 计划竣工日期前30天，进度<90% → 中
 */
function checkScheduleOverdue(project: Project): RiskDetail | null {
  if (!project.plannedEndDate) return null;

  const now = new Date();
  const plannedEnd = new Date(project.plannedEndDate);
  const diffDays = Math.floor((now.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24));

  // 已超过计划竣工日期
  if (diffDays >= RISK_CONFIG.SCHEDULE_OVERDUE_HIGH) {
    return {
      ruleCode: 'SCHEDULE_OVERDUE',
      ruleName: '工期超期风险',
      level: 'high',
      description: `当前日期已超过计划竣工日期(${project.plannedEndDate}) ${diffDays}天`,
      currentValue: `超期 ${diffDays} 天`,
      thresholdValue: `计划竣工日期: ${project.plannedEndDate}`,
    };
  }

  // 距离计划竣工日期不足30天，但进度<90%
  if (
    diffDays >= RISK_CONFIG.SCHEDULE_OVERDUE_MEDIUM &&
    (project.progressPercent || 0) < RISK_CONFIG.SCHEDULE_PROGRESS_THRESHOLD
  ) {
    return {
      ruleCode: 'SCHEDULE_OVERDUE',
      ruleName: '工期超期风险',
      level: 'medium',
      description: `距离计划竣工日期(${project.plannedEndDate})不足 ${Math.abs(RISK_CONFIG.SCHEDULE_OVERDUE_MEDIUM)}天，当前进度仅 ${(project.progressPercent * 100).toFixed(0)}%`,
      currentValue: `进度 ${(project.progressPercent * 100).toFixed(0)}%`,
      thresholdValue: `进度 > ${(RISK_CONFIG.SCHEDULE_PROGRESS_THRESHOLD * 100).toFixed(0)}%`,
    };
  }

  return null;
}

/**
 * 规则4: 成本偏差异常
 * 人工成本占比 > 40% → 中
 * 材料成本占比 > 60% → 中
 * 设备成本占比 > 30% → 中
 */
function checkCostDeviation(project: Project): RiskDetail | null {
  if (!project.totalCost || project.totalCost <= 0) return null;

  const laborRatio = project.laborCost / project.totalCost;
  const materialRatio = project.materialCost / project.totalCost;
  const equipmentRatio = project.equipmentCost / project.totalCost;

  const warnings: string[] = [];

  if (laborRatio > RISK_CONFIG.LABOR_COST_RATIO_WARN) {
    warnings.push(`人工成本占比 ${(laborRatio * 100).toFixed(1)}%（阈值 ${(RISK_CONFIG.LABOR_COST_RATIO_WARN * 100).toFixed(0)}%）`);
  }
  if (materialRatio > RISK_CONFIG.MATERIAL_COST_RATIO_WARN) {
    warnings.push(`材料成本占比 ${(materialRatio * 100).toFixed(1)}%（阈值 ${(RISK_CONFIG.MATERIAL_COST_RATIO_WARN * 100).toFixed(0)}%）`);
  }
  if (equipmentRatio > RISK_CONFIG.EQUIPMENT_COST_RATIO_WARN) {
    warnings.push(`设备成本占比 ${(equipmentRatio * 100).toFixed(1)}%（阈值 ${(RISK_CONFIG.EQUIPMENT_COST_RATIO_WARN * 100).toFixed(0)}%）`);
  }

  if (warnings.length > 0) {
    return {
      ruleCode: 'COST_DEVIATION',
      ruleName: '成本偏差异常',
      level: 'medium',
      description: warnings.join('；'),
      currentValue: warnings.join('；'),
      thresholdValue: `人工≤${(RISK_CONFIG.LABOR_COST_RATIO_WARN * 100).toFixed(0)}%，材料≤${(RISK_CONFIG.MATERIAL_COST_RATIO_WARN * 100).toFixed(0)}%，设备≤${(RISK_CONFIG.EQUIPMENT_COST_RATIO_WARN * 100).toFixed(0)}%`,
    };
  }

  return null;
}

/**
 * 规则5: 质保金回收风险
 * 质保金到期未收回 → 高
 */
function checkWarrantyRisk(project: Project): RiskDetail | null {
  if (!project.warrantyDueDate) return null;

  const now = new Date();
  const dueDate = new Date(project.warrantyDueDate);

  if (dueDate <= now) {
    return {
      ruleCode: 'WARRANTY_RISK',
      ruleName: '质保金回收风险',
      level: 'high',
      description: `质保金已到期(${project.warrantyDueDate})，质保金比例 ${(project.warrantyRatio * 100).toFixed(1)}%`,
      currentValue: `到期日: ${project.warrantyDueDate}`,
      thresholdValue: `应 < 当前日期`,
    };
  }

  return null;
}

/**
 * 规则6: 分包商集中度风险
 * 单分包商金额 > 总成本 50% → 中
 */
function checkSubcontractorConcentration(project: Project): RiskDetail | null {
  if (!project.totalCost || project.totalCost <= 0 || !project.mainSubcontractorAmount) return null;

  const ratio = project.mainSubcontractorAmount / project.totalCost;

  if (ratio > RISK_CONFIG.SUBCONTRACTOR_CONCENTRATION_WARN) {
    return {
      ruleCode: 'SUBCONTRACTOR_CONCENTRATION',
      ruleName: '分包商集中度风险',
      level: 'medium',
      description: `分包商"${project.mainSubcontractor}"合同金额(${project.mainSubcontractorAmount.toFixed(2)})占总成本(${project.totalCost.toFixed(2)})的 ${(ratio * 100).toFixed(1)}%`,
      currentValue: `占比 ${(ratio * 100).toFixed(1)}%`,
      thresholdValue: `≤ ${(RISK_CONFIG.SUBCONTRACTOR_CONCENTRATION_WARN * 100).toFixed(0)}%`,
    };
  }

  return null;
}

/**
 * 计算一组项目的风险
 * @param projects 项目数据数组
 * @returns 每个项目的风险计算结果
 */
export function calculateRisks(projects: Project[]): RiskResult[] {
  return projects.map(project => {
    const details: RiskDetail[] = [];

    // 执行所有 6 条风险规则
    const rules = [
      checkOverPayment,
      checkCostOverrun,
      checkScheduleOverdue,
      checkCostDeviation,
      checkWarrantyRisk,
      checkSubcontractorConcentration,
    ];

    for (const rule of rules) {
      const result = rule(project);
      if (result) {
        details.push(result);
      }
    }

    const overallRisk = getOverallRisk(details);
    const highCount = details.filter(d => d.level === 'high').length;
    const mediumCount = details.filter(d => d.level === 'medium').length;
    const lowCount = details.filter(d => d.level === 'low').length;

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
 * 将风险结果分组统计
 */
export function aggregateRiskStats(results: RiskResult[]) {
  return {
    totalProjects: results.length,
    highRiskCount: results.filter(r => r.overallRisk === 'high').length,
    mediumRiskCount: results.filter(r => r.overallRisk === 'medium').length,
    lowRiskCount: results.filter(r => r.overallRisk === 'low').length,
    totalRiskItems: results.reduce((sum, r) => sum + r.riskDetails.length, 0),
  };
}
