# PromptForge — Brainstorming Context

## Purpose of this document

This file is a reusable context brief for conversations with regular ChatGPT. It explains what PromptForge is, what already exists, what the project is trying to become, and which design boundaries matter. When brainstorming, ChatGPT should use this document as the shared product context rather than treating PromptForge as a generic random character generator.

The repository currently contains a mixture of historical documentation and an active implementation that uses the older name **PersonaForge** in several places. The intended product name for ongoing discussion is **PromptForge**. The rename is primarily a product-language issue; the underlying concept is the same.

## One-sentence description

PromptForge is a local-first, offline character and persona-generation studio that combines a structured catalogue, context-aware deterministic generation, editable persona cards, dependency-aware rerolls, coherence checks, persona exports, and a companion data-population workshop.

## The problem being solved

Creating a convincing character manually is slow because the creator has to keep many dimensions consistent at once:

- identity, age, species, setting, era, and country;
- culture and origin without reducing people to stereotypes;
- personality traits that feel distinct rather than randomly contradictory;
- education, work, income, housing, transport, hobbies, and daily life;
- appearance, clothing, signature items, goals, secrets, and expressions;
- a usable roleplay hook and a visual reference package.

Pure randomness produces combinations that are technically possible but narratively weak. A giant form creates too much work. A single LLM prompt can produce attractive prose but is difficult to reproduce, edit, validate, or maintain as a library. PromptForge is intended to sit between those extremes: structured enough to be reliable, flexible enough to preserve surprising combinations, and local enough that the user owns the data and workflow.

## Product vision

PromptForge should feel like a visual character studio backed by a carefully curated creative database.

The user establishes a few meaningful anchors, then the engine fills in the rest with contextual randomness. The result is not supposed to be the one “correct” character. It is a strong starting point that the user can shape, lock, reroll, save, compare, export, and reuse.

The core experience is:

1. Choose or randomize foundation anchors.
2. Generate a complete persona from the local catalogue.
3. Inspect the result as structured cards.
4. Lock the parts worth preserving.
5. Reroll a field, section, visual package, hook, or all unlocked content.
6. See when a change makes dependent fields stale.
7. Keep or regenerate affected fields deliberately.
8. Export polished persona text and visual/reference prompts.
9. Save the persona in a local library for later reuse or duplication.

## Current implementation at a glance

The repository is a browser studio served by a small local Python server, plus a Python command-line tool for maintaining the JSON catalogue.

### Studio

- Plain HTML, CSS, and vanilla JavaScript.
- Runs locally at `http://127.0.0.1:8765` through `python start.py`.
- Loads JSON data from the repository.
- Stores saved personas in browser local storage.
- Supports seeded generation and three variance modes: grounded, varied, and chaotic.
- Supports foundation anchors for setting, era, gender, species, life stage, age, and country.
- Displays generated content in cards for foundation, origin, personality, life, interests, appearance, narrative, and character hook.
- Supports field locks, card locks, field rerolls, card rerolls, reroll-unlocked, visual rerolls, and hook rerolls.
- Tracks stale fields when an upstream value changes.
- Shows context, locks, dependencies, warnings, coherence results, schema version, and data version.
- Exports persona text as Markdown or TXT.
- Generates a structured or polished visual/reference package with prompt variants such as a master reference, expression sheet, outfit, silhouette, and negative prompt.
- Saves, opens, duplicates, exports, and deletes personas in the local library.

### Populator

The Populator is the data-management side of the product. It answers: **which part of the library needs more variety, and how can it be improved safely?**

It currently supports or is designed around:

- catalogue browsing and search;
- health and coverage reporting;
- guided entry creation;
- rapid pasted entry creation;
- templates and shared entry schemas;
- bulk import;
- duplicate and near-duplicate detection;
- deterministic expansion of catalogue data;
- deep-pool and coverage analysis;
- validation and schema checks;
- backups before risky mutations;
- one-action undo;
- readable IDs and structured metadata;
- finite reference datasets such as countries being treated differently from creative pools.

The Populator matters because the quality of generated personas is limited by the quality, breadth, and contextual usefulness of the catalogue. PromptForge is therefore both a generation product and a data-curation product.

## Important design principles

### Contextual logic instead of stereotypes

