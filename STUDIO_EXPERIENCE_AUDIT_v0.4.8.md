# PromptForge Studio Experience Audit

Date: 2026-09-08  
Scope: current Control Centre + PersonaForge Studio, with v0.4.8 definition

## Audit status

This is an evidence-based product audit of the current repository. The live Windows/browser capture path was attempted twice, but the Computer Use runtime failed before exposing a target surface (`failed to write kernel assets: The system cannot find the path specified`). Therefore layout and interaction findings below are verified from `index.html`, `styles.css`, `control-centre.css`, `src/app.js`, `src/control-centre.js`, `src/hub-views.js`, existing tests, and the Control Centre implementation guide. Pixel-level visual and animation observations remain unverified and should be the first step of implementation.

## Current experience map

```text
Control Centre
├─ Overview
├─ My Forge / pool inspection
├─ Pool editor
├─ Profile · Preferences · Appearance
├─ Presets · Activity · Data & Backup
└─ Diagnostics · About

Studio
├─ Persistent primary navigation from Control Centre
├─ Generation bar: variance, seed, generate, reroll unlocked, save
├─ Foundation anchors: setting, era, gender, species, life stage, age, country
├─ Canonical character tabs
│  ├─ Studio: narrative + expandable persona cards
│  ├─ Persona: prose output + exports
│  ├─ Reference Package: prompt and visual projection controls
│  └─ Library: saved personas
└─ Context inspector: seed, locks, stale dependencies, hook, data contract,
   coherence, decision inspector, controlled alternatives
```

## Findings by experience layer

| Layer | Evidence | Audit finding |
|---|---|---|
| Information architecture | Two primary destinations plus 11 Control Centre pages and four Studio tabs | Capability is broad, but the user's main job—shape a character, then produce output—is distributed across multiple navigation systems. |
| Navigation | Hash routes for the hub; local tab buttons for Studio; primary rail persists | Navigation is functional but not fully unified: browser back/deep-link semantics differ between hub pages and Studio tabs. |
| Hierarchy | Three-column Studio; Foundation left, canonical center, Context right | The visual hierarchy puts many system controls at the same level as creative decisions. The generated character and next best action are not a single obvious focal point. |
| Creation flow | Foundation anchors precede Generate; random/locked state is explained with a small legend | The flow is technically coherent, but there is no explicit staged progress, review checkpoint, or “shape → compare → finalize” framing. |
| Controls | Generate, reroll unlocked, save, locks, card rerolls, field inspect, alternatives | Controls are numerous and mostly field-level. Destructive or high-consequence actions are not consistently grouped by intent or accompanied by a compact change summary. |
| Visual generation | Reference tab combines prompt mode, visual context, target, density, projection rerolls and source inspector | Powerful but dense. Canonical identity, visual composition, provider target, density, and export are adjacent without a strong workflow distinction. |
| Alternatives | Progressive-disclosure alternatives use current value, bounded options, inspect/choose | Good foundation. The experience still needs a clearer comparison state and post-choice confirmation of what changed and what became stale. |
| Inspector | Context and Decision Inspector share the right rail | Explanation is available, but it competes with the primary editing surface and can become a long vertical stack. |
| Output | Persona, Reference Package, copy/export controls | Output is separated by tabs, but there is no persistent output tray or clear “ready to use” state connecting canonical changes to refreshed outputs. |
| Library | Saved Personas tab plus Control Centre presets | Personas and generation setups are intentionally distinct, but the distinction is learned through copy and labels rather than a strong mental model in the UI. |
| Responsive behavior | CSS collapses three columns to two then one; hub documents one-column adaptation | Structural collapse exists. The audit cannot verify whether action rows, long field values, inspector content, and tabs remain comfortable at actual narrow widths. |
| Visual design | Graphite/violet Control Centre tokens; Studio graphite/lime token set; serif/editorial headings | The two shells are individually coherent but visually speak different product dialects. The transition from Control Centre to Studio may feel like entering a different application. |
| Animation/micro-interactions | Control Centre guide specifies 160–180ms transitions and reduced-motion handling; Studio CSS has little visible motion system | Motion guidance is stronger for the hub than the Studio. Studio state changes appear primarily instantaneous from source evidence. |

## UX opportunities

Scoring: Impact is user/product value; Complexity is implementation effort and regression surface. High/medium/low are relative to this repository.

