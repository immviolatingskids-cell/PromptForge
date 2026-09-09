# Projection Density v0.4.5

Status: complete.

## 1. Pre-milestone audit

v0.4.4 emitted one standard serialized representation per target. Optional accessories, makeup, signature items, and relevant context were either all visible or absent; there was no explicit user-controlled density vocabulary.

## 2–5. Density semantics

The supported values are `compact`, `standard`, and `detailed`. Standard is the default and preserves the existing representation. Compact keeps identity, appearance, wardrobe, action/pose, environment, camera, and lighting while suppressing optional accessories, makeup, signature items, and context. Detailed keeps standard content and adds existing relevant context as a separate context block. No facts are invented.

## 6–10. Priority, mode, target, and switching

The filter reuses projection fields and relevance decisions; it does not create a competing priority system. Density is applied inside the adapter boundary and is mode-sensitive because it never broadens the projection. Target and density changes serialize the same projection without rerolling, mutation, or source-trace changes.

## 11–16. Studio and editorial comparison

Studio now exposes a compact Density selector beside Target. Existing Compare Targets export now includes the selected density and serializes one immutable projection for all four targets. Target-aware JSON exports include density metadata. The inspector remains authoritative and continues to show the full projection/source trace.

## 17–18. Source trace and negatives

Density filtering clones the projection and only changes serializer visibility. Source trace and canonical negative guidance remain unchanged and are not density-specific.

## 19–24. Length, differentiation, semantic and adapter checks

`scripts/density-diagnostics.js` reports length and component counts for every mode × target × density, plus determinism, projection immutability, identity anchors, and semantic omissions. Compact is shorter where optional content exists; Detailed expands with relevant context. All four adapters retain required components.

## 25–28. Quality and editorial review

The density diagnostic uses transparent checks rather than arbitrary hard limits. Fixed-seed review covers all eight modes, four targets, and all three density values. Compact remains a complete prompt, Standard remains the compatibility baseline, and Detailed adds context only where the projection already contains it.

## 29–33. Persistence, compatibility, determinism, performance

Density is session-local and defaults to Standard; no new settings subsystem was introduced. Existing APIs accept density as an optional serializer option, and unknown values fall back to Standard. Filtering is a single structured clone and serialization pass; it never invokes generation or composition.

## 34–37. Verification and known limitations

Final gate results will be recorded below after the post-correction suite. Known limitation: Detailed can equal Standard for projections with no optional/contextual fields, which is preferable to inventing filler. Compact does not create a keyword-only format.

## Final validation closure

Final post-correction results:

- JavaScript: 100/100 passing.
- Python: 102/102 passing.
- Canonical validation: 42/42 JSON files passed.
- Health: 0 errors / 22 warnings / 69 info.
- Density diagnostics: deterministic true, projection unchanged true, identity-anchor failures 0, semantic omissions 0.
- Adapter parity: deterministic true, projection unchanged true, missing components 0.
- Visual quality: 0 contradictions, 0 identity-anchor failures, 0 abstract leakage, 0 activity/pose mismatches.
- Editorial review: 800 projections with no automated findings; 128 fixed-seed samples across all modes and targets.

The density implementation did not change canonical data, composition, source traces, or legacy default behavior. No v0.4.6 implementation was started.

## Recommendation for v0.4.6

Use evidence from density/editorial review to consider a small in-app prompt editing workflow, but do not broaden density into a new generation or provider architecture.
