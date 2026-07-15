CREATE TABLE IF NOT EXISTS report_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    report_type TEXT NOT NULL,
    output_name TEXT NOT NULL,
    source_version TEXT NOT NULL,
    rule_version TEXT NOT NULL,
    exported_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_exports_project_exported
    ON report_exports(project_id, exported_at DESC);
