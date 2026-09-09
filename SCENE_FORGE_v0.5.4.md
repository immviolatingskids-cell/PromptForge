# Scene Forge v0.5.4

Scene Forge turns project references into deterministic scene direction without changing canonical personas.

## Storage contract

Scenes use schema version 2 under `personaforge.scenes.v1`. They contain typed references to projects, personas, locations, casts, groups, and relationships; referenced records are never copied into a scene. Version 1 `characterRef` records migrate to `participantRefs` and `focusPersonaRef`, while `characterRef` remains a reference-only compatibility alias.

## Resolution contract

Explicit scene values take precedence over project context. Participant inheritance may be `project`, `explicit`, or `independent`; cast and group membership contribute references when selected. A relationship is evidence only when its record exists and both endpoints participate. Missing or unsupported references produce warnings or validation errors and never produce replacement facts.

The seed controls bounded hook selection. Output keeps the readable summary, structured reference package, source trace, visual projection, and negative guidance separate from persona identity.

## Portability

Browser snapshot import remaps scene IDs and every typed reference after collision-safe imports of personas, projects, casts, groups, relationships, and locations. JSON and Markdown scene exports are deterministic serializations of the stored scene package.
