// 风险引擎阈值配置
// 所有风险计算阈值在此集中管理，支持运行时调整

export const RISK_CONFIG = {
  // 超结算风险
  OVER_PAYMENT_RATIO_HIGH: 1.05,    // 累计已付款 > 结算金额 × 1.05 → 高
  OVER_PAYMENT_RATIO_MEDIUM: 1.0,   // 累计已付款 > 结算金额 × 1.0 → 中

  // 成本倒挂风险
  COST_OVERRUN_HIGH: 1.0,           // 总成本 > 合同金额 → 高
  COST_OVERRUN_MEDIUM: 0.95,        // 总成本 > 合同金额 × 0.95 → 中

  // 成本偏差异常
  LABOR_COST_RATIO_WARN: 0.4,       // 人工成本占比 > 40% → 中
  MATERIAL_COST_RATIO_WARN: 0.6,    // 材料成本占比 > 60% → 中
  EQUIPMENT_COST_RATIO_WARN: 0.3,   // 设备成本占比 > 30% → 中

  // 分包商集中度风险
  SUBCONTRACTOR_CONCENTRATION_WARN: 0.5, // 单分包商金额 > 总成本 50% → 中

  // 工期超期风险
  SCHEDULE_OVERDUE_DAYS_HIGH: 0,         // 已过计划竣工日期 → 高
  SCHEDULE_OVERDUE_DAYS_MEDIUM: -30,     // 距竣工不足30天且进度<90% → 中

  // 热更新轮询间隔
  POLLING_INTERVAL_MS: 30000,    // 30秒

  // 风险规则元数据
  RISK_RULES: [
    { code: 'R001', name: '超结算风险', description: '累计已付款超过结算金额' },
    { code: 'R002', name: '成本倒挂风险', description: '总成本超过合同金额' },
    { code: 'R003', name: '工期超期风险', description: '超过计划竣工日期' },
    { code: 'R004', name: '成本偏差异常', description: '单项成本占比异常' },
    { code: 'R005', name: '质保金回收风险', description: '质保金到期未收回' },
    { code: 'R006', name: '分包商集中度风险', description: '单分包商占比过高' },
  ] as const,
};
