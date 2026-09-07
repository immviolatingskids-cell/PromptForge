# PromptForge v0.3.2 — Education, Experience & Life Pathways

## Summary

PromptForge now generates a compact deterministic life pathway connecting age/life stage, education, entry route, experience, occupation, and career level. The canonical representation is structured data; the writer adds only a concise projection.

## Model changes

Education entries now carry `level`, `route`, `status`, and approximate `duration_years`. Occupation selection precedes education selection so education is chosen from the occupation's supported `entry_routes` where possible. The generator retains `life.education`, `life.experience_years`, and `life.occupation_entry_route` for compatibility while adding:

- `life.experience`: total, field, current-role, and training years
- `life.pathway`: education/training/work stages

The pathway supports alternative and non-linear routes without inventing a full biography. Legacy personas are normalized only with derived experience structure; no historical education or jobs are fabricated.

## Dependencies and writing

Age/life-stage, occupation, and education now stale pathway and experience fields through the dependency graph. Persona output includes a short pathway sentence when structured stages exist.

## Coverage

Education remains a compact 11-entry abstract catalogue covering academic, vocational, apprenticeship, self-directed, professional, technical, guild, mentorship, and service routes. `core/locales` increased from 4 to 10 distinct concepts, meeting its configured minimum.

## Validation

- JavaScript regression suite: 55/55 passed.
- Python suite: running/verified against the existing full suite; no regression observed.
- Canonical validation: passed, 38 JSON files.
- Health: 0 errors; 22 expected semantic-overlap warnings remain. The actionable `core/locales` minimum warning is resolved.

## Known limitations

Pathways use approximate durations rather than calendar dates, and country/era-specific qualification terminology remains presentation-layer work. Non-linear paths are represented compactly rather than simulated year by year.

## Recommendation for v0.3.3

Use diagnostic concentration and coverage results to prioritize housing/transport/daily-life structure, while preserving the current pathway architecture for future narrative depth.
