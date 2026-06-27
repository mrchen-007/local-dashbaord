// ETL 聚合脚本
// 从 extracted_fields 聚合数据到 projects 表
// 打通数据流，替代 mockData

import { invoke } from '@tauri-apps/api/tauri';
import { mapUIEFieldsToDB } from '../extraction/fieldMapper';

const DB_URL = 'sqlite:dedup_tool.db';

async function dbExecute(query: string, values?: unknown[]): Promise<void> {
  await invoke('plugin:sql|execute', { db: DB_URL, query, values });
}

async function dbSelect<T>(query: string, values?: unknown[]): Promise<T[]> {
  return await invoke<T[]>('plugin:sql|select', { db: DB_URL, query, values });
}

function extractProjectName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return parts[0] || '未知项目';
}

export async function aggregateToProjects(): Promise<void> {
  await dbExecute(`
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
      scan_time TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await dbExecute(`
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

  await dbExecute(`
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

  await dbExecute(`
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

  await dbExecute(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      payment_date TEXT,
      amount REAL,
      payment_type TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await dbExecute(`
    CREATE TABLE IF NOT EXISTS subcontractors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      name TEXT,
      amount REAL,
      ratio REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await dbExecute(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      milestone TEXT,
      plan_date TEXT,
      actual_date TEXT,
      progress REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await dbExecute('DELETE FROM projects');
  await dbExecute('DELETE FROM contracts');
  await dbExecute('DELETE FROM cost_items');
  await dbExecute('DELETE FROM settlements');

  let extractedData = await dbSelect<any>(`
    SELECT ef.file_path, ef.contract_no, ef.contract_amount, ef.party_a, ef.party_b, ef.sign_date,
           ef.labor_cost, ef.material_cost, ef.equipment_cost, ef.subcontract_amount,
           ef.settlement_amount, ef.settlement_date, ef.warranty_ratio
    FROM extracted_fields ef
    WHERE ef.contract_amount IS NOT NULL OR ef.labor_cost IS NOT NULL 
       OR ef.material_cost IS NOT NULL OR ef.settlement_amount IS NOT NULL
  `);

  if (extractedData.length === 0) {
    console.log('extracted_fields 为空，尝试从 parsed_contents 回退解析...');
    const parsedContents = await dbSelect<any>(
      'SELECT file_path, content_text FROM parsed_contents WHERE content_text IS NOT NULL'
    );
    
    if (parsedContents.length > 0) {
      extractedData = [];
      for (const pc of parsedContents) {
        try {
          const fields = JSON.parse(pc.content_text);
          if (fields && typeof fields === 'object') {
            const mappedFields = mapUIEFieldsToDB(fields);
            if (Object.keys(mappedFields).length > 0) {
              extractedData.push({
                file_path: pc.file_path,
                contract_no: mappedFields.contract_no || null,
                contract_amount: mappedFields.contract_amount || null,
                party_a: mappedFields.party_a || null,
                party_b: mappedFields.party_b || null,
                sign_date: mappedFields.sign_date || null,
                labor_cost: mappedFields.labor_cost || null,
                material_cost: mappedFields.material_cost || null,
                equipment_cost: mappedFields.equipment_cost || null,
                subcontract_amount: mappedFields.subcontract_amount || null,
                settlement_amount: mappedFields.settlement_amount || null,
                settlement_date: mappedFields.settlement_date || null,
                warranty_ratio: mappedFields.warranty_ratio || null,
              });
            }
          }
        } catch (e) {
          console.warn(`解析 parsed_contents JSON 失败: ${pc.file_path}`, e);
        }
      }
    }
  }

  if (extractedData.length === 0) {
    console.log('没有可聚合的抽取数据');
    return;
  }

  const projectMap = new Map<string, any[]>();
  extractedData.forEach((row: any) => {
    const projectName = extractProjectName(row.file_path);
    if (!projectMap.has(projectName)) {
      projectMap.set(projectName, []);
    }
    projectMap.get(projectName)!.push(row);
  });

  for (const [projectName, rows] of projectMap) {
    const contractAmount = Math.max(...rows.map(r => r.contract_amount || 0));
    const laborCost = rows.reduce((sum, r) => sum + (r.labor_cost || 0), 0);
    const materialCost = rows.reduce((sum, r) => sum + (r.material_cost || 0), 0);
    const equipmentCost = rows.reduce((sum, r) => sum + (r.equipment_cost || 0), 0);
    const subcontractAmount = rows.reduce((sum, r) => sum + (r.subcontract_amount || 0), 0);
    const totalCost = laborCost + materialCost + equipmentCost + subcontractAmount;
    const settlementAmount = Math.max(...rows.map(r => r.settlement_amount || 0));
    const settlementDate = rows.find(r => r.settlement_date)?.settlement_date || null;
    const contractNo = rows.find(r => r.contract_no)?.contract_no || null;
    const partyA = rows.find(r => r.party_a)?.party_a || null;
    const partyB = rows.find(r => r.party_b)?.party_b || null;
    const signDate = rows.find(r => r.sign_date)?.sign_date || null;
    const warrantyRatio = rows.find(r => r.warranty_ratio)?.warranty_ratio || 0;

    const estimatedProfit = contractAmount - totalCost;
    const estimatedProfitRate = contractAmount > 0 ? estimatedProfit / contractAmount : 0;
    const actualProfit = settlementAmount - totalCost;
    const actualProfitRate = settlementAmount > 0 ? actualProfit / settlementAmount : 0;

    await dbExecute(
      `INSERT INTO projects (name, contract_no, contract_amount, total_cost, labor_cost, material_cost, equipment_cost, subcontract_amount, settlement_amount, settlement_date, total_paid, estimated_profit_rate, actual_profit_rate, warranty_ratio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [projectName, contractNo, contractAmount, totalCost, laborCost, materialCost, equipmentCost, subcontractAmount, settlementAmount, settlementDate, 0, estimatedProfitRate, actualProfitRate, warrantyRatio]
    );

    if (contractNo) {
      await dbExecute(
        `INSERT INTO contracts (project_id, contract_no, amount, party_a, party_b, sign_date, file_path)
         SELECT id, $1, $2, $3, $4, $5, $6 FROM projects WHERE name = $7`,
        [contractNo, contractAmount, partyA, partyB, signDate, rows[0].file_path, projectName]
      );
    }

    if (laborCost > 0) {
      await dbExecute(
        `INSERT INTO cost_items (project_id, cost_type, amount, file_path)
         SELECT id, '人工', $1, $2 FROM projects WHERE name = $3`,
        [laborCost, rows[0].file_path, projectName]
      );
    }
    if (materialCost > 0) {
      await dbExecute(
        `INSERT INTO cost_items (project_id, cost_type, amount, file_path)
         SELECT id, '材料', $1, $2 FROM projects WHERE name = $3`,
        [materialCost, rows[0].file_path, projectName]
      );
    }
    if (equipmentCost > 0) {
      await dbExecute(
        `INSERT INTO cost_items (project_id, cost_type, amount, file_path)
         SELECT id, '设备', $1, $2 FROM projects WHERE name = $3`,
        [equipmentCost, rows[0].file_path, projectName]
      );
    }
    if (subcontractAmount > 0) {
      await dbExecute(
        `INSERT INTO cost_items (project_id, cost_type, amount, file_path)
         SELECT id, '分包', $1, $2 FROM projects WHERE name = $3`,
        [subcontractAmount, rows[0].file_path, projectName]
      );
    }

    if (settlementAmount > 0) {
      await dbExecute(
        `INSERT INTO settlements (project_id, settle_date, amount, file_path)
         SELECT id, $1, $2, $3 FROM projects WHERE name = $4`,
        [settlementDate, settlementAmount, rows[0].file_path, projectName]
      );
    }
  }

  console.log(`聚合完成: ${projectMap.size} 个项目`);
}
