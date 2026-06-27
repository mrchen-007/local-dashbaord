// 数据网关系映射页面
// 展示合同↔成本↔结算↔进度之间的关联关系

import { useEffect, useState } from 'react';
import { databaseService } from '../shared/database';
import { Project } from '../shared/types';

interface DataNetworkProps {
  selectedProject?: Project | null;
}

interface NetworkNode {
  id: string;
  type: 'contract' | 'cost' | 'settlement' | 'schedule' | 'project';
  label: string;
  value?: number;
  details?: Record<string, any>;
}

interface NetworkEdge {
  from: string;
  to: string;
  label: string;
}

export default function DataNetwork({ selectedProject }: DataNetworkProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [_edges, setEdges] = useState<NetworkEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectNetwork(selectedProject);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      await databaseService.initialize();
      const dbProjects = await databaseService.getProjects();
      setProjects(dbProjects);
    } catch (error) {
      console.error('加载项目失败:', error);
    }
    setIsLoading(false);
  };

  const loadProjectNetwork = async (project: Project) => {
    setIsLoading(true);
    try {
      const projectId = parseInt(project.id.replace('P', ''));
      
      // 获取关联数据
      const contracts = await databaseService.getContracts() || [];
      const payments = await databaseService.getPayments(projectId);
      const subcontractors = await databaseService.getSubcontractors(projectId);
      const schedules = await databaseService.getSchedules(projectId);

      // 构建节点
      const networkNodes: NetworkNode[] = [
        {
          id: `project-${projectId}`,
          type: 'project',
          label: project.name,
          value: project.contractAmount,
          details: {
            contractAmount: project.contractAmount,
            totalCost: project.totalCost,
            profitRate: project.actualProfitRate,
          },
        },
      ];

      // 合同节点
      contracts.forEach((c: any, i: number) => {
        networkNodes.push({
          id: `contract-${projectId}-${i}`,
          type: 'contract',
          label: c.contract_no || `合同 ${i + 1}`,
          value: c.amount,
          details: { partyA: c.party_a, partyB: c.party_b, signDate: c.sign_date },
        });
      });

      // 成本节点
      if (project.laborCost > 0) {
        networkNodes.push({
          id: `cost-labor-${projectId}`,
          type: 'cost',
          label: '人工成本',
          value: project.laborCost,
        });
      }
      if (project.materialCost > 0) {
        networkNodes.push({
          id: `cost-material-${projectId}`,
          type: 'cost',
          label: '材料成本',
          value: project.materialCost,
        });
      }
      if (project.equipmentCost > 0) {
        networkNodes.push({
          id: `cost-equipment-${projectId}`,
          type: 'cost',
          label: '设备成本',
          value: project.equipmentCost,
        });
      }
      if (project.subcontractAmount > 0) {
        networkNodes.push({
          id: `cost-subcontract-${projectId}`,
          type: 'cost',
          label: '分包成本',
          value: project.subcontractAmount,
        });
      }

      // 结算节点
      if (project.settlementAmount > 0) {
        networkNodes.push({
          id: `settlement-${projectId}`,
          type: 'settlement',
          label: '结算',
          value: project.settlementAmount,
          details: { settlementDate: project.settlementDate },
        });
      }

      // 付款节点
      payments.forEach((p: any, i: number) => {
        networkNodes.push({
          id: `payment-${projectId}-${i}`,
          type: 'settlement',
          label: `付款 ${i + 1}`,
          value: p.amount,
          details: { paymentDate: p.payment_date, paymentType: p.payment_type },
        });
      });

      // 分包商节点
      subcontractors.forEach((s: any, i: number) => {
        networkNodes.push({
          id: `subcontractor-${projectId}-${i}`,
          type: 'cost',
          label: s.name || `分包商 ${i + 1}`,
          value: s.amount,
          details: { paidAmount: s.paid_amount },
        });
      });

      // 进度节点
      schedules.forEach((s: any, i: number) => {
        networkNodes.push({
          id: `schedule-${projectId}-${i}`,
          type: 'schedule',
          label: s.milestone || `进度 ${i + 1}`,
          value: s.progress,
          details: { planDate: s.plan_date, actualDate: s.actual_date },
        });
      });

      // 构建边
      const networkEdges: NetworkEdge[] = [];
      
      // 项目 -> 合同
      contracts.forEach((_: any, i: number) => {
        networkEdges.push({
          from: `project-${projectId}`,
          to: `contract-${projectId}-${i}`,
          label: '签订',
        });
      });

      // 项目 -> 成本
      if (project.laborCost > 0) {
        networkEdges.push({ from: `project-${projectId}`, to: `cost-labor-${projectId}`, label: '发生' });
      }
      if (project.materialCost > 0) {
        networkEdges.push({ from: `project-${projectId}`, to: `cost-material-${projectId}`, label: '发生' });
      }
      if (project.equipmentCost > 0) {
        networkEdges.push({ from: `project-${projectId}`, to: `cost-equipment-${projectId}`, label: '发生' });
      }
      if (project.subcontractAmount > 0) {
        networkEdges.push({ from: `project-${projectId}`, to: `cost-subcontract-${projectId}`, label: '分包' });
      }

      // 项目 -> 结算
      if (project.settlementAmount > 0) {
        networkEdges.push({ from: `project-${projectId}`, to: `settlement-${projectId}`, label: '结算' });
      }

      // 结算 -> 付款
      payments.forEach((_: any, i: number) => {
        networkEdges.push({
          from: `settlement-${projectId}`,
          to: `payment-${projectId}-${i}`,
          label: '支付',
        });
      });

      // 项目 -> 分包商
      subcontractors.forEach((_: any, i: number) => {
        networkEdges.push({
          from: `project-${projectId}`,
          to: `subcontractor-${projectId}-${i}`,
          label: '分包',
        });
      });

      // 项目 -> 进度
      schedules.forEach((_: any, i: number) => {
        networkEdges.push({
          from: `project-${projectId}`,
          to: `schedule-${projectId}-${i}`,
          label: '进度',
        });
      });

      setNodes(networkNodes);
      setEdges(networkEdges);
    } catch (error) {
      console.error('加载数据网失败:', error);
    }
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`;
    }
    return `${value.toFixed(0)}`;
  };

  const getNodeIcon = (type: NetworkNode['type']) => {
    switch (type) {
      case 'project': return '🏗️';
      case 'contract': return '📄';
      case 'cost': return '💰';
      case 'settlement': return '💳';
      case 'schedule': return '📅';
      default: return '📌';
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 text-white">数据网关系图</h2>
      <p className="text-gray-400 mb-6">
        展示项目合同、成本、结算、进度之间的关联关系
      </p>

      {/* 项目选择器 */}
      <div className="card mb-6">
        <label className="block text-sm text-gray-400 mb-2">选择项目</label>
        <select
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-300"
          onChange={(e) => {
            const project = projects.find(p => p.id === e.target.value);
            if (project) {
              loadProjectNetwork(project);
            }
          }}
        >
          <option value="">请选择项目...</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      )}

      {!isLoading && nodes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>请选择项目查看数据网</p>
        </div>
      )}

      {/* 数据网可视化 */}
      {!isLoading && nodes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 节点列表 */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 text-white">节点列表</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {nodes.map(node => (
                <div
                  key={node.id}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedNodeId === node.id ? 'bg-primary/20 border border-primary' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <div className="flex items-center gap-2">
                    <span>{getNodeIcon(node.type)}</span>
                    <span className="text-white font-medium text-sm">{node.label}</span>
                  </div>
                  {node.value !== undefined && (
                    <div className="text-xs text-gray-400 mt-1">
                      {node.type === 'schedule' ? `${node.value}%` : formatCurrency(node.value)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 关系图 */}
          <div className="lg:col-span-2 card">
            <h3 className="text-lg font-semibold mb-4 text-white">关系图</h3>
            <div className="bg-gray-900 rounded p-4 min-h-96">
              {/* 简单的关系可视化 */}
              <div className="space-y-4">
                {nodes.filter(n => n.type === 'project').map(projectNode => (
                  <div key={projectNode.id} className="border-l-4 border-primary pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getNodeIcon('project')}</span>
                      <span className="text-white font-bold">{projectNode.label}</span>
                      <span className="text-sm text-gray-400">
                        合同额: {formatCurrency(projectNode.value || 0)}
                      </span>
                    </div>
                    
                    <div className="ml-6 space-y-2">
                      {/* 合同 */}
                      {nodes.filter(n => n.type === 'contract').map(contract => (
                        <div key={contract.id} className="flex items-center gap-2 text-sm">
                          <span className="text-green-400">└─</span>
                          <span>{getNodeIcon('contract')}</span>
                          <span className="text-green-400">{contract.label}</span>
                          <span className="text-gray-500">{contract.value ? formatCurrency(contract.value) : ''}</span>
                        </div>
                      ))}
                      
                      {/* 成本 */}
                      {nodes.filter(n => n.type === 'cost').map(cost => (
                        <div key={cost.id} className="flex items-center gap-2 text-sm">
                          <span className="text-amber-400">└─</span>
                          <span>{getNodeIcon('cost')}</span>
                          <span className="text-amber-400">{cost.label}</span>
                          <span className="text-gray-500">{cost.value ? formatCurrency(cost.value) : ''}</span>
                        </div>
                      ))}
                      
                      {/* 结算 */}
                      {nodes.filter(n => n.type === 'settlement').map(settlement => (
                        <div key={settlement.id} className="flex items-center gap-2 text-sm">
                          <span className="text-purple-400">└─</span>
                          <span>{getNodeIcon('settlement')}</span>
                          <span className="text-purple-400">{settlement.label}</span>
                          <span className="text-gray-500">{settlement.value ? formatCurrency(settlement.value) : ''}</span>
                        </div>
                      ))}
                      
                      {/* 进度 */}
                      {nodes.filter(n => n.type === 'schedule').map(schedule => (
                        <div key={schedule.id} className="flex items-center gap-2 text-sm">
                          <span className="text-pink-400">└─</span>
                          <span>{getNodeIcon('schedule')}</span>
                          <span className="text-pink-400">{schedule.label}</span>
                          <span className="text-gray-500">{schedule.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 节点详情弹窗 */}
      {selectedNodeId && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            {(() => {
              const node = nodes.find(n => n.id === selectedNodeId);
              if (!node) return null;
              
              return (
                <>
                  <h3 className="text-lg font-bold mb-4 text-white">
                    {getNodeIcon(node.type)} {node.label}
                  </h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="text-sm text-gray-400">
                      类型: <span className="text-white">{node.type}</span>
                    </div>
                    {node.value !== undefined && (
                      <div className="text-sm text-gray-400">
                        金额: <span className="text-white">
                          {node.type === 'schedule' ? `${node.value}%` : formatCurrency(node.value)}
                        </span>
                      </div>
                    )}
                    {node.details && Object.entries(node.details).map(([key, value]) => (
                      <div key={key} className="text-sm text-gray-400">
                        {key}: <span className="text-white">{String(value)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                    >
                      关闭
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
