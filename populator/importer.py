"""TXT, CSV, and JSON bulk import with review-first results."""
from __future__ import annotations
import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from populator.backup import create_backup, record_undo
from populator.duplicate_detector import find_duplicates
from populator.schemas import COMPATIBILITY_FIELDS, csv_list, make_entry
from populator.storage import category_path, load_entries, save_entries
from populator.validator import validate_entry, validate_file

@dataclass
class ImportReview:
    valid: list[dict[str, Any]] = field(default_factory=list)
    duplicates: list[tuple[dict[str, Any], list[tuple[str, str]]]] = field(default_factory=list)
    variants: list[tuple[dict[str, Any], list[tuple[str, str]]]] = field(default_factory=list)
    errors: list[tuple[dict[str, Any], list[str]]] = field(default_factory=list)

def parse_import(path: Path) -> list[dict[str, Any]]:
    suffix = path.suffix.lower()
    if suffix == ".txt":
        return [make_entry(line.strip()) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if suffix == ".json":
        value = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(value, list): raise ValueError("JSON import must contain an array")
        return value
    if suffix == ".csv":
        rows = []
        with path.open(encoding="utf-8-sig", newline="") as stream:
            for row in csv.DictReader(stream):
                compatibility = {field: csv_list(row.get(field)) for field in COMPATIBILITY_FIELDS}
                rows.append(make_entry(row.get("name", ""), row.get("id") or None, row.get("description", ""), tags=csv_list(row.get("tags")), aliases=csv_list(row.get("aliases")), compatibility=compatibility, category=row.get("category") or None, specialisation=row.get("specialisation") or row.get("specialization") or None, variant=row.get("variant") or None))
        return rows
    raise ValueError("supported import formats are .txt, .csv, and .json")

def review_import(candidates: list[dict[str, Any]], existing: list[dict[str, Any]]) -> ImportReview:
    review = ImportReview(); accepted = list(existing)
    for candidate in candidates:
        issues = validate_entry(candidate, 0)
        if issues: review.errors.append((candidate, issues)); continue
        duplicates = find_duplicates(candidate, accepted)
        strong = [match for match in duplicates if match[0] != "near_match"]
        if strong: review.duplicates.append((candidate, strong)); continue
        if duplicates: review.variants.append((candidate, duplicates))
        review.valid.append(candidate); accepted.append(candidate)
    return review

def import_valid(data_root: Path, category: str, review: ImportReview, backup_root: Path | None = None) -> Path | None:
    if not review.valid: return None
    target = category_path(data_root, category)
    prospective = load_entries(target) + review.valid
    # Never commit a review that became stale or violates the destination
    # contract between preview and acceptance.
    duplicate_ids = {entry_id for entry_id in (entry.get("id") for entry in prospective) if entry_id and [e.get("id") for e in prospective].count(entry_id) > 1}
    if duplicate_ids:
        raise ValueError(f"import would create duplicate ids: {', '.join(sorted(duplicate_ids))}")
    preflight = [message for index, entry in enumerate(prospective) for message in validate_entry(entry, index)]
    if preflight: raise ValueError("import failed validation: " + "; ".join(preflight))
    backup = create_backup(data_root, backup_root)
    record_undo(data_root, [target], f"bulk import into {category}")
    save_entries(target, prospective)
    issues = validate_file(target)
    if issues:
        # Restore the pre-import bytes from the undo record rather than leaving
        # a syntactically valid but semantically invalid destination behind.
        from populator.backup import undo_last
        undo_last(data_root)
        raise ValueError("import failed validation: " + "; ".join(str(issue) for issue in issues))
    return backup
