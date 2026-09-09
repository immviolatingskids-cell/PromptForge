# Control Centre implementation

The default landing page is now the Prompt Forge Control Centre. The existing PersonaForge studio, persona library, generation pipeline, seeds, locks and output writers remain available through the persistent Studio navigation.

Run `python start.py`, then open `http://127.0.0.1:8765`. Restart an already-running server to load the new API handler. Static hosting still opens the UI and studio, but live health, coverage and backup actions require this local Python server.

## Architecture and files

Created:

- `src/control-centre.js`: hash navigation, action orchestration, form handling and studio bridge.
- `src/hub-views.js`: pure page rendering and reusable cards, threshold pool cards, health summary, preset cards and timeline.
- `src/hub-store.js`: browser persistence, defaults, escaping, greeting, coverage labels and CSS appearance application.
- `src/hub-dialog.js`: reusable keyboard-accessible naming and confirmation dialogs.
- `src/hub-api.js`: JSON requests and actionable offline/error handling.
- `control-centre.css`: responsive graphite/violet theme, light/system themes, accents, density and reduced motion.
- `populator/control_centre.py`: thin local service over existing coverage, health, history, templates and backup utilities.
- `populator/hub_activity.py`: catalogue hash/count comparison with explicit observation timestamps.
- `test/control-centre.test.js`, `tests/test_control_centre.py`: state, rendering, service, activity and HTTP tests.
- `docs/CONTROL_CENTRE.md`: this guide.

Modified: `index.html` adds primary navigation and the hub shell; `src/app.js` connects real generator controls and events; `start.py` adds the same-origin local API; `README.md` links this guide. No catalogue, schema or version files changed.

## Pages and reusable UI

Overview includes a time-based greeting, last workspace, actual health, catalogue totals, quick actions, under-minimum pools, observed expansions, activity, personal presets, session action counts and backup/version information. My Forge preserves catalogue and registry leaf semantics, displaying minimum/healthy/target thresholds, gaps and textual status. Category buttons filter the pool list; links open a pool inspector with the existing CLI command and catalogue JSON where applicable.

Profile supports name, initials/emoji avatar and creator label. Preferences connect to actual variance, setting, reference format and auto-copy behavior. Appearance supports dark/light/system, three accents, compact/comfortable spacing, optional subtle background and reduced motion. Presets support search by name/tags, favourites, open, use, rename, tags, duplicate and confirmed deletion. Activity, Data & Backup, Diagnostics and About provide the corresponding installation views.

Cards, pool cards, health summaries, timelines and forms are independent render helpers. Widgets can be rearranged in the view module without changing persistence or backend logic.

## Sources and persistence

- Coverage comes directly from `pool_coverage` and `leaf_coverage`; no threshold calculations are duplicated in JavaScript. Catalogue and deep counts overlap and are explicitly labelled as non-additive. Entry totals count primary catalogues once.
- Audits call `scan_health`, which reuses schema validation and existing duplicate/similarity logic. Results are timestamped snapshots, not a continuously running assertion of health. Similarity is not labelled intentional without evidence. Audit results are retained in ignored `.personaforge/control-centre.json`.
- The same ignored file stores up to 200 server events and a catalogue hash/count baseline. The first observation creates a baseline without inventing history. Refresh detects edits, additions and removals since the previous observation. Event time means observed time, not exact edit time. Positive count differences populate Recently expanded.
- Existing `.undo/history.jsonl` operations are shown separately because they lack timestamps. No fabricated dates are added to these records.
- Browser settings, profile, generation presets, the last workspace route and up to 200 browser events share `personaforge.control-centre.v1` in localStorage. Failed writes leave the last committed in-memory state intact and display an error. Session counters live only in memory and reset on reload.
- Saved personas continue using the existing `PersonaStore` and `personaforge.personas.v1`; they are not copied into the hub store. Generation presets are distinct reusable input setups, not persona records. Seeds are intentionally left under studio control.
- The backup page lists existing ZIP files with filesystem timestamps and actual sizes. Creation calls the existing `create_backup`, with unique names and no overwrite. Browser-data export includes hub data and existing saved personas as a user-downloaded JSON file. Catalogue backups do not contain browser data.
- About reads `package.json`, `data/data_version.json` and `data/schema_version.json` independently. It does not infer a build hash from milestone filenames.

## API

`GET /api/hub` returns current coverage, metadata, backup inventory, latest audit and activity; it also records a changed catalogue observation baseline in local runtime state. `POST /api/hub/audit` and `POST /api/hub/backup` run the explicit actions. Mutations require the exact localhost/loopback Host and matching Origin plus a custom request header; no CORS permission is added. Action failures return JSON errors; concurrent audit/backup mutations are serialized. The server continues binding to loopback.

## Responsive behavior and accessibility

Three-column modular desktop cards collapse to two and then one column. Secondary navigation wraps at narrow widths, while the primary rail remains available. Pool grids, studio columns, action rows and long paths adapt to narrow containers. Controls use native labels and semantics, keyboard navigation, visible focus, aria-current navigation, aria-pressed favourites and a polite live status region. Coverage status has text as well as colour. Theme tokens apply across the hub and studio. System and explicit reduced motion disable nonessential transitions; normal hover/progress transitions take 160–180 ms.

## Verification

Automated tests cover all ten pages with empty state, real-value populated rendering, escaping, profile absence, state persistence and failed writes, appearance resolution, all coverage labels/gaps/links, activity empty state, observed catalogue changes, actual scanner delegation, backup archive contents and unique names, API JSON failures and cross-origin mutation rejection. The existing generation and Python suites are run alongside data validation.

Browser checks cover actual dashboard totals, health audit completion, pool deep links, appearance persistence, light/dark rendering, reduced-motion application and narrow-width overflow on the overview, settings and generated studio. Native-dialog preset creation/use generated a persona successfully; deletion opens a confirmation dialog and Cancel preserves the preset. All 67 JavaScript tests and 99 Python tests pass. Data validation passes for all 38 canonical JSON files. The inspected audit reported 0 errors, 22 warnings and 145 informational findings. The test preview uses port 8766 to avoid the previously-running server on 8765.

## Limitations and next milestone

This is a local profile, not a cloud account. Avatar uploads, remote identity, style/workspace preset types, drag-reordering widgets and cross-tab state synchronization are deferred. Continue Working reopens a workspace; it does not restore an unsaved persona after reload. Generation defaults intentionally expose only controls the studio actually supports.

Catalogue editing/import remains in Populator. ZIP restore and browser-data import need a review/merge workflow and are not exposed as destructive browser actions. The API does not run test suites; Diagnostics clearly distinguishes health/schema scans from tests. CLI audits/backups created outside the hub do not gain synthetic activity events, though backup files and existing operation records are visible. Catalogue observation detects canonical file changes; deep registry/configuration-only changes update coverage but do not yet produce dedicated change events.

Next milestone: a reviewed pool editing/import interface with preview, validation, backups and conflict-aware restore, plus a resumable saved-persona workspace.
