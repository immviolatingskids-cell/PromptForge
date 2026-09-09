# PromptForge v0.4.9 — Persona Library & Creative Workspace

Status: In progress. Audit recorded; metadata boundary implemented and tested. No v0.5.0 work started.

## Scope amendment: live review gate

The v0.4.9 closure review carries forward the v0.4.8 live-review checklist as a required continuity gate. Library work must be reviewed in the same workbench context, at approximately:

- desktop: 1440px wide;
- tablet: 900–1024px wide;
- narrow/mobile: 375–480px wide.

The eight required states are:

1. Empty Studio / first-run state.
2. Generated character with phase and status hierarchy.
3. Inspector open/close and focus return.
4. Alternatives comparison and stale-impact preview.
5. Stale state and post-choice feedback.
6. Persona output and Reference Package grouping.
7. Library versus Control Centre preset distinction.
8. Control Centre → Studio transition, overflow, focus, and reduced motion.

Evidence must distinguish live interaction from source-level responsive inspection. A viewport-capable browser includes a Playwright-controlled Chromium run, including exact `page.newPage({ viewport })` sizes, responsive assertions, and captured screenshots. The Codex In-app Browser remains useful for interaction review but is not itself the exact-width evidence surface.

## Mandatory repository audit — current findings

### Persistence and record identity

- `PersonaStore` is implemented in `src/persona-store.js`.
- Saved personas use localStorage key `personaforge.personas.v1`.
- The workspace draft uses `personaforge.workspace.v1`.
- A saved persona is uniquely addressed by `meta.persona_id`.
- `save()` updates an existing matching ID and otherwise prepends a new record.
- `duplicate()` creates a new timestamp-suffixed ID, resets creation/modification timestamps, and appends `Copy` to the canonical name.
- Current timestamps are `meta.created_at` and `meta.modified_at`; legacy records may lack either value, so v0.4.9 must not fabricate historical dates.
- Generation seed and schema/data versions remain in `meta`; selection provenance is stored under canonical `state.selection_provenance` by the existing alternative-choice flow.

### Normalization and compatibility

`normalizePersona()` repairs known legacy shapes for value profiles, occupation, experience, housing, mobility, hobbies, personality depth, and origin. It initializes existing `state` collections conservatively. New library metadata must be normalized separately from canonical persona truth, with safe defaults only for workspace concepts such as favorite, tags, archived, and lineage metadata.

### Current library and save flow

The Studio Library currently renders a compact row with name, seed, schema/data versions, and Open, Duplicate, JSON, and Delete actions. Save updates the current record and clears the Studio dirty state. Opening establishes the saved persona as the current workspace without rerunning generation. Duplicate opens the independent copy and marks the workspace changed. Deletion is currently direct and must be made clearly distinct from reversible archive behavior.

### Control Centre and presets

Control Centre data uses `personaforge.control-centre.v1` through `HubStore`. Presets are stored in `hub.presets` and are reusable generation setups, not saved characters. Browser-data export currently includes hub data and `PersonaStore` personas; catalogue ZIP backups do not include browser data. v0.4.9 must preserve this distinction and extend the existing export/backup path rather than introduce a second incompatible store.

### Import, backup, and migration constraints

The current browser-data surface exports hub data and personas, while browser-data import is not exposed as a completed merge workflow. Catalogue restore is a separate conflict-aware server operation. v0.4.9 metadata migration must be deterministic, idempotent, preserve malformed-but-loadable canonical records where possible, and keep missing lineage references non-breaking. Collision behavior for imported persona IDs must be audited before implementation.

## Architecture decision to preserve

Library organization is workspace metadata, not canonical character truth. The intended saved-record boundary is:

```text
saved persona
├── canonical persona
└── library metadata
    ├── favorite
    ├── tags
    ├── archived
    ├── timestamps where truthful
    └── explicit variant lineage
```

No lineage may be inferred from matching seeds, names, or similar canonical values. A variant must receive a new ID and record an explicit parent relationship only when the user performs the variant action.

## Implemented in the current slice

