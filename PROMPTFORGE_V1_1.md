# PromptForge v1.1 — Migration and portability hardening

v1.1 is a foundation-only release. It does not add product features or change canonical persona generation.

The shared migration contract is applied when projects, scenes, casts, groups, relationships, and locations are validated and loaded. Legacy records are accepted additively, unknown top-level fields survive normalization, malformed records are rejected, and unsupported future schema versions are rejected before persistence. Browser snapshots advertise the same independent application and record-family metadata.

Imports remain collision-safe and preserve typed project, persona, location, scene, and parent references through the existing remapping paths. Canonical personas remain independently owned; projects continue to store references only.

Context JSON and Markdown exports use the same assembled package. Markdown includes resolved participant names for casts, groups, and relationship endpoints while retaining IDs for traceability and portable round-tripping.

Verification for this release includes focused migration coverage for every record family, the complete JavaScript suite, Python tests, canonical data validation, whitespace checks, project workspace browser QA, and a live GitHub Pages smoke audit.
