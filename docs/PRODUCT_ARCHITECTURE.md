# PromptForge product architecture

## Product areas

PromptForge is a local creative application with six visible areas:

- **Home** is the calm starting point for continuing recent work or beginning a character or scene.
- **Characters** is the friendly Character Studio. It presents and edits PersonaForge data through progressive disclosure.
- **Scenes** is Scene Forge. It combines a saved character with a small set of moment-level requirements and resolves the remaining visual detail contextually.
- **Projects** are contextual containers for casts, locations, scene references, and shared notes.
- **Library** explains and surfaces reusable universal data, genre recipes, and reference packages.
- **Control Centre** retains pool management, coverage, diagnostics, backups, preferences, presets, and population tooling.

Advanced PersonaForge remains reachable as a separate workbench for canonical fields, locks, rerolls, alternatives, decision traces, and projection controls.

## Character Studio and PersonaForge

There is one character model. `generatePersona` creates the canonical persona, `PersonaController` owns canonical mutation and deterministic rerolls, and `PersonaStore` owns persistence. Character Studio calls those existing systems; it does not maintain a parallel character record.

The guided flow adds two deliberately bounded fields to the saved persona:

- `style_profile`: a versioned, normalized list of weighted genre IDs plus exclusions and overrides.
- `extensions.promptforge.characterOverrides`: explicit user-facing notes such as current-life context, reference notes, and exclusions.

These fields are additive. Legacy personas normalize to an empty style profile and an empty override object. Existing canonical values are never inferred from those notes during load.

Core edits made in Character Studio become explicit locks. Changes that affect dependent canonical fields use the existing stale-field graph, so Advanced PersonaForge can review or regenerate affected values.

## Universal library

The JSON catalogues remain the universal source for reusable human traits and contextual facts: personality, values, hobbies, interests, appearance, occupation, life structure, expressions, settings, and places. General human traits are not copied into genre definitions.

The Library product area reports these domains without turning the creative workflow into a catalogue editor. Their operational management remains in Control Centre and Populator.

`src/universal-semantics.js` derives a versioned semantic graph from the existing catalogues rather than copying them. Hobby, trait, occupation, environment, and prop nodes connect through typed, weighted relationships. The graph and its resolver are catalogue-order deterministic, non-mutating, and deliberately have no dependency on genre state. `src/lifestyle-resolution.js` consumes these relationships only at the universal/default tier.

## Genre library and weighting

`src/genre-profile.js` contains the initial small registry. Every registry item has a stable ID, family, definition, semantic dimensions, soft affinities, related genres, and provenance. The seed registry is intentionally small; it validates the architecture without beginning mass taxonomy population.

A genre profile supports:

- no genres;
- one genre;
- multiple genres with normalized weights;
- character exclusions;
- future override metadata.

Weights are normalized deterministically and sorted by weight, then ID. Unknown or non-positive entries are ignored. Genres provide influence, never canonical identity.

Registry recipes keep legacy affinity label arrays while adding semantic candidates with stable concept IDs, strengths, tags, contexts, shared dimension definitions, and related-genre evidence. Exclusions can match a concept ID, label, or semantic tag. The six seed recipes remain intentionally small.

## Character identity intelligence

`src/character-intelligence.js` makes source and lifetime explicit. Its assertion vocabulary distinguishes canonical facts, explicit overrides, preferences, affinities, exclusions, temporary state, scene requirements, project context, genre influence, and universal affinity.

Character exclusions veto conflicting lower-layer suggestions; a preference can remain plausible without becoming canonical identity. Legacy records normalize to empty preference, affinity, and exclusion lists rather than inferred traits. Context resolves in this order:

```text
canonical fact / explicit character override
  > explicit scene requirement
  > temporary current-life state / character preference
  > project context
  > character affinity
  > genre influence
  > universal affinity
```

Temporary state is below an explicit scene requirement, so current life can guide an underspecified scene without preventing deliberate direction.

## Reference intelligence

Structural record references remain `{ type, id }`. Creative references use a separate purpose-aware model so source material cannot be mistaken for a canonical entity. Supported purposes are appearance, fashion, genre, lifestyle, environment, and character; each purpose has bounded influence fields and an explicit strength. Genre and fashion references cannot influence identity.

`assemblePurposeReferences` provides deterministic ordering, deduplication, influence metadata, and diagnostics for invalid entries, ignored fields, ineffective references, duplicates, and conflicting anchors. Existing `referencePackage` keys and prompt output remain unchanged; `assembleReferencePackage` is additive. Character references persist at `extensions.promptforge.references`.

## Scene Forge

Scenes are stored in `personaforge.scenes.v1` by `SceneStore`. A scene contains references to a persona and optional project, explicit requirements, advanced controls, the resolved context, and generated output. It never embeds a persona or project.

`resolveScene` starts with the existing `projectVisual(persona, "narrative_scene")` projection and output adapters. Scene intelligence version 2 then resolves wardrobe, props, body language, expression, activity detail, environment, composition, and lighting through the shared priority contract.

