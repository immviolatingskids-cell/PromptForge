# PromptForge v0.5.3 — Locations

Locations are first-class reusable Project entities persisted by `LocationStore` under `personaforge.locations.v1` (schema version 1). Projects contain typed `locationRefs`; records are never embedded in projects or copied from Personas.

`location-types.js` provides an extensible broad taxonomy and human-readable labels. Records support optional structured geography, environment metadata, one parent Location reference, workspace metadata, provenance, and stable `location_...` IDs. Parent updates reject self-parenting and direct/indirect cycles; deleting a parent leaves children intact and diagnosable.

Browser export/import includes Locations. Imports remap colliding IDs and update project references and child parent references in a two-pass import. Raw records remain available to diagnostics, which report invalid records, unknown types, missing projects/parents, malformed parents, self-parenting, cycles, duplicate IDs, and resolved counts.

The Product Shell exposes the Location store through the application bridge and supports project-scoped creation with optional city geography. Persona geography remains independent. Scene Forge can resolve a Location, its ancestry, and its context through `open()` and `ancestry()` without duplicating records.

Regression commands: `npm test`, `python -m unittest discover -s tests -v`, `python -m populator.main validate`, and `python populate.py health`.

Known limitations: editing/deletion controls and richer hierarchy editing remain follow-up UI work; no world simulation, GIS, ownership inference, or Scene Forge behavior is included.
