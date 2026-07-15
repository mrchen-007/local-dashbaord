import { dbExecute, dbSelect } from '../api/tauriApi';

const RULE_VERSION = '1.0.0';

export interface ProjectLedger {
  contract_no?: string;
  contract_amount?: number;
  labor_cost?: number;
  material_cost?: number;
  equipment_cost?: number;
  subcontract_amount?: number;
  settlement_amount?: number;
  settlement_date?: string;
  warranty_ratio?: number;
  source_version?: string;
  calculated_at?: string;
}

export interface ProjectRiskFinding {
  id: number;
  rule_code: string;
  rule_version: string;
  level: string;
  title: string;
  description: string;
  status: string;
  evidence_json: string;
  last_calculated_at: string;
}

interface EvidenceRow {
  id: number;
  field_key: string;
  normalized_value?: string;
  project_file_id: number;
}

export async function rebuildProjectLedger(projectId: number): Promise<void> {
  const evidence = await dbSelect<EvidenceRow>(
    `SELECT id, field_key, normalized_value, project_file_id FROM project_field_observations
     WHERE project_id = $1 AND review_status = 'confirmed' ORDER BY id`,
    [projectId]
  );
  const rows = await dbSelect<ProjectLedger>(
    `SELECT MAX(CASE WHEN field_key = 'contract_no' THEN normalized_value END) AS contract_no,
     MAX(CASE WHEN field_key = 'contract_amount' THEN CAST(normalized_value AS REAL) END) AS contract_amount,
     SUM(CASE WHEN field_key = 'labor_cost' THEN CAST(normalized_value AS REAL) ELSE 0 END) AS labor_cost,
     SUM(CASE WHEN field_key = 'material_cost' THEN CAST(normalized_value AS REAL) ELSE 0 END) AS material_cost,
     SUM(CASE WHEN field_key = 'equipment_cost' THEN CAST(normalized_value AS REAL) ELSE 0 END) AS equipment_cost,
     SUM(CASE WHEN field_key = 'subcontract_amount' THEN CAST(normalized_value AS REAL) ELSE 0 END) AS subcontract_amount,
     MAX(CASE WHEN field_key = 'settlement_amount' THEN CAST(normalized_value AS REAL) END) AS settlement_amount,
     MAX(CASE WHEN field_key = 'settlement_date' THEN normalized_value END) AS settlement_date,
     MAX(CASE WHEN field_key = 'warranty_ratio' THEN CAST(normalized_value AS REAL) END) AS warranty_ratio
     FROM project_field_observations WHERE project_id = $1 AND review_status = 'confirmed'`,
    [projectId]
  );
  const ledger = rows[0] || {};
  const snapshot = JSON.stringify({ ...ledger, confirmedCount: evidence.length });
  const evidenceJson = JSON.stringify(evidence.map(item => ({ observationId: item.id, projectFileId: item.project_file_id, field: item.field_key, value: item.normalized_value })));

  await dbExecute(
    `INSERT INTO project_ledgers (project_id, contract_no, contract_amount, labor_cost, material_cost, equipment_cost, subcontract_amount, settlement_amount, settlement_date, warranty_ratio, source_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT(project_id) DO UPDATE SET contract_no = excluded.contract_no, contract_amount = excluded.contract_amount,
     labor_cost = excluded.labor_cost, material_cost = excluded.material_cost, equipment_cost = excluded.equipment_cost,
     subcontract_amount = excluded.subcontract_amount, settlement_amount = excluded.settlement_amount,
     settlement_date = excluded.settlement_date, warranty_ratio = excluded.warranty_ratio,
     source_version = excluded.source_version, calculated_at = datetime('now')`,
    [projectId, ledger.contract_no ?? null, ledger.contract_amount ?? 0, ledger.labor_cost ?? 0, ledger.material_cost ?? 0, ledger.equipment_cost ?? 0, ledger.subcontract_amount ?? 0, ledger.settlement_amount ?? 0, ledger.settlement_date ?? null, ledger.warranty_ratio ?? 0, RULE_VERSION]
  );

  const findings = [] as Array<{ code: string; level: string; title: string; description: string }>;
  if (!ledger.contract_amount) findings.push({ code: 'R100', level: 'medium', title: '关键金额缺失', description: '尚未确认合同金额，无法完成完整风险计算。' });
  if ((ledger.settlement_amount ?? 0) > (ledger.contract_amount ?? 0) && (ledger.contract_amount ?? 0) > 0) findings.push({ code: 'R101', level: 'high', title: '结算超合同', description: '已确认结算金额高于已确认合同金额。' });
  if (evidence.length === 0) findings.push({ code: 'R102', level: 'medium', title: '证据不足', description: '当前项目没有人工确认字段，未生成可依赖的正式台账。' });

  await dbExecute(
    `UPDATE risk_findings SET status = 'resolved', last_calculated_at = datetime('now')
     WHERE project_id = $1 AND rule_version = $2 AND status = 'open'
     AND rule_code IN ('R100', 'R101', 'R102')`,
    [projectId, RULE_VERSION]
  );

  for (const finding of findings) {
    await dbExecute(
      `INSERT INTO risk_findings (project_id, rule_code, rule_version, level, title, description, input_snapshot_json, evidence_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(project_id, rule_code, rule_version) DO UPDATE SET level = excluded.level, title = excluded.title,
       description = excluded.description, input_snapshot_json = excluded.input_snapshot_json, evidence_json = excluded.evidence_json,
       status = CASE WHEN risk_findings.status = 'resolved' THEN 'open' ELSE risk_findings.status END,
       last_calculated_at = datetime('now')`,
      [projectId, finding.code, RULE_VERSION, finding.level, finding.title, finding.description, snapshot, evidenceJson]
    );
  }
}

export async function getProjectLedger(projectId: number): Promise<ProjectLedger | null> {
  const rows = await dbSelect<ProjectLedger>('SELECT * FROM project_ledgers WHERE project_id = $1', [projectId]);
  return rows[0] || null;
}

export interface ProjectReviewSummary {
  confirmedCount: number;
  unconfirmedCount: number;
}

export async function getProjectReviewSummary(projectId: number): Promise<ProjectReviewSummary> {
  const rows = await dbSelect<{ confirmed_count: number | null; unconfirmed_count: number | null }>(
    `SELECT
       SUM(CASE WHEN review_status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_count,
       SUM(CASE WHEN review_status IN ('pending', 'conflict') THEN 1 ELSE 0 END) AS unconfirmed_count
     FROM project_field_observations WHERE project_id = $1`,
    [projectId]
  );
  return {
    confirmedCount: rows[0]?.confirmed_count ?? 0,
    unconfirmedCount: rows[0]?.unconfirmed_count ?? 0,
  };
}

export async function getProjectRiskFindings(projectId: number): Promise<ProjectRiskFinding[]> {
  return dbSelect<ProjectRiskFinding>(
    `SELECT id, rule_code, rule_version, level, title, description, status, evidence_json, last_calculated_at
     FROM risk_findings WHERE project_id = $1 ORDER BY CASE level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, id`,
    [projectId]
  );
}
