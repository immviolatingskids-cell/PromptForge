# PromptForge — Current Scope Audit Log

**Audit date:** 2026-09-07  
**Repository root:** `C:\Users\Pc\Documents\PromptForge`  
**Requested mode:** read-only deep-dive review; no product/source/data changes  
**Observed project version:** `0.2.7`  
**Data/schema versions:** `data/data_version.json` and `data/schema_version.json`

## Executive scope

PromptForge (the repository describes the product as PersonaForge in several places) is a browser-based persona-generation studio backed by a Python catalogue-management CLI. Its scope includes:

- A static browser UI served locally by `start.py`.
- Deterministic, seeded persona generation from JSON catalogues.
- Context compatibility, anchor resolution, candidate ranking, coherence repair, dependency invalidation, stale-field tracking, locks, rerolls, and variance modes.
- Persona persistence in browser storage, JSON export, Markdown/plain-text persona writing, and reference-prompt generation.
- A Python `populator` package for validation, import/review, backup/undo, coverage analysis, health scans, duplicate handling, migrations, templates, queues, deep-pool inspection, and interactive workflows.
- Legacy flat catalogue branches plus a registry-driven deep-pool expansion model.
- JavaScript and Python automated test suites.

This audit logs the current scope and observed baseline. It does not propose or apply changes.

## Repository and workspace state

- No Git repository metadata was available at the project root when checked (`git status` returned “not a git repository”). No commit, branch, diff, or historical provenance could therefore be verified.
- Present top-level directories: `.personaforge`, `.undo`, `backups`, `data`, `populator`, `schemas`, `scripts`, `src`, `test`, `tests`.
- Generated/runtime-looking content is present in `populator/__pycache__` and `tests/__pycache__`; these were excluded from source inventory but are part of the current filesystem scope.
- `backups/` exists and is treated as generated data history; archives were not edited.
- `.personaforge/` and `.undo/` are operational state areas used by the population/coverage workflows.
- Existing project documents include `README.md`, `PROMPTFORGE_BRAINSTORM_CONTEXT.md`, `PROJECT_REVIEW_AND_FEATURE_ROADMAP_2026-09-07.md`, and `POPULATOR_CHANGES_2026-09-07.md`.

## Top-level files and responsibilities

| Surface | Current responsibility |
|---|---|
| `index.html` | Browser form, persona display, library controls, reroll/lock actions, prompt/reference controls, and export controls. |
| `styles.css` | UI presentation and layout. |
| `start.py` | Local static server launcher; project guidance specifies `127.0.0.1:8765`. |
| `package.json` | Private ES-module Node package, version `0.2.7`; scripts are `test` and `diagnose`. |
| `populate.py` | Thin launcher for the Python populator CLI. |
| `AGENTS.md` | Repository-specific collaboration, structure, style, testing, and data-safety guidance. |
| `schemas/` | Structural schemas for library and species entries. |
| `scripts/` | Standalone generation diagnostics launcher. |

## JavaScript runtime scope (`src/`)

| Module | Responsibility |
|---|---|
| `app.js` | Browser orchestration, form population, rendering, UI event handling, library actions, downloads, and display escaping. |
| `data-loader.js` | Loads the JSON catalogue library from the data tree. |
| `generator.js` | End-to-end seeded persona generation, anchor handling, selection, and assembly. |
| `seed-rng.js` | Seed hashing and deterministic random-number generation. |
| `context-engine.js` | Context fields, context extraction, compatibility checks, and candidate filtering. |
| `context-profile.js` | Resolves explicit/inferred context profiles from library data and persona anchors. |
| `candidate-ranker.js` | Compatibility scoring and weighted/ranked candidate choice by variance mode. |
| `coherence.js` | Post-generation coherence checks and repairs. |
| `dependency-engine.js` | Field dependency graph, transitive affected-field calculation, and stale marking. |
| `persona-controller.js` | Field access, mutation, locks, rerolls, section rerolls, anchors, and state transitions. |
| `persona-store.js` | Browser persistence and CRUD operations for saved personas. |
| `persona-writer.js` | Structured persona rendering and plain-text normalization. |
| `reference-writer.js` | Structured/polished reference prompt package and Markdown output. |
| `character-hook.js` | Derives a connecting character hook from existing persona facts. |
| `structured-fields.js` | Normalizes names, occupations, and hobbies into structured output. |
| `similarity-guard.js` | Prevents repeated concepts by cluster when selecting multiple values. |
| `selection-inspector.js` | Explains contextual exclusion and candidate-selection state. |
| `effective-coverage.js` | Measures usable contextual coverage rather than raw entry count. |
| `generation-diagnostics.js` | Batch diagnostics across seeds, modes, contexts, and actionable coverage queues. |

