# PromptForge v0.4.1 — Narrative Controls, Diagnostic Depth & Editorial Polish

## v0.4.0 audit

The v0.4.0 canonical narrative shape is `narrative.integration` with motivations, short/long-term goals, tensions, pressures, relationship hooks, arc seeds, scene hooks, intensity, domains, and source IDs. The existing controller can address nested paths, but the Studio previously exposed only the opaque narrative card. Visual reference prompts remain intentionally separate.

## Studio controls

The Studio now shows a compact Derived Narrative panel with an at-a-glance goal/tension summary and expandable rows for motivation, goals, tension, pressure, relationship hook, arc seed, and scene hook. Each row displays domain/source trace details and has individual Lock/Reroll controls. Existing stale-field indicators and regenerate/keep decisions are reused; no parallel state model was introduced. Controls are ordinary buttons/details elements and are keyboard reachable, with stale state shown by both text and colour.

## Diagnostics

`npm run diagnostics:narrative` retains the fixed 1,000-persona-per-mode benchmark and now adds conditional slices for occupation family, daily rhythm, and housing, with domain distributions per slice. Aggregate results remain healthy: 1,000 unique profiles per mode, top goal share 9%, top domain share 16–17%. The slice output is intentionally compact rather than a persisted matrix. Source IDs are reported by element and source-system distribution, allowing occupation dominance and source-pair review.

## Editorial review

The deterministic sample review found no generic trauma, moralizing arc language, or value-as-goal echo. Motivations are situational, tensions combine competing values or flaw/goal facts, pressures are explicitly situational, and scene hooks combine a goal with a pressure. Roleplay output remains concise and present-focused. No narrative architecture rewrite was required.

## Name concentration diagnosis and fix

The prior 300-sample modern warning was a 43.0% top full-name share (`Ash Marrow`) with only 28 unique names in the mixed-species setting slice. Root cause was a too-small species-filtered fallback: only neutral entries remained, despite a broader setting/era/life-stage-compatible pool. The fix uses the broader pool when the species-specific pool has fewer than five entries; it preserves hard setting/era/life-stage compatibility and does not flatten country/origin weighting. The warning disappeared in the same 300-sample deterministic run. No name catalogue expansion was performed.

## Verification

- JavaScript: 61/61 passed (including narrative lock/reroll coverage).
- Python: 92/92 passed.
- Canonical validation: 38/38 files passed.
- Health: 0 errors, 22 reviewed warnings, 145 informational findings.
- Narrative benchmark: 1,000 unique profiles per mode; 9% top-goal share; 16–17% top-domain share.
- Working tree was clean after commit.

Known limitations: the panel does not yet offer per-element prose editing, relationship hooks remain role-level, and conditional lift summaries are diagnostic rather than persisted analytics. Next priority should be a demonstrated Studio workflow improvement or reference/image-prompt integration, not another narrative architecture milestone.
