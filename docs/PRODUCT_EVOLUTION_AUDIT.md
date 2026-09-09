# PromptForge product evolution audit

Date: 9 September 2026

## Release decision

The evolutionary redesign and Character Intelligence programme are accepted for the local PromptForge application. The canonical PersonaForge engine, deterministic generation, locks, reference-package output, project references, Control Centre, Populator tooling, and the `0.4.0` catalogue/data contract remain intact.

The v0.6.0–v0.6.9 labels identify the additive Character Intelligence programme milestones. They do not replace the repository's coupled application/data version. Cache markers may use the programme milestone without changing saved persona metadata or catalogue semantics.

## Milestone evidence

| Milestone | Result | Evidence |
|---|---|---|
| 0 — Audit | Pass | `PRODUCT_ARCHITECTURE.md` maps product areas, canonical ownership, persistence, projection, compatibility, and extension boundaries. |
| 1 — Design system and shell | Pass | `product-shell.css` supplies the dark creative shell, tokens, surfaces, controls, focus states, responsive navigation, reduced motion, dialogs, and empty states. |
| 2 — Home | Pass | Home prioritizes continuation, character/scene creation, recent characters, projects, and scenes; system health remains in Control Centre. |
| 3 — Character Studio | Pass | Character list/detail and the eight-step Guided flow operate on `PersonaStore`; Advanced and Import paths remain available. |
| 4 — Genre foundation | Pass | Versioned recipes, zero/one/multiple weighted genres, deterministic normalization, exclusions, related genres, semantic dimensions, persistence, and a deliberately small seed registry are implemented. |
| 5 — Scene Forge | Pass | The simple six-input flow resolves eight visual directions through the existing projection/adapters; fine-tuning and source explanations are progressively disclosed. |
| 6 — Project context | Pass | Project schema 2 adds referenced characters, locations, relationships, notes, genre context, and scene references without embedding canonical records. |
| 7 — Control Centre | Pass | The existing Control Centre and advanced PersonaForge studio remain globally reachable and retain their dense management workflows. |
| 8 — UX polish | Pass | Creative views have responsive layouts, visible focus, keyboard-friendly native controls, reduced-motion handling, long-text/overflow rules, accessible empty states, and restrained visual hierarchy. |
| 9 — Validation | Pass | Full JavaScript, Python, catalogue, health, coverage, migration, determinism, compatibility, and live browser gates passed. |

## Character Intelligence acceptance

- Universal relationships derive from the existing catalogue and stay independent of genre definitions.
- Genre recipes are soft, weighted influence. They cannot create or overwrite canonical identity.
- Character assertions distinguish canonical facts, overrides, preferences, affinities, exclusions, temporary state, scene requirements, project context, genre influence, and universal defaults.
- Resolution preserves the contract: canonical/explicit truth, then explicit scene direction, then bounded current-life or preference context, project context, character affinities, genre influence, and universal defaults.
- An explicit exclusion vetoes conflicting lower-priority suggestions.
- Purpose-aware creative references remain separate from structural `{ type, id }` references; fashion and genre references cannot influence identity.
- Continuity stores bounded current state, explicit thread lifecycle, and recent scene references rather than inferred history or scene copies.
- Legacy records normalize additively and do not gain invented preferences, history, genres, or canonical facts.

## Final automated gate

| Check | Result |
|---|---|
| JavaScript (`npm test`) | 189 passed, 0 failed |
| Python (`python -m unittest discover -s tests -v`) | 102 passed, 0 failed |
| Canonical JSON validation | 42 files passed |
| Health | 0 errors; 22 existing warnings; 69 informational findings |
| Coverage | 92 health score; 0 deficient pools |

The health warnings are catalogue similarity/expansion observations, not regressions introduced by this programme. No catalogue records or catalogue/schema versions were changed.

## Live browser gate

The running local application was inspected through its accessibility tree and rendered UI. The audit confirmed:

- Characters, Genres, Scene Forge, Projects, Library, Control Centre, and Advanced PersonaForge remain reachable from the shared shell.
- Character detail presents current life, genre state, guardrails, creative references, and quick actions without exposing the full engine by default.
- Scene Forge exposes the six simple inputs first and all six fine-tuning directions only after disclosure.
- A generated scene preserved canonical wardrobe, honored explicit location/activity and an advanced lighting override, and displayed source explanations plus bounded alternatives.
- The Control Centre loaded live catalogue health and retained its existing tools.
- The Advanced PersonaForge workbench loaded the existing canonical persona, locks, rerolls, inspector, and projection surfaces.
- The browser console contained no errors. Focus, accessibility names, empty states, desktop layout, and the dedicated 390-pixel responsive checks passed.

## Deliberately deferred work

These are extension points, not incomplete acceptance items:

- Move the small in-code genre seed registry into managed catalogue data when taxonomy tooling and migration policy are ready.
- Add Control Centre editors/diagnostics for semantic relationships rather than exposing unfinished management screens now.
- Add asset ingestion, thumbnails, and caching for creative references; this milestone stores typed metadata only.
- Persist project-level creative reference metadata when a real project reference workflow is designed.
- Add relationship-aware and multi-person scene generation after cast semantics are specified; current relationship fields are honest extension points.
- Add automated continuity suggestions only with explicit review and provenance; current continuity changes are user-driven and bounded.
- Optimize representative large-project setup and batch persistence. Resolution/listing checks pass their bounded-operation contract, but the performance test fixture remains the slowest part of the JavaScript suite.
- Keep deployment local while the Python Control Centre is required; no static hosting configuration was fabricated.

## Conclusion

PromptForge now presents one coherent product journey: ideas become canonical characters, characters gather bounded context inside projects, context becomes explainable scenes, and scenes become structured prompts. The friendly shell hides unnecessary complexity while keeping the original PersonaForge and Control Centre power one action away.
