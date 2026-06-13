-- 文件数据提取模块 - SQLite 数据库初始化脚本
-- 使用 tauri-plugin-sql 插件管理数据库

-- 文件清单表：记录待处理的文件信息
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,           -- 文件完整路径
    file_name TEXT NOT NULL,                   -- 文件名
    file_size INTEGER NOT NULL,                -- 文件大小(字节)
    modified_time TEXT NOT NULL,               -- 修改时间(ISO格式)
    file_hash TEXT,                            -- 文件内容哈希(SHA-256)
    status TEXT DEFAULT 'pending',             -- 状态: pending/parsing/parsed/extracting/extracted/error
    error_message TEXT,                        -- 错误信息(如有)
    created_at TEXT DEFAULT (datetime('now')), -- 记录创建时间
    updated_at TEXT DEFAULT (datetime('now'))  -- 记录更新时间
);

-- 解析内容表：存储文档解析后的文本内容
CREATE TABLE IF NOT EXISTS parsed_contents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,                  -- 关联的文件ID
    file_path TEXT NOT NULL,                   -- 文件路径(冗余字段，便于查询)
    content_text TEXT,                         -- 解析后的纯文本内容
    content_metadata TEXT,                     -- 元数据(JSON格式)
    page_count INTEGER,                        -- 页数(PDF/DOCX)
    sheet_names TEXT,                          -- Excel工作表名称(JSON数组)
    parse_duration_ms INTEGER,                 -- 解析耗时(毫秒)
    parsed_at TEXT DEFAULT (datetime('now')),  -- 解析时间
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 抽取字段表：存储从文档中抽取的结构化信息
CREATE TABLE IF NOT EXISTS extracted_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,                  -- 关联的文件ID
    file_path TEXT NOT NULL,                   -- 文件路径(冗余字段)
    
    -- 合同基本信息
    contract_no TEXT,                          -- 合同编号
    contract_amount REAL,                      -- 合同总金额
    party_a TEXT,                              -- 甲方
    party_b TEXT,                              -- 乙方
    sign_date TEXT,                            -- 签约日期
    
    -- 成本信息
    labor_cost REAL,                           -- 人工成本_总价
    material_cost REAL,                        -- 材料成本_总价
    equipment_cost REAL,                       -- 设备成本_总价
    subcontract_amount REAL,                   -- 分包金额
    
    -- 结算信息
    settlement_amount REAL,                    -- 结算金额
    settlement_date TEXT,                      -- 结算日期
    warranty_ratio REAL,                       -- 质保金比例(%)
    
    -- 扩展字段(预留)
    extra_fields TEXT,                         -- 其他抽取字段(JSON格式)
    
    -- 元信息
    extraction_model TEXT DEFAULT 'siamese-uie', -- 使用的抽取模型
    extraction_duration_ms INTEGER,            -- 抽取耗时(毫秒)
    confidence_score REAL,                     -- 置信度分数
    extracted_at TEXT DEFAULT (datetime('now')), -- 抽取时间
    
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(file_path);
CREATE INDEX IF NOT EXISTS idx_parsed_contents_file_id ON parsed_contents(file_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_file_id ON extracted_fields(file_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_contract_no ON extracted_fields(contract_no);

-- 创建视图：文件处理状态概览
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

-- 创建视图：处理统计
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