PromptForge should use context to influence probability, not to dictate identity.

Bad behavior would be treating a programmer as automatically introverted, treating a country as a costume, treating an older person as unable to pursue physical hobbies, or treating a fantasy species as a bundle of mandatory visual clichés.

Better behavior is to distinguish:

- **hard constraints**: combinations that are impossible or structurally invalid;
- **contextual compatibility**: combinations that make sense more often in a particular setting;
- **soft preference**: combinations that are plausible and perhaps interesting, but should not be forced;
- **unusual but plausible**: combinations the system should preserve rather than “repair” merely because they are uncommon.

The engine should support diversity within every identity category. Culture and geography should add meaningful context without collapsing a character into a stereotype.

### Structured data before prose

The canonical persona is an object made of fields, IDs, metadata, state, and provenance. Prose is generated from that object. Visual prompts are also generated from that object. This keeps the persona, export text, and reference package synchronized.

### Deterministic generation

Given the same data version, seed, anchors, and variance mode, generation should be reproducible. Determinism makes debugging, comparison, testing, sharing, and user trust much easier. Rerolls can derive new seeds from the original seed while retaining the relationship between versions.

### User control over surprise

The system should generate interesting results but never make the user fight the generator. Locks, rerolls, stale-field warnings, “keep existing,” and “regenerate affected” are central product features rather than polish.

### Explainability over hidden magic

When possible, the user should be able to understand why a candidate was selected, why another candidate was filtered, which fields depend on a changed anchor, and whether a coherence check is a hard validation or a subjective warning.

## Foundation model

The main anchors are:

1. Setting
2. Era or year
3. Gender
4. Species
5. Life stage
6. Age
7. Country

Setting describes the world type, such as modern, historical, Victorian, fantasy, sci-fi, cyberpunk, or post-apocalyptic. Era describes the temporal context and should remain distinct from setting. Country is a core location anchor; deeper geography such as birthplace, region, city, and current location can be expanded later.

The generator should use species-aware life-stage and apparent-age models where appropriate. Human defaults are useful, but the data model should not assume that every species ages identically.

## Generation pipeline

The intended generation flow is staged so that later choices can use earlier context:

1. **Foundation** — establish anchors, age, and gender.
2. **Origin** — generate heritage, name, birthplace, current location, family makeup, and economic upbringing.
3. **Character core** — select complementary, contrasting, and central personality traits, values, habits, flaws, and quirks.
4. **Life structure** — generate education, role, job, experience, income, housing, transport, and schedule.
5. **Personal detail** — generate hobbies, interests, skills, commitment levels, and related details.
6. **Appearance** — generate hair, eyes, body, features, clothing style, and signature outfit.
7. **RP connections** — generate goals, secrets, signature items, expressions, and a character hook.
8. **Output** — write the persona description and visual/reference package.

The pipeline should remain modular. A future feature should ideally add or refine a stage, field, rule, or presentation layer rather than turning the generator into one opaque prompt.

## Persona anatomy

The persona is organized into broad sections:

- `meta`: persona ID, seed, variance mode, schema version, data version, and timestamps;
- `foundation`: setting, era, species, life stage, age, gender, country;
- `origin`: name, heritage, birthplace, current location, family, upbringing;
- `personality`: core traits, complementary traits, contrast, flaw, values, habit, quirk;
- `life`: education, primary role, job, experience, income, housing, transport, schedule;
- `interests`: hobbies, interests, skills, and commitment;
- `appearance`: surface traits, visual traits, clothing style, signature outfit;
- `narrative`: goals, secrets, signature item;
- `expressions`: reusable emotional/expression states;
- `character_hook`: a concise set of connections that makes the persona useful for roleplay;
- `state`: locks, stale fields, warnings, repairs, and coherence checks.

The exact schema can evolve, but the distinction between canonical structured data and generated presentation should remain.

## Compatibility and selection

Catalogue entries can contain compatibility metadata for settings, eras, species, life stages, countries, income bands, gender relevance, related skills, technology availability, and other dimensions.

Selection is not simply “pick a random item.” The engine should:

1. filter out hard-incompatible candidates;
2. fall back gracefully when a narrow context has no candidates;
3. score remaining candidates using contextual and soft metadata;
4. apply the selected variance mode to the score distribution;
5. preserve diversity with similarity or cluster guards where needed;
6. record enough information for future explainability.

