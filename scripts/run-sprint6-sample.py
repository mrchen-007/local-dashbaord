#!/usr/bin/env python3
"""Sprint 6 real-sample acceptance runner.

Runs the same parser used by the desktop extraction path against a user-provided
sample directory. It never mutates the sample; only writes a JSON evidence file.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "python"))
from parse_file import is_supported_file, parse_document  # noqa: E402


def classify(path: Path) -> str:
    return path.suffix.lower() or "<none>"


async def run(sample: Path) -> dict[str, Any]:
    files = sorted(p for p in sample.rglob("*") if p.is_file())
    rows: list[dict[str, Any]] = []
    for path in files:
        ext = classify(path)
        rel = str(path.relative_to(sample))
        if not is_supported_file(str(path)):
            rows.append({"path": rel, "extension": ext, "status": "unsupported", "error": f"unsupported format: {ext}"})
            continue
        result = await parse_document(str(path))
        if result.get("success"):
            rows.append({
                "path": rel,
                "extension": ext,
                "status": "success",
                "content_length": len(result.get("content") or ""),
                "parse_duration_ms": result.get("parse_duration_ms"),
            })
        else:
            rows.append({
                "path": rel,
                "extension": ext,
                "status": "failed",
                "error": result.get("error", "unknown parser error"),
                "parse_duration_ms": result.get("parse_duration_ms"),
            })

    by_ext: dict[str, dict[str, int]] = defaultdict(dict)
    for ext in sorted({r["extension"] for r in rows}):
        counts = Counter(r["status"] for r in rows if r["extension"] == ext)
        by_ext[ext] = dict(sorted(counts.items()))
    counts = Counter(r["status"] for r in rows)
    return {
        "schema_version": 1,
        "sample_directory": str(sample),
        "total_files": len(rows),
        "counts": dict(sorted(counts.items())),
        "by_extension": by_ext,
        "failed_files": [r for r in rows if r["status"] == "failed"],
        "unsupported_files": [r for r in rows if r["status"] == "unsupported"],
        "successful_files": [r for r in rows if r["status"] == "success"],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("sample_directory", type=Path)
    parser.add_argument("--output", type=Path, default=Path("tests/golden-sample/actual.json"))
    args = parser.parse_args()
    sample = args.sample_directory.resolve()
    if not sample.is_dir():
        parser.error(f"sample directory does not exist: {sample}")
    evidence = asyncio.run(run(sample))
    output = args.output
    if not output.is_absolute():
        output = (REPO_ROOT / output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "sample_directory": evidence["sample_directory"],
        "total_files": evidence["total_files"],
        "counts": evidence["counts"],
        "by_extension": evidence["by_extension"],
        "output": str(output),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
