// 数据库服务
// 使用 tauri-plugin-sql 管理 SQLite 数据库

import { dbExecute, dbSelect } from '../api/tauriApi';
import { Project, Payment, Contract, Subcontractor, Schedule } from './types';

class DatabaseBridge {
  static async load(_connectionString: string): Promise<DatabaseBridge> {
    return new DatabaseBridge();
  }

  async execute(query: string, values?: unknown[]): Promise<void> {
    await dbExecute(query, values);
  }

  async select<T>(query: string, values?: unknown[]): Promise<T[]> {
    return dbSelect<T>(query, values);
  }
}

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

export type FieldReviewStatus = 'pending' | 'confirmed' | 'rejected' | 'conflicted';

export interface FieldObservation {
  id: number;
  file_id: number;
  file_path: string;
  field_key: string;
  raw_value?: string;
  normalized_value?: string;
  confidence_score?: number;
  source_excerpt?: string;
  review_status: FieldReviewStatus;
  observed_at: string;
  reviewed_at?: string;
}

export interface ProjectFieldObservation {
  id: number;
  project_id: number;
  project_file_id: number;
  field_key: string;
  raw_value?: string;
  normalized_value?: string;
  confidence_score?: number;
  source_excerpt?: string;
  review_status: FieldReviewStatus;
  observed_at: string;
  reviewed_at?: string;
  file_path: string;
}

export interface ProcessingRun {
  id: number;
  run_type: string;
  status: 'running' | 'succeeded' | 'partial' | 'failed';
  total_count: number;
  succeeded_count: number;
  failed_count: number;
  metadata_json?: string;
  started_at: string;
  completed_at?: string;
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
  private db: DatabaseBridge | null = null;

  /**
   * 初始化数据库连接
   */
  async initialize(): Promise<void> {
    try {
      // 使用 tauri-plugin-sql 连接 SQLite
      this.db = await DatabaseBridge.load('sqlite:dedup_tool.db');
      
      // Rust 在每次打开连接时执行 migrations/ 中尚未应用的增量迁移。
      void this.createTables;
    } catch (error) {
      throw new Error(`数据库初始化失败: ${error}`);
    }
  }

  /**
   * 创建数据库表
   * 使用 migrations/001_init.sql 作为唯一权威 Schema
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    // 以 migrations/001_init.sql 为权威来源
    // 文件清单表
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

    // 解析内容表
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

    // 抽取字段表
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

    await this.db.execute(`
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
      )
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS field_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observation_id INTEGER NOT NULL,
        decision TEXT NOT NULL,
        decided_value TEXT,
        note TEXT,
        decided_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (observation_id) REFERENCES field_observations(id) ON DELETE CASCADE
      )
    `);

    await this.db.execute(`
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
      )
    `);

    // 项目主表
    await this.db.execute(`
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
      )
    `);

    // 合同表
    await this.db.execute(`
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
      )
    `);

    // 成本明细表
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS cost_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        cost_type TEXT,
        amount REAL,
        supplier TEXT,
        file_path TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    // 结算表
    await this.db.execute(`
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
      )
    `);

    // 付款记录表
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        payment_amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_type TEXT,
        note TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // 分包商表
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS subcontractors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        contract_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        contact_person TEXT,
        phone TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // 进度计划表
    await this.db.execute(`
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
      )
    `);

    // 创建索引
    // 旧版本没有唯一约束；先保留最新记录，再创建唯一索引以完成平滑升级。
    await this.db.execute('DELETE FROM parsed_contents WHERE id NOT IN (SELECT MAX(id) FROM parsed_contents GROUP BY file_id)');
    await this.db.execute('DELETE FROM extracted_fields WHERE id NOT IN (SELECT MAX(id) FROM extracted_fields GROUP BY file_id)');
    for (const table of ['contracts', 'cost_items', 'settlements', 'payments', 'subcontractors', 'schedules']) {
      await this.db.execute(
        `UPDATE ${table} SET project_id = (
           SELECT MAX(latest.id) FROM projects latest
           WHERE latest.name = (SELECT current.name FROM projects current WHERE current.id = ${table}.project_id)
         ) WHERE project_id IN (SELECT id FROM projects WHERE id NOT IN (SELECT MAX(id) FROM projects GROUP BY name))`
      );
    }
    await this.db.execute('DELETE FROM projects WHERE id NOT IN (SELECT MAX(id) FROM projects GROUP BY name)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_files_status ON files(status)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_files_path ON files(file_path)');
    await this.db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_parsed_contents_file_id_unique ON parsed_contents(file_id)');
    await this.db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_extracted_fields_file_id_unique ON extracted_fields(file_id)');
    await this.db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name_unique ON projects(name)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_field_observations_status ON field_observations(review_status)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_field_observations_file_id ON field_observations(file_id)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_field_decisions_observation_id ON field_decisions(observation_id)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_projects_risk_level ON projects(risk_level)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_subcontractors_project_id ON subcontractors(project_id)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_schedules_project_id ON schedules(project_id)');
  }

  /**
   * 插入或更新文件记录
   */
  async upsertFile(file: Omit<FileRecord, 'id'>): Promise<number> {
    if (!this.db) throw new Error('数据库未初始化');

    await this.db.execute(
      `INSERT INTO files (file_path, file_name, file_size, modified_time, file_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(file_path) DO UPDATE SET
         file_size = $3,
         modified_time = $4,
         file_hash = $5,
         status = $6,
         updated_at = datetime('now')
       `,
      [file.file_path, file.file_name, file.file_size, file.modified_time, file.file_hash, file.status]
    );

    const rows = await this.db.select<{ id: number }>(
      'SELECT id FROM files WHERE file_path = $1',
      [file.file_path]
    );
    if (!rows[0]) throw new Error(`未找到已保存的文件记录: ${file.file_path}`);
    return rows[0].id;
  }

