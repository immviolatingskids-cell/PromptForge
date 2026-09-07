"""Deterministic synthetic catalogue fixtures for scale tests."""
from __future__ import annotations
from populator.schemas import make_entry

def generate_entries(count: int, prefix: str = "fixture") -> list[dict]:
    if count < 0: raise ValueError("count must be non-negative")
    return [make_entry(f"{prefix.title()} {index + 1}", f"{prefix}_{index + 1}") for index in range(count)]
