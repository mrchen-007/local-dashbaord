# AI Build Guide

## Source of truth

Before changing code, read these files in order:

1. `docs/TECHNICAL_REFACTOR_PRD.md`
2. `docs/PROJECT_STANDARDS.md`
3. `CONTRIBUTING.md`
4. The current migration, API adapter, Rust command, and page files affected by the task

The technical PRD defines product scope. Existing code defines compatibility constraints. Do not invent a parallel architecture.

## Implementation strategy

- Refactor incrementally. Do not rewrite the application or replace React, Tauri, SQLite, or Python.
- Complete one Sprint or one independently testable vertical slice at a time.
- Keep the application buildable and usable after every slice.
- Preserve all existing user changes. Never reset, discard, or overwrite unrelated dirty-worktree changes.
- Do not add mock fallback, hard-coded project paths, hidden production test pages, or a second schema source.
- Do not claim production readiness without a real de-identified end-to-end sample.

## Required architecture boundaries

```text
Page -> Domain Service -> src/api -> Rust Command -> SQLite / Filesystem
Page -> Extraction Service -> Python Local API -> Field Observation
```

- New page components must not call SQL or build privileged filesystem commands.
- Add new Tauri calls through `src/api`; migrate direct page-level `invoke` calls when touching those pages.
- Rust owns path validation and filesystem mutations.
- Python owns parsing and inference only.
- Only confirmed field observations may feed ETL and risk rules.
- Every persisted risk must include evidence and a rule version.

## Build sequence

### Sprint 0: establish the baseline

1. Inspect `git status`; preserve all existing changes.
2. Run the existing frontend, Rust, Python, and golden-contract checks.
3. Inspect how migrations are currently loaded before creating a new migration.
4. Map current `projects`, file scan, extraction, review, ETL, and risk call paths.
5. Record blockers instead of silently bypassing them.

### Sprint 1: create the project backbone

Implement the smallest vertical slice that provides:

- A project domain type and explicit project status.
- Backward-compatible project persistence.
- Typed create, list, get, update, bind-directory, and archive operations.
- A project center as the first useful screen.
- A current-project context used by project-scoped pages.
- Empty, loading, error, and unavailable-runtime states.

Do not migrate scanning or extraction until project creation and reopening are verified.

### Sprint 2 and later

Follow the Sprint order in `docs/TECHNICAL_REFACTOR_PRD.md`. At each stage, migrate one real workflow and remove its old unscoped path only after tests prove the new path works.

## Database rules

- `migrations/` is the only schema source of truth.
- Never require deletion of an existing database.
- Prefer additive migrations and explicit backfill steps.
- Add indexes and foreign keys for every new project-scoped relationship.
- Preserve observations and decisions as append-only evidence where required by the PRD.
- Store timestamps consistently and document whether they are UTC or local time.

## Testing requirements

For every vertical slice:

1. Add focused unit tests for business rules and transformations.
2. Add integration coverage for changed API or database contracts when practical.
3. Run:

```powershell
npm run build
npm test
npm run verify:golden
cargo check --offline --manifest-path src-tauri/Cargo.toml
python -m compileall -q python
git diff --check
```

4. Report commands that were not run and explain why.

## Definition of done

A task is complete only when the real workflow is connected end to end, errors are visible to the user, data ownership is clear, tests cover the changed contract, documentation reflects the new behavior, and no silent mock fallback remains.

## First instruction for the building AI

Start with Sprint 0. Inspect the current implementation and produce a short compatibility map for project persistence, migration loading, Tauri API boundaries, and page routing. Then implement only the Sprint 1 project backbone, verify it, and report remaining migration risks before continuing.