  /**
   * 批量插入或替换文件记录
   */
  async batchUpsertFiles(files: Omit<FileRecord, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    if (files.length === 0) return;

    const BATCH_SIZE = 100;
    const columns = ['file_path', 'file_name', 'file_size', 'modified_time', 'file_hash', 'status'];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const valuesPlaceholders: string[] = [];
      const params: (string | number)[] = [];

      for (let j = 0; j < batch.length; j++) {
        const file = batch[j];
        const baseIndex = j * columns.length;
        const placeholders = columns.map((_, colIndex) => `$${baseIndex + colIndex + 1}`).join(',');
        valuesPlaceholders.push(`(${placeholders})`);
        params.push(
          file.file_path,
          file.file_name,
          file.file_size,
          file.modified_time,
          file.file_hash ?? '',
          file.status
        );
      }

      const updateAssignments = columns.slice(1).map(column => `${column} = excluded.${column}`).join(', ');
      const sql = `INSERT INTO files (${columns.join(',')}) VALUES ${valuesPlaceholders.join(', ')}
        ON CONFLICT(file_path) DO UPDATE SET ${updateAssignments}, updated_at = datetime('now')`;
      await this.db.execute(sql, params);
      console.log(`[DatabaseService] 批量保存文件记录 ${Math.min(i + BATCH_SIZE, files.length)}/${files.length}`);
    }
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

    const result = await this.db.select<FileRecord>(
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

    return await this.db.select<FileRecord>(
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
      `INSERT INTO parsed_contents (file_id, file_path, content_text, content_metadata, page_count, sheet_names, parse_duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(file_id) DO UPDATE SET
         file_path = excluded.file_path, content_text = excluded.content_text,
         content_metadata = excluded.content_metadata, page_count = excluded.page_count,
         sheet_names = excluded.sheet_names, parse_duration_ms = excluded.parse_duration_ms,
         parsed_at = datetime('now')`,
      [content.file_id, content.file_path, content.content_text, content.content_metadata, content.page_count, content.sheet_names, content.parse_duration_ms]
    );
  }

