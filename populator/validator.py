"""Validate PersonaForge JSON using only the Python standard library."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


ID_PATTERN = re.compile(r"^[a-z0-9]+(?:_[a-z0-9]+)*$")
COMPATIBILITY_KEYS = {"settings", "eras", "species", "life_stages", "countries"}
OPTIONAL_COMPATIBILITY_KEYS = {"species_types", "regions", "locales"}
VERSION_FILES = {"schema_version.json", "data_version.json"}
REGISTRY_FILE = Path("pools/deep_pool_registry.json")
TEMPLATE_FILE = Path("templates/entry_templates.json")
EXPANSIONS_DIR = "expansions"
VALID_PRIORITIES = {"high", "normal", "low"}
VALID_SELECTION_MODES = {"single", "multiple"}


@dataclass(frozen=True)
class ValidationIssue:
    path: Path
    message: str

    def __str__(self) -> str:
        return f"{self.path}: {self.message}"


def _validate_string_list(value: Any, field: str) -> list[str]:
    if not isinstance(value, list):
        return [f"'{field}' must be an array"]
    if any(not isinstance(item, str) or not item.strip() for item in value):
        return [f"'{field}' must contain only non-empty strings"]
    if len(value) != len(set(value)):
        return [f"'{field}' must not contain duplicates"]
    return []


def validate_entry(entry: Any, index: int) -> list[str]:
    prefix = f"entry {index}"
    if not isinstance(entry, dict):
        return [f"{prefix} must be an object"]

    issues: list[str] = []
    allowed = {"id", "name", "description", "aliases", "tags", "compatibility", "metadata"}
    unknown = sorted(set(entry) - allowed)
    if unknown:
        issues.append(f"{prefix} has unknown fields: {', '.join(unknown)}")

    entry_id = entry.get("id")
    if not isinstance(entry_id, str) or not ID_PATTERN.fullmatch(entry_id):
        issues.append(f"{prefix} has an invalid readable id")
    if not isinstance(entry.get("name"), str) or not entry["name"].strip():
        issues.append(f"{prefix} requires a non-empty name")

    for field in ("aliases", "tags"):
        if field in entry:
            issues.extend(f"{prefix} {message}" for message in _validate_string_list(entry[field], field))

    compatibility = entry.get("compatibility")
    if not isinstance(compatibility, dict):
        issues.append(f"{prefix} requires a compatibility object")
    else:
        missing = sorted(COMPATIBILITY_KEYS - set(compatibility))
        unknown_compatibility = sorted(set(compatibility) - COMPATIBILITY_KEYS - OPTIONAL_COMPATIBILITY_KEYS)
        if missing:
            issues.append(f"{prefix} compatibility is missing: {', '.join(missing)}")
        if unknown_compatibility:
            issues.append(f"{prefix} compatibility has unknown fields: {', '.join(unknown_compatibility)}")
        for field in sorted((COMPATIBILITY_KEYS | OPTIONAL_COMPATIBILITY_KEYS) & set(compatibility)):
            issues.extend(
                f"{prefix} compatibility {message}"
                for message in _validate_string_list(compatibility[field], field)
            )

    if "description" in entry and not isinstance(entry["description"], str):
        issues.append(f"{prefix} description must be a string")
    if "metadata" in entry and not isinstance(entry["metadata"], dict):
        issues.append(f"{prefix} metadata must be an object")
    metadata = entry.get("metadata")
    if isinstance(metadata, dict):
        for field in ("category", "specialisation", "specialization", "variant"):
            if field in metadata and (not isinstance(metadata[field], str) or not metadata[field].strip()):
                issues.append(f"{prefix} metadata '{field}' must be a non-empty string")
        for field in ("family", "cluster"):
            if field in metadata and (not isinstance(metadata[field], str) or not ID_PATTERN.fullmatch(metadata[field])):
                issues.append(f"{prefix} metadata '{field}' must be a readable id")
        affinities = metadata.get("context_affinities")
        if affinities is not None:
            if not isinstance(affinities, dict):
                issues.append(f"{prefix} metadata 'context_affinities' must be an object")
            else:
                unknown = sorted(set(affinities) - COMPATIBILITY_KEYS - OPTIONAL_COMPATIBILITY_KEYS)
                if unknown: issues.append(f"{prefix} metadata context_affinities has unknown fields: {', '.join(unknown)}")
                for field, values in affinities.items():
                    issues.extend(f"{prefix} metadata context_affinities {message}" for message in _validate_string_list(values, field))
        if "tension_with" in metadata:
            issues.extend(f"{prefix} metadata tension_with {message}" for message in _validate_string_list(metadata["tension_with"], "tension_with"))
            if isinstance(entry_id, str) and entry_id in metadata.get("tension_with", []):
                issues.append(f"{prefix} metadata tension_with must not reference itself")
    return issues


def validate_file(path: Path) -> list[ValidationIssue]:
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        return [ValidationIssue(path, f"invalid JSON: {error}")]

    if path.name in VERSION_FILES:
        key = path.stem
        if not isinstance(document, dict) or not isinstance(document.get(key), str):
            return [ValidationIssue(path, f"must contain a string '{key}'")]
        return []

    relative_parts = path.parts
    if len(relative_parts) >= 2 and relative_parts[-2:] == REGISTRY_FILE.parts:
        return _validate_registry(path, document)
    if len(relative_parts) >= 2 and relative_parts[-2:] == TEMPLATE_FILE.parts:
        return _validate_templates(path, document)
    if EXPANSIONS_DIR in relative_parts:
        return _validate_expansions(path, document)

    if not isinstance(document, list):
        return [ValidationIssue(path, "library file must contain an array of entries")]

    issues = [ValidationIssue(path, message) for i, entry in enumerate(document) for message in validate_entry(entry, i)]
    ids = [entry.get("id") for entry in document if isinstance(entry, dict) and isinstance(entry.get("id"), str)]
    duplicate_ids = sorted({entry_id for entry_id in ids if ids.count(entry_id) > 1})
    if duplicate_ids:
        issues.append(ValidationIssue(path, f"duplicate ids: {', '.join(duplicate_ids)}"))
    if path.name == "values.json":
        by_id = {entry.get("id"): entry for entry in document if isinstance(entry, dict)}
        for entry_id, entry in by_id.items():
            relationships = entry.get("metadata", {}).get("tension_with", [])
            if not isinstance(relationships, list):
                continue
            for target in relationships:
                if target not in by_id:
                    issues.append(ValidationIssue(path, f"value '{entry_id}' tension_with references unknown value '{target}'"))
                elif entry_id not in by_id[target].get("metadata", {}).get("tension_with", []):
                    issues.append(ValidationIssue(path, f"value tension relationship '{entry_id}' -> '{target}' is asymmetric"))
    if path.name == "occupations.json":
        list_fields = {"career_levels", "employment_types", "work_arrangements", "environments", "schedule_patterns", "entry_routes", "related_skills"}
        for entry in document:
            if not isinstance(entry, dict):
                continue
            metadata = entry.get("metadata", {})
            for field in list_fields:
                if field in metadata:
                    issues.extend(ValidationIssue(path, f"occupation '{entry.get('id')}' metadata {message}") for message in _validate_string_list(metadata[field], field))
            for field in ("family", "cluster"):
                if field in metadata and (not isinstance(metadata[field], str) or not ID_PATTERN.fullmatch(metadata[field])):
                    issues.append(ValidationIssue(path, f"occupation '{entry.get('id')}' metadata '{field}' must be a readable id"))
    return issues


def _issue(path: Path, message: str) -> ValidationIssue:
    return ValidationIssue(path, message)


def _validate_registry(path: Path, document: Any) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    if not isinstance(document, dict):
        return [_issue(path, "registry must be an object")]
    for field in ("version", "categories", "pools"):
        if field not in document:
            issues.append(_issue(path, f"registry is missing required field '{field}'"))
    if not isinstance(document.get("version"), str) or not document.get("version", "").strip():
        issues.append(_issue(path, "registry 'version' must be a non-empty string"))
    categories = document.get("categories")
    pools = document.get("pools")
    if not isinstance(categories, list) or not categories:
        issues.append(_issue(path, "registry 'categories' must be a non-empty array"))
    if not isinstance(pools, dict):
        issues.append(_issue(path, "registry 'pools' must be an object"))
        pools = {}

    seen: set[str] = set()
    leaf_ids: set[str] = set()

    def walk(node: Any, location: str, expected_root: bool = False) -> None:
        if isinstance(node, str):
            if not ID_PATTERN.fullmatch(node):
                issues.append(_issue(path, f"registry leaf '{location}' has invalid id '{node}'"))
            if node in leaf_ids:
                issues.append(_issue(path, f"registry contains duplicate leaf id '{node}'"))
            leaf_ids.add(node)
            return
        if not isinstance(node, dict):
            issues.append(_issue(path, f"registry node '{location}' must be an object or leaf id"))
            return
        node_id = node.get("id")
        if not isinstance(node_id, str) or not ID_PATTERN.fullmatch(node_id):
            issues.append(_issue(path, f"registry node '{location}' requires a readable 'id'"))
        elif node_id in seen:
            issues.append(_issue(path, f"registry contains duplicate node id '{node_id}'"))
        else:
            seen.add(node_id)
        if not isinstance(node.get("name"), str) or not node.get("name", "").strip():
            issues.append(_issue(path, f"registry node '{location}' requires a non-empty 'name'"))
        children = node.get("children")
        if not isinstance(children, list) or not children:
            issues.append(_issue(path, f"registry node '{location}' requires a non-empty 'children' array"))
        else:
            for index, child in enumerate(children):
                walk(child, f"{location}.children[{index}]")

    if isinstance(categories, list):
        for index, category in enumerate(categories):
            walk(category, f"categories[{index}]", True)

    if isinstance(pools, dict):
        for pool_id, definition in pools.items():
            if not isinstance(pool_id, str) or not ID_PATTERN.fullmatch(pool_id):
                issues.append(_issue(path, f"registry pool key '{pool_id}' is not a readable id"))
            if not isinstance(definition, dict):
                issues.append(_issue(path, f"registry pool '{pool_id}' must be an object"))
                continue
            if not isinstance(definition.get("name"), str) or not definition.get("name", "").strip():
                issues.append(_issue(path, f"registry pool '{pool_id}' requires a non-empty 'name'"))
            if "target" in definition and (not isinstance(definition["target"], int) or definition["target"] < 1):
                issues.append(_issue(path, f"registry pool '{pool_id}' target must be a positive integer"))
            thresholds = {key: definition[key] for key in ("minimum", "healthy", "target", "saturated") if key in definition}
            if thresholds:
                try:
                    from populator.coverage_targets import deep_thresholds
                    deep_thresholds(definition)
                except ValueError as error:
                    issues.append(_issue(path, f"registry pool '{pool_id}' has invalid coverage thresholds: {error}"))
            if "priority" in definition and definition["priority"] not in VALID_PRIORITIES:
                issues.append(_issue(path, f"registry pool '{pool_id}' has an invalid priority"))
            mode = definition.get("selection_mode", "single")
            if mode not in VALID_SELECTION_MODES:
                issues.append(_issue(path, f"registry pool '{pool_id}' has an invalid selection_mode"))
            if "none_allowed" in definition and not isinstance(definition["none_allowed"], bool):
                issues.append(_issue(path, f"registry pool '{pool_id}' none_allowed must be boolean"))
    return issues


def _validate_templates(path: Path, document: Any) -> list[ValidationIssue]:
    if not isinstance(document, dict):
        return [_issue(path, "template storage must be an object")]
    issues: list[ValidationIssue] = []
    allowed = {"id", "name", "description", "aliases", "tags", "compatibility", "metadata"}
    for template_name, template in document.items():
        prefix = f"template '{template_name}'"
        if not isinstance(template_name, str) or not template_name.strip():
            issues.append(_issue(path, "template names must be non-empty strings"))
        if not isinstance(template, dict):
            issues.append(_issue(path, f"{prefix} must be an object"))
            continue
        unknown = sorted(set(template) - allowed)
        if unknown:
            issues.append(_issue(path, f"{prefix} has unknown fields: {', '.join(unknown)}"))
        for field in ("aliases", "tags"):
            if field in template:
                issues.extend(_issue(path, f"{prefix} {message}") for message in _validate_string_list(template[field], field))
        if "compatibility" in template:
            compatibility = template["compatibility"]
            if not isinstance(compatibility, dict):
                issues.append(_issue(path, f"{prefix} compatibility must be an object"))
            else:
                unknown_compatibility = sorted(set(compatibility) - COMPATIBILITY_KEYS - OPTIONAL_COMPATIBILITY_KEYS)
                if unknown_compatibility:
                    issues.append(_issue(path, f"{prefix} compatibility has unknown fields: {', '.join(unknown_compatibility)}"))
                for field, values in compatibility.items():
                    issues.extend(_issue(path, f"{prefix} compatibility {message}") for message in _validate_string_list(values, field))
        if "description" in template and not isinstance(template["description"], str):
            issues.append(_issue(path, f"{prefix} description must be a string"))
        if "metadata" in template and not isinstance(template["metadata"], dict):
            issues.append(_issue(path, f"{prefix} metadata must be an object"))
    return issues


def _validate_expansions(path: Path, document: Any) -> list[ValidationIssue]:
    if not isinstance(document, dict):
        return [_issue(path, "expansion document must be an object")]
    issues: list[ValidationIssue] = []
    for entry_id, definition in document.items():
        prefix = f"expansion '{entry_id}'"
        if not isinstance(entry_id, str) or not ID_PATTERN.fullmatch(entry_id):
            issues.append(_issue(path, f"{prefix} has an invalid readable id"))
        if not isinstance(definition, dict):
            issues.append(_issue(path, f"{prefix} must be an object"))
            continue
        if "common" not in definition:
            issues.append(_issue(path, f"{prefix} is missing required field 'common'"))
        for level, values in definition.items():
            if level not in {"common", "full"}:
                issues.append(_issue(path, f"{prefix} has unknown level '{level}'"))
                continue
            if not isinstance(values, list) or any(not isinstance(value, str) or not value.strip() for value in values):
                issues.append(_issue(path, f"{prefix} '{level}' must be an array of non-empty strings"))
            elif len(values) != len(set(values)):
                issues.append(_issue(path, f"{prefix} '{level}' must not contain duplicates"))
        common = definition.get("common")
        full = definition.get("full")
        if isinstance(common, list) and isinstance(full, list) and not set(common).issubset(full):
            issues.append(_issue(path, f"{prefix} full expansion must include common values"))
    return issues


def _validate_component_versions(data_root: Path) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    data_path = data_root / "data_version.json"
    if not data_path.exists():
        return [_issue(data_path, "authoritative data_version.json is missing")]
    try:
        data_document = json.loads(data_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return []
    authoritative = data_document.get("data_version") if isinstance(data_document, dict) else None
    if not isinstance(authoritative, str) or not authoritative.strip():
        return []
    registry_path = data_root / REGISTRY_FILE
    if registry_path.exists():
        try:
            registry = json.loads(registry_path.read_text(encoding="utf-8"))
            if isinstance(registry, dict) and registry.get("version") != authoritative:
                issues.append(_issue(registry_path, f"registry version {registry.get('version')!r} does not match data_version {authoritative!r}"))
        except (OSError, UnicodeError, json.JSONDecodeError):
            pass
    schema_path = data_root / "schema_version.json"
    if schema_path.exists():
        try:
            schema = json.loads(schema_path.read_text(encoding="utf-8"))
            if isinstance(schema, dict) and schema.get("application_version") not in (None, authoritative):
                issues.append(_issue(schema_path, f"application_version {schema.get('application_version')!r} does not match data_version {authoritative!r}"))
        except (OSError, UnicodeError, json.JSONDecodeError):
            pass
    package_path = data_root.parent / "package.json"
    if package_path.exists():
        try:
            package = json.loads(package_path.read_text(encoding="utf-8"))
            if isinstance(package, dict) and package.get("version") not in (None, authoritative):
                issues.append(_issue(package_path, f"package version {package.get('version')!r} does not match data_version {authoritative!r}"))
        except (OSError, UnicodeError, json.JSONDecodeError):
            pass
    return issues


def discover_data_files(data_root: Path) -> Iterable[Path]:
    return sorted(path for path in data_root.rglob("*.json") if path.is_file())


def validate_data_tree(data_root: Path) -> list[ValidationIssue]:
    issues = [issue for path in discover_data_files(data_root) for issue in validate_file(path)]
    issues.extend(_validate_component_versions(data_root))
    # Explicit pool definitions must be reachable. Missing definitions are
    # intentional: deep_pools supplies inherited defaults for those leaves.
    registry_path = data_root / REGISTRY_FILE
    if registry_path.exists():
        try:
            registry = json.loads(registry_path.read_text(encoding="utf-8"))
            leaves: set[str] = set()
            def collect(node: Any) -> None:
                if isinstance(node, str): leaves.add(node)
                elif isinstance(node, dict):
                    for child in node.get("children", []): collect(child)
            for category in registry.get("categories", []) if isinstance(registry, dict) else []: collect(category)
            pools = registry.get("pools", {}) if isinstance(registry, dict) else {}
            for pool_id in sorted(set(pools) - leaves):
                issues.append(_issue(registry_path, f"registry pool '{pool_id}' is not reachable from categories"))
        except (OSError, UnicodeError, json.JSONDecodeError):
            pass
    return issues
