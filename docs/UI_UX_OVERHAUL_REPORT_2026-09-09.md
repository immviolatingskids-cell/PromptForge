# PromptForge Website UI/UX Overhaul Report

Date: 2026-09-09
Scope: presentation layer only

## 1. Initial UX audit

The live site and source were reviewed before implementation across Home, Characters, Scenes, Projects, Genres, Library, PersonaForge, Control Centre, Pool Editor, Preferences, Appearance, Presets, Activity, Data & Backup, Diagnostics, and About.

The creator-facing product shell already provided a strong start: clear page titles, useful empty states, compact visual identity marks, and direct creation routes. The experience still split into three visual dialects. Home and resource pages used a pink/violet creative language; PersonaForge retained an older lime/graphite dashboard treatment; Control Centre used a uniform card grid. This made one product feel like several adjacent tools.

Key issues recorded before implementation:

- PersonaForge gave foundation inputs, generated character content, and technical context almost equal visual weight.
- The character name was present but did not sufficiently anchor the workspace.
- Advanced controls dominated the top bar and permanent right rail.
- Studio tabs and phase controls appeared as two competing navigation systems.
- Control Centre treated status, actions, health, content, and system information as equivalent cards.
- The dashboard used a simple repeated grid, leaving large-screen composition feeling accidental.
- Control Centre navigation was a flat list of eleven destinations.
- The product's pink/violet identity disappeared in the older PersonaForge surface.
- Technical labels were sometimes presented before creative intent.
- Narrow layouts relied primarily on stacking, with the primary rail still consuming scarce horizontal space.

No proposed audit recommendation required generation, schema, pool, project-model, persistence, or API changes. Any idea that would have required those changes was excluded.

## 2. Design principles adopted

1. Character before machinery: canonical identity and creative phases lead PersonaForge.
2. One product, two modes: Studio is expressive; Forge is technical; both share tokens and interaction rules.
3. Accent with meaning: pink marks creative/current context, violet marks active workstation actions, green marks health, and amber marks warnings or stale state.
4. Fewer equal boxes: prominent content can use canvas space, borders, or a single edge accent instead of another full card.
5. Progressive density: creator views remain spacious while inspection and maintenance views retain useful technical density.
6. Responsive recomposition: navigation changes location and grids change meaningfully instead of merely shrinking.

## 3. Design-system changes

`studio-overhaul.css` adds a shared presentation layer with reusable tokens for canvas and surface layers, subtle and strong borders, three text levels, semantic accents, spacing, radii, elevation, control sizing, focus treatment, and interaction timing.

The implementation unifies:

- dark canvas and elevated surface hierarchy;
- violet/pink creative identity;
- green, amber, and red semantic states;
- 42px standard control targets;
- visible three-pixel keyboard focus rings;
- restrained hover/press feedback;
- reduced-motion handling;
- consistent typography and radius treatment.

## 4. Navigation changes

The global rail now names the two technical destinations `Forge` and `PersonaForge`, preserving the established product concepts while making their relationship clearer. A subtle Creative/Forge visual division reinforces the mental model.

Control Centre navigation is grouped into Workspace, Personalise, and System sections. At tablet and mobile widths, the global rail becomes a bottom navigation bar so the content canvas receives the full width.

## 5. Control Centre changes

### Before

The overview was a repeated three-column card grid. Welcome, health, totals, actions, coverage, presets, activity, and version information had similar visual weight.

### After

The overview uses named responsive grid areas. The welcome workspace is the visual anchor; Forge health and Quick actions form dedicated workstation columns; At a glance is quieter system context; Coverage watch spans the dashboard; supporting content forms a lower operational row.

Explicit eyebrow labels—Workstation, Status, Action, System, Health, Activity, Content—make information type scannable without relying on colour alone. Quick actions use a clear vertical command stack, with persona generation as the primary action.

## 6. Studio changes

The general creative shell remains intact because it already expressed the intended product direction. Shared tokens, navigation language, responsive behavior, and focus treatment now connect it to PersonaForge and Forge Internals.

## 7. PersonaForge changes

### Before

PersonaForge opened with an engineering label, the same visual dialect as system tooling, a dense top action row, bordered phase and tab bars, and three competing columns. The inspector headline was simply Context, which did not communicate its role as advanced tooling.

### After

