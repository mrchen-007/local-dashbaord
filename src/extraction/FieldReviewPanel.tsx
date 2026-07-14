import { useCallback, useEffect, useState } from 'react';
import { databaseService, FieldObservation } from '../shared/database';

interface FieldReviewPanelProps {
  refreshKey: number;
}

export default function FieldReviewPanel({ refreshKey }: FieldReviewPanelProps) {
  const [items, setItems] = useState<FieldObservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      await databaseService.initialize();
      setItems(await databaseService.getFieldObservations('pending'));
      setError(null);
    } catch (loadError) {
      setError(`加载待复核字段失败：${loadError instanceof Error ? loadError.message : String(loadError)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const review = useCallback(async (item: FieldObservation, decision: 'confirmed' | 'rejected') => {
    const value = decision === 'confirmed'
      ? window.prompt(`确认“${item.field_key}”的标准值`, item.normalized_value ?? item.raw_value ?? '')
      : undefined;
    if (decision === 'confirmed' && value === null) return;
    await databaseService.reviewFieldObservation(item.id, decision, value ?? undefined);
    await load();
  }, [load]);

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">字段人工复核</h3>
          <p className="text-sm text-gray-400">确认后的标准值会保留审计记录；原始 AI 结果不会被覆盖。</p>
        </div>
        <button onClick={() => void load()} className="px-3 py-1.5 text-sm border border-gray-600 rounded text-gray-300 hover:bg-gray-700">
          刷新
        </button>
      </div>

      {error && <p className="text-red-400 mb-3">{error}</p>}
      {isLoading && <p className="text-gray-400">正在加载复核队列…</p>}
      {!isLoading && items.length === 0 && <p className="text-gray-500">暂无待复核字段。</p>}

      {!isLoading && items.length > 0 && (
        <div className="max-h-96 overflow-y-auto space-y-3">
          {items.map(item => (
            <div key={item.id} className="border border-gray-700 rounded-lg p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-white font-medium">{item.field_key}</div>
                  <div className="text-sm text-gray-300 mt-1">原始值：{item.raw_value || '—'}</div>
                  <div className="text-sm text-primary mt-1">标准值：{item.normalized_value || '—'}</div>
                  <div className="text-xs text-gray-500 mt-1 truncate">来源：{item.file_path}</div>
                  {item.source_excerpt && <div className="text-xs text-gray-500 mt-1 line-clamp-2">片段：{item.source_excerpt}</div>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => void review(item, 'confirmed')} className="px-3 py-1.5 text-sm bg-green-700 hover:bg-green-600 rounded text-white">确认/修改</button>
                  <button onClick={() => void review(item, 'rejected')} className="px-3 py-1.5 text-sm border border-red-600 text-red-300 hover:bg-red-900/30 rounded">驳回</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
