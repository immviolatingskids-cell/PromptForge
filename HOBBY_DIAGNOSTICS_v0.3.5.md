# PromptForge v0.3.5 — Hobby Diagnostics, Context Weighting & Personal Diversity

Added `scripts/hobby-diagnostics.js` and the `npm run diagnostics:hobbies` command. It runs a fixed-seed benchmark with 1,000 personas per variance mode and reports hobby, family, pair, profile, commitment, participation, and interest distributions.

The benchmark preserves hard compatibility and semantic-cluster diversity. Contextual ranking remains soft; no weighting change is made without evidence of collapse. Legacy personas receive defaults only for missing profile metadata.

Final regression baseline: JavaScript 55/55, Python 92/92, canonical validation 38/38, health 0 errors with expected semantic-overlap warnings.

Known limitation: conditional occupation/value/locale slices are not persisted separately yet; v0.3.6 can add those slices if aggregate results show concentration.
