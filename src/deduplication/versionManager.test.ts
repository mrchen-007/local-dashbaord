import { describe, expect, it } from 'vitest';
import { VersionManager } from './versionManager';
import { FileInfo } from '../shared/types';

const file = (name: string, modified: number): FileInfo => ({
  path: `D:/project/${name}`, name, modified, created: modified, size: 10, isDir: false, extension: 'docx',
});

describe('VersionManager', () => {
  it('groups versioned files and preserves the newest file', () => {
    const groups = new VersionManager([
      file('施工合同_V1.docx', 1_700_000_000),
      file('施工合同_V2.docx', 1_700_010_000),
      file('其他文件.docx', 1_700_020_000),
    ]).analyzeVersions();

    expect(groups).toHaveLength(1);
    expect(groups[0].latestVersion.name).toBe('施工合同_V2.docx');
    expect(groups[0].totalVersions).toBe(2);
  });
});
