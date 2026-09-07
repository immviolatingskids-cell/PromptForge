"""CI-friendly quality gate helpers."""
from __future__ import annotations
from populator.duplicate_detector import classify_duplicates
from populator.storage import all_entries
from populator.validator import validate_data_tree

def quality_report(data_root):
    rows = all_entries(data_root); issues = validate_data_tree(data_root); pairs = 0
    for index, (_, entry) in enumerate(rows): pairs += len(classify_duplicates(entry, [other for _, other in rows[index + 1:]]))
    return {"passed": not issues, "validation_errors": [str(issue) for issue in issues],
            "entries": len(rows), "duplicate_comparisons": pairs}
