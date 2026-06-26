// 数据看板页面
// 展示风险概览、项目列表、成本构成和风险分布图表
// 使用 recharts 库实现图表

import { useEffect, useState, useMemo } from 'react';
import { useDataStore } from './dataStore';
import { RiskLevel, Project } from '../shared/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import UpdateBar from './UpdateBar';

// 风险等级颜色映射
const RISK_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

const RISK_LABELS: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

// 统计卡片子组件
function StatCard({ title, value, color, icon }: { title: string; value: string | number; color: string; icon?: React.ReactNode }) {
  return (
    <div className="card flex items-center gap-4">
      {icon && <div className={`p-3 rounded-lg`} style={{ backgroundColor: color + '20' }}>{icon}</div>}
      <div>
        <div className="text-sm text-gray-400">{title}</div>
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}

// 风险等级标签子组件
function RiskBadge({ level }: { level: RiskLevel | string }) {
  const label = RISK_LABELS[level] || RISK_LABELS['low'];
  const color = RISK_COLORS[level] || RISK_COLORS['low'];
  return (
    <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: color + '20', color }}>
      {label}
    </span>
  );
}

// 成本构成饼图
function CostPieChart({ project }: { project: Project }) {
  const data = [
    { name: '人工成本', value: project.laborCost },
    { name: '材料成本', value: project.materialCost },
    { name: '设备成本', value: project.equipmentCost },
    { name: '分包成本', value: project.subcontractAmount },
  ];

  const PIE_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// 风险等级分布柱状图
function RiskBarChart({ projects }: { projects: Project[] }) {
  const data = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    projects.forEach(p => {
      if (p.riskLevel === 'high') counts.high++;
      else if (p.riskLevel === 'medium') counts.medium++;
      else counts.low++;
    });
    return [
      { name: '高风险', count: counts.high, fill: '#ef4444' },
      { name: '中风险', count: counts.medium, fill: '#f59e0b' },
      { name: '低风险', count: counts.low, fill: '#10b981' },
    ];
  }, [projects]);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          />
          <Bar dataKey="count" name="项目数" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const { projects, riskResults, riskStats, isLoading, fetchData } = useDataStore();
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // 初始化加载数据
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 筛选后的项目列表
  const filteredProjects = useMemo(() => {
    let list = projects;

    // 按风险等级筛选
    if (filterRisk !== 'all') {
      list = list.filter(p => p.riskLevel === filterRisk);
    }

    // 按项目名称搜索
    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(keyword));
    }

    return list;
  }, [projects, filterRisk, searchText]);

  if (isLoading && projects.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* 热更新提示条 */}
      <UpdateBar />

      <h2 className="text-2xl font-bold mb-6 text-white">数据看板</h2>
      <p className="text-gray-400 mb-6">工程项目风险监控与数据分析</p>

      {/* 风险概览卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="总项目数"
          value={riskStats.totalProjects}
          color="#0ea5e9"
          icon={
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          title="高风险"
          value={riskStats.highRiskCount}
          color="#ef4444"
          icon={
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
        />
        <StatCard
          title="中风险"
          value={riskStats.mediumRiskCount}
          color="#f59e0b"
          icon={
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="低风险"
          value={riskStats.lowRiskCount}
          color="#10b981"
          icon={
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* 筛选栏 */}
      <div className="card mb-6">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm text-gray-400 mb-1">风险等级</label>
            <select
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
              className="p-2 rounded bg-gray-800 border border-gray-700 text-gray-300"
            >
              <option value="all">全部</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">搜索项目</label>
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="输入项目名称..."
              className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-300"
            />
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-white">成本构成（首项目示例）</h3>
          {filteredProjects.length > 0 && <CostPieChart project={filteredProjects[0]} />}
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-white">风险等级分布</h3>
          <RiskBarChart projects={projects} />
        </div>
      </div>

      {/* 项目列表 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-white">项目列表</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">项目名称</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">合同金额</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">总成本</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">结算收入</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">预估毛利率</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">实际毛利率</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">风险等级</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project, i) => {
                const risk = riskResults.find(r => r.projectId === project.id);
                return (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-white font-medium">{project.name}</td>
                    <td className="py-3 px-4 text-gray-300 text-right">{(project.contractAmount / 10000).toFixed(0)}万</td>
                    <td className="py-3 px-4 text-gray-300 text-right">{(project.totalCost / 10000).toFixed(0)}万</td>
                    <td className="py-3 px-4 text-gray-300 text-right">{(project.settlementAmount / 10000).toFixed(0)}万</td>
                    <td className="py-3 px-4 text-gray-300 text-right">{(project.estimatedProfitRate * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-gray-300 text-right">{(project.actualProfitRate * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-center">
                      <RiskBadge level={risk?.overallRisk || project.riskLevel} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('navigate', {
                            detail: { page: 'risk-report', projectId: project.id },
                          }));
                        }}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-xs"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    无匹配项目
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
