# PromptForge v0.4.8 — Studio Workbench & Editorial Flow

Status: Implemented in source; automated behavior verified; live visual capture remains unavailable in this environment.

## Runtime baseline and live review evidence

The runtime was retried after the earlier initialization error. It now launches PromptForge successfully at `http://127.0.0.1:8765` in the Codex In-app Browser. The authoritative browser inventory contains only `Codex In-app Browser` (`iab`); Chrome and Edge are installed locally but are not exposed to this session. The available CUA API also does not expose a viewport-resize control, so the exact 1440px / 900–1024px / 375–480px viewport captures could not be produced. Responsive behavior is therefore source-verified from the repository's breakpoint rules, not claimed as live width verification.

Live interaction review was completed at the available browser viewport:

| Checklist state | Result | Evidence |
|---|---|---|
| Empty Studio / first-run | Verified | Empty Studio exposed “Set a few anchors, then generate a character” and the Generate Persona primary action. |
| Generated character with phase + status | Verified | Generated Vesper Reedwalker; Foundation/Character/Compare/Output phases and status showed variance, seed, current/unsaved state. |
| Inspector open/close and focus | Partially verified | Inspector opened with source, context, pool, dependency, and state detail. Before the focus patch, close returned focus to the document root; the stable-path plus deferred-focus patch was applied afterward and requires one further live confirmation. |
| Alternatives + stale-impact preview | Verified | Occupation comparison showed pinned current Soldier, four candidates, editorial fit evidence, and “21 dependent fields will need review.” |
| Stale state + post-choice feedback | Verified | Choosing Baker produced “21 stale fields,” “Unsaved changes,” “Last change: Changed life.job,” and Regenerate affected / Keep existing actions. |
| Persona output + Reference Package grouping | Verified | Persona tab exposed copy/export controls and prose; Reference Package exposed separate VISUAL INTENT and OUTPUT FORMAT groups. |
| Library vs Control Centre presets | Verified | Library said “Saved characters” and explicitly distinguished presets; Control Centre Presets said reusable generation setups. |
| Control Centre → Studio, overflow, focus, reduced motion | Partially verified | Hash transition and persisted last workspace worked; keyboard-visible controls and the reduced-motion preference are exposed. Width-specific overflow and motion timing remain unverified because viewport override is unavailable. |

## Implemented

### Workbench hierarchy

The Studio now exposes a lightweight, non-blocking phase model: Foundation, Character, Compare, and Output. Foundation and Character retain the existing Studio surface; Compare opens the existing alternatives inspector; Output selects the existing Reference Package tab. The model is navigation/editorial state only and does not enter the canonical persona.

### Character status and dirty state

The character header now reports identity, variance, seed, stale-field count, saved/unsaved state, and the last deliberate change when available. Generation, rerolls, locks, stale resolution, alternative choices, duplication, and hook changes mark the workspace unsaved. Opening a saved persona clears dirty state; saving clears dirty state; presentation actions do not mark it dirty. Existing `PersonaStore` and workspace persistence remain in use.

### Contextual comparison

The existing Inspector remains on demand rather than being populated with decision detail by default. Alternatives now present a comparison-oriented surface with a pinned current value, “Compare with” candidates, candidate inspection/choice actions, editorial fit language, and a dependency-graph-backed impact preview before selection. Choosing still uses `PersonaController.chooseAlternative()` and the existing stale propagation; no regeneration or reranking was added.

### Output workflow

Reference Package controls are grouped into Visual intent and Output format. Visual context, prompt mode, and visual rerolls are separated from target, density, copy, and export controls. Existing projection, adapter, density, and export semantics are unchanged. Persona Library is explicitly labelled as saved characters and explains its distinction from reusable Control Centre presets.

### Shared language and responsive foundations

The new phase/status/comparison surfaces use the existing shared CSS variables and focus conventions. New controls are native buttons/selects, keyboard reachable, and use text labels. Existing responsive rules remain active: the Studio collapses from three columns to two and then one, action clusters wrap, prose breaks long content, and reduced-motion rules remain respected.

## Verified

- JavaScript: 108/108 passing after the workbench changes.
- Existing generation, ranking, dependency, alternatives, visual, adapter, density, and explainability modules remain covered by the existing suite.
- `git diff --check`: verified after implementation.
- No catalogue, schema, generator, ranker, projection, adapter, or density files were changed for this milestone.

Protected v0.4.7 alternatives baseline remains the reference: 718 eligible instances, 676 with alternatives, 0 determinism failures, 0 current-value exclusions, 0 hard-compatibility failures, 0 duplicate-cluster failures.

## Deferred / not supported

- Live desktop/tablet/mobile screenshots and pixel-level interaction review are deferred until the Windows/browser capture runtime is repaired or a supported browser harness is supplied.
- Studio hash routes and browser-back parity remain deferred; the existing tab architecture is preserved.
- No decorative animation was added. Functional motion should be selected after the live review identifies specific comprehension gaps.
- The current alternative “Inspect candidate” affordance continues to reuse the established decision evidence path; it does not fabricate historical candidate traces.
- No v0.4.9 work was started.

## Remaining visual review checklist

When runtime capture is available, review at approximately 1440px, 900–1024px, and 375–480px:

1. Empty Studio and first-run orientation.
2. Generated character with phase/status hierarchy.
3. Inspector open/close and focus return.
4. Alternatives comparison and stale-impact preview.
5. Stale state and post-choice feedback.
6. Persona output and Reference Package grouping.
7. Library versus Control Centre preset distinction.
8. Control Centre → Studio transition, overflow, focus, and reduced motion.
