# Sprint 5: Project Workspace And Report Center

Project Center's open action now enters the project workspace. The workspace queries only the active project's scanned files, formal ledger, and persisted risk findings. It does not fall back to legacy global demonstration data.

The report center exports only the active project's formal ledger, persisted risk findings, and review counts. Every Excel or Word export includes its generation time, ledger data version, risk rule version, and unconfirmed-field count. `report_exports` records the export file name and versions.

The browser download API cannot truthfully expose the user's final absolute save path. The audit table records the downloaded file name instead of inventing an unavailable path.
