// 字段映射器
// 将 SiameseUIE 返回的中文字段名映射为数据库英文字段名

export const FIELD_MAP: Record<string, string> = {
  '合同编号': 'contract_no',
  '合同总金额': 'contract_amount',
  '甲方': 'party_a',
  '乙方': 'party_b',
  '签约日期': 'sign_date',
  '签订日期': 'sign_date',
  '人工成本': 'labor_cost',
  '人工成本_总价': 'labor_cost',
  '材料成本': 'material_cost',
  '材料成本_总价': 'material_cost',
  '设备成本': 'equipment_cost',
  '设备成本_总价': 'equipment_cost',
  '分包金额': 'subcontract_amount',
  '结算金额': 'settlement_amount',
  '结算日期': 'settlement_date',
  '质保金比例': 'warranty_ratio',
  '管理费': 'extra_fields',
  '累计已付款': 'extra_fields',
  '质保金': 'extra_fields',
  '付款方式': 'extra_fields',
};

const NUMBER_FIELDS = ['contract_amount', 'labor_cost', 'material_cost', 'equipment_cost', 'subcontract_amount', 'settlement_amount', 'warranty_ratio'];

export function mapUIEFieldsToDB(uiFields: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [cnKey, value] of Object.entries(uiFields)) {
    const enKey = FIELD_MAP[cnKey];
    if (enKey && value !== null && value !== undefined && value !== '') {
      if (NUMBER_FIELDS.includes(enKey)) {
        const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
        mapped[enKey] = isNaN(num) ? null : num;
      } else {
        mapped[enKey] = String(value);
      }
    }
  }
  return mapped;
}
