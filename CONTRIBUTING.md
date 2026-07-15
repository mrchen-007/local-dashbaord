# Engineering Rules

## Required checks

Run these commands before opening a pull request or publishing a release:

```powershell
npm run build
npm test
npm run verify:golden
cargo check --offline --manifest-path src-tauri/Cargo.toml
python -m compileall -q python
```

## Change boundaries

- Keep React pages in their domain directory and put reusable UI or utilities in `src/shared`.
- Access Tauri commands only through `src/api/tauriApi.ts`; do not call `invoke` from new page components.
- Make schema changes only through a numbered file in `migrations/`; do not add a second initialization SQL source.
- Do not add mock data, hard-coded local paths, test pages, or hidden development routes to production navigation.
- Remove a module when no production import, dynamic import, command registration, or documented operational entry point uses it.
- Add or update focused tests whenever business rules, parsing, aggregation, or version matching changes.

## Review gate

- Keep `npm run build` free of TypeScript errors and `git diff --check` free of whitespace errors.
- Prefer explicit types at boundary layers. Do not introduce `any` in new application code.
- Preserve evidence, source path, and review state when changing extraction or ETL workflows.
- Request only the Tauri permissions required by the implemented feature.
