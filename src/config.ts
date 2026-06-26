// 风险引擎阈值配置
// 所有风险计算阈值在此集中管理，支持运行时调整

export const RISK_CONFIG = {
  // 超结算风险
  OVER_PAYMENT_RATIO_HIGH: 1.05,    // 累计已付款 > 结算金额 × 1.05 → 高风险
  OVER_PAYMENT_RATIO_MEDIUM: 1.0,   // 累计已付款 > 结算金额 → 中风险

  // 成本倒挂风险
  COST_OVERRUN_HIGH: 1.0,           // 总成本 > 合同金额 → 高风险
  COST_OVERRUN_MEDIUM: 0.95,        // 总成本 > 合同金额 × 0.95 → 中风险

  // 成本偏差异常
  LABOR_COST_RATIO_WARN: 0.4,       // 人工成本占比 > 40% → 中风险
  MATERIAL_COST_RATIO_WARN: 0.6,    // 材料成本占比 > 60% → 中风险
  EQUIPMENT_COST_RATIO_WARN: 0.3,   // 设备成本占比 > 30% → 中风险

  // 分包商集中度风险
  SUBCONTRACTOR_CONCENTRATION_WARN: 0.5, // 单分包商金额 > 总成本 50% → 中风险

  // 工期超期风险
  SCHEDULE_OVERDUE_HIGH: 0,         // 当前日期 > 计划竣工日期 → 高风险（相差天数 >= 0）
  SCHEDULE_OVERDUE_MEDIUM: -30,     // 计划竣工日期前30天，进度<90% → 中风险

  // 质保金回收风险
  WARRANTY_EXPIRED_DAYS: 0,         // 质保金到期日 >= 当前日期 → 高风险

  // 进度阈值
  SCHEDULE_PROGRESS_THRESHOLD: 0.9, // 进度低于 90% 触发预警

  // 热更新轮询间隔（毫秒）
  POLLING_INTERVAL_MS: 30000,
};

// 风险规则元数据
export const RISK_RULES = [
  {
    code: 'OVER_PAYMENT',
    name: '超结算风险',
    description: '累计已付款超过结算金额的约定比例',
    highThreshold: `已付款 > 结算金额 × ${RISK_CONFIG.OVER_PAYMENT_RATIO_HIGH}`,
    mediumThreshold: `已付款 > 结算金额 × ${RISK_CONFIG.OVER_PAYMENT_RATIO_MEDIUM}`,
  },
  {
    code: 'COST_OVERRUN',
    name: '成本倒挂风险',
    description: '项目总成本超过合同金额',
    highThreshold: `总成本 > 合同金额 × ${RISK_CONFIG.COST_OVERRUN_HIGH}`,
    mediumThreshold: `总成本 > 合同金额 × ${RISK_CONFIG.COST_OVERRUN_MEDIUM}`,
  },
  {
    code: 'SCHEDULE_OVERDUE',
    name: '工期超期风险',
    description: '项目未按计划竣工日期完成',
    highThreshold: `当前日期 > 计划竣工日期`,
    mediumThreshold: `计划竣工日期前30天且进度 < ${RISK_CONFIG.SCHEDULE_PROGRESS_THRESHOLD * 100}%`,
  },
  {
    code: 'COST_DEVIATION',
    name: '成本偏差异常',
    description: '单项成本占比超过基准值',
    thresholds: {
      labor: `人工成本 > ${RISK_CONFIG.LABOR_COST_RATIO_WARN * 100}%`,
      material: `材料成本 > ${RISK_CONFIG.MATERIAL_COST_RATIO_WARN * 100}%`,
      equipment: `设备成本 > ${RISK_CONFIG.EQUIPMENT_COST_RATIO_WARN * 100}%`,
    },
  },
  {
    code: 'WARRANTY_RISK',
    name: '质保金回收风险',
    description: '质保金到期但未收回',
    threshold: `质保金到期日已过`,
  },
  {
    code: 'SUBCONTRACTOR_CONCENTRATION',
    name: '分包商集中度风险',
    description: '单一分包商合同金额超过总成本一定比例',
    threshold: `单分包商 > 总成本 × ${RISK_CONFIG.SUBCONTRACTOR_CONCENTRATION_WARN}`,
  },
] as const;
