"""JSON persistence for PersonaForge library entries."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


RESERVED_FILES = {"schema_version.json", "data_version.json"}


def category_path(data_root: Path, category: str) -> Path:
    cleaned = category.replace("\\", "/").strip("/")
    if not cleaned or cleaned.startswith(".") or ".." in cleaned.split("/"):
        raise ValueError("category must be a relative path inside the data directory")
    path = data_root.joinpath(*cleaned.split("/"))
    if path.suffix != ".json":
        path = path.with_suffix(".json")
    if path.name in RESERVED_FILES or data_root.resolve() not in path.resolve().parents:
        raise ValueError("category cannot target a reserved or external file")
    return path


def load_entries(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError(f"{path} is not a library entry array")
    return value


def save_entries(path: Path, entries: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def list_categories(data_root: Path) -> list[str]:
    categories: list[str] = []
    for path in sorted(data_root.rglob("*.json")):
        if path.name not in RESERVED_FILES and not ({"templates", "expansions", "pools"} & set(path.relative_to(data_root).parts)):
            categories.append(path.relative_to(data_root).with_suffix("").as_posix())
    return categories


def all_entries(data_root: Path) -> list[tuple[str, dict[str, Any]]]:
    return [(category, entry) for category in list_categories(data_root) for entry in load_entries(category_path(data_root, category))]
