"""Deterministic, predefined category expansion."""
from __future__ import annotations
import json
from pathlib import Path

def expand(data_root: Path, category: str, entry_id: str, level: str = "common") -> list[str]:
    if level == "none": return []
    path = data_root / "expansions" / f"{category}.json"
    if not path.exists(): return []
    definitions = json.loads(path.read_text(encoding="utf-8"))
    if entry_id not in definitions: return []
    if level not in ("common", "full"): raise ValueError("expansion level must be none, common, or full")
    return list(definitions[entry_id].get(level, definitions[entry_id].get("common", [])))
