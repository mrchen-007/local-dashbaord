// ETL 聚合脚本
// 从 extracted_fields 聚合数据到 projects 表
// 打通数据流，替代 mockData

import { dbExecute as executeSql, dbSelect as selectSql } from '../api/tauriApi';

async function dbExecute(query: string, values?: unknown[]): Promise<void> {
  await executeSql(query, values);
}

async function dbSelect<T>(query: string, values?: unknown[]): Promise<T[]> {
  return await selectSql<T>(query, values);
}

function extractProjectName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return parts[0] || '未知项目';
}

export async function aggregateToProjects(lastSyncTime?: string): Promise<string> {
  // 表结构已在 database.ts createTables() 中创建（以 migrations/001_init.sql 为权威）
  // 这里只做数据聚合，不重复建表

  // 增量模式：只删除受影响的项目数据
  if (lastSyncTime) {
    // 获取本次需要处理的文件路径
    const affectedPaths = await dbSelect<{ file_path: string }>(
      `SELECT DISTINCT file_path FROM extracted_fields WHERE extracted_at > $1`,
      [lastSyncTime]
    );

    if (affectedPaths.length === 0) {
      console.log('无新数据需要聚合');
      return lastSyncTime;
    }

    // 获取受影响的项目名称
    const affectedProjects = new Set<string>();
    for (const p of affectedPaths) {
      affectedProjects.add(extractProjectName(p.file_path));
    }
    
    // 只删除受影响的项目相关数据
    for (const projectName of affectedProjects) {
      await dbExecute(`DELETE FROM payments WHERE project_id IN (SELECT id FROM projects WHERE name = $1)`, [projectName]);
      await dbExecute(`DELETE FROM subcontractors WHERE project_id IN (SELECT id FROM projects WHERE name = $1)`, [projectName]);
      await dbExecute(`DELETE FROM schedules WHERE project_id IN (SELECT id FROM projects WHERE name = $1)`, [projectName]);
      await dbExecute(`DELETE FROM settlements WHERE project_id IN (SELECT id FROM projects WHERE name = $1)`, [projectName]);
      await dbExecute(`DELETE FROM cost_items WHERE project_id IN (SELECT id FROM projects WHERE name = $1)`, [projectName]);
      await dbExecute(`DELETE FROM contracts WHERE project_id IN (SELECT id FROM projects WHERE name = $1)`, [projectName]);
      await dbExecute(`DELETE FROM projects WHERE name = $1`, [projectName]);
    }
  } else {
    // 全量模式：清空所有数据
    await dbExecute('DELETE FROM payments');
    await dbExecute('DELETE FROM subcontractors');
    await dbExecute('DELETE FROM schedules');
    await dbExecute('DELETE FROM settlements');
    await dbExecute('DELETE FROM cost_items');
    await dbExecute('DELETE FROM contracts');
    await dbExecute('DELETE FROM projects');
  }

  const timeCondition = lastSyncTime ? 'AND fo.reviewed_at > $1' : '';

  let extractedData = await dbSelect<any>(`
    SELECT fo.file_path,
           MAX(CASE WHEN fo.field_key = 'contract_no' THEN fo.normalized_value END) AS contract_no,
           MAX(CASE WHEN fo.field_key = 'contract_amount' THEN CAST(fo.normalized_value AS REAL) END) AS contract_amount,
           MAX(CASE WHEN fo.field_key = 'party_a' THEN fo.normalized_value END) AS party_a,
           MAX(CASE WHEN fo.field_key = 'party_b' THEN fo.normalized_value END) AS party_b,
           MAX(CASE WHEN fo.field_key = 'sign_date' THEN fo.normalized_value END) AS sign_date,
           MAX(CASE WHEN fo.field_key = 'labor_cost' THEN CAST(fo.normalized_value AS REAL) END) AS labor_cost,
           MAX(CASE WHEN fo.field_key = 'material_cost' THEN CAST(fo.normalized_value AS REAL) END) AS material_cost,
           MAX(CASE WHEN fo.field_key = 'equipment_cost' THEN CAST(fo.normalized_value AS REAL) END) AS equipment_cost,
           MAX(CASE WHEN fo.field_key = 'subcontract_amount' THEN CAST(fo.normalized_value AS REAL) END) AS subcontract_amount,
           MAX(CASE WHEN fo.field_key = 'settlement_amount' THEN CAST(fo.normalized_value AS REAL) END) AS settlement_amount,
           MAX(CASE WHEN fo.field_key = 'settlement_date' THEN fo.normalized_value END) AS settlement_date,
           MAX(CASE WHEN fo.field_key = 'warranty_ratio' THEN CAST(fo.normalized_value AS REAL) END) AS warranty_ratio,
           MAX(fo.reviewed_at) AS extracted_at
    FROM field_observations fo
    WHERE fo.review_status = 'confirmed'
    ${timeCondition}
    GROUP BY fo.file_path
  `, lastSyncTime ? [lastSyncTime] : []);

  if (extractedData.length === 0) {
    console.log('没有已确认的字段数据可聚合');
    return lastSyncTime || new Date().toISOString();
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

  // 返回最新的 extracted_at 时间戳
  const latestResult = await dbSelect<{ latest: string }>(
    `SELECT MAX(extracted_at) as latest FROM extracted_fields`
  );
  return latestResult[0]?.latest || new Date().toISOString();
}
