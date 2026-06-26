// 数据看板页面
// 展示风险概览、项目列表、成本构成和风险分布图表
// 使用 recharts 库实现图表

import { useEffect, useState, useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { RiskLevel, Project } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import UpdateBar from '../components/UpdateBar';

// unused - kept for reference
// const _RISK_COLORS = {
//   high: '#ef4444',
//   medium: '#f59e0b',
//   low: '#10b981',
// };

const RISK_LABELS: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

// 统计卡片组件
function StatCard({ title, value, color, subtitle }: { title: string; value: string | number; color: string; subtitle?: string }) {
  return (
    <div className="stat-card group">
      <div className="text-sm text-gray-400 mb-1">{title}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

// 风险等级标签组件
function RiskBadge({ level }: { level: RiskLevel }) {
  const colors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[level]}`}>
      {RISK_LABELS[level]}
    </span>
  );
}

// 成本构成饼图
function CostPieChart({ project }: { project: Project }) {
  const data = [
    { name: '人工成本', value: project.laborCost, color: '#0ea5e9' },
    { name: '材料成本', value: project.materialCost, color: '#10b981' },
    { name: '设备成本', value: project.equipmentCost, color: '#f59e0b' },
    { name: '分包金额', value: project.subcontractAmount, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          {/* 使用 recharts 的 PieChart 实现 */}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            formatter={(value: any) => typeof value === 'number' ? value.toLocaleString('zh-CN') : value}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// 风险等级分布柱状图
function RiskBarChart({ riskStats }: { riskStats: { highRiskCount: number; mediumRiskCount: number; lowRiskCount: number } }) {
  const data = [
    { name: '高风险', count: riskStats.highRiskCount, color: '#ef4444' },
    { name: '中风险', count: riskStats.mediumRiskCount, color: '#f59e0b' },
    { name: '低风险', count: riskStats.lowRiskCount, color: '#10b981' },
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        {/* 使用 recharts 的 BarChart 实现 */}
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
        <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
        />
        <Bar dataKey="count" name="项目数" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const { projects, riskStats, isLoading, error, fetchData } = useDataStore();
  const [filterLevel, setFilterLevel] = useState<RiskLevel | 'all'>('all');
  const [searchText, setSearchText] = useState('');

  // 首次加载数据
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 筛选后的项目列表
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (filterLevel !== 'all' && p.riskLevel !== filterLevel) return false;
      if (searchText && !p.name.includes(searchText)) return false;
      return true;
    });
  }, [projects, filterLevel, searchText]);

  // 计算毛利率（保留未使用）
  // const calcProfitRate = (p: Project) =>
  //   p.settlementAmount ? (((p.settlementAmount - p.totalCost) / p.settlementAmount) * 100).toFixed(1) : '0.0';

  // 格式化金额
  const fmtMoney = (v: number) =>
    v >= 10000 ? `${(v / 10000).toFixed(2)}万` : v.toFixed(2);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-red-400">
          <h3 className="text-lg font-bold mb-2">加载失败</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* 热更新提示条 */}
      <UpdateBar />

      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">数据看板</h2>
          <p className="text-gray-400 text-sm mt-1">工程项目风险监控与数据分析</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新数据
        </button>
      </div>

      {/* 风险概览卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard title="总项目数" value={riskStats.totalProjects} color="text-white" subtitle="当前监控项目" />
        <StatCard title="高风险" value={riskStats.highRiskCount} color="text-red-400" subtitle="需要立即处理" />
        <StatCard title="中风险" value={riskStats.mediumRiskCount} color="text-amber-400" subtitle="需要关注" />
        <StatCard title="低风险" value={riskStats.lowRiskCount} color="text-green-400" subtitle="运行正常" />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">成本构成分析</h3>
          {projects.length > 0 && <CostPieChart project={projects[0]} />}
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">风险等级分布</h3>
          <RiskBarChart riskStats={riskStats} />
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜索项目名称..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'high', 'medium', 'low'] as const).map(level => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterLevel === level
                  ? level === 'all'
                    ? 'bg-primary text-white'
                    : level === 'high'
                    ? 'bg-red-500 text-white'
                    : level === 'medium'
                    ? 'bg-amber-500 text-white'
                    : 'bg-green-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {level === 'all' ? '全部' : RISK_LABELS[level]}
            </button>
          ))}
        </div>
      </div>

      {/* 项目列表表格 */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">项目名称</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">合同金额</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">总成本</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">结算收入</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">预估毛利率</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">实际毛利率</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">风险等级</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    暂无匹配的项目数据
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => {
                    return (
                    <tr
                      key={project.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <div className="text-white font-medium">{project.name}</div>
                        <div className="text-xs text-gray-500">{project.contractNo}</div>
                      </td>
                      <td className="px-4 py-4 text-right text-white">{fmtMoney(project.contractAmount)}</td>
                      <td className="px-4 py-4 text-right text-white">{fmtMoney(project.totalCost)}</td>
                      <td className="px-4 py-4 text-right text-white">{fmtMoney(project.settlementAmount)}</td>
                      <td className={`px-4 py-4 text-right ${project.estimatedProfitRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(project.estimatedProfitRate * 100).toFixed(1)}%
                      </td>
                      <td className={`px-4 py-4 text-right ${project.actualProfitRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(project.actualProfitRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-4 text-center">
                        <RiskBadge level={project.riskLevel} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          className="text-primary hover:text-primary-light text-sm transition-colors"
                          onClick={() => {
                            // 跳转到风险报告页的逻辑（通过 App.tsx 的 setCurrentPage）
                            // 这里通过 URL hash 或全局事件传递
                            window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'risk-report', projectId: project.id } }));
                          }}
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
