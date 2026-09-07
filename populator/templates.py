"""Reusable entry defaults stored separately from canonical library data."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def template_path(data_root: Path) -> Path:
    return data_root / "templates" / "entry_templates.json"


def load_templates(data_root: Path) -> dict[str, dict[str, Any]]:
    path = template_path(data_root)
    if not path.exists():
        return {}
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("template storage must be an object")
    return value


def save_templates(data_root: Path, templates: dict[str, dict[str, Any]]) -> None:
    path = template_path(data_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(templates, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
