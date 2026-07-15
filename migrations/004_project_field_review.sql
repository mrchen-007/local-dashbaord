CREATE TABLE IF NOT EXISTS project_field_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    project_file_id INTEGER NOT NULL,
    field_key TEXT NOT NULL,
    raw_value TEXT,
    normalized_value TEXT,
    confidence_score REAL,
    source_excerpt TEXT,
    review_status TEXT NOT NULL DEFAULT 'pending',
    observed_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (project_file_id) REFERENCES project_files(id) ON DELETE CASCADE,
    UNIQUE(project_file_id, field_key)
);

CREATE TABLE IF NOT EXISTS project_field_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    observation_id INTEGER NOT NULL,
    decision TEXT NOT NULL,
    decided_value TEXT,
    note TEXT,
    decided_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (observation_id) REFERENCES project_field_observations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_field_observations_queue
ON project_field_observations(project_id, review_status, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_field_decisions_observation
ON project_field_decisions(observation_id, decided_at DESC);
