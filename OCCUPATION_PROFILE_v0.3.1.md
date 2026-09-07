# Occupational Profile v0.3.1

## Previous architecture

The occupation catalogue contained 24 entries. Entries had compatibility metadata plus partial `education`, `income_band`, `role`, category/specialisation, and occasional technology-era hints. Generation selected one `life.job`, copied income, randomized a global schedule list, and exposed a small `structured_occupation` projection.

## New architecture

The canonical occupation entry remains the role object and preserves its readable ID. Metadata now adds reusable `family` and `cluster` taxonomy, valid `career_levels`, `employment_types`, `work_arrangements`, `environments`, `schedule_patterns`, `entry_routes`, and `related_skills`. `structuredOccupation()` exposes these fields without replacing the legacy role object.

Generated personas retain `life.job` and add `career_level`, `employment_type`, `work_arrangement`, `work_environment`, and `occupation_entry_route`. Values are selected from the occupation's declared options; career level is filtered by age and experience. The model is contextual and does not derive personality, values, or hobbies from occupation.

Legacy personas remain loadable. Opening a persona derives only the non-generative `structured_occupation` projection when absent; it does not invent career, employment, workplace, or entry-route facts.

## Catalogue and coverage

The catalogue grew from 24 to 40 genuinely distinct roles across 20 occupational families, including professional, technical, creative, service, academic, manual, public-sector, independent, and entry-accessible roles. No synonym-only bulk expansion was used.

## Dependencies and output

Occupation changes stale its structured profile, career level, employment type, arrangement, environment, entry route, experience, income, schedule, and downstream presentation fields. Country changes can stale occupation and employment interpretation. Existing locks and stale-field regeneration remain authoritative. Persona prose now describes career level, employment arrangement, workplace context, income, and schedule when available.

## Diagnostics and validation

Generation remains seeded and deterministic. Occupational diagnostics report role, family, profile, career-level, employment, arrangement, and environment distributions alongside existing diversity reports. Populator validation checks occupational taxonomy IDs and structured metadata arrays.

## Known limitations

The current catalogue uses abstract environment and employment IDs; setting-specific terminology and country-specific labour-market weighting remain intentionally light. Regulated education constraints are represented as entry-route metadata rather than hard qualification simulation.

## Recommendation for v0.3.2

Focus on **B) education/life structure**: the next bottleneck is connecting declared occupation entry routes to richer education and experience histories without making careers deterministic.
