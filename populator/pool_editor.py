"""Review-first pool editing operations for the local Control Centre."""
from __future__ import annotations

import hashlib
import json
import secrets
from pathlib import Path
from typing import Any
from zipfile import ZipFile

from populator.backup import create_backup, record_undo
from populator.importer import review_import
from populator.storage import category_path, load_entries, save_entries
from populator.validator import validate_entry, validate_file


def _hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else ""


class PoolEditor:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.data = self.root / "data"
        self.backups = self.root / "backups"
        self.previews: dict[str, dict[str, Any]] = {}

    def preview(self, category: str, candidates: list[dict[str, Any]]) -> dict[str, Any]:
        target = category_path(self.data, category)
        existing = load_entries(target)
        review = review_import(candidates, existing)
        token = secrets.token_urlsafe(18)
        self.previews[token] = {"category": category, "path": str(target), "hash": _hash(target), "review": review}
        return {"token": token, "category": category, "existing": len(existing),
                "valid": review.valid, "duplicates": [{"entry": e, "matches": m} for e, m in review.duplicates],
                "variants": [{"entry": e, "matches": m} for e, m in review.variants],
                "errors": [{"entry": e, "issues": issues} for e, issues in review.errors],
                "can_apply": bool(review.valid) and not review.errors}

    def apply(self, token: str) -> dict[str, Any]:
        item = self.previews.pop(token, None)
        if not item:
            raise ValueError("Import preview is missing or has expired; preview the changes again.")
        target = Path(item["path"])
        if _hash(target) != item["hash"]:
            raise ValueError("The destination changed after preview; review the import again.")
        review = item["review"]
        prospective = load_entries(target) + review.valid
        ids = [entry.get("id") for entry in prospective]
        duplicates = sorted({entry_id for entry_id in ids if entry_id and ids.count(entry_id) > 1})
        if duplicates:
            raise ValueError("Import would create duplicate ids: " + ", ".join(duplicates))
        issues = [message for index, entry in enumerate(prospective) for message in validate_entry(entry, index)]
        if issues:
            raise ValueError("Import failed validation: " + "; ".join(issues))
        backup = create_backup(self.data, self.backups)
        record_undo(self.data, [target], f"Control Centre import into {item['category']}")
        save_entries(target, prospective)
        if validate_file(target):
            from populator.backup import undo_last
            undo_last(self.data)
            raise ValueError("Import failed destination validation.")
        return {"category": item["category"], "added": len(review.valid), "backup": backup.name}

    def restore(self, archive_name: str, conflicts: str = "reject") -> dict[str, Any]:
        if Path(archive_name).name != archive_name or not archive_name.endswith(".zip"):
            raise ValueError("Invalid backup name")
        archive = self.backups / archive_name
        if not archive.exists():
            raise FileNotFoundError("Backup not found")
        members: dict[str, bytes] = {}
        with ZipFile(archive) as source:
            for name in source.namelist():
                if name.startswith("data/") and not name.endswith("/"):
                    relative = Path(name[5:])
                    if relative.is_absolute() or ".." in relative.parts:
                        raise ValueError("Backup contains an unsafe path")
                    members[relative.as_posix()] = source.read(name)
        changed = [name for name, content in members.items() if _hash(self.data / name) and _hash(self.data / name) != hashlib.sha256(content).hexdigest()]
        if changed and conflicts == "reject":
            return {"status": "conflict", "files": changed}
        if conflicts not in {"reject", "replace"}:
            raise ValueError("conflicts must be reject or replace")
        current = create_backup(self.data, self.backups)
        paths = [self.data / name for name in members]
        record_undo(self.data, paths, f"Restore {archive_name}")
        for name, content in members.items():
            path = self.data / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(content)
        return {"status": "restored", "files": len(members), "safety_backup": current.name}
