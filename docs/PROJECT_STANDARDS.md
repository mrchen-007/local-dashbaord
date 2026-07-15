# Project Structure And Standards

## Directory responsibilities

| Path | Responsibility |
| --- | --- |
| `src/api` | Typed bridge to Tauri commands. |
| `src/deduplication` | Scan, hash, duplicate grouping, and version comparison. |
| `src/extraction` | File parsing, AI extraction, field mapping, and review UI. |
| `src/risk` | Project aggregation, risk calculation, reporting, and network view. |
| `src/shared` | Cross-domain UI, database access, ETL, formatting, and runtime diagnostics. |
| `src-tauri` | Rust command implementation and application permissions. |
| `migrations` | The single source of truth for database schema creation and evolution. |
| `tests` | Golden samples and acceptance fixtures only. |

## Layer rules

1. UI pages may call domain services and `src/api`, but must not contain SQL or direct shell access.
2. `src/shared/database.ts` owns SQL execution; migration files own schema definition.
3. Rust commands validate paths and own privileged filesystem work. Frontend code must not create alternate filesystem execution paths.
4. ETL can aggregate only confirmed field observations. Pending or conflicted observations are evidence, not facts.
5. Every new route must have a visible production navigation entry or be omitted from the production build.

## Code quality rules

1. Use `PascalCase.tsx` for React components and `camelCase.ts` for non-component modules.
2. Keep one responsibility per module. Extract only reusable behavior with at least two real consumers.
3. Avoid duplicate formatting, export, hashing, and data-access implementations; extend the existing shared implementation instead.
4. Delete unused code together with its dependency, route, permission, and documentation reference when applicable.
5. Use UTF-8, two spaces, LF, a final newline, and no trailing whitespace. `.editorconfig` is authoritative.

## Acceptance baseline

Before merge, the checks in `CONTRIBUTING.md` must pass. User-visible workflows must use real files or clearly labelled fixtures; silent mock fallback is prohibited.