Variance modes express the desired relationship between context and surprise:

- **Grounded** favors strong compatibility and familiar results.
- **Varied** balances context with breadth and is the normal default.
- **Chaotic** allows more unusual but still valid combinations.

## Locks, rerolls, and stale dependencies

Locks are field-level or section-level user commitments. A locked field should survive normal rerolls. Foundation locks should be retained when regenerating dependent content.

Dependencies matter because changing one value can make another value less aligned. For example:

- changing setting can affect era, occupation, technology, clothing, housing, and visual interpretation;
- changing era can affect jobs, education, transport, expressions, and reference prompts;
- changing species can affect age ranges, anatomy, appearance, and life-stage interpretation;
- changing country can affect heritage, names, location, and cultural context;
- changing income can affect housing and transport;
- changing hobbies can affect skills and signature items.

When an upstream value changes, dependent unlocked fields should become stale rather than silently changing. The user should be offered a clear choice to regenerate affected fields or keep the existing values. This preserves agency and makes consequences visible.

## Coherence model

Coherence is not the same as conformity. PromptForge should catch hard contradictions and surface questionable combinations without erasing characterful variation.

Examples of hard or near-hard checks include:

- a job requiring technology that does not exist in the selected era;
- an age or life stage outside a species-supported range;
- a housing choice that violates a deliberately hard economic constraint;
- impossible dependency combinations;
- malformed or unsupported catalogue references.

Examples of warnings rather than automatic repairs include:

- an unusual hobby for an age group;
- an uncommon but plausible combination of traits;
- a visually surprising clothing choice;
- a cultural combination that needs context but is not impossible.

The UI should eventually distinguish `pass`, `warning`, and `not evaluated`. It should never claim a check passed if that check is not implemented.

## Outputs

### Persona output

The persona writer turns structured fields into readable roleplay-oriented prose. It should be polished but faithful to the source object. It should not invent facts that are absent from the canonical data unless the product explicitly adds a generative prose layer later.

### Reference package

The reference writer converts the same persona into reusable visual prompts. The package should preserve identity across views and rerolls, including apparent age, proportions, facial identity, distinguishing features, clothing, signature items, and species interpretation.

Useful package components include:

- master character reference;
- expression sheet;
- outfit or clothing reference;
- silhouette or full-body reference;
- close-up/detail reference;
- negative prompt;
- structured prompt form;
- polished prose prompt form.

PromptForge does not need to call an image API in its current scope. It should produce strong, portable prompt/reference material that can be used elsewhere.

## Populator and library philosophy

The data library is a product asset, not incidental configuration. A larger raw count does not automatically mean better coverage. A pool is useful only if it contains distinct, contextually applicable, readable entries.

Coverage should distinguish:

- raw entry count;
- effective count after compatibility filters;
- minimum acceptable depth;
- healthy depth;
- target depth;
- duplicate concentration;
- context diversity;
- whether a pool is creative or finite reference data.

Countries are an example of finite reference data: completeness should be measured against a known reference set, not against an arbitrary creative target. Hobbies, occupations, traits, clothing, and narrative elements are creative pools where breadth and diversity matter.

All risky data mutations should remain reviewable and reversible. Backups, validation, duplicate classification, provenance, and undo are essential as the library grows.

## Current state and known direction

The active repository is functional and has a healthy baseline. The latest recorded review reports:

- JavaScript tests passing;
- Python tests passing;
- canonical JSON validation passing;
- no live health errors or warnings;
- intentional backlog in some deep catalogue leaves and pools that are below minimum or healthy targets.

The most important next direction is to make the system more explainable, trustworthy, and scalable before indiscriminately adding data. In particular, future work should clarify registry/version/migration contracts, improve import safety, validate behavior-defining configuration, distinguish effective coverage from raw counts, and make the studio show why it made its decisions.

## High-value brainstorming areas

When asked to brainstorm, prioritize ideas that improve one or more of these areas:

### Studio experience

- coverage-aware generation inspection;
- explainable coherence warnings;
- scenario and anchor presets;
- comparison-based visual rerolls;
- richer persona library workflows;
- analytics showing catalogue drift and meaningful diversity;
- responsive and accessible UI improvements;
- controlled multi-persona generation for casts or ensembles.