| Rank | Opportunity | Impact | Complexity | v0.4.8 recommendation |
|---:|---|---|---|---|
| 1 | Create a unified Studio workbench hierarchy: one explicit flow from Foundation → Character → Compare → Output, with the current phase and next action visible | High | Medium | **Do** |
| 2 | Add a compact “character status / change summary” near the generated name: seed, variance, stale count, unsaved state, and last deliberate choice | High | Low | **Do** |
| 3 | Make the inspector contextual and collapsible rather than a permanently competing right-rail stack; preserve deep detail on demand | High | Medium | **Do** |
| 4 | Turn alternatives into a real comparison state: current pinned beside selected candidate, shared context, changed field, downstream stale preview, Choose/Close | High | Medium | **Do** |
| 5 | Separate creative controls from delivery controls in Reference Package: composition first, target/density/export second | High | Medium | **Do** |
| 6 | Add a visible “unsaved changes / save persona” state and clarify Save Persona versus generation presets | High | Low | **Do** |
| 7 | Establish a shared design-token layer between Control Centre and Studio so rail, buttons, surfaces, focus, warnings, and headings feel like one product | Medium | Medium | **Do** |
| 8 | Improve field action hierarchy: keep Inspect and Alternatives discoverable, move low-frequency lock/reroll actions into a consistent action cluster, and expose keyboard focus clearly | Medium | Medium | **Do if capacity permits** |
| 9 | Add an output tray or “Use this output” handoff that preserves the selected persona/reference mode while moving between Persona and Reference Package | Medium | Medium | **Do if capacity permits** |
| 10 | Make Studio tabs deep-linkable and browser-back friendly, matching Control Centre route behavior | Medium | Medium | **Do if capacity permits** |
| 11 | Add a first-run empty-state path that explains the three-step job and points to one primary Generate action | Medium | Low | **Do if capacity permits** |
| 12 | Make Library and Presets visibly different objects: “saved characters” versus “reusable generation setups,” with separate visual treatments and primary actions | Medium | Low | **Do if capacity permits** |
| 13 | Add a responsive action strategy for narrow widths: sticky primary action, stacked field actions, and a bottom/inline inspector rather than a long post-column dump | Medium | Medium | **Do if capacity permits** |
| 14 | Define and implement a Studio micro-interaction system for generation, stale marking, alternative selection, save success, and tab transitions, with reduced-motion equivalents | Medium | Medium | **Defer to polish slice unless runtime review finds severe feedback gaps** |
| 15 | Add a bounded visual review harness with desktop/tablet/mobile screenshots and a short interaction checklist | Medium | Low | **Do first as enablement** |

## Proposed v0.4.8 boundary

### v0.4.8 — Studio Workbench & Editorial Flow

The milestone should be an experience-architecture pass, not another catalogue or generation feature.

Implement:

1. A unified Studio phase model and hierarchy without changing canonical generation.
2. A compact character status/change summary.
3. A collapsible contextual inspector with clear primary/secondary information levels.
4. A comparison-first alternatives presentation with stale-impact preview, preserving the existing deterministic alternative engine.
5. A clearer Reference Package workflow separating composition from delivery/export.
6. Shared cross-shell design tokens and accessibility/focus treatment.
7. Runtime review at desktop, tablet, and mobile widths, with screenshots captured as evidence.

Success should be measured by task clarity and state visibility, not by adding more controls:

- A new user can identify the primary next action after landing in Studio.
- A user can tell what is canonical, what is derived, what is stale, and what is unsaved.
- A user can compare an alternative before choosing it and understand downstream consequences.
- A user can move from character shaping to usable Persona/Reference output without losing context.
- The same mental model works in Control Centre and Studio.
- Narrow layouts remain actionable without horizontal overflow or hidden primary actions.

## Explicit non-goals for v0.4.8

- No new catalogue domains, candidate ranking, variance model, visual adapter, density model, or narrative generator.
- No full catalogue browser or unrestricted manual editing.
- No relationships, cast generation, world simulation, plugin architecture, or AI replacement suggestions.
- No broad Control Centre expansion until the Studio workbench hierarchy is coherent.

## Recommended implementation order

1. Repair/enable the runtime visual review path and capture the current baseline.
2. Define shared tokens and the Studio phase/status model.
3. Implement inspector and alternatives comparison hierarchy.
4. Rework Reference Package information architecture.
5. Validate desktop/tablet/mobile flows and accessibility.
6. Add only the highest-value micro-interactions exposed by the review.

## Decision

Proceed with v0.4.8 as **Studio Workbench & Editorial Flow**, beginning with a runtime visual baseline and information hierarchy. Do not begin another backend or catalogue milestone until this audit's visual evidence is completed and the proposed flow is accepted.

## Local visual review harness

The bounded dev-only harness in `visual-review/capture.mjs` starts the existing `start.py` server, launches Playwright Chromium, enables reduced motion, and captures deterministic screenshots under `visual-review/screenshots/`. It covers Empty Studio, generated character, Inspector, Alternatives, stale dependency, Persona output, Reference Package, Persona Library, Control Centre, and Control Centre → Studio states at 1440 × 1000, 1024 × 900, and 390 × 844.

Each capture also checks document/body width, primary-action reachability, action-row and phase-navigation bounds, panel clipping, and the relevant hub/workbench surfaces. The local run produced 30 screenshots and passed the structural responsive assertions. This remains a local verification aid only; it does not replace the existing JavaScript or Python test suites and does not provide pixel-diff comparison or CI coverage.
