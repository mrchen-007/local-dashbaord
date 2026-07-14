-- 工程项目数据稽查系统 - 数据库初始化脚本
-- V1.0 初始版本

-- ============================================
-- 第一部分：文件去重与数据提取
-- ============================================

-- 文件清单表
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    modified_time TEXT NOT NULL,
    file_hash TEXT,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 解析内容表
CREATE TABLE IF NOT EXISTS parsed_contents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    content_text TEXT,
    content_metadata TEXT,
    page_count INTEGER,
    sheet_names TEXT,
    parse_duration_ms INTEGER,
    parsed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(file_id)
);

-- 抽取字段表
CREATE TABLE IF NOT EXISTS extracted_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    contract_no TEXT,
    contract_amount REAL,
    party_a TEXT,
    party_b TEXT,
    sign_date TEXT,
    labor_cost REAL,
    material_cost REAL,
    equipment_cost REAL,
    subcontract_amount REAL,
    settlement_amount REAL,
    settlement_date TEXT,
    warranty_ratio REAL,
    extra_fields TEXT,
    extraction_model TEXT DEFAULT 'siamese-uie',
    extraction_duration_ms INTEGER,
    confidence_score REAL,
    extracted_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(file_id)
);

-- 字段观察值：保留每个来源文件的自动抽取结果，不作为最终业务事实直接覆盖
CREATE TABLE IF NOT EXISTS field_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    field_key TEXT NOT NULL,
    raw_value TEXT,
    normalized_value TEXT,
    confidence_score REAL,
    source_excerpt TEXT,
    review_status TEXT NOT NULL DEFAULT 'pending',
    observed_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(file_id, field_key)
);

-- 字段复核决定：追加式审计记录，永不覆盖原始观察值
CREATE TABLE IF NOT EXISTS field_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    observation_id INTEGER NOT NULL,
    decision TEXT NOT NULL,
    decided_value TEXT,
    note TEXT,
    decided_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (observation_id) REFERENCES field_observations(id) ON DELETE CASCADE
);

-- 处理批次：记录处理范围、运行结果和所用模型/规则版本
CREATE TABLE IF NOT EXISTS processing_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_type TEXT NOT NULL,
    status TEXT NOT NULL,
    total_count INTEGER DEFAULT 0,
    succeeded_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    metadata_json TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

-- ============================================
-- 第二部分：风险引擎
-- ============================================

-- 项目主表
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT,
    contract_no TEXT,
    contract_amount REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    labor_cost REAL DEFAULT 0,
    material_cost REAL DEFAULT 0,
    equipment_cost REAL DEFAULT 0,
    subcontract_amount REAL DEFAULT 0,
    settlement_amount REAL DEFAULT 0,
    settlement_date TEXT,
    total_paid REAL DEFAULT 0,
    estimated_profit_rate REAL DEFAULT 0,
    actual_profit_rate REAL DEFAULT 0,
    planned_end_date TEXT,
    progress_percent REAL DEFAULT 0,
    warranty_ratio REAL DEFAULT 0,
    warranty_due_date TEXT,
    risk_level TEXT DEFAULT 'low',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 合同表
CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    contract_no TEXT,
    amount REAL,
    party_a TEXT,
    party_b TEXT,
    sign_date TEXT,
    file_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 成本明细表
CREATE TABLE IF NOT EXISTS cost_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    cost_type TEXT,
    amount REAL,
    supplier TEXT,
    file_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 结算表
CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    settle_date TEXT,
    amount REAL,
    paid_amount REAL DEFAULT 0,
    retention REAL DEFAULT 0,
    file_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 付款记录表
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    payment_amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    payment_type TEXT,
    note TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 分包商表
CREATE TABLE IF NOT EXISTS subcontractors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    contract_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    contact_person TEXT,
    phone TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 进度计划表
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    planned_start_date TEXT,
    planned_end_date TEXT,
    actual_start_date TEXT,
    actual_end_date TEXT,
    progress_percent REAL DEFAULT 0,
    milestone_name TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================
-- 索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(file_path);
CREATE INDEX IF NOT EXISTS idx_parsed_contents_file_id ON parsed_contents(file_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_file_id ON extracted_fields(file_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_contract_no ON extracted_fields(contract_no);
CREATE INDEX IF NOT EXISTS idx_field_observations_status ON field_observations(review_status);
CREATE INDEX IF NOT EXISTS idx_field_observations_file_id ON field_observations(file_id);
CREATE INDEX IF NOT EXISTS idx_field_decisions_observation_id ON field_decisions(observation_id);
CREATE INDEX IF NOT EXISTS idx_projects_risk_level ON projects(risk_level);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name_unique ON projects(name);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_subcontractors_project_id ON subcontractors(project_id);
CREATE INDEX IF NOT EXISTS idx_schedules_project_id ON schedules(project_id);

-- ============================================
-- 视图
-- ============================================

-- 文件处理状态概览
CREATE VIEW IF NOT EXISTS v_extraction_summary AS
SELECT 
    f.id,
    f.file_path,
    f.file_name,
    f.file_size,
    f.status,
    f.error_message,
    pc.parsed_at,
    ef.extracted_at,
    ef.contract_no,
    ef.contract_amount,
    ef.party_a,
    ef.party_b
FROM files f
LEFT JOIN parsed_contents pc ON f.id = pc.file_id
LEFT JOIN extracted_fields ef ON f.id = ef.file_id;

-- 处理统计
CREATE VIEW IF NOT EXISTS v_processing_stats AS
SELECT 
    COUNT(*) as total_files,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    SUM(CASE WHEN status = 'parsing' THEN 1 ELSE 0 END) as parsing_count,
    SUM(CASE WHEN status = 'parsed' THEN 1 ELSE 0 END) as parsed_count,
    SUM(CASE WHEN status = 'extracting' THEN 1 ELSE 0 END) as extracting_count,
    SUM(CASE WHEN status = 'extracted' THEN 1 ELSE 0 END) as extracted_count,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
FROM files;

-- 项目风险概览
CREATE VIEW IF NOT EXISTS v_project_risk_overview AS
SELECT 
    p.id,
    p.name,
    p.contract_no,
    p.contract_amount,
    p.total_cost,
    p.settlement_amount,
    p.total_paid,
    p.risk_level,
    (SELECT COUNT(*) FROM payments WHERE project_id = p.id) as payment_count,
    (SELECT COUNT(*) FROM subcontractors WHERE project_id = p.id) as subcontractor_count
FROM projects p;
