# PromptForge Review and Feature Roadmap

Date: 2026-09-07
Scope: review only. No application code, catalogue data, schemas, registry definitions, or configuration were changed.

## Current verification

The current checkout was reviewed through all repository Markdown documents, including `README.md`, `PROJECT_STATUS.md`, the v0.2.5 audit, v0.2.6 health and coverage reports, the v0.2.7 deep-pool plan and coverage contract, the post-implementation review, the curation report, and `AGENTS.md`.

Live checks on 2026-09-07:

- JavaScript tests: 25 passed, 0 failed.
- Python tests: 80 passed, 0 failed.
- Canonical data validation: 33 JSON files passed.
- Health: 0 errors, 0 warnings, 145 informational findings.
- Coverage: completed successfully.

The main outstanding coverage issue is intentional backlog: 67 deep leaves are below minimum and 27 pools are below healthy coverage. The entries are not currently assigned to deep registry leaves, so this should be handled through an approved migration/classification workflow rather than automatic reassignment.

## Documentation reconciliation

`Prompt Forge curation report.md` is historical and reports 80 warnings from an earlier run. `LIBRARY_HEALTH_REVIEW_v0.2.6.md` records the later reporting correction: unclassified deep entries and unstarted deep leaves are informational until they become actionable. The current command confirms the newer result. Keep the older report as history, but label it clearly as superseded if the documentation is later refreshed.

`DEEP_POOL_POPULATION_PLAN_v0.2.7.md` references `Audit.for.agent2.md`, which is absent from the current Markdown file inventory. The plan correctly falls back to the registry, catalogue, coverage implementation, and health output; future audits should either include that input or remove the stale reference.

## Actionable errors and warnings

There are no live errors or warnings to repair from the current test and validation run. The following are unresolved audit risks, ranked for a future implementation pass:

1. **High: validation coverage.** Ensure registry, template, and expansion documents are validated by the normal validation workflow, or expose and run explicit companion validators.
2. **High: deep-pool migration contract.** Decide whether legacy Appearance/Clothing entries are migrated, mapped for reporting, or kept explicitly migration-pending. Add fixtures for both mapped and unmapped entries.
3. **High: duplicate policy.** Make bulk import consume structured duplicate classifications directly, with explicit handling for exact duplicate, likely duplicate, possible variant, and distinct entries.
4. **High: version compatibility.** Define whether the deep registry version is independent or must match the project/data version, then validate that contract.
5. **High: policy centralization.** Move target overrides, category mappings, pool kinds, and special reference-pool rules behind one validated policy contract.
6. **Useful: mutation safety.** Revalidate batch metadata updates and make multi-file backup/undo operations transactional.
7. **Useful: import safety.** Replace fragile pasted-input heuristics with explicit parser modes, robust CSV/Markdown handling, and a preview before applying imports.
8. **Useful: effective coverage.** Report raw counts alongside representative context-aware depth so large but unusable pools do not look healthy.
9. **Useful: browser boundaries.** Validate loaded JSON shape/version at the browser boundary and mark unimplemented coherence checks as “not evaluated” rather than “pass.”
10. **Polish: UX and scale.** Add clipboard failure feedback, responsive browser smoke coverage, and registry-sized performance fixtures.

## Feature drafts: main studio

### 1. Coverage-aware generation inspector

Show which selected fields came from legacy pools versus deep leaves, the effective candidate count after context filters, and the reason a candidate was excluded. Link each thin or deficient dimension to the relevant population queue entry.

Acceptance ideas: a user can inspect one generated field, see its source pool and compatibility decisions, and reproduce the same result from the displayed seed and data version.

### 2. Explainable coherence panel

Replace unconditional pass placeholders with three states: pass, warning, and not evaluated. Show the evidence behind each check, such as the conflicting fields, the rule tier, and whether the user can keep the result.

Acceptance ideas: hard contradictions block or repair according to existing rules; contextual oddities remain visible as overridable warnings; unimplemented checks never claim verification.

### 3. Scenario and anchor presets

Allow users to save a named bundle of setting, era, species, life stage, region, variance mode, and locked fields. Presets should be seedable and exportable as a small JSON profile without embedding the catalogue.

Acceptance ideas: a preset can generate repeatedly, report incompatible anchors clearly, and survive reload without changing the underlying catalogue.

### 4. Controlled visual reroll workspace

Add a comparison view for current versus rerolled appearance/clothing fields. Let the user accept individual changes, keep locked fields, and see downstream stale dependencies before committing.

Acceptance ideas: accepting a change is undoable, preserves deterministic seed metadata, and never silently overwrites locked or stale fields.

### 5. Library analytics and drift view

Add trend snapshots for raw coverage, effective coverage, duplicate concentration, context sparsity, and recently added entries. Highlight when a new batch improves count but not usable diversity.

Acceptance ideas: analytics distinguish creative pools from finite reference pools and expose the same status vocabulary as the CLI.

## Feature drafts: native populator CLI

### 1. Review-first import workspace

Extend import review with parser detection, a normalized preview, duplicate classification, schema validation, context coverage impact, and an explicit acceptance manifest. Applying the manifest remains a separate user action.

Useful commands could include `import preview`, `import accept`, and `import reject`, while preserving the existing backup and undo behavior.

### 2. Deep migration workbench

Provide a guided command to sample legacy Appearance/Clothing entries, suggest candidate leaves, show confidence and overlap, and require explicit approval per mapping or batch. Record migration provenance in metadata.

The workbench should support dry-run output, reversible application, and a report of entries intentionally left unmapped.

### 3. Registry contract validator

Add one validator for registry paths, threshold ordering, selection modes, category ownership, version compatibility, and target resolution. Make `validate` call it so behavior-defining configuration cannot bypass the canonical check.

### 4. Coverage queue planner

Generate queue recommendations using priority, minimum/healthy/target goal, effective context depth, and category concentration. Offer a dry-run plan that estimates the impact of a proposed batch before any file mutation.

### 5. Transaction journal and multi-step undo

Replace one-action assumptions with a small journal recording operation ID, exact files, pre-state hashes, post-state hashes, and validation results. Keep the current undo command compatible while adding a history/list/restore workflow.

### 6. Data quality gates

Add optional CI-friendly checks for duplicate IDs, near-duplicate concentration, missing compatibility fields, unsupported metadata, stale versions, low context diversity, and accidental raw-count inflation from bundled entries.

### 7. Synthetic scale laboratory

Add a fixture generator and benchmark command for hundreds or thousands of registry-sized entries. Measure import review, duplicate detection, coverage aggregation, and deterministic generation without touching production data.

## Suggested implementation order

1. Establish the registry/version/migration contracts and validator boundaries.
2. Close import and batch-metadata validation gaps, including transactional safety.
3. Add effective coverage and scale fixtures before materially expanding Appearance or Clothing data.
4. Build the deep migration workbench and review-first import flow.
5. Improve studio explainability, scenario presets, reroll comparison, and analytics.

This order keeps data expansion reversible and makes the coverage numbers trustworthy before they become a major UI feature.

## Scheduled review specification

Requested cadence: every 120 minutes, every day, using London local time (`Europe/London`, including daylight-saving transitions).

Each run should:

- read all repository Markdown files for current context, audits, tests, and progress;
- run the documented tests, validation, health, and coverage checks;
- report live errors and warnings separately from intentional coverage backlog;
- update this review/planning Markdown file with findings and new feature ideas;
- never modify application code, JSON data, schemas, registry definitions, or configuration;
- stay quiet when nothing materially changed, and notify only for a new error, warning, meaningful progress change, or required decision.

