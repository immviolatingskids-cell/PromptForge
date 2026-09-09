# PromptForge v0.4.7 — Controlled Alternatives

Status: Implemented and verified. v0.4.8 was not started.

## Repository audit

The generator does not retain ranked candidate lists. Selection uses `filterCandidates()` in `src/context-engine.js`, `compatibilityScore()` and `chooseRanked()` in `src/candidate-ranker.js`, deterministic seeded weighting, and the existing fallback sequence in `src/generator.js`. Field rerolls use `PersonaController.rerollField()`, field assignment uses `setAt()`, locks are checked by the controller, and downstream invalidation uses `markStale()` from `src/dependency-engine.js`. v0.4.6 `decisionTrace()` already exposes source, context, pool, selection, dependency, lock, and stale evidence.

## Implemented

- `src/controlled-alternatives.js` projects a transient, bounded set of up to four alternatives for catalogue-selected fields.
- The projection reuses the generator's hard compatibility filters, fallback order, context score, and variance context. It does not create a second ranker or consume RNG.
- Candidate ordering is deterministic: descending existing compatibility score, then stable ID order. The selected current ID is excluded.
- Existing semantic-cluster metadata is used only for presentation-time duplicate suppression; canonical generation is unchanged.
- Supported fields are catalogue-backed, context-ranked values such as occupation, education, housing, transport, traits, values, hobbies, clothing, and appearance selections. Derived narrative, experience, projections, and unavailable fields are omitted honestly.
- The Studio adds an explicit Alternatives action beside eligible fields. The current value remains visible, and each option exposes an editorial relation label and context evidence with Inspect/Choose controls.
- Choosing an option changes only the requested canonical field, records `user_alternative_choice` provenance, and calls the existing stale/visual invalidation paths. It does not silently regenerate downstream fields.
- Locked fields reject controlled choices. Alternatives remain outside the canonical persona until selected.

## Verified

Alternatives diagnostics across 90 personas in Grounded, Varied, and Chaotic modes:

| Measure | Result |
|---|---:|
| Eligible field instances | 718 |
| Instances with alternatives | 676 |
| Unsupported field instances | 2 |
| 0 / 1 / 2 / 3+ alternatives | 42 / 70 / 42 / 564 |
| Determinism failures | 0 |
| Current-value exclusions | 0 |
| Hard-compatibility failures | 0 |
| Duplicate-cluster failures | 0 |

Focused JavaScript coverage: 108/108 passing. This includes deterministic ordering, bounded output, unsupported/derived behavior, field-only mutation, stale propagation, lock preservation, provenance, and RNG neutrality.

## Regression results

- JavaScript: 108/108 passing (the v0.4.6 baseline was 103/103; five focused v0.4.7 tests were added).
- Python: run in closure validation.
- Canonical validation, health, generation, narrative, visual, adapter, visual-quality, density, and explainability diagnostics: run in closure validation.

## Deferred / not supported

- No full catalogue search, autocomplete, arbitrary ID picker, shuffle button, or giant browser.
- No alternative history is fabricated for legacy personas. Current compatible alternatives, when safely derivable, are distinct from historical generation evidence.
- Alternative inspection is intentionally compact; it reuses `decisionTrace()`'s source/context semantics rather than storing a duplicate trace per candidate.
- No visual projection, narrative-output, provider-specific, density-specific, or adapter-specific alternatives were added.

## Editorial review notes

The default list is progressive-disclosure and bounded to four. Labels are based on the existing score semantics (`strong_alternative`, `compatible_alternative`, `broader_alternative`) rather than exposed raw numbers. Alternatives remain deterministic when the panel is closed and reopened. Downstream stale state is visible through the existing Control Centre warning and existing regenerate/keep-existing actions.