  /**
   * 保存抽取字段
   */
  async saveExtractedFields(fields: Omit<ExtractedFields, 'id'>): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    await this.db.execute(
      `INSERT INTO extracted_fields (file_id, file_path, contract_no, contract_amount, party_a, party_b, sign_date, labor_cost, material_cost, equipment_cost, subcontract_amount, settlement_amount, settlement_date, warranty_ratio, extra_fields, extraction_duration_ms, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT(file_id) DO UPDATE SET
         file_path = excluded.file_path, contract_no = excluded.contract_no,
         contract_amount = excluded.contract_amount, party_a = excluded.party_a,
         party_b = excluded.party_b, sign_date = excluded.sign_date,
         labor_cost = excluded.labor_cost, material_cost = excluded.material_cost,
         equipment_cost = excluded.equipment_cost, subcontract_amount = excluded.subcontract_amount,
         settlement_amount = excluded.settlement_amount, settlement_date = excluded.settlement_date,
         warranty_ratio = excluded.warranty_ratio, extra_fields = excluded.extra_fields,
         extraction_duration_ms = excluded.extraction_duration_ms,
         confidence_score = excluded.confidence_score, extracted_at = datetime('now')`,
      [
        fields.file_id, fields.file_path, fields.contract_no, fields.contract_amount,
        fields.party_a, fields.party_b, fields.sign_date, fields.labor_cost,
        fields.material_cost, fields.equipment_cost, fields.subcontract_amount,
        fields.settlement_amount, fields.settlement_date, fields.warranty_ratio,
        fields.extra_fields, fields.extraction_duration_ms, fields.confidence_score,
      ]
    );
  }

  async saveFieldObservations(
    fileId: number,
    filePath: string,
    fields: Record<string, unknown>,
    mappedFields: Record<string, unknown>,
    confidence: number,
    sourceExcerpt: string
  ): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    const keyMap: Record<string, string> = {
      '合同编号': 'contract_no', '合同总金额': 'contract_amount', '甲方': 'party_a', '乙方': 'party_b',
      '签约日期': 'sign_date', '签订日期': 'sign_date', '人工成本': 'labor_cost',
      '材料成本': 'material_cost', '设备成本': 'equipment_cost', '分包金额': 'subcontract_amount',
      '结算金额': 'settlement_amount', '结算日期': 'settlement_date', '质保金比例': 'warranty_ratio',
    };

    for (const [rawKey, rawValue] of Object.entries(fields)) {
      const fieldKey = keyMap[rawKey];
      if (!fieldKey || rawValue === null || rawValue === undefined || rawValue === '') continue;
      const normalized = mappedFields[fieldKey];
      await this.db.execute(
        `INSERT INTO field_observations (file_id, file_path, field_key, raw_value, normalized_value, confidence_score, source_excerpt, review_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         ON CONFLICT(file_id, field_key) DO UPDATE SET
           raw_value = excluded.raw_value, normalized_value = excluded.normalized_value,
           confidence_score = excluded.confidence_score, source_excerpt = excluded.source_excerpt,
           review_status = 'pending', observed_at = datetime('now'), reviewed_at = NULL`,
        [fileId, filePath, fieldKey, String(rawValue), normalized === undefined || normalized === null ? null : String(normalized), confidence, sourceExcerpt]
      );
    }
  }

  async getFieldObservations(status?: FieldReviewStatus): Promise<FieldObservation[]> {
    if (!this.db) throw new Error('数据库未初始化');
    return this.db.select<FieldObservation>(
      `SELECT * FROM field_observations ${status ? 'WHERE review_status = $1' : ''}
       ORDER BY observed_at DESC, id DESC`,
      status ? [status] : []
    );
  }

  async getConfirmedFieldObservationsForProject(projectName: string): Promise<FieldObservation[]> {
    if (!this.db) throw new Error('数据库未初始化');
    const unixPattern = `%/${projectName}/%`;
    const windowsPattern = `%\\${projectName}\\%`;
    return this.db.select<FieldObservation>(
      `SELECT * FROM field_observations
       WHERE review_status = 'confirmed' AND (file_path LIKE $1 OR file_path LIKE $2)
       ORDER BY field_key, reviewed_at DESC, id DESC`,
      [unixPattern, windowsPattern]
    );
  }

  async reviewFieldObservation(
    observationId: number,
    status: Exclude<FieldReviewStatus, 'pending' | 'conflicted'>,
    decidedValue?: string,
    note?: string
  ): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    await this.db.execute(
      'INSERT INTO field_decisions (observation_id, decision, decided_value, note) VALUES ($1, $2, $3, $4)',
      [observationId, status, decidedValue, note]
    );
    await this.db.execute(
      `UPDATE field_observations SET review_status = $1,
       normalized_value = COALESCE($2, normalized_value), reviewed_at = datetime('now') WHERE id = $3`,
      [status, decidedValue, observationId]
    );
  }

  async saveProjectFieldObservations(
    projectId: number,
    filePath: string,
    fields: Record<string, unknown>,
    mappedFields: Record<string, unknown>,
    confidence: number,
    sourceExcerpt: string
  ): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    const projectFiles = await this.db.select<{ id: number }>(
      'SELECT id FROM project_files WHERE project_id = $1 AND absolute_path = $2',
      [projectId, filePath]
    );
    const projectFile = projectFiles[0];
    if (!projectFile) throw new Error('文件不属于当前项目，请先重新扫描项目资料');

    const keyMap: Record<string, string> = {
      '合同编号': 'contract_no', '合同总金额': 'contract_amount', '甲方': 'party_a', '乙方': 'party_b',
      '签约日期': 'sign_date', '签订日期': 'sign_date', '人工成本': 'labor_cost', '材料成本': 'material_cost',
      '设备成本': 'equipment_cost', '分包金额': 'subcontract_amount', '结算金额': 'settlement_amount',
      '结算日期': 'settlement_date', '质保金比例': 'warranty_ratio',
    };

    for (const [rawKey, rawValue] of Object.entries(fields)) {
      const fieldKey = keyMap[rawKey];
      if (!fieldKey || rawValue === null || rawValue === undefined || rawValue === '') continue;
      const normalized = mappedFields[fieldKey];
      await this.db.execute(
        `INSERT INTO project_field_observations (project_id, project_file_id, field_key, raw_value, normalized_value, confidence_score, source_excerpt, review_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         ON CONFLICT(project_file_id, field_key) DO UPDATE SET raw_value = excluded.raw_value,
         normalized_value = excluded.normalized_value, confidence_score = excluded.confidence_score,
         source_excerpt = excluded.source_excerpt, review_status = 'pending', observed_at = datetime('now'), reviewed_at = NULL`,
        [projectId, projectFile.id, fieldKey, String(rawValue), normalized == null ? null : String(normalized), confidence, sourceExcerpt]
      );
    }
  }

  async getProjectFieldObservations(projectId: number, status?: FieldReviewStatus): Promise<ProjectFieldObservation[]> {
    if (!this.db) throw new Error('数据库未初始化');
    return this.db.select<ProjectFieldObservation>(
      `SELECT pfo.*, pf.absolute_path AS file_path FROM project_field_observations pfo
       JOIN project_files pf ON pf.id = pfo.project_file_id
       WHERE pfo.project_id = $1 ${status ? 'AND pfo.review_status = $2' : ''}
       ORDER BY pfo.observed_at DESC, pfo.id DESC`,
      status ? [projectId, status] : [projectId]
    );
  }

  async reviewProjectFieldObservation(
    observationId: number,
    status: Exclude<FieldReviewStatus, 'pending' | 'conflicted'>,
    decidedValue?: string,
    note?: string
  ): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    await this.db.execute(
      'INSERT INTO project_field_decisions (observation_id, decision, decided_value, note) VALUES ($1, $2, $3, $4)',
      [observationId, status, decidedValue, note]
    );
    await this.db.execute(
      `UPDATE project_field_observations SET review_status = $1,
       normalized_value = COALESCE($2, normalized_value), reviewed_at = datetime('now') WHERE id = $3`,
      [status, decidedValue, observationId]
    );
  }

  async startProcessingRun(runType: string, totalCount: number, metadata?: Record<string, unknown>): Promise<number> {
    if (!this.db) throw new Error('数据库未初始化');
    await this.db.execute(
      'INSERT INTO processing_runs (run_type, status, total_count, metadata_json) VALUES ($1, $2, $3, $4)',
      [runType, 'running', totalCount, metadata ? JSON.stringify(metadata) : null]
    );
    const runs = await this.db.select<{ id: number }>('SELECT id FROM processing_runs ORDER BY id DESC LIMIT 1');
    if (!runs[0]) throw new Error('创建处理批次失败');
    return runs[0].id;
  }

  async completeProcessingRun(runId: number, succeeded: number, failed: number): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    const status = failed === 0 ? 'succeeded' : succeeded === 0 ? 'failed' : 'partial';
    await this.db.execute(
      `UPDATE processing_runs SET status = $1, succeeded_count = $2, failed_count = $3,
       completed_at = datetime('now') WHERE id = $4`,
      [status, succeeded, failed, runId]
    );
  }

  async getDatabaseHealth(): Promise<{ integrity: string; foreignKeyIssues: number; pendingReviews: number }> {
    if (!this.db) throw new Error('数据库未初始化');
    const integrity = await this.db.select<{ integrity_check: string }>('PRAGMA integrity_check');
    const foreignKeys = await this.db.select<Record<string, unknown>>('PRAGMA foreign_key_check');
    const pending = await this.db.select<{ count: number }>('SELECT COUNT(*) AS count FROM field_observations WHERE review_status IN (\'pending\', \'conflicted\')');
    return { integrity: integrity[0]?.integrity_check || 'unknown', foreignKeyIssues: foreignKeys.length, pendingReviews: pending[0]?.count || 0 };
  }

  /**
   * 获取处理统计
   */
  async getProcessingStats(): Promise<ProcessingStats> {
    if (!this.db) throw new Error('数据库未初始化');

    const result = await this.db.select<ProcessingStats>(`
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

    return await this.db.select<any>(`
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

    const result = await this.db.select<{ count: number }>(
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
  async getProjects(): Promise<Project[]> {
    if (!this.db) throw new Error('数据库未初始化');
    const rows = await this.db.select<any>('SELECT * FROM projects ORDER BY updated_at DESC');
    return rows.map(row => ({
      id: String(row.id),
      name: row.name || '',
      contractNo: row.contract_no || '',
      contractAmount: row.contract_amount || 0,
      totalCost: row.total_cost || 0,
      laborCost: row.labor_cost || 0,
      materialCost: row.material_cost || 0,
      equipmentCost: row.equipment_cost || 0,
      subcontractAmount: row.subcontract_amount || 0,
      settlementAmount: row.settlement_amount || 0,
      settlementDate: row.settlement_date || '',
      totalPaid: row.total_paid || 0,
      estimatedProfitRate: row.estimated_profit_rate || 0,
      actualProfitRate: row.actual_profit_rate || 0,
      plannedEndDate: row.planned_end_date || '',
      progressPercent: row.progress_percent || 0,
      warrantyRatio: row.warranty_ratio || 0,
      warrantyDueDate: row.warranty_due_date || '',
      mainSubcontractor: row.main_subcontractor || '',
      mainSubcontractorAmount: row.main_subcontractor_amount || 0,
      riskLevel: row.risk_level || 'low',
      updatedAt: row.updated_at || '',
    }));
  }

  /**
   * 插入或更新项目
   */
  async upsertProject(project: Omit<Project, 'updatedAt'> & { id?: string }): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    await this.db.execute(
      `INSERT INTO projects (name, contract_no, contract_amount, total_cost, labor_cost, material_cost, equipment_cost, subcontract_amount, settlement_amount, settlement_date, total_paid, estimated_profit_rate, actual_profit_rate, planned_end_date, progress_percent, warranty_ratio, warranty_due_date, risk_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT(name) DO UPDATE SET
         name = $1, contract_no = $2, contract_amount = $3, total_cost = $4,
         labor_cost = $5, material_cost = $6, equipment_cost = $7, subcontract_amount = $8,
         settlement_amount = $9, settlement_date = $10, total_paid = $11,
         estimated_profit_rate = $12, actual_profit_rate = $13, planned_end_date = $14,
         progress_percent = $15, warranty_ratio = $16, warranty_due_date = $17, risk_level = $18,
         updated_at = datetime('now')`,
      [project.name, project.contractNo, project.contractAmount, project.totalCost,
       project.laborCost, project.materialCost, project.equipmentCost, project.subcontractAmount,
       project.settlementAmount, project.settlementDate, project.totalPaid,
       project.estimatedProfitRate, project.actualProfitRate, project.plannedEndDate,
       project.progressPercent, project.warrantyRatio, project.warrantyDueDate, project.riskLevel]
    );
  }

  /**
   * 获取付款记录
   */
  async getPayments(projectId: number): Promise<Payment[]> {
    if (!this.db) throw new Error('数据库未初始化');
    return await this.db.select<Payment>(
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
  async getSubcontractors(projectId: number): Promise<Subcontractor[]> {
    if (!this.db) throw new Error('数据库未初始化');
    return await this.db.select<Subcontractor>(
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
  async getSchedules(projectId: number): Promise<Schedule[]> {
    if (!this.db) throw new Error('数据库未初始化');
    return await this.db.select<Schedule>(
      'SELECT * FROM schedules WHERE project_id = $1',
      [projectId]
    );
  }

  /**
   * 添加进度计划
   */
  async addSchedule(sched: { project_id: number; planned_start_date: string; planned_end_date: string; actual_start_date: string; actual_end_date: string; progress_percent: number; milestone_name?: string }): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    await this.db.execute(
      'INSERT INTO schedules (project_id, planned_start_date, planned_end_date, actual_start_date, actual_end_date, progress_percent, milestone_name) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [sched.project_id, sched.planned_start_date, sched.planned_end_date, sched.actual_start_date, sched.actual_end_date, sched.progress_percent, sched.milestone_name]
    );
  }

  /**
   * 检查是否有新数据更新（热更新检测）
   */
  async checkForUpdates(): Promise<{ hasUpdate: boolean; latestTime: string }> {
    if (!this.db) throw new Error('数据库未初始化');
    const result = await this.db.select<any>(
      "SELECT MAX(updated_at) as latest FROM files"
    );
    return {
      hasUpdate: result.length > 0 && result[0].latest !== null,
      latestTime: result[0]?.latest || '',
    };
  }

  /**
   * 【Sprint 1 新增】检查是否有提取的字段数据
   */
  async hasExtractedFields(): Promise<boolean> {
    if (!this.db) throw new Error('数据库未初始化');
    try {
      const result = await this.db.select<{ count: number }>('SELECT COUNT(*) as count FROM extracted_fields');
      return result.length > 0 && result[0].count > 0;
    } catch (error) {
      console.error('[DatabaseService] 检查extracted_fields失败:', error);
      return false;
    }
  }

  /**
   * 【Sprint 4 新增】获取文件哈希缓存
   */
  async getFileHash(filePath: string, modified: number, size: number): Promise<string | null> {
    if (!this.db) throw new Error('数据库未初始化');
    try {
      const result = await this.db.select<{ file_hash: string }>(
        'SELECT file_hash FROM files WHERE file_path = $1 AND modified_time = $2 AND file_size = $3 AND file_hash IS NOT NULL',
        [filePath, new Date(modified * 1000).toISOString(), size]
      );
      return result.length > 0 ? result[0].file_hash : null;
    } catch (error) {
      console.error('[DatabaseService] 获取哈希缓存失败:', error);
      return null;
    }
  }

  /**
   * 【Sprint 4 新增】保存文件哈希到缓存
   */
  async saveFileHash(filePath: string, modified: number, size: number, hash: string): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    try {
      await this.db.execute(
        `INSERT INTO files (file_path, file_name, file_size, modified_time, file_hash, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         ON CONFLICT(file_path) DO UPDATE SET
           file_hash = $5,
           modified_time = $4,
           file_size = $3,
           updated_at = datetime('now')`,
        [
          filePath,
          filePath.split(/[/\\]/).pop() || 'unknown',
          size,
          new Date(modified * 1000).toISOString(),
          hash
        ]
      );
    } catch (error) {
      console.error('[DatabaseService] 保存哈希缓存失败:', error);
    }
  }

  /**
   * 【Sprint 5 新增】获取所有合同数据
   */
  async getContracts(): Promise<Contract[]> {
    if (!this.db) throw new Error('数据库未初始化');
    try {
      return await this.db.select('SELECT * FROM contracts ORDER BY created_at DESC');
    } catch (error) {
      console.error('[DatabaseService] 获取合同数据失败:', error);
      return [];
    }
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
