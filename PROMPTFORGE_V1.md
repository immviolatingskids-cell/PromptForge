# PromptForge v1.0 foundation contract

PromptForge v1.0 builds on the complete v0.5 reference-based foundation. Canonical personas remain independently owned; Projects, casts, groups, relationships, locations, scenes, and visual projections store typed references rather than copied persona records.

## Independent versions

The application version is `1.0.0`. It is intentionally independent from the catalogue data version and schema version. Portable records expose family-specific metadata for projects, scenes, visual projections, and assembled context packages. Browser snapshots expose the same metadata so imports can establish an explicit migration boundary.

Legacy records are normalized additively. Unknown object fields are preserved where the record is otherwise safe to load. Malformed records and records newer than the supported family version are rejected rather than rewritten or fabricated.

## Workspace state

Project workspace state is separate from canonical entities and includes the active section, selected context sources, assembly density/purpose/notes, review filters, collapsed panels, last-opened scene/participant, archive/favourite tags, and a bounded recent activity list. Legacy records are not backfilled with invented activity.

## Context packages

Preview and export use the same project assembly helper. JSON and Markdown include equivalent project, participant, cast, group, relationship, location, scene, projection, notes, purpose, provenance, and warning coverage. Missing references remain visible as diagnostics; canonical persona identity is never rewritten.

## Portability

Browser snapshots are collision-safe and preserve missing references. Project exports are reference-only and intentionally do not embed canonical personas or relationship records. Project duplication creates a new project identity while retaining references to the same canonical personas.

## Verification

Focused JavaScript migration, workspace, assembly, projection, relationship, location, and scene tests pass. Python tests and canonical-data validation pass. The project workspace browser flow verifies settings persistence, project filtering, and context export. The full JavaScript suite includes a timing-sensitive representative project benchmark that passes standalone but can exceed its threshold when the complete suite runs concurrently.
