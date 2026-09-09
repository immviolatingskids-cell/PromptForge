# Character Intelligence programme

## Dependency and ownership plan

The existing canonical pipeline remains authoritative:

```text
catalogue data -> generatePersona -> PersonaController -> PersonaStore
                                              |
                                              v
                                  visual projection / references
                                              |
                                              v
                                project + scene contextual resolution
```

Wave 1 establishes three additive intelligence layers in parallel:

1. **Genre intelligence (v0.6.0)** owns the registry recipe model, dimensions,
   affinities, related genres, normalization, exclusions, and focused tests.
2. **Universal character library (v0.6.1)** owns reusable semantic relations
   between universal human concepts and focused tests. These relations remain
   independent of genre definitions.
3. **Reference intelligence foundation (v0.6.7)** owns typed purpose, strength,
   influence, package semantics, assembly, diagnostics, and focused tests while
   preserving the existing reference package API.
4. **Compatibility guardian** reviews the combined Wave 1 result for boundary,
   migration, determinism, duplication, and regression risks.

The lead owns all shared interfaces and integration work, including the canonical
persona model, `PersonaController`, `PersonaStore`, migration behavior,
`SceneStore`, `resolveScene`, `ProjectStore`, and cross-layer priority rules.

## Integration gates

Gate 1 requires review of each Wave 1 change, interface reconciliation, focused
and complete tests, catalogue validation, legacy and zero-genre coverage,
determinism checks, existing reference-package compatibility, and an updated
architecture document.

Wave 2 then introduces a lead-owned typed character-context model followed by
universal lifestyle/activity resolution. Its gate proves the priority contract:

```text
canonical fact / explicit character override
  > explicit scene requirement
  > project context
  > genre influence
  > universal/default affinity
```

Wave 3 upgrades scene intelligence using that contract, then adds bounded
current-life continuity with explicit persistence and lifecycle semantics.

Wave 4 exposes the integrated behavior through progressive disclosure in the
product shell. The final v0.6.9 audit covers architecture, compatibility,
determinism, migration, semantics, UI, accessibility, tests, and documentation.

## Compatibility invariants

- Genres are contextual influence and never canonical identity.
- Universal semantic data is not duplicated into genre recipes.
- Existing persona records and zero-genre personas remain loadable.
- Existing reference package entry points and output keys remain compatible.
- Seeded operations remain deterministic for identical normalized inputs.
- New persisted fields are additive and normalized on read.
- No catalogue or schema version changes occur without an explicit migration
  decision at an integration gate.
