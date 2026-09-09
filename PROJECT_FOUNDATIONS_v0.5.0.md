# PromptForge v0.5.0 — Project Foundations

## Outcome

PromptForge now has a local-first Project domain boundary that can group canonical personas without owning or copying them. Standalone personas remain first-class. Project-aware generation is an adapter over the existing `generatePersona` pipeline, so compatibility filtering, ranking, variance, locks, coherence, and seeded behavior remain authoritative.

## Audit and implementation boundaries

The existing generator lives in `src/generator.js`; canonical persona normalization and local persistence live in `src/persona-store.js`; interaction semantics live in `src/persona-controller.js`; contextual compatibility lives in `src/context-engine.js` and `src/context-profile.js`; dependencies and stale fields live in `src/dependency-engine.js`; output and projection live in the writer and visual modules; and both Studio surfaces are composed by `src/app.js` and `src/product-shell.js`.

The Project implementation is deliberately additive:

- `src/project-store.js` owns the Project schema, validation, migration-by-normalization, persistence, references, duplication, diagnostics, and portability.
- `src/project-context.js` owns inheritance, provenance, generator input assembly, review marking, and coordinated membership lifecycle.
- Personas remain canonical records in `PersonaStore`; Project records contain `{type:"persona", id}` references only.
- One persona may belong to multiple Projects. Membership is association, not ownership.

## Canonical Project schema

Project schema version 3 contains:

- stable `id`, `name`, optional `description`, `createdAt`, and `updatedAt`;
- distinct `versions.projectSchema`, `versions.application`, `versions.data`, and `versions.personaSchema`;
- structured `context` with setting, era/year label, country, species, premise, and an extension boundary;
- `defaults.varianceMode` and a typed defaults extension boundary;
- `personaRefs` and per-member review state;
- project revision/review state;
- explicit future entity collection boundaries for casts, groups, relationships, locations, and scenes;
- an `extensions` object for namespaced additions;
- workspace metadata.

The JSON contract is also documented by `schemas/project.schema.json`. Existing schema-1 and schema-2 records normalize additively to schema 3. Unknown future schema versions are rejected rather than guessed. Unknown fields are not promoted into canonical meaning; intentional additions belong in `extensions`.

Compatibility-only fields used by the already-present experimental Scene surface remain readable. v0.5.0 does not add Cast, Relationship, Location, or Scene business logic.

## Context inheritance and overrides

Applicable Project fields map to existing foundation anchors: setting, era, country, and species. Resolution produces three inspectable states per field:

- `project`: inherited because no persona anchor was supplied;
- `persona`: explicitly supplied, including whether it overrides a Project value;
- `independent`: neither layer supplied a value.

The generated persona stores a versioned overlay at `extensions.promptforge.projectContexts[projectId]`. It records the Project reference/revision, inherited snapshot, overrides, per-field source records, seed, variance mode, effective anchors, and review state. The canonical foundation remains the generator result. This avoids ambiguous copies and makes provenance reconstructable.

When a contextual label is not a valid catalogue ID—for example a literal future year—it remains recorded in Project provenance but is not passed as an invalid hard anchor to the generator.

## Context changes and review state

`ProjectCoordinator.updateContext` compares the old and new context. It never regenerates or rewrites member personas. For each member whose stored source is `project`, it records the changed context keys and affected persona fields derived from the existing dependency graph. Persona overrides are excluded from the review marker and preserved. The Project revision increments and its overview displays a review warning.

The existing persona dependency engine remains authoritative for later user-directed regeneration. v0.5.0 intentionally does not implement cross-project coherence or automatic repairs.

## Persistence and lifecycle

Projects use the existing browser-local storage philosophy and storage key `personaforge.projects.v1`. The store supports create, list, open, update, duplicate, delete, and archive metadata. Serialization is normalized and stable. Removing a member removes only its association overlay; deleting a Project removes its associations and never deletes a persona. Duplicate Projects receive new IDs while retaining references to the same canonical personas.

## Export and import

Canonical export is a formatted JSON envelope with `format: "promptforge-project"`, format version 1, and one normalized Project. Import is deliberately staged:

1. parse JSON;
2. validate the Project and supported schema;
3. return a preview with name, context, member count, and schema;
4. require explicit UI confirmation;
5. persist with deterministic collision handling.

An existing ID is never overwritten. Imports default to a readable `_import_N` suffix; callers may choose collision rejection.

## Studio changes

The Projects surface provides Project creation with progressively disclosed shared context, list/open, Project overview, member inspection, add/remove existing persona, generate persona within Project context, context editing, review indicators, duplication, export, confirmed import, and deletion. The hierarchy is stated as `PromptForge → Project → Personas`.

The Character wizard identifies Project context and explains that blank contextual fields inherit while explicit selections override. Project-created personas use Project defaults plus explicit anchors and the normal generator.

## Version contract

- Application/package version: `0.5.0`.
- Project schema version: `3`.
- Persona schema version: currently `2.0` from the catalogue contract.
- Catalogue/data version: `0.4.0`.

The validator now checks the package against `application_version` and the deep-pool registry against `data_version`. Application and data versions are intentionally independent.

## Tests and compatibility

`test/project-foundations-v050.test.js` covers schema shape, serialization, collision-safe preview/confirmation import, malformed/future versions, inheritance, overrides, provenance, review behavior, membership, multi-project association, safe removal/deletion, duplication, deterministic generation assembly, and standalone personas. Existing ProjectStore, persona, generator, controller, export, projection, and populator tests remain part of the full gates.

No existing persona is forced into a Project. Persona exports and reference packages are unchanged. The catalogue format and data version are unchanged.

## Known limitations and intentional deferrals

- No Casts, Groups, Relationships, first-class Locations, Scene business logic, multi-person prompts, timelines, world simulation, cloud services, accounts, or collaborative editing were added for v0.5.0.
- Review markers identify consequences; they do not automatically resolve them.
- Imported Projects can retain missing persona references for honest diagnostics; importing a Project does not import persona payloads.
- Era supports a catalogue anchor or contextual label, but only valid catalogue IDs become hard generator anchors.
- Project context currently exposes only four appropriate foundation dimensions. Additional world context belongs in the typed context extension boundary.

## Recommended next bounded goal

Build v0.5.1 Casts & Groups as typed Project-owned grouping records that reference canonical member personas. Keep grouping separate from relationships, preserve multi-Project persona membership, and reuse the Project schema migration and portability contracts established here.
