import { useEffect, useState } from 'react';
import { databaseService, FieldObservation } from '../shared/database';

const FIELD_LABELS: Record<string, string> = {
  contract_no: '合同编号', contract_amount: '合同金额', party_a: '甲方', party_b: '乙方',
  sign_date: '签约日期', labor_cost: '人工成本', material_cost: '材料成本',
  equipment_cost: '设备成本', subcontract_amount: '分包金额', settlement_amount: '结算金额',
  settlement_date: '结算日期', warranty_ratio: '质保金比例',
};

export default function FieldSourcePanel({ projectName }: { projectName: string }) {
  const [items, setItems] = useState<FieldObservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await databaseService.initialize();
        const observations = await databaseService.getConfirmedFieldObservationsForProject(projectName);
        if (active) setItems(observations);
      } catch (loadError) {
        if (active) setError(String(loadError));
      }
    })();
    return () => { active = false; };
  }, [projectName]);

  return (
    <div className="mt-4 border-t border-gray-700 pt-4">
      <h4 className="text-sm font-semibold text-white mb-3">已确认字段与来源</h4>
      {error && <p className="text-sm text-red-400">加载来源失败：{error}</p>}
      {!error && items.length === 0 && <p className="text-sm text-gray-500">当前项目暂无已确认字段来源。</p>}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500 border-b border-gray-700">
              <tr><th className="text-left py-2">字段</th><th className="text-left py-2">确认值</th><th className="text-left py-2">来源文件</th><th className="text-left py-2">证据片段</th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-800/80 text-gray-300">
                  <td className="py-2 pr-3 text-primary">{FIELD_LABELS[item.field_key] || item.field_key}</td>
                  <td className="py-2 pr-3">{item.normalized_value || '—'}</td>
                  <td className="py-2 pr-3 max-w-xs truncate" title={item.file_path}>{item.file_path}</td>
                  <td className="py-2 max-w-sm truncate" title={item.source_excerpt}>{item.source_excerpt || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
