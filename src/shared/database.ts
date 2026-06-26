// 数据库服务
// 使用 tauri-plugin-sql 管理 SQLite 数据库

import Database from '@tauri-apps/plugin-sql';

export interface FileRecord {
  id?: number;
  file_path: string;
  file_name: string;
  file_size: number;
  modified_time: string;
  file_hash?: string;
  status: 'pending' | 'parsing' | 'parsed' | 'extracting' | 'extracted' | 'error';
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ParsedContent {
  id?: number;
  file_id: number;
  file_path: string;
  content_text?: string;
  content_metadata?: string;
  page_count?: number;
  sheet_names?: string;
  parse_duration_ms?: number;
  parsed_at?: string;
}

export interface ExtractedFields {
  id?: number;
  file_id: number;
  file_path: string;
  contract_no?: string;
  contract_amount?: number;
  party_a?: string;
  party_b?: string;
  sign_date?: string;
  labor_cost?: number;
  material_cost?: number;
  equipment_cost?: number;
  subcontract_amount?: number;
  settlement_amount?: number;
  settlement_date?: string;
  warranty_ratio?: number;
  extra_fields?: string;
  extraction_model?: string;
  extraction_duration_ms?: number;
  confidence_score?: number;
  extracted_at?: string;
}

export interface ProcessingStats {
  total_files: number;
  pending_count: number;
  parsing_count: number;
  parsed_count: number;
  extracting_count: number;
  extracted_count: number;
  error_count: number;
}

/**
 * 数据库服务类
 * 管理文件、解析内容和抽取字段的数据
 */
export class DatabaseService {
  private db: Database | null = null;

  /**
   * 初始化数据库连接
   */
  async initialize(): Promise<void> {
    try {
      // 使用 tauri-plugin-sql 连接 SQLite
      this.db = await Database.load('sqlite:dedup_tool.db');
      
      // 创建表结构
      await this.createTables();
    } catch (error) {
      throw new Error(`数据库初始化失败: ${error}`);
    }
  }

  /**
   * 创建数据库表
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    // 创建文件表
    await this.db.execute(`
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
      )
    `);

    // 创建解析内容表
    await this.db.execute(`
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
      )
    `);

    // 创建抽取字段表
    await this.db.execute(`
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
      )
    `);

    // 创建索引
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_files_status ON files(status)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_files_path ON files(file_path)');
  }

  /**
   * 插入或更新文件记录
   */
  async upsertFile(file: Omit<FileRecord, 'id'>): Promise<number> {
    if (!this.db) throw new Error('数据库未初始化');

    const result = await this.db.execute(
      `INSERT INTO files (file_path, file_name, file_size, modified_time, file_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(file_path) DO UPDATE SET
         file_size = $3,
         modified_time = $4,
         file_hash = $5,
         status = $6,
         updated_at = datetime('now')
       RETURNING id`,
      [file.file_path, file.file_name, file.file_size, file.modified_time, file.file_hash, file.status]
    );

    // 从结果中获取插入的 ID
    const insertResult = result as any;
    return insertResult.lastInsertId || insertResult.rows?.[0]?.id || 0;
  }

  /**
   * 更新文件状态
   */
  async updateFileStatus(filePath: string, status: FileRecord['status'], errorMessage?: string): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    await this.db.execute(
      `UPDATE files SET status = $1, error_message = $2, updated_at = datetime('now') WHERE file_path = $3`,
      [status, errorMessage, filePath]
    );
  }

  /**
   * 获取文件记录
   */
  async getFile(filePath: string): Promise<FileRecord | null> {
    if (!this.db) throw new Error('数据库未初始化');

    const result = await this.db.select<FileRecord[]>(
      'SELECT * FROM files WHERE file_path = $1',
      [filePath]
    );

    return result[0] || null;
  }

  /**
   * 获取待处理的文件列表
   */
  async getPendingFiles(limit: number = 100): Promise<FileRecord[]> {
    if (!this.db) throw new Error('数据库未初始化');

    return await this.db.select<FileRecord[]>(
      'SELECT * FROM files WHERE status = $1 ORDER BY id LIMIT $2',
      ['pending', limit]
    );
  }

