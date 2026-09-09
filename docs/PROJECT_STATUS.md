# PromptForge Project Status

Date: 9 September 2026

## Summary

PromptForge is a local-first creative studio for building coherent characters, scenes, projects, and image/reference prompts from structured JSON catalogues. It grew out of PersonaForge, the original deterministic persona generator, and now wraps that engine in a broader product shell with Home, Characters, Scenes, Projects, Genres, Library, Control Centre, and the advanced PersonaForge workbench.

The project is currently in a strong local-application state. The original PersonaForge engine remains intact and authoritative, while newer PromptForge layers add friendlier workflows, weighted genre influence, scene resolution, project context, character continuity, and purpose-aware references. The design direction is stable: simple on the surface, deep underneath.

## Product Direction

PromptForge is not trying to be a generic chatbot, a cloud platform, or a full roleplay runtime. Its main purpose is to help a user create rich, plausible characters and turn them into explainable scene and reference prompts without hand-filling every field.

The core philosophy is contextual logic rather than stereotypes. Canonical facts, explicit user choices, scene requirements, project context, genre influence, and universal catalogue affinities are treated as different kinds of information with different authority. Genre can influence a result, but it cannot overwrite identity. Project notes can guide an underspecified scene, but they do not rewrite a persona. Creative references can shape appearance, fashion, environment, lifestyle, or genre tone, but they are separate from structural records.

## Repository Shape

- `index.html`, `styles.css`, `product-shell.css`, and `control-centre.css` define the browser application shell and UI.
- `src/` contains the JavaScript generation pipeline, stores, project and scene systems, character intelligence, visual projection, adapters, diagnostics, and UI controllers.
- `data/` contains the local JSON catalogues used by the generator.
- `schemas/` contains structural schema definitions.
- `populator/` contains the Python CLI and library-management tooling.
- `test/` contains JavaScript `node:test` coverage.
- `tests/` contains Python `unittest` coverage.
- `docs/` contains architecture, roadmap, audit, Control Centre, and milestone notes.
- `visual-review/` contains Playwright capture scripts and responsive screenshots.
- `backups/` stores generated data backups.

## What Is Built

### PersonaForge Core

The original deterministic persona engine is still the canonical source of character truth. It supports seeded generation, locks, individual and section rerolls, dependency tracking, stale-field warnings, hard contradiction repair, persona output, reference output, local export, and saved persona library behavior.

Important files include:

- `src/generator.js`
- `src/persona-controller.js`
- `src/persona-store.js`
- `src/coherence.js`
- `src/dependency-engine.js`
- `src/persona-writer.js`
- `src/reference-writer.js`

### PromptForge Product Shell

The application now presents a calmer creative product around the deeper engine. The visible areas are Home, Characters, Scenes, Projects, Genres, Library, Control Centre, and Advanced PersonaForge. The shell keeps advanced systems available without forcing every user through dense controls immediately.

Important files include:

- `src/app.js`
- `src/product-shell.js`
- `product-shell.css`
- `index.html`

### Character Studio

Character Studio gives users a friendlier path into the canonical persona system. It includes a character list/detail experience, guided creation, genre state, current-life context, guardrails, creative references, and quick actions. Advanced PersonaForge remains available for low-level locks, rerolls, inspection, alternatives, and projection controls.

Character Studio does not create a second character model. It operates through `PersonaStore`, `PersonaController`, and the same canonical persona records.

### Genre Intelligence

Genre support is implemented as a soft weighted influence profile. A persona may have no genre, one genre, or multiple weighted genres. Genre recipes include semantic dimensions, affinities, exclusions, related genres, and deterministic normalization.

The current seed registry is intentionally small. It proves the architecture without turning the project into a mass taxonomy project too early.

Important file:

- `src/genre-profile.js`

### Universal Semantics

Universal semantic relationships are derived from existing catalogues instead of being copied into genre definitions. This keeps general human traits, hobbies, occupations, values, environments, and props independent from any single genre.

Important files include:

- `src/universal-semantics.js`
- `src/lifestyle-resolution.js`
- `src/value-profile.js`

### Character Intelligence

The Character Intelligence programme adds typed assertions and explicit source priority. The system distinguishes canonical facts, explicit overrides, preferences, affinities, exclusions, temporary state, scene requirements, project context, genre influence, and universal affinity.

Current priority order:

```text
canonical fact / explicit character override
  > explicit scene requirement
  > temporary current-life state / character preference
  > project context
  > character affinity
  > genre influence
  > universal affinity
```

Important files include:

- `src/character-intelligence.js`
- `src/character-continuity.js`
- `src/character-hook.js`

### Scene Forge

