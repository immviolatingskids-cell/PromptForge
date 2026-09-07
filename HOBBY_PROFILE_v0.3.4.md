# PromptForge v0.3.4 — Hobbies, Interests & Personal-Life Depth

Hobbies now use the existing semantic cluster taxonomy as a structured profile. Personas receive two deterministic hobbies selected from distinct clusters, each with commitment, participation style, social context, and related skills. Existing specialization relationships remain distinct rather than being collapsed.

Interests remain a separate, lower-commitment catalogue projection: an interest is something the persona follows or studies, while a hobby is actively practiced. Legacy personas remain loadable and are not assigned fabricated historical hobbies.

The similarity guard continues to prevent duplicate clusters when selecting multiple hobbies. Occupation, values, geography, and daily-life context remain soft signals only; no stereotype or one-to-one hobby mapping was introduced.

Validation baseline: JavaScript 55/55, Python 92/92, canonical validation 38/38, health 0 errors with expected semantic-overlap warnings.

Known limitation: hobby diagnostics and richer cross-catalogue weighting remain candidates for v0.3.5, along with deeper participation metadata for individual entries.
