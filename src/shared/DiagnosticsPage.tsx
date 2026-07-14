import { useCallback, useEffect, useState } from 'react';
import { checkUieService } from '../api/tauriApi';
import { databaseService } from './database';
import { isTauri } from './environment';

interface DiagnosticState {
  uieReady: boolean;
  integrity: string;
  foreignKeyIssues: number;
  pendingReviews: number;
  error?: string;
}

export default function DiagnosticsPage() {
  const [state, setState] = useState<DiagnosticState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await databaseService.initialize();
      const [health, uieReady] = await Promise.all([
        databaseService.getDatabaseHealth(),
        isTauri() ? checkUieService() : Promise.resolve(false),
      ]);
      setState({ uieReady, ...health });
    } catch (error) {
      setState({ uieReady: false, integrity: 'unknown', foreignKeyIssues: 0, pendingReviews: 0, error: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const ok = state?.integrity === 'ok' && state.foreignKeyIssues === 0;
  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">运行诊断</h2>
          <p className="text-gray-400 mt-1">检查本地服务、数据库完整性与待复核数据。</p>
        </div>
        <button onClick={() => void refresh()} disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50">
          {isLoading ? '检查中…' : '重新检查'}
        </button>
      </div>

      {state?.error && <div className="card border-red-500 text-red-400 mb-6">诊断失败：{state.error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusCard title="桌面环境" ok={isTauri()} detail={isTauri() ? 'Tauri 桌面应用已连接' : '当前为浏览器预览，文件与数据库功能不可用'} />
        <StatusCard title="AI 提取服务" ok={state?.uieReady === true} detail={state?.uieReady ? '模型已加载并可处理字段抽取' : '服务未就绪；仍可扫描和解析文件'} />
        <StatusCard title="SQLite 完整性" ok={ok === true} detail={state ? `integrity_check: ${state.integrity}；外键问题: ${state.foreignKeyIssues}` : '等待检查'} />
        <StatusCard title="待人工复核" ok={state?.pendingReviews === 0} detail={state ? `${state.pendingReviews} 个字段等待确认或驳回` : '等待检查'} />
      </div>
    </div>
  );
}

function StatusCard({ title, ok, detail }: { title: string; ok: boolean; detail: string }) {
  return (
    <div className={`card border ${ok ? 'border-green-800' : 'border-amber-700'}`}>
      <div className={`font-semibold ${ok ? 'text-green-400' : 'text-amber-400'}`}>{ok ? '●' : '●'} {title}</div>
      <p className="text-sm text-gray-400 mt-2">{detail}</p>
    </div>
  );
}
