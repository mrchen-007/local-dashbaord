# Sprint 2 Project Scan

## Implemented workflow

1. Open a project in the project center and bind its source directory.
2. Open the file deduplication page and start a scan.
3. The desktop app scans only the active project's bound root, skips ignored directories and symbolic links, and persists each file to `project_files`.
4. A `project_scan_tasks` record stores the run status and aggregate counts. Re-running the scan upserts the same `(project_id, relative_path)` records, so interrupted or later scans can safely be repeated without deleting the database.

## Current boundary

- The legacy global `files` table remains available to extraction and risk workflows until their project-scoped migration in Sprints 3 and 4.
- Content hashes calculated by duplicate analysis are not yet persisted to `project_files`; that persistence belongs to the project-scoped hash and extraction handoff.
- Scan cancellation and background resume require the long-running task runner planned for a later implementation slice. The current scan is synchronous and safely repeatable.
