# PromptForge v0.3.7 — Names, Origin & Geographic Context

Added a compact structured origin projection distinguishing current residence, birthplace, upbringing, and name-origin slots while preserving legacy `origin.birthplace`, `origin.current_location`, and name fields. Birthplace is usually residence but may differ deterministically; no migration history, heritage, language, or personality is fabricated during legacy normalization.

The `node scripts/origin-diagnostics.js 1000` benchmark measures unique names, origin pairs, and birthplace/residence variation by variance mode. Geography remains contextual and does not drive values, traits, flaws, habits, quirks, or hobbies.

Validation baseline: JavaScript 55/55, Python 92/92, canonical validation 38/38, health 0 errors with expected semantic-overlap findings. The accumulated structured systems now justify evaluating v0.4.0 narrative/character integration next.
