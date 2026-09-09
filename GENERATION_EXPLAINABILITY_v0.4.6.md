# Generation Explainability v0.4.6

Status: implemented and verified.

## Audit matrix

| Information | Existing / derivable | Decision Inspector treatment |
|---|---|---|
| Catalogue source and IDs | Present in library entries | Reused from selected value and field mapping |
| Compatibility context | Present in `context-engine` / `context-profile` | Current compatible, relevant, and neutral context shown |
| Candidate ranking | Present during generation, not persisted | Current pool counts shown where safely derivable; original fallback remains “Not recorded” |
| Variance and seed | Present in `persona.meta` | Variance and deterministic selection shown |
| Fallback use | Runtime fallback is not persisted | Never guessed; displayed as “Not recorded” |
| Dependencies | Existing `DEPENDENCIES` graph | Direct and downstream dependencies reused |
| Locks and stale state | Present in persona state | Reported directly |
| Narrative sources | Present in narrative elements | Existing narrative inspector remains authoritative |
| Visual sources/relevance | Present in visual projection | Existing visual source/relevance inspector remains authoritative |

## Trace representation

`src/decision-inspector.js` provides one compact observational helper: `decisionTrace(library, persona, field)`. It derives selected source, compatibility evidence, current candidate-pool counts, variance, deterministic status, dependency relationships, and lock/stale state. It does not rerun generation or store ranking matrices.

Unsupported historical facts are explicitly marked unavailable. The implementation does not invent fallback causes, psychological rationales, or causal relationships.

## Studio UX

Persona fields now have a lightweight `Inspect` affordance. The context panel opens an on-demand Decision Inspector showing source, context, selection, pool, dependencies, and state. Normal cards remain compact; no candidate browser or large metadata wall was added.

## Compatibility and boundaries

The inspector is observational and sits beside generation, narrative, visual projection, density, and adapters. It does not alter generation output, consume RNG, mutate canonical data, or change locks/rerolls. Density and target serialization remain independent. Legacy/manual/derived fields report unavailable or derived status rather than fabricated history.

## Diagnostics and tests

Focused tests cover deterministic traces, non-mutation, derived/unavailable fields, lock/stale reporting, source identification, and dependency parity. `scripts/explainability-diagnostics.js` measures trace coverage and unsupported-causality leakage without creating an opaque score. Across 100 fixed-seed personas it inspected 2,098 eligible fields: 2,098 source-identifiable, 2,098 selection-identifiable, 2,098 dependency/state records, 0 deterministic failures, 0 mutation failures, and 0 unsupported-causality findings.

## Performance

Inspection uses current persona state and small library lookups. It does not rerun full generation, capture RNG operations, clone candidate pools, or persist trace payloads in canonical personas.

## Editorial findings and limitations

The inspector answers “why this?” only in terms of recorded source and context evidence. Original candidate counts and fallback events are unavailable for historical/generated personas because they were not previously persisted; the UI says so plainly. Full alternatives browsing is deferred to v0.4.7.

## Validation

Final validation: JavaScript 103/103, Python 102/102, canonical validation 42/42, health 0 errors / 22 warnings / 69 info. Generation diagnostics completed with no warnings and an empty coverage queue; narrative diagnostics reported 1,000 unique profiles per variance mode; visual diagnostics reported 0 identity failures; adapter diagnostics reported deterministic true, projection unchanged true, and 0 missing components; visual-quality diagnostics reported zero contradictions, identity failures, abstract leakage, and pose mismatches; density diagnostics reported deterministic true, projection unchanged true, 0 identity-anchor failures, and 0 semantic omissions.

## Recommendation for v0.4.7

Build Generation Comparison & Controlled Alternatives on this trace foundation, keeping alternatives bounded and explicit; do not make the inspector itself a generation engine.
