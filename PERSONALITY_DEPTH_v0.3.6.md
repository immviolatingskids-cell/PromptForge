# PromptForge v0.3.6 — Personality Depth

The personality system now exposes a compact `personality.depth` projection separating traits, flaw, habit, quirk, and value-family references while retaining all legacy fields. The writer uses these layers as one concise paragraph rather than a metadata dump.

Legacy personas receive only a safe projection of facts already present; missing flaws, habits, quirks, and additional traits are not invented. A deterministic benchmark is available via `node scripts/personality-diagnostics.js 1000` and reports profile diversity and top-layer concentration by variance mode.

Values remain motivations, traits describe behavioural tendencies, flaws add friction, habits describe repetition, and quirks add texture. No demographic or occupation-to-personality mapping was introduced.

Validation baseline: JavaScript 55/55, Python 92/92, canonical validation 38/38, health 0 errors with expected semantic-overlap findings. Recommendation for v0.3.7: names, origin, and cultural/geographic context.