## Python CLI scope (`populator/`)

The CLI supports interactive and command-line catalogue administration. Major areas are storage/category resolution (`storage.py`), schema-normalized entry creation (`schemas.py`), structural validation (`validator.py`), import/review and duplicate classification (`importer.py`, `duplicate_detector.py`), safe backup/undo (`backup.py`), population sessions and queues (`population.py`), dry-run planning (`planner.py`), templates (`templates.py`), health and quality reporting (`health.py`, `quality.py`), coverage/thresholds/priorities (`coverage.py`, `coverage_targets.py`, `coverage_priorities.py`), deep registry and leaf-pool operations (`deep_pools.py`, `deep_coverage.py`, `deep_compatibility.py`, `inspector.py`), classification migration (`migration.py`), fixture generation (`fixtures.py`), country reference generation (`country_reference.py`), terminal theme/tree rendering (`theme.py`, `tree_view.py`), and the CLI/menu surface (`cli.py`, `main.py`).

The design explicitly distinguishes reversible, backed-up mutations from dry-run analysis. Tests cover import, edit/clone/delete, backup/undo, validation, queueing, migration, deep-pool acceptance, and threshold compatibility.

## Data and schema scope

Canonical data is organized under `data/` by domain:

- `appearance`: body, eyes, features, hair.
- `clothing`: styles, signature outfits.
- `core`: settings, eras, life stages, cohorts, countries, regions, locales.
- `expansions`: checked-in hobby expansion document.
- `identity`: heritage, species types, species, given names, family names.
- `lifestyle`: education, hobbies, housing, interests, occupations, transport.
- `narrative`: expressions, goals, secrets, signature items.
- `personality`: flaws, habits, quirks, traits, values.
- `pools`: deep-pool registry.
- `templates`: entry templates.
- `data_version.json`, `schema_version.json`: component/version metadata.

Inventory observed: 38 canonical JSON files validated, including large hierarchy/reference files (`countries.json`, `regions.json`, `cohorts.json`) and compact generation pools. The largest observed files were `data/core/countries.json` (3,512 lines) and `data/core/regions.json` (807 lines).

Schemas observed:

- `schemas/library-entry.schema.json`: shared library-entry structure.
- `schemas/species-entry.schema.json`: species-specific structure.

The validator also covers special documents such as versions, templates, expansions, and the deep-pool registry, plus component-version consistency and safe data-root/category boundaries.

## UI and user workflow scope

The browser flow exposes generation from random or anchored selections, displays grouped persona cards, allows field/card locking and rerolling, marks dependent fields stale after upstream changes, saves/opens/duplicates/deletes personas, exports JSON, writes persona text, and produces reference packages in structured or polished modes. HTML display values are escaped in library rendering; generated display helpers handle arrays and object-shaped values.

The local server is intentionally simple: there is no observed compilation or bundling step, and `package.json` has no runtime dependency declaration.

## Observed validation baseline

Commands run from the project root:

| Command | Result |
|---|---|
| `npm test` | **PASS** — 39 tests, 0 failures, 0 skipped. |
| `python -m unittest discover -s tests -v` | **PASS** — 84 tests, all OK, runtime 36.193s. |
| `python -m populator.main validate` | **PASS** — 38 canonical JSON files checked. |
| `python populate.py health` | **PASS with findings** — 0 errors, 1 warning, 145 informational findings. |
| `python populate.py coverage` | **Completed with catalogue gaps** — 68 deficient pools, 23 below healthy, 8 healthy, 1 at or above target. |

