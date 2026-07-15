import { describe, expect, it } from 'vitest';
import { riskRuleVersion, sourceVersion } from './projectReportService';

describe('project report version metadata', () => {
  it('uses the formal ledger version and unique persisted rule versions', () => {
    expect(sourceVersion({ source_version: '1.0.0' })).toBe('1.0.0');
    expect(riskRuleVersion([
      { id: 1, rule_code: 'R100', rule_version: '1.0.0', level: 'medium', title: 'a', description: 'a', status: 'open', evidence_json: '[]', last_calculated_at: '2026-07-14' },
      { id: 2, rule_code: 'R101', rule_version: '1.0.0', level: 'high', title: 'b', description: 'b', status: 'open', evidence_json: '[]', last_calculated_at: '2026-07-14' },
      { id: 3, rule_code: 'R102', rule_version: '1.1.0', level: 'medium', title: 'c', description: 'c', status: 'open', evidence_json: '[]', last_calculated_at: '2026-07-14' },
    ])).toBe('1.0.0, 1.1.0');
  });

  it('labels a not-yet-built ledger and uncalculated rules explicitly', () => {
    expect(sourceVersion(null)).toBe('not-built');
    expect(riskRuleVersion([])).toBe('not-calculated');
  });
});
