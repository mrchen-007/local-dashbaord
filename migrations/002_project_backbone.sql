ALTER TABLE projects ADD COLUMN code TEXT;
ALTER TABLE projects ADD COLUMN source_root TEXT;
ALTER TABLE projects ADD COLUMN owner TEXT;
ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';

UPDATE projects
SET source_root = path
WHERE source_root IS NULL AND path IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_code_unique
ON projects(code)
WHERE code IS NOT NULL AND code <> '';

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_source_root ON projects(source_root);
