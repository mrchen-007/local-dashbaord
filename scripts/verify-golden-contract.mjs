import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'tests/golden-sample');
const expectedPath = resolve(root, 'expected.json');
const actualPath = resolve(root, 'actual.json');

if (!existsSync(expectedPath)) {
  throw new Error(`未找到黄金样本期望文件：${expectedPath}`);
}
if (!existsSync(actualPath)) {
  throw new Error(`未找到真实样本证据文件：${actualPath}；先运行 scripts/run-sprint6-sample.py`);
}

const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));
const actual = JSON.parse(readFileSync(actualPath, 'utf8'));
if (expected.status === 'awaiting-sanitized-sample') {
  throw new Error('黄金样本仍是占位状态，必须先填写真实断言');
}

for (const [section, keys] of Object.entries({
  files: ['total', 'parse_success_min'],
  projects: ['count'],
})) {
  for (const key of keys) {
    if (!Number.isFinite(expected[section]?.[key])) {
      throw new Error(`黄金样本缺少数值断言：${section}.${key}`);
    }
  }
}

if (!Array.isArray(expected.confirmed_fields)) {
  throw new Error('confirmed_fields 必须为数组');
}

const counts = actual.counts ?? {};
if (actual.total_files !== expected.files.total) {
  throw new Error(`文件总数不匹配：expected=${expected.files.total} actual=${actual.total_files}`);
}
if ((counts.success ?? 0) < expected.files.parse_success_min) {
  throw new Error(`解析成功数低于下限：expected_min=${expected.files.parse_success_min} actual=${counts.success ?? 0}`);
}
for (const key of ['failed', 'unsupported']) {
  const min = expected.parse?.[key];
  if (Number.isFinite(min) && (counts[key] ?? 0) < min) {
    throw new Error(`${key} 数量低于断言：expected_min=${min} actual=${counts[key] ?? 0}`);
  }
}

console.log(`黄金样本契约有效：${root}`);
console.log(`真实样本统计：total=${actual.total_files} success=${counts.success ?? 0} failed=${counts.failed ?? 0} unsupported=${counts.unsupported ?? 0}`);
