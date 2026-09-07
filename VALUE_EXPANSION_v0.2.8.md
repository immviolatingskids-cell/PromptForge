# Values and Population Workflow v0.2.8

## Pre-change audit

`data/personality/values.json` contained 12 ordinary library entries with `id`, `name`, and the shared compatibility object. Some entries used hard setting or life-stage compatibility. The browser loader exposes the file as `library.values`; `generator.js` filtered it through `context-engine.js`, ranked one value through `candidate-ranker.js`, and stored it in `persona.personality.values`. The writer consumes only each selected entry's name. Values had no dedicated schema or family model. `similarity-guard.js` understood `metadata.cluster`, but it was used only for trait selection.

The Python Populator already supplied canonical entry construction, paste/import parsing, structural validation, duplicate review, backup/undo, threshold configuration, queues, and separate legacy/deep-pool coverage. Those components are retained. The reusable workflow added here composes them rather than introducing another storage path.

## Entry model

Values remain backward-compatible library entries. Optional metadata now has these documented fields:

- `family`: broad conceptual diversity group, expressed as a readable ID.
- `cluster`: narrower synonym/equivalence group used for selection and duplicate review.
- `context_affinities`: compatibility-shaped lists that add a small ranking bonus and never hard-filter an entry.

The shared JSON schema and Python validator validate these fields. Entries without them remain valid.

## Population commands

`python populate.py populate-plan` ranks incomplete legacy and deep creative pools, putting deficient pools before below-healthy pools and target expansion. The finite `core/countries` reference catalogue is excluded.

`python populate.py populate <branch> --goal minimum|healthy|target --text "..."` is a dry-run preview. It reports normalized structured entries, exact/likely duplicates, possible variants, errors, threshold intent, and before/after coverage. Add `--apply` for the explicit mutation step. Apply uses the existing backup and undo journal, performs a full preflight, writes once, validates the destination, rolls back on failure, and returns refreshed coverage.

Structured defaults—including `family`, `cluster`, and soft affinity metadata—can be supplied with `--defaults` JSON. The same functions are available to a future interactive UI.

## Selection behavior

The default remains one value, preserving generated persona shape and seeded behavior. Callers requesting multiple values use cluster/family-distinct selection. Context affinities participate only in weighted ranking; the compatibility filter remains unchanged. This preserves the rule that context influences probability without dictating identity.