- Added separate `personaforge.persona-library.v1` storage for workspace metadata.
- Added conservative metadata normalization for favorite, tags, archive state, truthful timestamps, variant labels, and explicit variant lineage.
- Added metadata update and persona-plus-metadata retrieval helpers to `PersonaStore`.
- Existing canonical persona JSON remains unchanged when metadata is mutated.
- Duplicate copies user tags but does not infer variant lineage.
- Added tests for metadata persistence, normalization, canonical isolation, and duplicate lineage behavior.
- Added deterministic Library indexing, search, active/favorites/recent/archived views, and name/date sorting helpers.
- Replaced the old Library rows with concise character cards showing identity, setting, occupation, tags, favorite/archive state, and explicit variant labels when present.
- Added accessible search, view, and sort controls plus favorite and archive actions; opening a character records a truthful `lastOpenedAt` timestamp.
- Added query tests covering identity/tag search, archive exclusion, favorites, and deterministic sorting.
- Added `PersonaStore.createVariant()` with a new independent ID and explicit `{ parentPersonaId, relation: "variant" }` metadata; ordinary Duplicate remains lineage-free.
- Added deterministic canonical comparison grouped by Foundation, Origin, Character, Life, Personal, Appearance, and Narrative, with Same/Changed/Only-in-A/B results and no similarity score.
- Added tests for independent variant state, explicit lineage, changed fields, same sections, and missing-field comparison.
- Exposed `Create Variant` on Library cards; it creates the explicit branch, opens it in Studio, and preserves the original record.
- Added lightweight two-card comparison selection in the Library with bounded section summaries and expandable deterministic field differences.
- Extended the existing browser-data export payload with a separate `personaLibrary` metadata map; canonical `personas` remain unchanged and Control Centre presets remain separate.
- Added lightweight tag editing with case-insensitive de-duplication and explicit Delete confirmation; Archive remains the reversible organization action.
- Added bounded Library filters for setting, species, life stage, country, and occupation, sourced only from saved canonical identity fields.
- Library filters now participate in the deterministic query pipeline, so combined search/filter results and empty states reflect the actual result set rather than merely hiding rendered cards.
- Added a bounded Tag filter to the live Library toolbar; it uses normalized workspace tags and remains empty-safe when no tags exist.
- Added source-level responsive regression coverage for Library card/toolbar reflow and Control Centre reduced-motion handling.
- Added `PersonaStore.libraryDiagnostics()` for saved count, duplicate IDs, metadata count, archive/favorite counts, and missing/self/cyclic lineage references; malformed lineage does not prevent loading the persona.
- Added `PersonaStore.browserData()` and a round-trip test proving browser export keeps canonical personas and Library metadata in separate collections.
- Added representative-size query coverage for 10, 50, 100, 250, and 500 saved records across search, favorites, archive, sorting, and repeated query passes; no database redesign was needed.
- Recent view now orders by the newest reliable `lastOpenedAt`/updated signal and excludes archived records; deterministic coverage added.
- Library cards now expose the existing Markdown, TXT, and Reference Package exports in addition to canonical JSON.
- Fresh live runtime smoke check after the export changes completed without a Data error; Studio resumed the saved character and remained interactive in the Codex In-app Browser.
- Live comparison review completed with two saved cards selected: the Library rendered a comparison summary with 4 changed sections, Same sections, and bounded expandable difference counts for Origin, Character, Life, and Personal data.
- Live variant review completed: Create Variant opened `Tomas Vale Copy Variant` in Studio, retained the original card, and displayed the explicit parent relationship on the variant card.
- Added regression coverage proving a deleted variant parent leaves the child loadable and reports an honest missing-parent diagnostic.
- Added collision-safe browser-data import for saved personas and separate Library metadata; imported variant parents are remapped when both records are present, while existing IDs are never overwritten.
- Added a Data & Backup browser-data import action with explicit collision reporting; catalogue restore remains a separate server-backed workflow.
- Live cache-busted runtime review confirmed the Data & Backup page exposes both Export browser data and Import browser data; nested Control Centre modules now use versioned URLs so source changes are not masked by stale browser module cache.
- Live smoke check confirmed the refreshed runtime loads `PersonaStore.allWithMetadata()`, renders the Library filters/cards, and preserves the existing duplicate flow with two independent saved cards. A versioned module URL was added to prevent stale browser module caching during local review.

