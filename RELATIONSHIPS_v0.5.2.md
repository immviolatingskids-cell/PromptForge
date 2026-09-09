# PromptForge v0.5.2 — Relationships

Relationships are first-class Persona-to-Persona records persisted by `RelationshipStore` under `personaforge.relationships.v1`. Projects hold typed `relationshipRefs`; records never embed persona data.

`relationship-types.js` provides the bounded extensible registry, labels, categories, directional/inverse pairs, and symmetric canonicalization. Self edges and semantic duplicates are rejected while distinct types may coexist for the same pair.

Records include source/target persona refs, optional project ref, type, direction, status, description, metadata, workspace, timestamps, and provenance. Raw diagnostics retain malformed records and report missing endpoints, invalid refs, unknown types, self edges, duplicate edges, and missing projects.

Browser export/import includes schema version, collision-safe IDs, persona/project remaps, and project reference remaps. Legacy snapshots without relationships remain compatible. The Project surface supports creation, human-readable listing, description editing, and safe deletion; missing endpoint names remain visible as IDs.

Verification covered focused relationship tests, syntax checks, and the existing regression suites. Locations, graph visualization, inference, simulation, and multi-person projection remain deferred to later milestones.