The header now frames the task as `Shape a character` and explains that generation machinery remains available. `Your character` and the canonical name form the strongest workspace anchor. Creative phases use an editorial underline instead of a boxed control, while detailed output tabs use a quieter segmented surface.

Foundation is reframed as `Creative anchors / Starting point`. The right rail is explicitly `Power controls / Inspector`, with seeds, locks, dependencies, and technical context described as secondary tooling. Generated cards use a quieter surface until opened; expanded sections gain elevation and a violet edge. The narrative summary uses a single pink edge rather than another full bordered card.

All Generate, Reroll Unlocked, Save Persona, locks, field rerolls, alternatives, inspection, output, library, and project controls retain their original IDs and event paths.

## 8. Responsive changes

- 1900px and above: PersonaForge can use three character-card columns and Control Centre expands to a four-track workstation composition.
- 1250px and below: PersonaForge's inspector moves below the creative workspace; Control Centre becomes a two-column semantic grid.
- 900px and below: the global rail becomes bottom navigation; PersonaForge foundations become a compact two-column form; shells no longer reserve left-rail width.
- 680px and below: the foundation form becomes one column, tabs remain horizontally operable, field controls stack, and Generate Persona becomes the full-width primary action.

Rendered checks at 1440, 768, and 390 pixels found no document-level horizontal overflow on any major route. CSS also includes wide-canvas behavior for 1920/2560-class screens.

## 9. Accessibility improvements

- Added semantic `aria-label` descriptions to foundations, character workspace, and power-control regions.
- Changed Control Centre's navigation label to describe its Forge-management purpose.
- Preserved semantic headings, native controls, live status regions, and keyboard-operable details.
- Increased standard control height and maintained responsive touch access.
- Strengthened keyboard focus visibility.
- Ensured state labels accompany colour semantics.
- Preserved and strengthened `prefers-reduced-motion` behavior.

## 10. Reusable components introduced

The work consolidates shared visual primitives through CSS rather than adding an unrelated component framework: canvas/surface layers, semantic cards, status badges, action stacks, phase navigation, tab surfaces, focus states, form controls, empty states, progress bars, and responsive navigation.

## 11. Existing functionality verified

The existing routing and event wiring were preserved. Browser review loaded all major routes without console errors: Home, Characters, Scenes, Projects, Genres, Library, PersonaForge, Control Centre, Pool Editor, Preferences, Appearance, Presets, Activity, Data & Backup, Diagnostics, and About.

Existing IDs, form names, data attributes, storage bridges, and action handlers were retained. No capability was removed.

## 12. Tests performed

- `python -m unittest discover -s tests -v`: 103 tests passed.
- `python -m populator.main validate`: 42 canonical JSON files passed validation.
- JavaScript suite excluding the timing benchmark: 216 tests passed.
- `test/project-performance.test.js`: timing assertion failed at 3.8–4.5 seconds against its 2-second ceiling on this host. This benchmark does not load or exercise the changed HTML/CSS/view markup; no functional assertion failed.
- Browser console audit: zero errors across fourteen representative routes.
- Browser overflow audit: no document-level horizontal overflow at 1440, 768, or 390 pixels across all major routes.
- Rendered visual review: PersonaForge desktop/mobile and Control Centre desktop were inspected after implementation.

## 13. Known visual/UX limitations

- PersonaForge remains intrinsically dense when many generated sections are expanded; this preserves the full existing field-level capability.
- The inspector moves inline below 1250px rather than becoming a JavaScript drawer. This avoids introducing new display-state or interaction complexity in a presentation-only release.
- The global bottom navigation contains eight destinations on very narrow screens; labels are intentionally compact, but a future presentation-only pass could offer an accessible overflow menu.
- Control Centre remains dependent on the local hub connection for live health content; its disconnected state is intentionally preserved.
- Automated pixel-diff baselines are not part of the current test setup.

## 14. Core/domain behavior confirmation

No generation algorithm, randomisation behavior, seed behavior, pool, registry, schema, data catalogue, compatibility rule, PersonaForge domain model, scene logic, relationship logic, location logic, prompt assembly, project model, persistence semantic, API, migration, or deterministic output behavior was changed.

Modified runtime files are limited to HTML presentation, CSS presentation, Control Centre view composition/copy, and module cache-version query strings. Core/domain behavior remains authoritative and unchanged.