Advanced controls remain explicit scene requirements. Every resolved field has a selected source, suppressed conflicts, and bounded alternatives. Typed reference diagnostics and genre-dimension evidence travel with the result. The seed combines the canonical persona seed and scene seed, so identical complete inputs resolve identically.

## Character continuity

`src/character-continuity.js` stores lightweight current-life state under `extensions.promptforge.continuity`. It includes an explicit current project, goal, and situation; lifecycle-managed active, paused, or resolved threads; and at most 20 recent scene references. It does not store scene copies, infer past events, alter canonical identity, or act as unrestricted roleplay memory.

Lifecycle changes are explicit events: `set_current`, `clear_current`, `upsert_thread`, `resolve_thread`, `remove_thread`, and `record_scene`. Current state becomes temporary contextual guidance. An explicitly directed scene overrides it.

## Project context

Projects remain reference-based under the existing `personaforge.projects.v1` storage key. Project schema version 3 establishes the v0.5.0 foundation: distinct version metadata, structured context/defaults, typed persona references, member review state, revisions, and explicit future entity collection boundaries. Version 1 and 2 records load through additive normalization. Canonical personas remain independently owned by `PersonaStore`, and a persona may be associated with multiple Projects.

`src/project-context.js` records inherited values, persona overrides, independent values, generation inputs, and per-Project review state under the persona's PromptForge extension. Project context changes never rewrite persona decisions; inheriting fields receive dependency-derived review hints.

Projects do not rewrite personas. Scene Forge may use a project location, premise, or notes when the scene leaves a corresponding choice open. A saved scene is linked back through a scene reference.

Relationships are an extension point only; no relationship inference or multi-person generation is fabricated in this milestone.

## Prompt projection integration

Scene Forge deliberately stays downstream of the canonical engine:

```text
canonical persona
  -> existing visual projection
  -> explicit scene/project/genre resolution
  -> existing target adapter
  -> structured prompt + source record
```

This preserves target adapters, density modes, negative prompts, canonical visual locks, and existing deterministic projection behavior.

## Compatibility and migration

- Catalogue data and `data_version.json` / `schema_version.json` are unchanged.
- Persona storage remains `personaforge.personas.v1`.
- Character intelligence, typed references, and continuity are additive, versioned fields inside `extensions.promptforge`; legacy records normalize to empty values.
- Project storage remains `personaforge.projects.v1`; each record normalizes to project schema 2 on read/write.
- Scene storage is new and isolated under `personaforge.scenes.v1`.
- Browser-data export format 2 includes persona metadata, projects, scenes, and their schema versions.
- Browser-data import collision maps are applied to persona, project, and scene references.
- Zero-genre characters and legacy personas remain valid.

No load path silently converts a genre, project note, or visual reference into a canonical fact.

## Future extension points

The present architecture leaves explicit places for richer genre registries, compatibility metadata, external provenance, reusable locations, cast/group references, relationships, multi-person scenes, visual reference assets, and semantic diagnostics. These should be added only when a milestone provides real behavior and migration coverage.

## Milestone implementation map

| Milestone | Implementation |
|---|---|
| 0 — Audit | Existing audits plus this decision map; baseline tests recorded before edits. |
| 1 — Foundation | `product-shell.css`, shared creative shell, accessible native dialogs, responsive navigation. |
| 2 — Home | Continue-work surface, creation actions, recent characters/projects/scenes. |
| 3 — Character Studio | Character list/detail and eight-step Guided flow with Advanced and Import paths. |
| 4 — Genre foundation | `genre-profile.js`, normalized weights, exclusions, seeded registry, persistence tests. |
| 5 — Scene Forge | `scene-store.js`, `scene-resolver.js`, simple workflow, source explanation, advanced disclosure. |
| 6 — Project context | Project schema 2 additive fields, cast/location/scene UI, project-aware resolution. |
| 7 — Control Centre | Existing capability preserved under the new global shell and navigation. |
| 8 — UX polish | Responsive layouts, focus states, reduced motion, empty states, overflow handling, live visual review. |
| 9 — Validation | JavaScript, Python, catalogue validation, focused compatibility tests, and browser inspection. |

## Character Intelligence programme map

| Version | Integrated implementation |
|---|---|
| v0.6.0 | Semantic genre recipes, dimensions, exclusions, and related genres. |
| v0.6.1 | Universal semantic graph and deterministic contextual resolution. |
| v0.6.2 | Typed character assertions, source priority, vetoes, and explanations. |
| v0.6.3 | Lifestyle/activity resolution across character, scene, project, genre, and universal layers. |
| v0.6.5 | Scene intelligence version 2 across eight visual direction fields. |
| v0.6.6 | Bounded current-life continuity and explicit lifecycle events. |
| v0.6.7 | Purpose-aware reference assembly and diagnostics. |
| v0.6.8 | Progressive-disclosure character, scene, reference, and continuity UX. |
| v0.6.9 | End-to-end compatibility, determinism, migration, UI, and documentation audit. |