Scene Forge stores scenes separately from personas and projects. A scene references a character and optionally a project, then resolves visual directions such as wardrobe, props, body language, expression, activity detail, environment, composition, and lighting.

It remains downstream of the canonical engine:

```text
canonical persona
  -> visual projection
  -> scene/project/genre resolution
  -> target adapter
  -> structured prompt + source record
```

Important files include:

- `src/scene-store.js`
- `src/scene-resolver.js`
- `src/visual-projection.js`
- `src/visual-adapters/`

### Projects

Projects are local containers for contextual work. They store references rather than embedding personas. Project schema 2 adds extension points for characters, scenes, locations, relationships, notes, and genre context.

Projects do not mutate personas. Removing a project does not delete its characters.

Important files include:

- `src/project-store.js`
- `src/reference-model.js`

### Reference Intelligence

Reference intelligence separates structural record references from creative references. Purpose-aware references can guide appearance, fashion, genre, lifestyle, environment, or character output, with bounded influence and diagnostics.

Important files include:

- `src/reference-model.js`
- `src/reference-writer.js`

### Control Centre and Populator

The existing Control Centre and Python Populator remain the operational backbone for catalogue health, coverage, imports, templates, backups, undo, diagnostics, and pool management.

Important files include:

- `src/control-centre.js`
- `populator/main.py`
- `populator/validator.py`
- `populator/coverage.py`
- `populator/health.py`
- `docs/CONTROL_CENTRE.md`

## Current Version Picture

There are two useful version lenses:

- `package.json` still identifies the repository package as `0.4.0`.
- The newer Character Intelligence programme is documented through milestone `v0.6.9`.

The programme milestones are additive product/architecture milestones. They do not replace the repository package version or change the catalogue/data contract by themselves.

## Recent Milestones

The current documentation records these completed layers:

- v0.4.3: generator adapters.
- v0.4.4: visual quality.
- v0.4.5: projection density.
- v0.4.6: generation explainability.
- v0.4.7: controlled alternatives.
- v0.4.8: studio workbench and studio experience audit.
- v0.4.9: persona library.
- v0.5.0: project foundations and reusable reference model.
- v0.6.0-v0.6.9: Character Intelligence programme, including genre recipes, universal semantics, typed character assertions, lifestyle/activity resolution, scene intelligence, bounded continuity, reference intelligence, progressive UX, and compatibility audit.

## Verification Status

The documented final audit records:

- JavaScript tests: 189 passed, 0 failed.
- Python tests: 102 passed, 0 failed.
- Canonical JSON validation: 42 files passed.
- Catalogue health: 0 errors, 22 existing warnings, 69 informational findings.
- Coverage: 92 health score, 0 deficient pools.

The checked-in `npm-test-final.log` currently ends with:

- JavaScript tests: 134 passed, 0 failed.
- Duration: about 67.8 seconds.

That means the repository has strong evidence of passing automated checks, but the status file should treat the audit numbers and the saved log as two separate snapshots unless the full verification suite is rerun.

## Known Deferred Work

These are intentionally deferred extension points, not blockers for the current local product:

- Move the small in-code genre registry into managed catalogue data when taxonomy tooling and migration policy are ready.
- Add Control Centre editors and diagnostics for semantic relationships.
- Add visual asset ingestion, thumbnails, and caching for creative references.
- Persist project-level creative reference metadata once the workflow is designed.
- Add relationship-aware and multi-person scene generation after cast semantics are specified.
- Add automated continuity suggestions only with explicit review and provenance.
- Optimize large-project setup and batch persistence; project resolution/listing behavior is covered, but the representative performance fixture is still one of the slower JavaScript tests.
- Keep the app local while the Python Control Centre remains part of the product.

## How To Run

Start the local application:

```powershell
python start.py
```

Then open:

```text
http://127.0.0.1:8765
```

Run JavaScript tests:

```powershell
npm test
```

Run Python tests:

```powershell
python -m unittest discover -s tests -v
```

Validate catalogue data:

```powershell
python -m populator.main validate
```

Inspect catalogue health and coverage:

```powershell
python populate.py health
python populate.py coverage
```

Run diagnostics:

```powershell
npm run diagnose -- --samples 300
npm run diagnostics:visual
npm run review:visual
```

## Where We Stand

PromptForge is no longer just a persona generator prototype. It is now a coherent local creative studio with a stable canonical character engine, a friendlier product shell, scene generation, project context, explainable visual projection, catalogue tooling, and broad automated coverage.

The main architectural risk has been handled well: new intelligence layers are additive and bounded rather than rewriting the original engine. The most important next work is product deepening, not rescue work. The project is ready for careful expansion of catalogue-managed genres, richer project/reference workflows, and eventually multi-character scene intelligence, provided those changes keep the existing determinism, migration, and source-priority rules intact.
