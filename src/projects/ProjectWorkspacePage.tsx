import { useCallback, useEffect, useState } from 'react';
import { formatCurrency } from '../shared/format';
import { useCurrentProject } from './ProjectContext';
import { getProjectLedger, getProjectRiskFindings, type ProjectRiskFinding } from './projectLedgerService';
import { projectFileService } from './projectFileService';

export default function ProjectWorkspacePage() {
  const { currentProject } = useCurrentProject();
  const [ledger, setLedger] = useState<Awaited<ReturnType<typeof getProjectLedger>>>(null);
  const [findings, setFindings] = useState<ProjectRiskFinding[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true); setError(null);
    try {
      const [nextLedger, nextFindings, files] = await Promise.all([
        getProjectLedger(currentProject.id), getProjectRiskFindings(currentProject.id), projectFileService.list(currentProject.id, 10_000),
      ]);
      setLedger(nextLedger); setFindings(nextFindings); setFileCount(files.length);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally { setLoading(false); }
  }, [currentProject]);

  useEffect(() => { void load(); }, [load]);

  if (!currentProject) return <div className="p-8"><div className="card">请先在项目中心打开一个项目。</div></div>;
  if (loading) return <div className="p-8 text-gray-400">正在加载项目工作台…</div>;

  return <div className="p-8 space-y-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-primary">项目工作台</p><h2 className="text-2xl font-bold">{currentProject.name}</h2><p className="text-gray-400 mt-1">{currentProject.sourceRoot || '未绑定资料目录'}</p></div><button onClick={() => void load()} className="text-sm text-primary">刷新</button></div>
    {error && <div className="border border-red-500/40 bg-red-950/20 p-3 text-red-200">{error}</div>}
    <div className="grid gap-4 md:grid-cols-4"><Metric label="项目文件" value={String(fileCount)} /><Metric label="合同金额" value={formatCurrency(ledger?.contract_amount || 0)} /><Metric label="结算金额" value={formatCurrency(ledger?.settlement_amount || 0)} /><Metric label="开放风险" value={String(findings.filter(item => item.status === 'open').length)} /></div>
    <section className="card"><h3 className="font-semibold mb-3">正式台账</h3>{ledger ? <div className="grid gap-3 text-sm md:grid-cols-3"><Item label="合同编号" value={ledger.contract_no || '—'} /><Item label="人工成本" value={formatCurrency(ledger.labor_cost || 0)} /><Item label="材料成本" value={formatCurrency(ledger.material_cost || 0)} /><Item label="设备成本" value={formatCurrency(ledger.equipment_cost || 0)} /><Item label="分包金额" value={formatCurrency(ledger.subcontract_amount || 0)} /><Item label="台账版本" value={ledger.source_version || '—'} /></div> : <p className="text-gray-400">尚无正式台账。确认字段后，在项目中心执行重建。</p>}</section>
    <section className="card"><h3 className="font-semibold mb-3">风险发现</h3>{findings.length === 0 ? <p className="text-gray-400">尚无持久化风险发现。</p> : <div className="space-y-3">{findings.map(finding => <div key={finding.id} className="border border-gray-700 p-3"><div className="flex justify-between gap-3"><strong>{finding.rule_code} {finding.title}</strong><span className={finding.level === 'high' ? 'text-red-300' : 'text-amber-300'}>{finding.level} · {finding.status}</span></div><p className="mt-1 text-sm text-gray-300">{finding.description}</p><p className="mt-2 text-xs text-gray-500">规则 {finding.rule_version} · 最近重算 {finding.last_calculated_at}</p></div>)}</div>}</section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="card"><p className="text-sm text-gray-400">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }
function Item({ label, value }: { label: string; value: string }) { return <div><p className="text-gray-400">{label}</p><p className="mt-1">{value}</p></div>; }
