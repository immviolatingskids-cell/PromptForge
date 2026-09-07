"""Recoverable backups and one-action undo for risky Populator operations."""
from __future__ import annotations
import json
import hashlib
import uuid
from datetime import datetime
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

def create_backup(data_root: Path, backup_root: Path | None = None) -> Path:
    backup_root = backup_root or data_root.parent / "backups"
    backup_root.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S_%f")
    destination = backup_root / f"persona_data_backup_{stamp}.zip"
    with ZipFile(destination, "w", ZIP_DEFLATED) as archive:
        for path in sorted(data_root.rglob("*")):
            if path.is_file():
                archive.write(path, Path("data") / path.relative_to(data_root))
    return destination

def record_undo(data_root: Path, paths: list[Path], action: str) -> None:
    undo_root = data_root.parent / ".undo"
    undo_root.mkdir(parents=True, exist_ok=True)
    files = {path.relative_to(data_root).as_posix(): path.read_text(encoding="utf-8") if path.exists() else None for path in paths}
    record = {"operation_id": uuid.uuid4().hex, "action": action, "files": files,
              "pre_hashes": {name: hashlib.sha256((content or "").encode()).hexdigest() for name, content in files.items()}}
    (undo_root / "last_action.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    history = undo_root / "history.jsonl"
    with history.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps({"operation_id": record["operation_id"], "action": action, "files": list(files)}) + "\n")

def list_history(data_root: Path) -> list[dict]:
    path = data_root.parent / ".undo" / "history.jsonl"
    if not path.exists(): return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]

def undo_last(data_root: Path) -> str:
    path = data_root.parent / ".undo" / "last_action.json"
    if not path.exists():
        raise FileNotFoundError("no major action is available to undo")
    record = json.loads(path.read_text(encoding="utf-8"))
    for relative, content in record["files"].items():
        target = data_root / relative
        if content is None:
            if target.exists(): target.unlink()
        else:
            target.parent.mkdir(parents=True, exist_ok=True); target.write_text(content, encoding="utf-8")
    path.unlink()
    return record["action"]
