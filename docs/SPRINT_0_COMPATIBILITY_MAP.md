# Sprint 0 Compatibility Map

## Persistence and migrations

- Database location remains the Tauri app-data SQLite file `dedup_tool.db`.
- Rust now enables foreign keys, WAL, and busy timeout before applying migrations in one transaction.
- `migrations/001_init.sql` remains the baseline schema; `002_project_backbone.sql` adds project code, source root, owner, status, indexes, and a legacy `path -> source_root` backfill.
- Existing databases are not deleted. Migration history is stored in `schema_migrations`.
- Legacy risk columns on `projects` remain untouched for backward compatibility.

## API boundary

- New project operations use typed Tauri commands through `src/api/tauriApi.ts`.
- The legacy generic database bridge remains for workflows not yet migrated in later sprints.
- `DatabaseService.initialize()` no longer creates tables; schema application is owned by Rust migrations.

## Routing and ownership

- The project center is the initial screen and can create, list, open, bind, and archive projects.
- `ProjectProvider` holds the active project for the current application session.
- Existing scan, extraction, review, ETL, and risk pages are not yet project-scoped; this is intentionally deferred to Sprints 2–4.

## Migration risks before Sprint 2

1. `src/shared/database.ts` still contains the legacy inlined schema definition for reference, but it is no longer executed. Remove it once its remaining generic workflows are migrated to typed APIs.
2. Existing unscoped `files`, `extracted_fields`, and field-review records have no `project_id`; their safe backfill requires the project-file model in Sprint 2.
3. A real de-identified end-to-end sample is still required before any production-readiness claim.