The JavaScript suite specifically exercised deterministic generation across 300 seeds, all variance modes, supported setting anchors, context compatibility, stale dependency behavior, locks, persistence, writers, reference prompts, species context, structured fields, and diagnostics. The Python suite exercised legacy and v0.25–v0.27 population/coverage behavior, country hierarchy integrity, import/backup/undo, deep pools, thresholds, migration, templates, and validator failures.

## Coverage and catalogue readiness

Legacy branches are generally at minimum breadth, with stronger coverage in countries (195/195), cohorts, regions, life stages, names, species types, hobbies, and occupations. Many appearance, clothing, personality, narrative, and lifestyle branches remain only at minimum or below healthy thresholds.

The most concrete legacy deficiency observed is `core/locales`: 4 current entries against a minimum of 10. Deep-pool readiness is materially lower: the coverage output showed deep leaf pools such as appearance subfeatures and clothing garments/accessories at zero current entries. The deep registry therefore represents planned/available expansion scope more than populated generation breadth at this snapshot.

Coverage semantics include minimum, healthy, and target thresholds; queue goals preserve which threshold a population task is intended to reach. The system separates raw catalogue count from effective context-usable coverage and supports ignored priorities, leaf targets, presets, and inherited registry defaults.

## Architecture and behavior observations

1. Determinism is a core invariant: seed plus data version is intended to reproduce the initial persona.
2. Anchors are treated as constraints; incompatible anchor chains fail clearly instead of silently changing the user’s selection.
3. Compatibility is hard for foundational context fields and soft/ranked for selected shared contexts where appropriate.
4. Coherence is a post-selection repair/recheck layer, including species-age and experience constraints.
5. Dependencies are explicit and transitive; rerolling an upstream field can mark downstream values stale while respecting locks.
6. Heritage is not hard-determined by current country, avoiding an overly simplistic cultural inference.
7. The Python side has a stronger operational-safety model than a simple file editor: review-before-import, backups, undo history, validation, and dry-run planning are first-class flows.
8. The system currently contains both legacy flat branches and newer deep-pool registry concepts, with compatibility/normalization code bridging old and new queue/config formats.

## Risks and watch items logged (no fixes applied)

- **Catalogue breadth risk:** passing code tests does not imply broad generation variety; most deep pools are unpopulated and many legacy branches are only at minimum.
- **Effective coverage risk:** raw counts can overstate usable variety when context filters remove candidates; the effective-coverage and diagnostics paths are therefore operationally important.
- **Version/provenance risk:** the root is not a Git checkout in this environment, so code/data change history cannot be audited from Git.
- **Runtime-artifact hygiene:** `__pycache__` directories are present in the working tree; their tracking status cannot be established without Git metadata.
- **Naming/documentation drift:** the product/repository is named PromptForge in the requested scope and PersonaForge in package/UI-related documentation; this may affect user-facing consistency.
- **Generated-state complexity:** `.personaforge`, `.undo`, and `backups` add persistence/history state that should remain distinct from canonical data and be reviewed before any future cleanup.
- **Browser-only persistence boundary:** persona storage is implemented in the browser layer; no server-side persona database or API was observed in the inspected scope.
- **Diagnostic volume:** health emits many informational findings, so consumers should distinguish actionable warning/error status from breadth/backlog information.

## Explicit non-actions

- No source code was edited.
- No JSON catalogue, schema, backup, undo, or runtime-state file was edited.
- No archive was opened for modification.
- No Git operation was performed beyond the read-only status check.
- This Markdown file is the sole audit artifact created for the request.

## Reproduction commands

```text
npm test
python -m unittest discover -s tests -v
python -m populator.main validate
python populate.py health
python populate.py coverage
node scripts/generation-diagnostics.js
python start.py
```

## Audit conclusion

The current scope is a tested, deterministic persona-generation studio with a substantial catalogue-operations subsystem. The executable baseline is healthy: all observed automated tests and structural validation passed. The principal current limitation is content readiness and expansion depth, not an observed failing implementation: the legacy catalogue is unevenly populated, and the deep-pool model is largely a zero-entry backlog at this snapshot. Future work should treat catalogue population, effective contextual coverage, state-directory hygiene, and naming/provenance consistency as separate concerns from core generation correctness.
