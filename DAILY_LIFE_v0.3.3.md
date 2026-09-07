# PromptForge v0.3.3 — Living Situation, Transport & Daily-Life Structure

PromptForge now retains legacy housing, transport, and schedule labels while adding compact structured projections: `housing_profile`, `mobility`, and `daily_rhythm`. These projections are deterministic, context-aware, and preserve unusual-but-plausible combinations.

Housing profiles expose type, tenure, and household arrangement. Mobility profiles expose primary mode, optional secondary access, and commute/access semantics. Schedules map occupation patterns, work arrangement, life stage, and ongoing education into a small daily rhythm vocabulary.

Legacy personas are normalized without inventing household history or transport facts. Income remains upstream of housing/transport; no circular income derivation was introduced.

Validation: JavaScript 55/55 passed. Python 92/92 passed. Canonical validation passed for 38 JSON files. The health baseline remains 0 errors and 22 expected semantic-overlap warnings; no new actionable warning was introduced.