## Required implementation and verification gates

The milestone remains open until the Library supports, with focused tests and runtime evidence where available: concise cards; local search; bounded filters; deterministic sorting; favorites; normalized tags; recent and archive views; archive/delete distinction; independent duplicate and explicit variant semantics; safe missing-parent handling; structural comparison; Studio continuity; export/backup metadata round-trip; metadata/canonical separation; and the carried-forward eight-state responsive review.

The live review record must report separately:

- states verified in the available browser;
- states source-verified only;
- states blocked by missing viewport or browser-provider support;
- exact browser/provider and viewport evidence used.

### Current live review record

Verified in Codex In-app Browser at `http://127.0.0.1:8765` with the cache-busted runtime: populated Library cards; search/view/sort controls; canonical Setting, Species, Life stage, Country, Occupation, and Tag filters; favorite/archive/duplicate/delete distinction; tag editing; Create Variant and explicit parent display; two-persona comparison; Markdown/TXT/Reference exports; Open in Studio continuity; and Control Centre Data & Backup export/import actions. Studio resumed the saved variant without a Data error.

Source-verified: responsive reflow rules, focus-return implementation for Inspector close, reduced-motion preference handling, and shared Control Centre/Studio visual tokens. Playwright-verified: Chromium at 1440×1000 desktop, 1024×900 tablet, and 390×844 mobile; all 10 visual-review states were captured at each size, with responsive overflow, clipping, primary-action, and phase-navigation assertions passing (30 screenshots). Exact-width verification is therefore complete through the Playwright harness.

## Baseline to protect

- JavaScript: 108/108 passing for v0.4.8.
- Python: 102/102 passing.
- Canonical validation: 42/42.
- Health: 0 errors / 22 warnings / 69 info in the v0.4.8 protected baseline.
- Controlled Alternatives: 718 eligible, 676 with alternatives, zero determinism/current-value/hard-compatibility/duplicate-cluster failures.

New v0.4.9 tests must be added without weakening these baselines. Current validation: JavaScript 126/126 passing; `node --check src/app.js`, `src/control-centre.js`, and `src/hub-views.js` passing; Python 102/102 passing; canonical validation 42/42. Health remains 0 errors / 22 warnings / 69 info. Performance query coverage passes at 10/50/100/250/500 records. Live browser evidence: Playwright-controlled Chromium against local `127.0.0.1:8765`, with exact target viewports and 30 captured state screenshots.

Full repository validation was rerun on the current worktree: Python `unittest` 102/102 passed, canonical validation 42/42 passed, and `populate.py health` reported 0 errors / 22 warnings / 69 info.

Applicable diagnostics were also rerun successfully: generation diagnostics reported no warnings and an empty coverage queue; narrative diagnostics completed; visual diagnostics completed with zero identity-anchor failures; adapter diagnostics reported deterministic output with no missing components; visual-quality diagnostics reported zero identity-anchor failures, contradictions, abstract leakage, or activity/pose mismatches; density diagnostics reported deterministic unchanged projections with zero identity-anchor failures and semantic omissions; explainability diagnostics reported 2,098/2,098 source, selection, dependency, and state records with zero deterministic, mutation, or unsupported-causality failures; and alternatives diagnostics preserved the 718 eligible / 676-with-alternatives baseline with zero determinism, current-value, hard-compatibility, or duplicate-cluster failures.

## Deferred / not supported

- **Exact-width live viewport verification:** complete through `npm run visual-review`. The Playwright harness is the accepted viewport-capable browser surface: it launches Chromium at the milestone target sizes, captures the defined states, and passes responsive assertions. The Codex In-app Browser and directly connected Chrome/Edge providers are optional complementary review surfaces, not prerequisites for closure.
- Browser-data import now supports saved-persona and Library-metadata merge with collision-safe ID renaming; Control Centre profile/preset merge is intentionally not performed automatically, so imported browser files do not overwrite local settings or presets.
- Folders/collections, casts, relationship graphs, cloud sync, semantic search, AI tagging, inferred lineage, and new generation architecture remain out of scope.
- No v0.5.0 work begins automatically.