  /**
   * 保存解析内容
   */
  async saveParsedContent(content: Omit<ParsedContent, 'id'>): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    await this.db.execute(
      `INSERT OR REPLACE INTO parsed_contents (file_id, file_path, content_text, content_metadata, page_count, sheet_names, parse_duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [content.file_id, content.file_path, content.content_text, content.content_metadata, content.page_count, content.sheet_names, content.parse_duration_ms]
    );
  }

  /**
   * 保存抽取字段
   */
  async saveExtractedFields(fields: Omit<ExtractedFields, 'id'>): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    await this.db.execute(
      `INSERT OR REPLACE INTO extracted_fields (file_id, file_path, contract_no, contract_amount, party_a, party_b, sign_date, labor_cost, material_cost, equipment_cost, subcontract_amount, settlement_amount, settlement_date, warranty_ratio, extra_fields, extraction_duration_ms, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        fields.file_id, fields.file_path, fields.contract_no, fields.contract_amount,
        fields.party_a, fields.party_b, fields.sign_date, fields.labor_cost,
        fields.material_cost, fields.equipment_cost, fields.subcontract_amount,
        fields.settlement_amount, fields.settlement_date, fields.warranty_ratio,
        fields.extra_fields, fields.extraction_duration_ms, fields.confidence_score,
      ]
    );
  }

  /**
   * 获取处理统计
   */
  async getProcessingStats(): Promise<ProcessingStats> {
    if (!this.db) throw new Error('数据库未初始化');

    const result = await this.db.select<ProcessingStats[]>(`
      SELECT 
        COUNT(*) as total_files,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'parsing' THEN 1 ELSE 0 END) as parsing_count,
        SUM(CASE WHEN status = 'parsed' THEN 1 ELSE 0 END) as parsed_count,
        SUM(CASE WHEN status = 'extracting' THEN 1 ELSE 0 END) as extracting_count,
        SUM(CASE WHEN status = 'extracted' THEN 1 ELSE 0 END) as extracted_count,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
      FROM files
    `);

    return result[0];
  }

  /**
   * 获取抽取结果概览
   */
  async getExtractionSummary(): Promise<any[]> {
    if (!this.db) throw new Error('数据库未初始化');

    return await this.db.select<any[]>(`
      SELECT 
        f.file_path,
        f.file_name,
        f.status,
        ef.contract_no,
        ef.contract_amount,
        ef.party_a,
        ef.party_b,
        ef.settlement_amount,
        ef.settlement_date
      FROM files f
      LEFT JOIN extracted_fields ef ON f.id = ef.file_id
      WHERE f.status = 'extracted'
      ORDER BY f.updated_at DESC
    `);
  }

  /**
   * 检查文件是否已处理（缓存检查）
   */
  async isFileProcessed(filePath: string, modifiedTime: string): Promise<boolean> {
    if (!this.db) throw new Error('数据库未初始化');

    const result = await this.db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM files 
       WHERE file_path = $1 AND modified_time = $2 AND status = 'extracted'`,
      [filePath, modifiedTime]
    );

    return result[0]?.count > 0;
  }

  // ========== 风险引擎相关方法 ==========

  /**
   * 获取所有项目列表（含风险等级）
   */
  async getProjects(): Promise<any[]> {
    if (!this.db) throw new Error('数据库未初始化');
    return await this.db.select<any[]>('SELECT * FROM projects ORDER BY updated_at DESC');
  }

  /**
   * 插入或更新项目
   */
  async upsertProject(project: any): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    await this.db.execute(
      `INSERT INTO projects (name, contract_no, contract_amount, total_cost, labor_cost, material_cost, equipment_cost, subcontract_amount, settlement_amount, settlement_date, total_paid, estimated_profit_rate, actual_profit_rate, planned_end_date, progress_percent, warranty_ratio, warranty_due_date, risk_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT(id) DO UPDATE SET
         name = $1, contract_no = $2, contract_amount = $3, total_cost = $4,
         labor_cost = $5, material_cost = $6, equipment_cost = $7, subcontract_amount = $8,
         settlement_amount = $9, settlement_date = $10, total_paid = $11,
         estimated_profit_rate = $12, actual_profit_rate = $13, planned_end_date = $14,
         progress_percent = $15, warranty_ratio = $16, warranty_due_date = $17, risk_level = $18,
         updated_at = datetime('now')`,
      [project.name, project.contract_no, project.contract_amount, project.total_cost,
       project.labor_cost, project.material_cost, project.equipment_cost, project.subcontract_amount,
       project.settlement_amount, project.settlement_date, project.total_paid,
       project.estimated_profit_rate, project.actual_profit_rate, project.planned_end_date,
       project.progress_percent, project.warranty_ratio, project.warranty_due_date, project.risk_level]
    );
  }

  /**
   * 获取付款记录
   */
  async getPayments(projectId: number): Promise<any[]> {
    if (!this.db) throw new Error('数据库未初始化');
    return await this.db.select<any[]>(
      'SELECT * FROM payments WHERE project_id = $1 ORDER BY payment_date',
      [projectId]
    );
  }

  /**
   * 添加付款记录
   */
  async addPayment(payment: { project_id: number; payment_amount: number; payment_date: string; payment_type: string }): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    await this.db.execute(
      'INSERT INTO payments (project_id, payment_amount, payment_date, payment_type) VALUES ($1, $2, $3, $4)',
      [payment.project_id, payment.payment_amount, payment.payment_date, payment.payment_type]
    );
  }

  /**
   * 获取分包商列表
   */
  async getSubcontractors(projectId: number): Promise<any[]> {
    if (!this.db) throw new Error('数据库未初始化');
    return await this.db.select<any[]>(
      'SELECT * FROM subcontractors WHERE project_id = $1',
      [projectId]
    );
  }

  /**
   * 添加分包商
   */
  async addSubcontractor(sub: { project_id: number; name: string; contract_amount: number; paid_amount: number }): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    await this.db.execute(
      'INSERT INTO subcontractors (project_id, name, contract_amount, paid_amount) VALUES ($1, $2, $3, $4)',
      [sub.project_id, sub.name, sub.contract_amount, sub.paid_amount]
    );
  }

  /**
   * 获取进度计划
   */
  async getSchedules(projectId: number): Promise<any[]> {
    if (!this.db) throw new Error('数据库未初始化');
    return await this.db.select<any[]>(
      'SELECT * FROM schedules WHERE project_id = $1',
      [projectId]
    );
  }

  /**
   * 添加进度计划
   */
  async addSchedule(sched: { project_id: number; planned_start: string; planned_end: string; actual_start: string; actual_end: string; progress: number }): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    await this.db.execute(
      'INSERT INTO schedules (project_id, planned_start, planned_end, actual_start, actual_end, progress) VALUES ($1, $2, $3, $4, $5, $6)',
      [sched.project_id, sched.planned_start, sched.planned_end, sched.actual_start, sched.actual_end, sched.progress]
    );
  }

  /**
   * 检查是否有新数据更新（热更新检测）
   */
  async checkForUpdates(): Promise<{ hasUpdate: boolean; latestTime: string }> {
    if (!this.db) throw new Error('数据库未初始化');
    const result = await this.db.select<any[]>(
      "SELECT MAX(updated_at) as latest FROM files"
    );
    return {
      hasUpdate: result.length > 0 && result[0].latest !== null,
      latestTime: result[0]?.latest || '',
    };
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      // tauri-plugin-sql 不直接提供 close 方法，通过置空引用让 GC 处理
      this.db = null;
    }
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    await this.db.execute('DELETE FROM extracted_fields');
    await this.db.execute('DELETE FROM parsed_contents');
    await this.db.execute('DELETE FROM files');
  }
}

/**
 * 数据库服务单例
 */
export const databaseService = new DatabaseService();
