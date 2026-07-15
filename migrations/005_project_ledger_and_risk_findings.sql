CREATE TABLE IF NOT EXISTS project_ledgers (
    project_id INTEGER PRIMARY KEY,
    contract_no TEXT,
    contract_amount REAL NOT NULL DEFAULT 0,
    labor_cost REAL NOT NULL DEFAULT 0,
    material_cost REAL NOT NULL DEFAULT 0,
    equipment_cost REAL NOT NULL DEFAULT 0,
    subcontract_amount REAL NOT NULL DEFAULT 0,
    settlement_amount REAL NOT NULL DEFAULT 0,
    settlement_date TEXT,
    warranty_ratio REAL NOT NULL DEFAULT 0,
    source_version TEXT NOT NULL,
    calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS risk_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    rule_code TEXT NOT NULL,
    rule_version TEXT NOT NULL,
    level TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    input_snapshot_json TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    first_detected_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, rule_code, rule_version)
);

CREATE TABLE IF NOT EXISTS risk_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    finding_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    note TEXT,
    acted_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (finding_id) REFERENCES risk_findings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_risk_findings_project_status ON risk_findings(project_id, status, level);
CREATE INDEX IF NOT EXISTS idx_risk_actions_finding ON risk_actions(finding_id, acted_at DESC);