### Data and catalogue quality

- review-first imports with normalized previews;
- clearer exact/likely/possible-variant/distinct duplicate classifications;
- deep-pool migration tools with explicit approval;
- coverage queue planning;
- context-aware depth measurements;
- data quality gates and CI checks;
- provenance and source notes for catalogue entries;
- safe, transactional multi-file updates.

### Future product possibilities

These are possible directions, not current commitments:

- persona presets and reusable scenario bundles;
- linked casts, families, teams, or relationship networks;
- world-building support built on the same structured context model;
- timeline or historical plausibility tools;
- user-created private catalogue packs;
- optional local or external LLM assistance for prose refinement;
- optional image-generation integrations;
- import/export formats for roleplay tools and writing software.

Any future expansion should preserve local ownership, deterministic core behavior, explicit user control, and the distinction between structured facts and generated prose.

## Non-goals and guardrails

Unless explicitly reconsidered, PromptForge should not become:

- a generic chatbot with a thin character wrapper;
- an opaque single-prompt generator;
- a stereotype engine;
- a cloud-first account platform;
- a social network;
- a full RP chat system by default;
- an uncontrolled world simulator;
- a database server requirement for basic use;
- a system that silently overwrites user decisions;
- a system that treats every unusual choice as an error.

External AI, image APIs, cloud sync, accounts, relationship networks, and advanced world simulation were intentionally outside the original focused scope. They may become optional extensions later, but they should not weaken the local structured core.

## How ChatGPT should help with brainstorming

When brainstorming for PromptForge, ChatGPT should:

1. Start from the product principles in this document.
2. Separate current capability, near-term improvement, and speculative future direction.
3. Consider both sides of the product: the browser studio and the catalogue Populator.
4. Prefer small composable features over broad platform expansions.
5. Explain how an idea affects data models, generation logic, UX, testing, and migration risk.
6. Call out whether an idea is deterministic, reversible, explainable, and local-first.
7. Preserve unusual-but-plausible character combinations unless there is a real contradiction.
8. Avoid proposing an LLM call as a substitute for structured modelling when a deterministic rule or catalogue design would be more reliable.
9. Suggest acceptance criteria or a thin vertical slice for promising ideas.
10. Ask only the most important clarifying question when a decision genuinely changes the product direction.

## Useful brainstorming prompt

> We are brainstorming for PromptForge, a local-first offline persona-generation studio with a structured JSON catalogue and a Python Populator. Use `PROMPTFORGE_BRAINSTORM_CONTEXT.md` as the product context. Keep the deterministic structured core, user-controlled locks/rerolls, contextual-not-stereotyped generation, explainability, reversibility, and local ownership in mind. For each idea, explain the user value, affected product area, data/model implications, implementation complexity, risks, and a small first version we could build.

## Repository landmarks

- `index.html` and `styles.css` — browser studio shell and layout.
- `src/generator.js` — staged persona generation.
- `src/context-engine.js` — context extraction and compatibility filtering.
- `src/candidate-ranker.js` — compatibility scoring and variance behavior.
- `src/dependency-engine.js` — stale-field dependency tracking.
- `src/coherence.js` — coherence checks and repairs.
- `src/persona-controller.js` — locks, rerolls, and persona mutations.
- `src/persona-writer.js` — readable persona output.
- `src/reference-writer.js` — visual/reference package output.
- `src/persona-store.js` — browser-local persona library.
- `data/` — canonical catalogue data.
- `schemas/` — structural schemas.
- `populator/` — catalogue maintenance and analysis CLI.
- `test/` — JavaScript tests.
- `tests/` — Python tests.
- `README.md` — detailed historical and technical specification.
- `PROJECT_REVIEW_AND_FEATURE_ROADMAP_2026-09-07.md` — current review findings and candidate roadmap.

## Bottom line

PromptForge is building a dependable creative instrument: a system that can surprise the user without losing coherence, produce rich personas without requiring manual form-filling, and make every generated result editable, reproducible, explainable, and reusable. The long-term advantage is not merely the number of fields or entries. It is the relationship between a thoughtful data library, a transparent generation engine, and a user experience that lets people discover and shape characters quickly.
