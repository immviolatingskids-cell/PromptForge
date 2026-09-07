"""Entry construction helpers shared by CLI commands."""

from __future__ import annotations

import re
import unicodedata
from typing import Any


COMPATIBILITY_FIELDS = ("settings", "eras", "species", "species_types", "life_stages", "countries", "regions", "locales")


def readable_id(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", normalized.lower())).strip("_")


def csv_list(value: str | None) -> list[str]:
    return list(dict.fromkeys(part.strip() for part in (value or "").split(",") if part.strip()))


def make_entry(
    name: str,
    entry_id: str | None = None,
    description: str = "",
    tags: list[str] | None = None,
    aliases: list[str] | None = None,
    compatibility: dict[str, list[str]] | None = None,
    metadata: dict[str, Any] | None = None,
    category: str | None = None,
    specialisation: str | None = None,
    variant: str | None = None,
) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "id": entry_id or readable_id(name),
        "name": name.strip(),
        "compatibility": {field: list((compatibility or {}).get(field, [])) for field in COMPATIBILITY_FIELDS},
    }
    if description.strip():
        entry["description"] = description.strip()
    if aliases:
        entry["aliases"] = list(dict.fromkeys(aliases))
    if tags:
        entry["tags"] = list(dict.fromkeys(tags))
    normalized_metadata = dict(metadata or {})
    for key, value in (("category", category), ("specialisation", specialisation), ("variant", variant)):
        if value:
            normalized_metadata[key] = value.strip()
    if normalized_metadata:
        entry["metadata"] = normalized_metadata
    return entry
