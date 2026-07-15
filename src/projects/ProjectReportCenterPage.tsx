import { useCallback, useEffect, useState } from 'react';
import { useCurrentProject } from './ProjectContext';
import { getProjectLedger, getProjectRiskFindings, getProjectReviewSummary, type ProjectLedger, type ProjectRiskFinding, type ProjectReviewSummary } from './projectLedgerService';
import { exportProjectRiskReport, exportProjectWorkbook, listProjectReportExports, type ReportExportRecord } from './projectReportService';

export default function ProjectReportCenterPage() {
  const { currentProject } = useCurrentProject();
  const [ledger, setLedger] = useState<ProjectLedger | null>(null);
  const [findings, setFindings] = useState<ProjectRiskFinding[]>([]);
  const [review, setReview] = useState<ProjectReviewSummary>({ confirmedCount: 0, unconfirmedCount: 0 });
  const [exports, setExports] = useState<ReportExportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    setError(null);
    try {
      const [nextLedger, nextFindings, nextReview, nextExports] = await Promise.all([
        getProjectLedger(currentProject.id),
        getProjectRiskFindings(currentProject.id),
        getProjectReviewSummary(currentProject.id),
        listProjectReportExports(currentProject.id),
      ]);
      setLedger(nextLedger);
      setFindings(nextFindings);
      setReview(nextReview);
      setExports(nextExports);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => { void load(); }, [load]);

  async function exportReport(kind: 'workbook' | 'docx') {
    if (!currentProject || exporting) return;
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      const data = { project: currentProject, ledger, findings, review };
      const outputName = kind === 'workbook' ? await exportProjectWorkbook(data) : await exportProjectRiskReport(data);
      setMessage(`已生成 ${outputName}`);
      await load();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : String(exportError));
    } finally {
      setExporting(false);
    }
  }

  if (!currentProject) return <div className="p-8"><div className="card">请先在项目中心打开一个项目。</div></div>;
  if (loading) return <div className="p-8 text-gray-400">正在加载报告中心…</div>;

  return <div className="p-8 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-primary">报告中心</p><h2 className="text-2xl font-bold">{currentProject.name}</h2><p className="mt-1 text-gray-400">仅导出当前项目已确认的台账和持久化风险发现。</p></div><button onClick={() => void load()} className="text-sm text-primary">刷新</button></div>
    {error && <div className="border border-red-500/40 bg-red-950/20 p-3 text-red-200">{error}</div>}
    {message && <div className="border border-green-500/40 bg-green-950/20 p-3 text-green-200">{message}</div>}
    <section className="card"><h3 className="font-semibold">导出范围</h3><dl className="mt-3 grid gap-3 text-sm md:grid-cols-3"><Entry label="数据版本" value={ledger?.source_version || '尚未构建'} /><Entry label="待确认字段" value={String(review.unconfirmedCount)} /><Entry label="持久化风险" value={String(findings.length)} /></dl><div className="mt-4 flex flex-wrap gap-3"><button disabled={exporting} onClick={() => void exportReport('workbook')} className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50">导出 Excel 台账与风险清单</button><button disabled={exporting} onClick={() => void exportReport('docx')} className="rounded border border-primary px-4 py-2 text-primary disabled:opacity-50">导出 Word 风险稽查报告</button></div></section>
    <section className="card"><h3 className="font-semibold">导出记录</h3>{exports.length === 0 ? <p className="mt-3 text-sm text-gray-400">尚无当前项目的导出记录。</p> : <div className="mt-3 space-y-2">{exports.map((item) => <div key={item.id} className="border border-gray-700 p-3 text-sm"><p className="font-medium">{item.output_name}</p><p className="mt-1 text-gray-400">{item.report_type} · 数据 {item.source_version} · 规则 {item.rule_version} · {item.exported_at}</p></div>)}</div>}</section>
  </div>;
}

function Entry({ label, value }: { label: string; value: string }) { return <div><dt className="text-gray-400">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
