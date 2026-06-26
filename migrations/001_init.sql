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
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
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
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- ============================================
-- 第二部分：风险引擎
-- ============================================

-- 项目主表
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_projects_risk_level ON projects(risk_level);
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
