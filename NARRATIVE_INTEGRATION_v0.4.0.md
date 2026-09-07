# PromptForge v0.4.0 — Narrative & Character Integration

## Architecture

Before v0.4.0, PromptForge selected a catalogue goal, secret, signature item, and a short derived character hook. Narrative was otherwise prose-adjacent and lacked source tracing. v0.4.0 retains those legacy fields and adds `narrative.integration`, a deterministic downstream projection of canonical character facts.

The layer distinguishes motivations (why), short/long goals (what), internal tensions (competing facts), external pressures (situational constraints), relationship hooks (interpersonal dynamics), arc seeds (possible change), and scene hooks (playable situations). Every element has a domain and source references. Prose remains derived and is never parsed back into canon.

## Composition and safety

The system uses a small set of structured compositional templates rather than a large prose catalogue. It combines values, flaws, daily rhythm, housing, occupation, and hobbies without treating any one source as destiny. Grounded, varied, and chaotic modes adjust conflict probability/intensity but never introduce trauma or extreme content. Want/need was deliberately omitted to avoid moralizing inferred growth.

## Dependencies and compatibility

Narrative integration is downstream of relevant values, flaw, occupation, housing, and hobbies. Locks and stale-state handling therefore work through the existing controller. Legacy loading does not fabricate narrative integration. Visual reference prompts remain separate; `roleplayPackage()` exposes current goal, tension, pressure, relationship hook, and scene hook.

## Diagnostics and coverage

`npm run diagnostics:narrative` generates 1,000 fixed-seed personas per variance mode and reports unique profiles, goal/domain concentration, and source-system distribution. Each mode produced 1,000 unique narrative profiles. Top-goal share was 9% in all modes; top-domain share was 16% grounded, 17% varied, and 16% chaotic after correcting an initially over-broad `personal` classification. Effective coverage is compositional rather than raw-entry count.

## Verification

Final verification: JavaScript 60/60 passed; Python 92/92 passed; canonical validation passed for 38/38 files; health reported 0 errors, 22 warnings, and 145 informational findings. The 22 warnings are the previously reviewed semantic overlaps, with no new actionable narrative warning. The general diagnostics completed at 300 samples per run and continue to flag name-pool concentration, not narrative concentration.

Known limitation: the UI does not yet expose each narrative sub-element as a dedicated control, though backend paths support locking/rerolling. Relationship hooks remain role-level dynamics rather than generated NPCs, and narrative templates intentionally cover ordinary pressures rather than mature/dramatic content.

Recommendation: proceed with v0.4.1 stabilization focused on richer diagnostics, UI controls, and editorial review before adding another major subsystem.
