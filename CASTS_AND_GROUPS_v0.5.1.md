# PromptForge v0.5.1 — Casts & Groups

## Architecture

Casts and Groups are first-class local records in `CastStore` and `GroupStore`, persisted under `personaforge.casts.v1` and `personaforge.groups.v1`. Projects contain only typed `castRefs` and `groupRefs`; canonical persona JSON is never copied into either collection.

## Record shapes and semantics

Records carry `schemaVersion`, stable readable IDs (`cast_…` / `group_…`), name, description, optional `projectRef`, explicit `personaRefs`, workspace metadata, timestamps, and provenance. Groups may carry a lightweight explicit `type`. Membership is user-controlled, deduplicated, multi-cast/multi-group, and deletion-safe. Missing persona references remain inspectable.

## Integration and import/export

Browser snapshots include casts, groups, and their schema versions. Imports rename collisions without overwriting, remap persona and project IDs, and preserve missing references. Older snapshots without these keys continue to import unchanged.

## Diagnostics and UI

Store diagnostics report totals, membership references, resolved/missing/invalid persona references, duplicate status, and missing project references. The Project detail surface now exposes linked Casts and Groups with counts, missing-reference indicators, and create actions.

## Versioning and verification

Application/package version is `0.5.1`; project schema remains `3`; cast/group schemas are `1`. Focused tests cover reference-only storage, duplicate prevention, missing references, collision-safe import, project remapping, and empty collections. Existing project and application tests remain supported.

## Known limitations and v0.5.2

This milestone does not infer social meaning, assign membership automatically, or model relationships. Editing individual collection records and richer membership management can follow. v0.5.2 Relationships should reuse the same reference layer and preserve the no-embedded-canon rule.
