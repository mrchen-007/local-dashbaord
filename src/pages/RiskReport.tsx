// 风险报告页面
// 显示风险汇总详情，支持一键生成 Word 报告和导出 Excel 风险清单

import { useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { RiskLevel } from '../types';
import { downloadRiskReport } from '../utils/docxReport';
import * as XLSX from 'xlsx';

const RISK_LABELS: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-green-400',
};

const RISK_BG_COLORS: Record<RiskLevel, string> = {
  high: 'bg-red-500/10 border-red-500/30',
  medium: 'bg-amber-500/10 border-amber-500/30',
  low: 'bg-green-500/10 border-green-500/30',
};

interface RiskReportProps {
  projectId?: string | null;
}

export default function RiskReport({ projectId }: RiskReportProps) {
  const { projects, riskResults, riskStats, isLoading, fetchData } = useDataStore();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 如果指定了 projectId，自动展开对应项目
  useEffect(() => {
    if (projectId) {
      setExpandedProject(projectId);
    }
  }, [projectId]);

  const handleDownloadReport = async () => {
    setIsGenerating(true);
    try {
      await downloadRiskReport(projects, riskResults);
    } catch (err: any) {
      console.error('报告生成失败:', err);
      alert(`报告生成失败: ${err.message || err}`);
    }
    setIsGenerating(false);
  };

  const handleExportExcel = () => {
    // 使用 xlsx 库导出风险清单
    const workbook = XLSX.utils.book_new();

    // 风险总览表
    const overviewData = [
      { '风险等级': '高风险', '项目数量': riskStats.highRiskCount, '占比': `${((riskStats.highRiskCount / Math.max(riskStats.totalProjects, 1)) * 100).toFixed(1)}%` },
      { '风险等级': '中风险', '项目数量': riskStats.mediumRiskCount, '占比': `${((riskStats.mediumRiskCount / Math.max(riskStats.totalProjects, 1)) * 100).toFixed(1)}%` },
      { '风险等级': '低风险', '项目数量': riskStats.lowRiskCount, '占比': `${((riskStats.lowRiskCount / Math.max(riskStats.totalProjects, 1)) * 100).toFixed(1)}%` },
      { '风险等级': '合计', '项目数量': riskStats.totalProjects, '占比': '100%' },
    ];
    const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, '风险总览');

    // 项目风险清单
    const projectData = projects.map(p => {
      const risk = riskResults.find(r => r.projectId === p.id);
      return {
        '项目名称': p.name,
        '合同编号': p.contractNo,
        '合同金额(万)': (p.contractAmount / 10000).toFixed(2),
        '总成本(万)': (p.totalCost / 10000).toFixed(2),
        '结算金额(万)': (p.settlementAmount / 10000).toFixed(2),
        '预估毛利率': `${(p.estimatedProfitRate * 100).toFixed(1)}%`,
        '实际毛利率': `${(p.actualProfitRate * 100).toFixed(1)}%`,
        '风险等级': RISK_LABELS[p.riskLevel],
        '触发规则数': risk?.riskDetails.length || 0,
        '高风险规则': risk?.highCount || 0,
        '中风险规则': risk?.mediumCount || 0,
      };
    });
    const projectSheet = XLSX.utils.json_to_sheet(projectData);
    XLSX.utils.book_append_sheet(workbook, projectSheet, '项目风险清单');

    // 风险详情明细
    const detailData: any[] = [];
    riskResults.forEach(r => {
      r.riskDetails.forEach(d => {
        detailData.push({
          '项目名称': r.projectName,
          '风险规则': d.ruleName,
          '规则代码': d.ruleCode,
          '风险等级': RISK_LABELS[d.level],
          '当前值': d.currentValue,
          '阈值': d.thresholdValue,
          '描述': d.description,
        });
      });
    });
    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, '风险详情');

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `风险清单_${timestamp}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* 标题区 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">风险报告</h2>
          <p className="text-gray-400 text-sm mt-1">项目风险详情与报告导出</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出 Excel 风险清单
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={isGenerating}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isGenerating ? '生成中...' : '一键生成 Word 报告'}
          </button>
        </div>
      </div>

      {/* 风险概览 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-400 mb-1">总项目数</div>
          <div className="text-3xl font-bold text-white">{riskStats.totalProjects}</div>
        </div>
        <div className="card border-red-500/20">
          <div className="text-sm text-red-400 mb-1">高风险</div>
          <div className="text-3xl font-bold text-red-400">{riskStats.highRiskCount}</div>
          <div className="text-xs text-gray-500 mt-1">需要立即处理</div>
        </div>
        <div className="card border-amber-500/20">
          <div className="text-sm text-amber-400 mb-1">中风险</div>
          <div className="text-3xl font-bold text-amber-400">{riskStats.mediumRiskCount}</div>
          <div className="text-xs text-gray-500 mt-1">需要关注</div>
        </div>
        <div className="card border-green-500/20">
          <div className="text-sm text-green-400 mb-1">低风险</div>
          <div className="text-3xl font-bold text-green-400">{riskStats.lowRiskCount}</div>
          <div className="text-xs text-gray-500 mt-1">运行正常</div>
        </div>
      </div>

      {/* 规则说明 */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">风险规则说明</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { code: 'OVER_PAYMENT', name: '超结算风险', desc: '累计已付款超过结算金额的比例' },
            { code: 'COST_OVERRUN', name: '成本倒挂风险', desc: '项目总成本超过合同金额的比例' },
            { code: 'SCHEDULE_OVERDUE', name: '工期超期风险', desc: '项目未按计划竣工日期完成' },
            { code: 'COST_DEVIATION', name: '成本偏差异常', desc: '单项成本占比超过基准值' },
            { code: 'WARRANTY_RISK', name: '质保金回收风险', desc: '质保金到期但未收回' },
            { code: 'SUBCONTRACTOR_CONCENTRATION', name: '分包商集中度风险', desc: '单一分包商合同金额超过总成本50%' },
          ].map(rule => (
            <div key={rule.code} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="font-medium text-white text-sm">{rule.name}</div>
              <div className="text-xs text-gray-400 mt-1">{rule.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 项目风险详情 */}
      <div className="space-y-4">
        {riskResults.map((result, idx) => {
          const project = projects.find(p => p.id === result.projectId);
          const isExpanded = expandedProject === result.projectId;

          return (
            <div key={result.projectId} className="card overflow-hidden">
              {/* 项目标题行 */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpandedProject(isExpanded ? null : result.projectId)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 text-sm w-6">{idx + 1}</span>
                  <div>
                    <div className="text-white font-medium">{result.projectName}</div>
                    {project && (
                      <div className="text-xs text-gray-500">{project.contractNo}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {result.highCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                        {result.highCount}高
                      </span>
                    )}
                    {result.mediumCount > 0 && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                        {result.mediumCount}中
                      </span>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    result.overallRisk === 'high' ? 'bg-red-500/20 text-red-400' :
                    result.overallRisk === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {RISK_LABELS[result.overallRisk]}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* 展开详情 */}
              {isExpanded && (
                <div className="border-t border-gray-700 p-4">
                  {/* 项目基本信息 */}
                  {project && (
                    <div className="grid grid-cols-5 gap-4 mb-4 text-sm">
                      <div><span className="text-gray-500">合同金额：</span><span className="text-white">{(project.contractAmount / 10000).toFixed(2)}万</span></div>
                      <div><span className="text-gray-500">总成本：</span><span className="text-white">{(project.totalCost / 10000).toFixed(2)}万</span></div>
                      <div><span className="text-gray-500">结算金额：</span><span className="text-white">{(project.settlementAmount / 10000).toFixed(2)}万</span></div>
                      <div><span className="text-gray-500">预估毛利率：</span><span className={project.estimatedProfitRate >= 0 ? 'text-green-400' : 'text-red-400'}>{(project.estimatedProfitRate * 100).toFixed(1)}%</span></div>
                      <div><span className="text-gray-500">实际毛利率：</span><span className={project.actualProfitRate >= 0 ? 'text-green-400' : 'text-red-400'}>{(project.actualProfitRate * 100).toFixed(1)}%</span></div>
                    </div>
                  )}

                  {/* 风险详情列表 */}
                  {result.riskDetails.length > 0 ? (
                    <div className="space-y-2">
                      {result.riskDetails.map((detail, di) => (
                        <div
                          key={di}
                          className={`p-3 rounded-lg border ${RISK_BG_COLORS[detail.level]}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-white">{detail.ruleName}</span>
                            <span className={`text-xs font-medium ${RISK_COLORS[detail.level]}`}>
                              {RISK_LABELS[detail.level]}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{detail.description}</p>
                          <div className="flex gap-4 mt-1 text-xs">
                            <span className="text-gray-500">当前值: <span className="text-gray-300">{detail.currentValue}</span></span>
                            <span className="text-gray-500">阈值: <span className="text-gray-300">{detail.thresholdValue}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-green-400">未触发任何风险规则，项目运行正常。</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {riskResults.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>暂无风险数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
