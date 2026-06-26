// 风险报告页面
// 显示风险汇总详情，支持一键生成 Word 报告和导出 Excel 风险清单

import { useEffect, useState } from 'react';
import { useDataStore } from './dataStore';
import { RiskLevel } from '../shared/types';
import { downloadRiskReport } from './docxReport';
import * as XLSX from 'xlsx';

const RISK_LABELS: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

const RISK_RULES_CONFIG = [
  { code: 'R001', name: '超结算风险', desc: '累计已付款超过结算金额一定比例时触发' },
  { code: 'R002', name: '成本倒挂风险', desc: '总成本接近或超过合同金额时触发' },
  { code: 'R003', name: '工期超期风险', desc: '超过计划竣工日期或进度严重滞后时触发' },
  { code: 'R004', name: '成本偏差异常', desc: '人工/材料/设备成本占比异常时触发' },
  { code: 'R005', name: '质保金回收风险', desc: '质保金到期未收回时触发' },
  { code: 'R006', name: '分包商集中度风险', desc: '单一分包商占比过高时触发' },
];

interface RiskReportProps {
  projectId?: string | null;
}

export default function RiskReport({ projectId }: RiskReportProps) {
  const { projects, riskResults, fetchData } = useDataStore();
  const [expandedProject, setExpandedProject] = useState<string | null>(projectId || null);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (projectId) setExpandedProject(projectId);
  }, [projectId]);

  // 生成 Word 报告
  const handleGenerateWordReport = async () => {
    try {
      await downloadRiskReport(projects, riskResults);
    } catch (err) {
      console.error('生成报告失败:', err);
      alert('生成报告失败，请查看控制台日志');
    }
  };

  // 导出 Excel 风险清单
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const data = projects.map(p => {
      const risk = riskResults.find(r => r.projectId === p.id);
      return {
        '项目名称': p.name,
        '合同编号': p.contractNo,
        '合同金额': p.contractAmount,
        '总成本': p.totalCost,
        '结算金额': p.settlementAmount,
        '已付款': p.totalPaid,
        '预估毛利率': p.estimatedProfitRate,
        '实际毛利率': p.actualProfitRate,
        '计划竣工': p.plannedEndDate,
        '当前进度': `${p.progressPercent}%`,
        '风险等级': risk ? RISK_LABELS[risk.overallRisk] : '-',
        '高风险规则数': risk?.highCount || 0,
        '中风险规则数': risk?.mediumCount || 0,
      };
    });

    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, '风险清单');
    XLSX.writeFile(workbook, `风险清单_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (projects.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">加载中...</div>
      </div>
    );
  }

  const highCount = riskResults.filter(r => r.overallRisk === 'high').length;
  const mediumCount = riskResults.filter(r => r.overallRisk === 'medium').length;
  const lowCount = riskResults.filter(r => r.overallRisk === 'low').length;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">风险报告</h2>
          <p className="text-gray-400 mt-1">项目风险分析与评估报告</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateWordReport}
            className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            生成 Word 报告
          </button>
          <button
            onClick={handleExportExcel}
            className="px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出 Excel
          </button>
        </div>
      </div>

      {/* 风险总览卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-gray-400">总项目数</div>
          <div className="text-2xl font-bold text-white mt-1">{projects.length}</div>
        </div>
        <div className="card border-l-4" style={{ borderLeftColor: '#ef4444' }}>
          <div className="text-sm text-gray-400">高风险</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{highCount}</div>
        </div>
        <div className="card border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="text-sm text-gray-400">中风险</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{mediumCount}</div>
        </div>
        <div className="card border-l-4" style={{ borderLeftColor: '#10b981' }}>
          <div className="text-sm text-gray-400">低风险</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{lowCount}</div>
        </div>
      </div>

      {/* 风险规则说明 */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">风险规则说明</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {RISK_RULES_CONFIG.map(rule => (
            <div key={rule.code} className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-sm font-medium text-white">{rule.code} {rule.name}</div>
              <div className="text-xs text-gray-400 mt-1">{rule.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 项目风险详情 */}
      <div className="space-y-4">
        {riskResults.filter(r => r.overallRisk !== 'low').map((risk, i) => {
          const isExpanded = expandedProject === risk.projectId;
          return (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setExpandedProject(isExpanded ? null : risk.projectId)}
                className="w-full flex justify-between items-center p-4 hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: RISK_COLORS[risk.overallRisk] }} />
                  <span className="font-medium text-white">{risk.projectName}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium`}
                    style={{ backgroundColor: RISK_COLORS[risk.overallRisk] + '20', color: RISK_COLORS[risk.overallRisk] }}>
                    {RISK_LABELS[risk.overallRisk]}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">
                    {risk.highCount}高 / {risk.mediumCount}中 / {risk.lowCount}低
                  </span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-700">
                  <div className="mt-4 space-y-3">
                    {risk.riskDetails.map((detail, j) => (
                      <div key={j} className={`p-3 rounded-lg border ${
                        detail.level === 'high' ? 'border-red-900/50 bg-red-900/10' :
                        detail.level === 'medium' ? 'border-amber-900/50 bg-amber-900/10' :
                        'border-green-900/50 bg-green-900/10'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-400">{detail.ruleCode}</span>
                          <span className="font-medium text-white">{detail.ruleName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            detail.level === 'high' ? 'bg-red-900 text-red-400' :
                            detail.level === 'medium' ? 'bg-amber-900 text-amber-400' :
                            'bg-green-900 text-green-400'
                          }`}>
                            {RISK_LABELS[detail.level]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{detail.description}</p>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                          <span>当前值: {detail.currentValue}</span>
                          <span>{detail.thresholdValue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {riskResults.filter(r => r.overallRisk !== 'low').length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg">所有项目均处于低风险状态</p>
          </div>
        )}
      </div>
    </div>
  );
}
