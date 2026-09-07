"""Dry-run population impact estimates."""
from __future__ import annotations
from typing import Any
from populator.coverage import recommendations
from populator.storage import load_entries, category_path

def plan_batch(data_root, category: str, candidates: list[dict[str, Any]]) -> dict[str, Any]:
    before = len(load_entries(category_path(data_root, category)))
    after = before + len(candidates)
    return {"category": category, "before": before, "proposed": len(candidates),
            "after": after, "recommendations": recommendations(data_root, 10), "mutates": False}
