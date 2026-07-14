import { describe, expect, it } from 'vitest';
import { mapUIEFieldsToDB } from './fieldMapper';

describe('mapUIEFieldsToDB', () => {
  it('normalizes Chinese numeric fields and retains text fields', () => {
    expect(mapUIEFieldsToDB({
      '合同编号': 'HT-2026-001',
      '合同总金额': '￥1,250,000.50',
      '质保金比例': '3%',
      '甲方': '甲方公司',
    })).toEqual({
      contract_no: 'HT-2026-001',
      contract_amount: 1250000.5,
      warranty_ratio: 3,
      party_a: '甲方公司',
    });
  });

  it('does not write unmapped values as business fields', () => {
    expect(mapUIEFieldsToDB({ '未知字段': 'value' })).toEqual({});
  });
});
