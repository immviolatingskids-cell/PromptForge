# PromptForge

PromptForge is a local-first character and scene studio. Its creative shell is organised around Home, Characters, Scenes, Projects, Genres, and Library, while the existing Control Centre and advanced PersonaForge workbench remain available for pool management, diagnostics, canonical locks, rerolls, inspection, and output control.

Live app: [PromptForge on GitHub Pages](https://immviolatingskids-cell.github.io/PromptForge/#home)

The product follows one rule: simple on the surface, deep underneath. PromptForge v1.1 hardens the v1 foundation with consistent migration boundaries across every record family, additive unknown-field preservation, collision-safe portability, human-readable context exports, and unchanged reference-only canonical persona ownership. Canonical personas remain reference-only and standalone personas remain first-class.

See [PROJECT_FOUNDATIONS_v0.5.0.md](PROJECT_FOUNDATIONS_v0.5.0.md) for the architecture and compatibility report.

Character Intelligence programme milestone: **v0.6.9**. It adds semantic genre recipes, reusable universal human relationships, typed character truth and preferences, contextual lifestyle and scene resolution, purpose-aware references, and bounded current-life continuity without changing the canonical PersonaForge engine or its `0.4.0` catalogue/data contract.

Run the application with:

```powershell
python start.py
```

Then open `http://127.0.0.1:8765`. See [`docs/PRODUCT_ARCHITECTURE.md`](docs/PRODUCT_ARCHITECTURE.md) for product boundaries, data priority, compatibility behavior, and extension points.

## Populator Library Workshop

PersonaForge Populator v0.2.6 is a completely local Library Workshop focused on answering: **what part of the library needs more variety, and how quickly can it be fixed?**

Launch the interactive workshop:

```powershell
python populate.py
```

The redesigned menu provides a coverage dashboard, guided Population Workshop, rapid paste entry with preview, compact browse/search tables, library health scanning, templates, validation, backups, and undo. It uses Unicode navigation anchors where supported and automatically falls back to plain ASCII; set `PERSONAFORGE_BASIC=1` to force basic rendering.

The bundled geography catalogue contains all 195 UN member/observer states. Countries are treated as finite reference data: the dashboard reports `core/countries` as `Complete` at 195/195 and does not grade every country as a creative pool. The checked-in catalogue can be deterministically rebuilt with `python -m populator.country_reference --m49 <saved-m49-page> --members <saved-member-states-page>`.

Useful scriptable commands include:

```powershell
python populate.py coverage
python populate.py health
python populate.py pool-depth lifestyle/occupations --setting modern --life-stage young_adult --country united_kingdom
python populate.py rapid-add lifestyle/hobbies --subcategory social --text "Dinner Parties,Escape Rooms,Trivia Nights"
python populate.py coverage-target lifestyle/hobbies/social 15 --healthy 25
python populate.py queue add lifestyle/hobbies/social --target 15
python populate.py batch-metadata lifestyle/hobbies cooking,boxing --settings modern
python populate.py batch-metadata lifestyle/hobbies cooking,boxing --settings modern --apply
```

Run `npm run diagnose -- --samples 300` for seeded repetition, contextual-slice,
stereotype-concentration, and variance-mode diagnostics. Add `--queue` to merge
actionable findings into the Populator queue; those records preserve the triggering
context and set a growth target above the pool's current count.

Visual projection diagnostics are available with `npm run diagnostics:visual`.
Run `npm run review:visual` for deterministic editorial checks covering abstract
psychology leakage, unspecified values, prompt bloat, and contradictions.

Risky mutations—bulk imports and batch metadata changes—create a full ZIP backup and a one-action undo record before writing. Possible variants remain importable and are shown separately from likely or exact duplicates.

The remainder of this document preserves the original v0.1 product specification as historical design context.

## Running the current build

PersonaForge is local-only and requires no installation. From the project folder, run:

```powershell
python start.py
```

Then open `http://127.0.0.1:8765`. If `python` is not on PATH, use any Python 3.11+ executable. The Studio stores saved personas in the browser's local storage.

Run the Populator interactively with `python -m populator.main`, or inspect scriptable commands with `python -m populator.main --help`.

Run verification with:

```powershell
node --test
python -m unittest discover -s tests -v
python -m populator.main validate
```

## 1. Project Vision

**PersonaForge** is a local-first, offline persona-generation studio for rapidly creating detailed roleplay characters without manually building every field from scratch.

The core idea is not a dumb randomizer and not a giant form. PersonaForge is a **context-aware modular persona engine** that lets the user:

- set a small number of foundation anchors;
- generate the rest with contextual randomness;
- lock values they want to keep;
- reroll entire sections or individual fields;
- receive warnings when dependencies become stale;
- preserve unusual but plausible combinations;
- prevent or auto-repair hard contradictions;
- export a polished RP persona;
- export a deeper image/reference package derived from the same source data.

PersonaForge should feel like a **visual character studio backed by a structured local database**.

A companion tool, the **PersonaForge Populator**, is responsible for creating and maintaining the database that PersonaForge searches.

The first version should remain intentionally modest and local. No LLM/API integration is required.

---

# 2. v0.1 Scope

## Build in v0.1

- Local web-based PersonaForge studio
- Python CLI Populator
- JSON data library
- Foundation anchors
- Context-aware generation
- Seeded randomness
- Locks
- Field rerolls
- Section rerolls
- Reroll unlocked
- Dependency tracking
- Stale-field warnings
- Coherence validation
- Hard contradiction auto-repair
- Character Hook generation
- Persona description output
- Image/reference package output
- Persona Library
- Duplicate persona / clone workflow
- Local JSON export
- Markdown/text export
- Populator validation
- Populator duplicate detection
- Populator bulk import
- Populator templates
- Populator backups
- Populator simple undo
- Populator coverage reports
- Schema/data version tracking

## Explicit v0.1 non-goals

Do **not** build these yet:

- LLM or external AI API integration
- Image API calls
- RP chat system
- NPC relationship networks
- Full world builder
- Cloud sync
- Accounts/login
- Remote database
- Complex economy simulation
- Historical simulation
- Deep dependency reasoning inside the Populator
- Excel/XLSX import
- Saved searches
- Advanced nested template inheritance

PersonaForge is a project, not a platform. Keep v0.1 focused.

---

# 3. Technical Stack

## PersonaForge Studio

Use:

- HTML
- CSS
- Vanilla JavaScript

The studio should be desktop-first but responsive enough for narrower windows.

## PersonaForge Populator

Use:

- Python
- Standard CLI interaction

## Storage

Use:

- JSON as canonical structured data
- TXT for simple one-entry-per-line bulk import
- CSV for structured bulk import
- JSON for import/export of PersonaForge-compatible data

No database server is required in v0.1.

---

# 4. Core Design Philosophy

PersonaForge should use **contextual logic rather than stereotypes**.

Examples:

Bad:

- Programmer = introvert + gamer + hoodie
- Older woman = cannot box
- Japanese character = automatically wears kimono
- Elf = automatically glows and wears fantasy armor

Good:

- Programmer may statistically fit some technical interests, but personality and hobbies remain varied.
- A 67-year-old may box recreationally if physically capable.
- Kimono is culturally specific but not automatically selected for every Japanese character.
- An elf may simply have pointed ears and species-specific features unless setting/context supports magical visuals.

The engine should distinguish between:

- **Impossible contradiction**
- **Unusual but plausible**
- **Ordinary compatible**
- **Strong contextual match**

Hard logic should block impossible combinations.

Soft logic should influence likelihood, not force stereotypes.

---

# 5. Foundation Anchors

The core selectable foundation is:

1. Setting
2. Era / Year
3. Gender
4. Species
5. Age / Life Stage
6. Country

These are the primary anchors used to establish the world and character context.

Country is the only location field that must be a core anchor.

Deeper location data such as city, town, birthplace, region, and current location is generated later.

---

# 6. Setting and Era

Setting and era are related but distinct.

## Setting

Setting describes the type of world.

Examples:

- Modern
- Historical
- Victorian
- Fantasy
- Sci-Fi
- Cyberpunk
- Post-Apocalyptic

## Era / Year

Era determines temporal context.

Examples:

- 1980
- 2026
- 2040
- 2200

Do not treat all 1950–2040 content identically even if it falls under Modern.

As time moves beyond roughly the 2040s, modern settings may gradually begin incorporating more advanced/futuristic living.

Exact boundaries may be refined later.

---

# 7. Generation / Cohort Context

PersonaForge should also support generation/cohort metadata.

Examples:

- Silent Generation
- Baby Boomer
- Gen X
- Millennial
- Gen Z
- Gen Alpha

Also support neutral descriptors such as:

- Pre-War
- Post-War
- Late 20th Century
- Early Digital
- Digital Native
- Post-Digital

Cohorts are **context**, not hard restrictions.

A Gen Z character in 2026 may still wear 1990s-inspired clothing. That should be interpreted as a contemporary vintage influence rather than literal 1994 fashion.

---

# 8. Species Age Model

Chronological age must not be treated as identical to life-stage age for every species.

Each species should support an age profile with:

- lifespan
- maturity point
- life-stage ranges
- apparent human age / human-equivalent age

Example:

- Species: Elf
- Chronological Age: 127
- Life Stage: Young Adult
- Apparent Human Age: Mid-20s

Persona output may say:

> 127-year-old young adult elf

Image prompt output should say:

> young adult elven woman, apparent age mid-20s

Do not tell an image generator to portray a “127-year-old woman” unless that is visually intended.

## Human life-stage defaults

Suggested initial ranges:

- Child: 0–12
- Teen: 13–17
- Young Adult: 18–24
- Adult: 25–39
- Mature: 40–59
- Older: 60+

Species may override these ranges.

Do not implement species ageing as simple multipliers.

---

# 9. Main Generation Pipeline

PersonaForge generation should run in ordered passes.

## PASS 1 — FOUNDATION

- Setting
- Era / Year
- Gender
- Species
- Age / Life Stage
- Country

## PASS 2 — ORIGIN

- Heritage
- Birthplace
- Parents
- Family Makeup
- Economic Upbringing

## PASS 3 — CHARACTER CORE

- Name
- Personality Core
- Complementary Traits
- Contrast Trait
- Flaws
- Values

## PASS 4 — LIFE STRUCTURE

- Education
- Primary Role
- Job
- Experience
- Income
- Housing
- Transport
- Schedule

## PASS 5 — PERSONAL DETAIL

- Hobbies
- Interests
- Skills
- Habits
- Quirks

## PASS 6 — APPEARANCE

- Surface Appearance
- Detailed Visual Attributes
- Fashion / Clothing Style

## PASS 7 — RP CONNECTIONS

- Signature Item
- Goals
- Secrets
- Expressions
- Character Hook

## PASS 8 — OUTPUT

- Persona Description
- Image / Reference Package

---

# 10. Persona Data Anatomy

## 10.1 Foundation

- Setting
- Era / Year
- Gender
- Species
- Age
- Life Stage
- Country

## 10.2 Identity / Origin

- Name
- Heritage
- Birthplace
- Current Location
- Languages
- Mother
- Father
- Family Makeup
- Siblings
- Economic Upbringing
- Family Dynamic
- Childhood Environment
- Education
- Major Formative Event(s)

Parents are lightweight supporting data, not complete personas.

Heritage should support mixed backgrounds.

Example:

- Birthplace: London
- Current Location: Tokyo
- Heritage: British-Japanese
- Mother: Japanese
- Father: British

Current location must not determine heritage.

---

# 11. Personality Model

Do not generate personality as a flat list of unrelated adjectives.

Use a structural model:

- Core disposition / primary trait
- Complementary traits
- Contrast trait
- Strengths
- Flaws
- Values
- Habits
- Quirks
- Confidence
- Humour
- Conflict response
- Affection style

Example:

- Core: Observant
- Supporting: Independent, Patient
- Contrast: Playful
- Flaw: Stubborn

Contrast should create personality depth without becoming logical contradiction.

Example:

- Reserved + Playful = valid contrast
- Pacifist + enjoys torturing people = contradiction unless explicitly supported by narrative context

---

# 12. Appearance Model

Appearance has two layers.

## 12.1 Persona-Level Appearance

Readable, moderate detail:

- Height
- Build
- Skin tone
- Hair
- Eyes
- Face
- Distinguishing features
- Tattoos
- Piercings
- Clothing style

## 12.2 Internal / Image-Level Appearance

Deeper visual detail:

- Face shape
- Jaw
- Cheekbones
- Eye shape
- Eye color
- Brows
- Nose
- Lips
- Skin tone
- Undertone
- Complexion
- Freckles
- Scars
- Marks
- Hair color
- Hair length
- Hair texture
- Hair style
- Height
- Build
- Body proportions
- Tattoos
- Piercings
- Distinguishing features

Heritage may influence compatible visual possibilities but must not rigidly stereotype appearance.

---

# 13. Clothing Style vs Signature Outfit

These are separate concepts.

## Clothing Style

Describes how the character generally dresses.

Example:

> Minimalist smart-casual with subtle streetwear influences.

## Signature Outfit

Describes one specific outfit that visually represents the character.

Example:

> Cream cropped jacket, charcoal high-waisted trousers, black ankle boots, silver pendant, and a leather shoulder bag.

A character may have one general clothing style but multiple individual outfits.

---

# 14. Life Model

Use:

- Primary Role
- Job / Employment
- Experience
- Income Band
- Housing
- Financial Situation
- Relationship Status
- Social Circle
- Transport
- Schedule

## Primary Role vs Job

Primary Role describes the character’s main life role.

Example:

- Full-time parent

Job may be optional additional employment.

Example:

- Volunteer shelter worker
- Part-time librarian

This avoids forcing every character into a traditional occupation.

## Income

Use relative bands rather than precise salaries.

Suggested bands:

- Low
- Lower-middle
- Moderate
- Upper-middle
- High
- Very high

Precise money and assets can be improvised during actual roleplay.

---

# 15. Hobbies and Interests

Keep hobbies and interests separate.

## Hobby

Something the character actively does.

Examples:

- Boxing
- Photography
- Cooking
- Gardening

## Interest

Something the character is drawn to.

Examples:

- Astronomy
- Architecture
- Film history
- Motorsports

Hobbies may generate associated skills.

## Commitment Levels

- Casual
- Regular
- Passionate
- Expert

This prevents every hobby from implying mastery.

---

# 16. RP Core

Keep RP-specific fields focused.

## Expressions

Suggested defaults:

- Default
- Happy
- Annoyed
- Embarrassed
- Angry
- Focused

## Secrets

Severity:

- None
- Minor
- Personal
- Significant

Secrets should not automatically be dramatic.

## Goals

- Primary Goal
- Optional Secondary Goal

---

# 17. Signature Item

Every persona should receive one meaningful signature item, even if small.

A signature item should connect to other character data rather than exist as decoration.

Suggested fields:

- item
- origin
- meaning
- linked person
- linked event
- visual importance

Example:

Grandfather’s camera may connect to:

- grandfather background
- photography hobby
- photography skill
- visual reference prompt

The signature item acts as a narrative connector.

---

# 18. Character Hook Pass

PersonaForge should deliberately create 1–3 memorable connections or combinations.

This is not random weirdness.

It should combine already valid character data into something distinctive.

Example:

Generic:

> 24-year-old junior accountant who likes music and cooking.

More memorable:

> 24-year-old junior accountant who restores old radios, has dry competitive humour, and keeps her father’s broken pocket watch on her desk.

The Character Hook should be a summary/connection of existing facts, not a separate arbitrary field.

The UI should allow:

- New Direction / reroll hook

without rebuilding the entire persona.

---

# 19. Context Logic

Use three dependency strengths.

## HARD

Controls validity.

Failure means the result is impossible or structurally incompatible.

## CONTEXT

Strongly determines which candidates fit.

## SOFT

Influences preference but should not restrict valid results.

---

# 20. Candidate Compatibility Tiers

Use these human-readable compatibility levels:

- Exact
- Contextual
- General
- Unusual
- Invalid

Internally, PersonaForge may use hidden numeric scoring.

Suggested starting logic:

- Exact = +3
- Contextual = +2
- General = +1
- Unusual = -1
- Invalid = removed

The UI and Populator should continue using human-readable labels rather than exposing numeric scores.

---

# 21. Candidate Filtering

When generating a value, first filter impossible candidates.

Example hobby search:

1. Load all hobbies
2. Setting compatible?
3. Era compatible?
4. Species compatible?
5. Life stage compatible?
6. Country / culture compatible?
7. Remove invalid candidates

Then rank remaining candidates using softer context such as:

- Personality
- Primary Role
- Job
- Income
- Existing Hobbies
- Existing Interests
- Existing Skills

Hard context removes.

Soft context ranks.

---

# 22. Random Selection Strategy

Do not always choose the highest-scoring candidate.

Instead:

- strongly favour the best-fitting candidates;
- retain some chance of selecting other valid candidates;
- preserve variance between characters.

This is required to prevent repeated stereotype chains.

---

# 23. Variance Modes

Support three generation styles.

## Grounded

- Strong contextual preference
- Low unusual-selection frequency
- High realism

## Varied

- Default mode
- Good contextual fit
- More mixed combinations

## Chaotic

- Weakens soft associations
- Encourages unusual but valid combinations
- Hard restrictions remain enforced

Chaos must never enable invalid combinations.

---

# 24. Repetition / Similarity Guard

PersonaForge should avoid semantic repetition.

Bad personality output:

- Quiet
- Reserved
- Shy
- Introverted
- Soft-spoken

Bad hobby output:

- Gaming
- PC Gaming
- Video Games
- Competitive Gaming

The engine should recognize concept clusters and avoid filling multiple slots with near-identical concepts unless explicitly requested.

This guard is required for v0.1.

---

# 25. Locks

Any generated value can be locked.

Locked values become active anchors during regeneration.

Example:

- Age: 24 — locked
- Gender: Female — locked
- Personality Core: Observant — locked

If `Reroll Unlocked` is pressed, those values become context for all regenerated unlocked fields.

Locking a generated value effectively promotes it to a temporary foundation anchor.

---

# 26. Foundation Lock Behavior

Foundation controls should look roughly like:

- Setting: Modern — locked
- Era: 2020s — locked
- Gender: Random
- Species: Human — locked
- Age: Random
- Country: Random

Selecting a specific foundation value should automatically lock it.

`Random` means unlocked.

---

# 27. Reroll Behavior

Support:

- Reroll entire persona
- Reroll all unlocked
- Reroll section
- Reroll individual field

Sub-vectors should reroll appropriately.

Example:

If `Occupation` is rerolled, related occupation sub-data can also reroll.

Do not automatically destroy downstream values that the user may want to keep.

---

# 28. Dependency / Stale System

When a dependency changes, affected fields should be marked stale.

Example:

Occupation changes.

Possible affected values:

- Income
- Housing
- Schedule
- Clothing
- Skills

Show:

> Occupation changed. These values may no longer align.

Options:

- Regenerate Affected
- Keep Existing

Locked values should not be silently overwritten.

---

# 29. Dependency Matrix

Initial dependency map:

| Generated Value | Reads From | Strength |
|---|---|---|
| Era | Setting | HARD |
| Age / Life Stage | Species, Setting | HARD + CONTEXT |
| Country | Setting, Era, Species | CONTEXT |
| Name | Country, Heritage, Era, Gender | CONTEXT |
| Heritage | Country, Birthplace, Parents | CONTEXT |
| Birthplace | Country, Heritage | CONTEXT |
| Mother / Father | Heritage, Birthplace, Era | CONTEXT |
| Family Makeup | Era, Country, Background | SOFT + CONTEXT |
| Economic Upbringing | Country, Era, Family | CONTEXT |
| Family Dynamic | Personality Seeds, Background | SOFT |
| Education | Age, Era, Country, Background | HARD + CONTEXT |
| Primary Role | Age, Era, Setting, Education, Species | HARD + CONTEXT |
| Job / Employment | Primary Role, Education, Age, Country | CONTEXT |
| Experience | Age, Education, Role, Job | HARD + CONTEXT |
| Income Band | Job, Role, Experience, Country | CONTEXT |
| Housing | Income, Role, Age, Country, Relationships | CONTEXT |
| Transport | Country, Income, Age, Role | SOFT + CONTEXT |
| Schedule | Role, Job, Hobbies, Relationships | CONTEXT |
| Personality Core | Background, Age, Setting | SOFT |
| Complementary Traits | Personality Core | CONTEXT |
| Contrast Trait | Personality Core | SOFT |
| Flaws | Personality Core, Background | CONTEXT |
| Values | Personality, Background, Era | SOFT |
| Habits / Quirks | Personality, Job, Hobbies | SOFT |
| Hobbies | Age, Life Stage, Country, Personality, Income, Role | CONTEXT + SOFT |
| Interests | Personality, Era, Role, Education, Hobbies | SOFT |
| Skills | Job, Education, Hobbies, Experience | CONTEXT |
| Clothing Style | Era, Country, Age, Gender, Role, Personality, Income | HARD + CONTEXT + SOFT |
| Surface Appearance | Species, Age, Gender, Heritage | HARD + CONTEXT |
| Detailed Visuals | Surface Appearance, Heritage, Age, Species | CONTEXT |
| Signature Item | Background, Personality, Hobby, Family, Job | CONTEXT |
| Goals | Personality, Role, Background, Age | CONTEXT |
| Secrets | Background, Relationships, Personality | SOFT |
| Expressions | Personality, Age, Species | SOFT + CONTEXT |

---

# 30. Context Lookup Order

When evaluating a pool entry, use this order:

1. HARD validation
2. Setting / Era
3. Species / Life Stage
4. Country / Culture
5. Role / Background
6. Personality
7. Variance

---

# 31. Coherence Pass

After generation, run a final deterministic coherence check.

Check:

- Age vs Experience
- Era vs Technology
- Species vs Age
- Education vs Role
- Income vs Housing
- Appearance vs Species
- Signature Item vs Background
- Hobbies vs Skills
- Parents vs Heritage
- Duplicate personality concepts

## Hard contradictions

Auto-repair automatically.

Example:

- Age 19
- 25 years professional experience

The engine should correct this.

## Contextual / subjective oddities

Keep the result but show a user-facing warning.

Example:

> Hobby is unusual for current life stage.

Coherence UI example:

- Age / Experience ✓
- Species / Age ✓
- Era / Technology ✓
- Education / Role ✓
- Income / Housing ✓
- Hobby / Life Stage ⚠

Allow:

- Review
- Keep
- Regenerate affected values where appropriate

---

# 32. Seeds and Reproducibility

Support a persona seed.

The same seed should recreate the same initial random choices when using the same underlying library/data version.

Save:

- seed
- schema_version
- data_version

If the data library changes substantially, the same seed may produce different results.

That is acceptable.

---

# 33. Persona Library

Store personas locally.

Required actions:

- Open
- Duplicate
- Delete

Duplication is important because the user may want to retain a character core while changing a few details.

Suggested saved persona metadata:

- persona ID
- name
- seed
- schema version
- data version
- created date
- modified date
- complete persona data object

---

# 34. Main Output Model

PersonaForge has two primary outputs generated from one underlying persona data object.

## 34.1 RP Persona Description

Readable, detailed RP-ready text.

Use clear headings and fields, but prefer detailed paragraphs over terse key/value dumping.

Sections may include:

- Identity
- Appearance
- Personality
- Background
- Lifestyle
- Goals
- Secrets
- Signature Item

## 34.2 Character Image / Reference Package

Adds deeper visual context.

Must derive from the exact same source-of-truth persona data.

No contradictions between persona and image prompts.

---

# 35. Image / Reference Package v0.1

Include:

1. Master Character Prompt
2. Headshot Prompt
3. Full-Body Prompt
4. Casual Outfit Prompt
5. Signature Outfit Prompt
6. Expression Sheet Prompt
7. Signature Item Prompt
8. Visual Traits Summary

---

# 36. Image Prompt Architecture

Store prompts internally as blocks.

Suggested blocks:

- Subject
- Appearance
- Hair
- Face
- Body
- Clothing
- Expression
- Pose
- Signature Item
- Lighting
- Camera
- Background

Offer two output modes:

## Structured

Shows block-by-block prompt sections.

## Polished

Combines the blocks into one natural prompt.

---

# 37. Reference Prompt Style

Reference outputs should remain relatively neutral.

Use:

- clean background
- soft even lighting
- front or useful reference angles
- minimal cinematic distraction

Do not automatically generate dramatic cinematic environments for reference sheets.

Cinematic scene generation belongs elsewhere.

---

# 38. Species-Specific Visual Interpretation

Species may add visual traits.

Example elf:

- pointed ears
- species-specific eye traits
- subtly elongated/elegant facial proportions if appropriate

Do not automatically add:

- glowing skin
- magical aura
- ornate armor
- supernatural visual effects

unless the persona setting/context supports them.

---

# 39. Expression Sheet

Expressions should use detailed but concise visual fragments.

Example:

**Focused**  
Brows slightly drawn, lips neutral, gaze fixed forward, posture attentive.

Default expressions:

- Default
- Happy
- Annoyed
- Embarrassed
- Angry
- Focused

---

# 40. Negative Prompt

Provide a reusable quality-control negative prompt.

Keep it lightweight because modern image tools may not need aggressive negative prompting.

Example categories:

- malformed anatomy
- extra fingers
- duplicate limbs
- text
- watermark
- inconsistent eye color
- unintended duplicated accessories

Do not over-engineer this.

---

# 41. Visual Reroll

Support `Reroll Visual Details`.

It should preserve core identity anchors such as:

- Age
- Heritage
- Hair Color
- Eye Color where locked/core
- Build
- Signature Item
- Species

It may reroll lower-level visual interpretation such as:

- Face Shape
- Hair Styling
- Freckles
- Minor Features
- Outfit Details

---

# 42. Export Modes

Support:

- `Persona.md`
- `Persona.txt`
- `Reference_Package.md`
- `Persona.json`

Also provide:

- Copy Persona
- Copy Master Image Prompt
- Copy Reference Package

---

# 43. Main PersonaForge UI

Use a three-panel desktop-oriented layout.

Example:

```text
┌──────────────────────────────────────────────────────────┐
│ PersonaForge                         Library   Settings  │
├───────────────┬───────────────────────────┬──────────────┤
│ FOUNDATION    │         PERSONA           │   CONTEXT    │
│               │                           │              │
│ Setting       │ Identity                  │ Seed         │
│ Era           │ Background                │ Coherence    │
│ Gender        │ Appearance                │ Dependencies │
│ Species       │ Personality               │ Variance     │
│ Age           │ Lifestyle                 │              │
│ Country       │ RP Core                   │              │
│               │                           │              │
│ [Generate]    │                           │              │
└───────────────┴───────────────────────────┴──────────────┘
```

---

# 44. Persona Cards

The center panel uses expandable cards.

Collapsed example:

```text
PERSONALITY                         🔒 🎲
Observant • Playful • Independent • Stubborn
```

Expanded example:

```text
PERSONALITY                         🔒 🎲

Core
🔒 Observant

Supporting
🔓 Independent
🔓 Patient

Contrast
🔓 Playful

Flaw
🔓 Stubborn

Values
🔓 Loyalty
🔓 Independence

[Regenerate Unlocked]
```

Every major card should support:

- lock card
- reroll card
- expand
- individual field locks
- individual field rerolls

---

# 45. Dependency Inspector

When a field is selected or inspected, optionally show:

```text
Occupation: Software Engineer

Influenced by:
Age • Era • Education • Country • Primary Role

Affects:
Income • Housing • Schedule • Clothing • Skills
```

This may be hidden behind an Advanced toggle later, but should be available in v0.1 if practical because it is useful for debugging and understanding generation logic.

---

# 46. Character Hook UI

Provide a small card such as:

```text
CHARACTER HOOK

Restores vintage radios and keeps her late father's
broken pocket watch on her desk.

[New Direction]
```

The hook should summarize connected existing facts, not invent an unrelated new fact.

---

# 47. Main Output Tabs

Use:

- Builder
- Persona
- Reference Package

## Builder

Cards and editing.

## Persona

Polished RP persona.

## Reference Package

Image-generation prompts and blocks.

The Persona Library remains a separate interface/view.

---

# 48. Reference Package UI

Suggested layout:

```text
REFERENCE PACKAGE

[Master] [Headshot] [Full Body] [Casual]
[Signature] [Expressions] [Item] [Traits]

Structured ●
Polished   ○
```

Then show blocks:

- Subject
- Face
- Hair
- Body
- Clothing
- Expression
- Pose
- Lighting
- Camera
- Background

Provide:

- Copy Prompt

---

# 49. Populator Purpose

The **PersonaForge Populator** is a companion database-making tool.

Its job is to:

- create entries;
- edit entries;
- organize entries;
- validate entries;
- detect duplicates;
- bulk import entries;
- manage templates;
- manage expansion trees;
- inspect coverage;
- back up data;
- export data.

It is **not** the main reasoning engine.

The PersonaForge Studio performs deeper compatibility ranking and persona generation.

---

# 50. Populator CLI Main Menu

Use:

```text
PERSONAFORGE POPULATOR

1. Add Single Entry
2. Bulk Add
3. Browse Entries
4. Search Entries
5. Edit Entry
6. Delete Entry
7. Clone Entry
8. Validate Library
9. Detect Duplicates
10. Manage Templates
11. Export / Backup
12. Library Statistics
0. Exit
```

Saved searches are not required in v0.1.

---

# 51. Populator Entry IDs

Use readable IDs.

Examples:

- `hobby_boxing`
- `clothing_oversized_hoodie`
- `occupation_software_engineer`

Avoid opaque IDs such as:

- `HOB-38747`

Readable IDs are easier to inspect and maintain manually.

Canonical IDs should use lowercase machine-friendly formatting.

---

# 52. Shared Base Entry Schema

Suggested broad v0.1 schema:

```json
{
  "id": "hobby_boxing",
  "name": "Boxing",
  "category": "hobby",
  "subcategory": "physical.combat_sport",

  "settings": ["modern"],

  "eras": [
    {
      "start": 1900,
      "end": 2049
    }
  ],

  "cohorts": [
    "gen_x",
    "millennial",
    "gen_z"
  ],

  "location": {
    "continents": ["global"],
    "regions": [],
    "countries": []
  },

  "life_stages": [
    "young_adult",
    "adult",
    "mature"
  ],

  "species": ["humanlike"],

  "gender_relevance": "any",

  "tags": [
    "physical",
    "competitive",
    "fitness"
  ],

  "context": {
    "required": [],
    "compatible": [],
    "unusual": [],
    "invalid": []
  },

  "notes": ""
}
```

Keep v0.1 metadata broad.

Do not overcomplicate every category with highly detailed schemas.

---

# 53. Context Rule Schema

Use:

```json
"context": {
  "required": [],
  "compatible": [],
  "unusual": [],
  "invalid": []
}
```

This matches the desired human-readable logic model.

---

# 54. Era Storage

Store explicit numeric ranges.

Example:

```json
"eras": [
  {
    "start": 1980,
    "end": 2049
  }
]
```

Do not require unnecessary extra layers.

---

# 55. Store Both Setting and Era

Example:

```json
"settings": ["modern"],
"eras": [
  {
    "start": 1980,
    "end": 2049
  }
]
```

Setting = world type.

Era = temporal range.

---

# 56. Cohort Data

Entries store cohort IDs.

Example:

```json
"cohorts": [
  "gen_x",
  "millennial",
  "gen_z"
]
```

Cohort definitions live separately.

Example:

```json
{
  "gen_z": {
    "display_name": "Gen Z",
    "birth_start": 1997,
    "birth_end": 2012,
    "descriptor": "Digital Native"
  }
}
```

---

# 57. Location Hierarchy

Support:

**Continent → Region → Country**

The Populator does not need to generate deep location detail itself.

Its role is to make entries searchable by geographical compatibility.

The main PersonaForge Studio performs deeper generation.

Examples:

- Global
- Europe → Western Europe → United Kingdom
- Asia → East Asia → Japan

---

# 58. Gender Relevance

Avoid limiting entries to only male/female.

Support:

- Any
- Masculine-coded
- Feminine-coded
- Unisex
- Male-specific
- Female-specific
- Species-specific

Example:

```text
Skirt
Gender relevance: Feminine-coded
Invalid gender: none
```

This permits broader combinations.

Functional/biological categories may use a specific constraint where genuinely relevant.

---

# 59. Category-Specific Metadata

Keep broad in v0.1.

Example hobby metadata might include only:

- physical demand
- commitment compatibility
- related skills

Example clothing metadata might include only:

- clothing type
- style family
- formality
- season

Do not attempt to model every possible detail yet.

---

# 60. Subcategories

Support hierarchical subcategories.

Example:

```text
Clothing
└── Outerwear
    ├── Jackets
    ├── Coats
    └── Hoodies
```

When adding:

```text
Choose Subcategory:
1. Existing
2. Create New
```

Validate new subcategories.

Canonical IDs should prevent accidental duplicates such as:

- `outerwear`
- `outer-wear`
- `Outerwear`

Use lowercase canonical IDs and friendly display names.

---

# 61. Clone Entry

Populator should support cloning.

Example:

- Hoodie
- clone → Zip Hoodie
- clone → Oversized Hoodie

Cloning should copy metadata and allow quick editing before save.

---

# 62. Populator Templates

Ship with a few useful built-in templates.

Examples:

- Modern General Hobby
- Modern Casual Clothing
- Modern Occupation
- Fantasy Occupation
- General Personality Trait
- General Signature Item

Allow custom templates.

Custom templates should be:

- editable
- clonable
- deletable
- reusable

Do not support nested template inheritance in v0.1.

A template is simply a reusable set of default fields.

---

# 63. Guided Add

Example workflow:

```text
Add Hobby

Name:
Subcategory:
Setting:
Era:
Generation relevance:
Life stage:
Physical demand:
Commitment:
Related skills:
Context:
Notes:

Save? Y/N
```

Use category-specific forms where useful, but keep them broad.

---

# 64. Bulk Add

Example:

```text
Bulk Add
Category: Hobby
Template: Modern General Hobby

Paste values:
Photography
Cooking
Gaming
Gardening
Boxing
Cycling
```

Then:

```text
6 entries detected.

Duplicates: 1
Possible conflicts: 0

[Review]
[Import Valid]
[Cancel]
```

Review should prioritize exceptions rather than forcing inspection of every valid entry.

---

# 65. Import Formats

v0.1 supports:

- `.txt` — simple one-entry-per-line
- `.csv` — structured bulk metadata
- `.json` — PersonaForge-compatible data

Do not add XLSX support in v0.1.

---

# 66. Deterministic Expansion

Expansion must be deterministic and predefined.

Do not use AI for expansion.

Example:

```text
Cooking
├── Home Cooking
├── Baking
├── Grilling
├── Meal Prep
└── Regional Cuisine
```

Expansion choices:

- None
- Common
- Full

Avoid automatically creating overly specific branches such as molecular gastronomy unless explicitly defined.

---

# 67. Expansion Storage

Store expansion trees separately from base entries.

Example:

```json
{
  "cooking": {
    "common": [
      "home_cooking",
      "baking",
      "grilling",
      "meal_prep",
      "regional_cuisine"
    ]
  }
}
```

This keeps entry files clean.

---

# 68. Duplicate Detection

Check:

- Exact ID
- Exact Name
- Case-insensitive Name
- Normalized Name
- Near Match

Example:

- Photography
- photography
- Photography Hobby
- Street Photography

Exact ID/name should be treated as strong duplicate candidates.

Near matches should be suggestions only.

Offer actions:

- Merge
- Create Variant
- Skip
- Open Existing

---

# 69. Validation Philosophy

The Populator should **warn rather than police** whenever possible.

Preferred message style:

> Warning: current values do not align with logic. Change values to improve realism.

Only structurally invalid schema data should be blocked.

The main PersonaForge Studio handles deeper reasoning.

---

# 70. Validation Severity

Use:

## INFO

Not wrong, but worth reviewing.

## WARNING

Potential contextual mismatch.

## ERROR

Broken schema or impossible structural data.

Example:

INFO:

> Kimono has no cohort information.

WARNING:

> Techwear jacket includes 1980–1989. Review for realism.

ERROR:

> Era start year is later than era end year.

Warnings should be overridable.

Errors should only block save when the data itself is structurally invalid.

---

# 71. Era Validation

Keep era validation broad.

Do not build a historical simulator.

Example:

```text
Smartphone
Era: 1970–2049

WARNING:
Current era range may conflict with known technology availability.
Suggested later-modern start.
```

Use broad known-range metadata where useful.

---

# 72. Deep Dependency Validation

Do not add advanced dependency-aware reasoning to the Populator in v0.1.

Example:

- Software Engineer
- Medieval Fantasy

The Populator may store context metadata, but the main PersonaForge Studio decides whether the occupation is valid in a specific world.

---

# 73. Culture Scope

Every entry should support geographical relevance.

Examples:

## Global

Hoodie

## Region-specific

Some broad cultural categories

## Country-specific

Kimono → Japan

Avoid Western-default generation.

---

# 74. Library Coverage

The Populator should report coverage gaps.

Do not compare raw counts blindly.

Example:

Women may naturally have more clothing categories than men. A lower men's clothing count does not automatically mean the men's library is weak.

Coverage should evaluate **breadth within relevant categories**, not forced equality.

Suggested dimensions:

- Category breadth
- Subcategory breadth
- Era coverage
- Setting coverage
- Life-stage coverage
- Location coverage
- Gender/presentation coverage
- Species coverage

Display:

- Strong
- Good
- Weak
- Missing

No percentages are required in the UI.

---

# 75. Coverage Example

```text
Modern > UK > Young Adult > Women

Tops        Strong
Bottoms     Strong
Outerwear   Strong
Footwear    Strong
Formal      Strong

Modern > UK > Young Adult > Men

Tops        Strong
Bottoms     Strong
Outerwear   Strong
Footwear    Strong
Formal      Weak
```

---

# 76. Coverage Priorities

Allow branches to be marked:

- High
- Normal
- Low
- Ignored / Not Planned

This prevents the Populator from repeatedly warning about branches the user does not intend to support yet.

---

# 77. Library Statistics

Suggested output:

```text
LIBRARY STATISTICS

Total Entries: 4,281

Hobbies: 314
Occupations: 622
Clothing: 1,204
Personality: 410

Coverage Warnings:
Modern / Japan / Clothing     Strong
Modern / Brazil / Clothing    Weak
Fantasy / Elf / Occupations   Weak
Victorian / UK / Hobbies      Strong
```

The purpose is to show what needs populating next.

---

# 78. Backups

Use automatic backups before risky operations.

Automatic backup before:

- bulk import
- bulk delete
- mass metadata changes
- major template changes

Also provide:

- manual backup anytime

Do not create a backup after every tiny edit.

Suggested archive:

```text
persona_data_backup_YYYY-MM-DD_HHMM.zip
```

Include:

- data/
- templates/
- expansions/
- schema_version.json
- data_version.json

---

# 79. Undo

Support simple last-action undo.

Examples:

- undo last bulk import
- undo last major edit
- undo last bulk delete

No Git-like history is required.

---

# 80. Schema Versioning

Use schema versioning from the start.

Example:

```json
{
  "schema_version": "1.0"
}
```

Also maintain a data version.

This allows later migration if v0.2 changes the structure.

---

# 81. Suggested Data Folder Structure

```text
data/
├── core/
│   ├── settings.json
│   ├── eras.json
│   ├── cohorts.json
│   ├── life_stages.json
│   ├── countries.json
│   └── regions.json
│
├── identity/
│   ├── names/
│   ├── species.json
│   └── heritage.json
│
├── personality/
│   ├── traits.json
│   ├── flaws.json
│   ├── values.json
│   ├── habits.json
│   └── quirks.json
│
├── lifestyle/
│   ├── hobbies.json
│   ├── interests.json
│   ├── occupations.json
│   ├── education.json
│   ├── housing.json
│   └── transport.json
│
├── appearance/
│   ├── hair.json
│   ├── eyes.json
│   ├── skin.json
│   ├── body.json
│   └── features.json
│
├── clothing/
│   ├── tops.json
│   ├── bottoms.json
│   ├── outerwear.json
│   ├── footwear.json
│   └── accessories.json
│
├── narrative/
│   ├── goals.json
│   ├── secrets.json
│   ├── signature_items.json
│   └── expressions.json
│
├── expansions/
│   └── ...
│
└── templates/
    └── ...
```

This may be adjusted during implementation if a small change improves maintainability, but preserve the category separation.

---

# 82. Recommended Internal Persona Object

Codex should create a single canonical persona object used by every UI/output layer.

Conceptually:

```json
{
  "meta": {
    "persona_id": "",
    "seed": 0,
    "schema_version": "1.0",
    "data_version": "1.0"
  },

  "foundation": {},

  "origin": {},

  "personality": {},

  "life": {},

  "interests": {},

  "appearance": {
    "surface": {},
    "visual": {},
    "clothing_style": {},
    "signature_outfit": {}
  },

  "narrative": {},

  "expressions": {},

  "character_hook": {},

  "state": {
    "locks": {},
    "stale_fields": [],
    "warnings": []
  }
}
```

Do not build persona text and image prompts from separate independent state.

---

# 83. Suggested Application Architecture

Keep modules separated.

Suggested JavaScript modules:

```text
src/
├── data-loader.js
├── generator.js
├── context-engine.js
├── candidate-ranker.js
├── seed-rng.js
├── dependency-engine.js
├── coherence.js
├── similarity-guard.js
├── persona-writer.js
├── reference-writer.js
├── persona-store.js
└── ui/
    ├── foundation.js
    ├── cards.js
    ├── context-panel.js
    ├── persona-view.js
    ├── reference-view.js
    └── library-view.js
```

The exact file split may change, but preserve separation of concerns.

Avoid putting all logic in one large `app.js`.

---

# 84. Generation Engine Responsibilities

The engine should:

1. receive locked/current persona state;
2. determine which fields must be generated;
3. derive active context;
4. filter invalid candidates;
5. rank valid candidates;
6. apply seeded weighted randomness;
7. run similarity guards;
8. create linked sub-vectors;
9. calculate downstream stale fields;
10. run Character Hook pass;
11. run coherence validation;
12. auto-repair hard contradictions;
13. expose contextual warnings.

---

# 85. Persona Writer Responsibilities

The Persona Writer should convert the canonical object into readable roleplay prose.

It must:

- avoid repetitive field dumping;
- preserve all important locked/generated data;
- keep appearance readable rather than overly technical;
- use paragraphs under structured headings;
- maintain internal consistency.

---

# 86. Reference Writer Responsibilities

The Reference Writer should:

- read the same canonical persona object;
- use deeper visual fields;
- expand visual details;
- preserve apparent species age;
- distinguish clothing style from specific outfits;
- create structured prompt blocks;
- create polished prompt variants;
- generate all v0.1 reference prompt types.

---

# 87. Populator Internal Architecture

Suggested Python layout:

```text
populator/
├── main.py
├── cli.py
├── schemas.py
├── storage.py
├── validator.py
├── duplicate_detector.py
├── importer.py
├── exporter.py
├── templates.py
├── expansions.py
├── coverage.py
├── backup.py
└── utils.py
```

Keep the CLI readable and beginner-maintainable.

---

# 88. Development Milestones

Do not build everything at once.

Each milestone must work before moving to the next.

## Milestone 1 — Project Structure + Schemas

Build:

- folders
- base JSON schema
- core data definitions
- schema version
- data version
- starter sample entries

Acceptance:

- project loads valid JSON
- invalid structural data can be detected
- readable folder layout exists

---

## Milestone 2 — Python Populator CLI

Build:

- main menu
- add
- edit
- delete
- clone
- browse
- basic search
- templates
- validation

Acceptance:

- user can create valid entries without hand-editing JSON
- readable IDs are generated/validated
- changes persist

---

## Milestone 3 — Populator Bulk + Safety

Build:

- TXT import
- CSV import
- JSON import
- duplicate detection
- bulk review
- automatic pre-operation backup
- last-action undo
- statistics
- coverage report

Acceptance:

- bulk import can safely add many entries
- duplicates are surfaced before import
- risky operations create backups
- last major action can be undone

---

## Milestone 4 — Starter Persona Database

Create enough starter content to test:

- several settings
- several eras
- species
- life stages
- countries
- heritage
- names
- personality
- hobbies
- interests
- occupations
- housing
- transport
- appearance
- clothing
- narrative items

Do not attempt exhaustive coverage yet.

Acceptance:

- engine can build multiple distinct test personas

---

## Milestone 5 — Persona Generation Engine

Build:

- seed RNG
- hard filtering
- compatibility ranking
- weighted random choice
- variance modes
- generation passes

Acceptance:

- same seed + same data version reproduces same initial persona
- invalid candidates are removed
- grounded/varied/chaotic produce noticeably different distributions

---

## Milestone 6 — Foundation + Card UI

Build:

- three-panel layout
- foundation controls
- Generate Random Persona
- Generate from anchors
- expandable cards

Acceptance:

- user can select anchors and generate
- selected anchors remain locked
- Random fields remain unlocked

---

## Milestone 7 — Locks, Rerolls, Dependencies

Build:

- card locks
- field locks
- field reroll
- section reroll
- reroll unlocked
- dependency inspector
- stale warnings
- regenerate affected

Acceptance:

- locked values survive rerolls
- rerolled dependencies mark downstream fields stale
- sub-vectors reroll correctly
- user can keep stale values

---

## Milestone 8 — Similarity + Character Hook + Coherence

Build:

- similarity guard
- contrast logic
- Character Hook pass
- coherence panel
- hard contradiction auto-repair
- contextual warnings

Acceptance:

- personality does not fill with near-synonyms
- hobbies avoid redundant duplicates
- hard contradictions are repaired
- unusual valid combinations remain possible
- Character Hook connects existing facts

---

## Milestone 9 — Persona Writer

Build:

- Persona tab
- structured readable headings
- detailed paragraphs
- copy
- Markdown export
- TXT export

Acceptance:

- persona text is RP-ready
- text matches canonical data
- no important contradictions

---

## Milestone 10 — Reference Package

Build:

- Reference Package tab
- prompt categories
- structured/polished toggle
- visual reroll
- copy prompt
- Markdown export

Acceptance:

- visual prompts match persona
- species apparent age is respected
- clothing style and signature outfit remain distinct
- visual reroll does not destroy identity anchors

---

## Milestone 11 — Persona Library

Build:

- save persona
- open persona
- duplicate persona
- delete persona
- JSON export
- seed/data version display

Acceptance:

- saved personas can be reopened without losing locks/state
- duplication creates editable copy

---

## Milestone 12 — Polish and Tests

Build:

- edge case handling
- useful empty-state messages
- basic responsive behavior
- JSON validation tests
- generation consistency tests
- reroll tests
- seed tests
- dependency tests

Acceptance:

- no major console errors
- no invalid data silently corrupts the library
- core workflows work end-to-end

---

# 89. v0.2+ Backlog

Possible later work:

- richer appearance systems
- additional reference prompts
- makeup
- accessories
- facial-expression libraries
- hobby background scenes
- more species logic
- more contextual relationship data
- relationship networks
- NPC groups
- world-builder integration
- richer demographic/cultural models
- advanced dependency visualizer
- saved Populator searches
- richer statistics
- optional GUI Populator
- advanced category metadata
- advanced template inheritance
- import migration tools
- database diff tools
- custom persona output templates
- optional LLM-assisted prose refinement
- optional AI image-generation integration
- optional desktop packaging
- possible Android packaging later

Do not implement these during v0.1 unless required for core correctness.

---

# 90. Codex Build Guidance

## General

Build incrementally.

Do not generate the entire finished application in one uncontrolled pass.

For each milestone:

1. inspect existing files;
2. explain the intended changes briefly;
3. implement only the milestone;
4. run/tests where practical;
5. fix errors before continuing;
6. preserve previous working behavior.

## Keep code understandable

The owner is learning alongside the project.

Prefer:

- clear naming
- small modules
- comments where logic is non-obvious
- simple JSON
- direct control flow

Avoid:

- unnecessary frameworks
- premature abstractions
- clever metaprogramming
- large monolithic files
- hidden magic
- infrastructure not required by v0.1

## Data first

The system should be data-driven.

Do not hardcode hundreds of persona values into JavaScript.

Values should live in JSON and be searchable by the engine.

## Deterministic core

Do not use an LLM to decide foundational generation behavior.

Generation, expansion, validation, seeding, filtering, ranking, and coherence should be deterministic local code.

## Source of truth

Never maintain separate persona and image versions of the character.

All outputs must read from the same canonical persona object.

---

# 91. v0.1 Acceptance Criteria

PersonaForge v0.1 is complete when all of the following are true.

## Populator

- User can add entries.
- User can bulk-add entries.
- User can edit entries.
- User can delete entries.
- User can clone entries.
- User can browse the library.
- User can search the library.
- User can manage templates.
- User can validate data.
- User can detect duplicates.
- User can safely bulk import.
- User receives automatic backups before risky operations.
- User can undo the most recent major operation.
- User can inspect library statistics.
- User can inspect coverage gaps.
- Entries use readable IDs.
- Canonical storage is JSON.
- Schema version exists.
- Data version exists.

## Generator

- User can generate a fully random persona.
- User can select foundation anchors.
- Foundation selections lock automatically.
- Hard-invalid candidates are never selected.
- Context influences candidate ranking.
- Unusual but plausible results remain possible.
- Grounded, Varied, and Chaotic modes work.
- Same seed + same data version reproduces initial generation.
- Similarity guard prevents excessive near-duplicate concepts.
- Character Hook pass creates a memorable connection.
- Coherence checker auto-repairs hard contradictions.
- Contextual oddities remain visible to the user.

## Locks and rerolls

- Entire cards can be locked.
- Individual fields can be locked.
- Entire cards can be rerolled.
- Individual fields can be rerolled.
- All unlocked values can be rerolled.
- Locked values act as anchors.
- Dependency changes mark affected values stale.
- User can regenerate affected values.
- User can keep existing values.
- Sub-vectors reroll correctly.

## Persona output

- Persona is detailed.
- Persona remains readable.
- Appearance is not overly technical.
- Personality reads as a coherent person rather than adjective soup.
- Background, lifestyle, goals, secrets, and signature item align with generated data.
- Markdown export works.
- TXT export works.
- Copy Persona works.

## Reference package

- Master prompt works.
- Headshot prompt works.
- Full-body prompt works.
- Casual outfit prompt works.
- Signature outfit prompt works.
- Expression sheet prompt works.
- Signature item prompt works.
- Visual traits summary works.
- Structured prompt mode works.
- Polished prompt mode works.
- Visual prompts derive from canonical persona data.
- Species apparent age is handled correctly.
- Visual reroll preserves core identity anchors.
- Copy Prompt works.
- Markdown export works.

## Persona Library

- Save works.
- Open works.
- Duplicate works.
- Delete works.
- Seed is preserved.
- Schema version is preserved.
- Data version is preserved.
- Locks/state remain intact where appropriate.

---

# 92. Final Product Principle

When there is a conflict between adding more features and keeping PersonaForge understandable, deterministic, and useful:

**choose the simpler implementation.**

PersonaForge v0.1 should be a reliable local persona studio and database-driven generation engine.

The long-term power should come from:

- a growing data library;
- better context relationships;
- richer generation rules;
- more user-defined templates;
- more combinations;

not from making the first version unnecessarily complex.
# v0.2.6 Deep Pool Workflows

Appearance and Clothing are defined by `data/pools/deep_pool_registry.json`. Leaf pools are the population and coverage targets; parent branches derive their coverage from child leaves.

Useful offline commands:

```text
python -m populator.main deep-tree appearance --expand hair
python -m populator.main deep-add hairstyle --text "Wolf Cut
Butterfly Cut"
python -m populator.main deep-add hairstyle --text "Wolf Cut
Butterfly Cut" --apply
python -m populator.main pool-inspect hairstyle
python -m populator.main pool-context hairstyle --contexts '[{"settings":"modern"}]'
python -m populator.main deep-target hairstyle 50
python -m populator.main unclassified
python -m populator.main migrate-deep
python -m populator.main migrate-deep --apply
```

Deep migration is conservative: only canonical, unambiguous mappings are applied automatically. Ambiguous entries require explicit approval and all writes are backed up for undo.

# v0.2.7 Unified Coverage Targets

Coverage now uses one minimum/healthy/target contract for legacy pools and deep registry leaves. Queue records name their intended goal, presets default to conservative minimum-first population, and library health measures minimum/healthy readiness without penalizing unfinished long-term expansion targets.

See `COVERAGE_ARCHITECTURE_v0.2.7.md` for threshold semantics, status names, configuration examples, queue commands, preset policies, compatibility rules, and agent-facing health fields.

## Control Centre

The local studio now opens in a personalised Control Centre with live coverage, diagnostics, generation presets, appearance preferences, activity and backup downloads. Start (or restart) `python start.py` to enable its local API. See [the Control Centre guide](docs/CONTROL_CENTRE.md) for architecture, persistence, testing and current limitations.
