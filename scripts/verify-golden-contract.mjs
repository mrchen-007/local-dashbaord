import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'tests/golden-sample');
const expectedPath = resolve(root, 'expected.json');

if (!existsSync(expectedPath)) {
  throw new Error(`未找到黄金样本期望文件：${expectedPath}`);
}

const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));
if (expected.status === 'awaiting-sanitized-sample') {
  console.log('黄金样本结构有效，但尚未导入脱敏真实样本；跳过数据断言。');
  process.exit(0);
}

for (const [section, keys] of Object.entries({
  files: ['total', 'duplicates', 'parse_success_min'],
  projects: ['count'],
})) {
  for (const key of keys) {
    if (!Number.isFinite(expected[section]?.[key])) {
      throw new Error(`黄金样本缺少数值断言：${section}.${key}`);
    }
  }
}

if (!Array.isArray(expected.confirmed_fields)) {
  throw new Error('confirmed_fields 必须为数组。');
}

console.log(`黄金样本契约有效：${root}`);
