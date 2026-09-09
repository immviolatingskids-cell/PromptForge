# PromptForge motion, interaction, and UX polish audit

Date: 9 September 2026

## Scope and approach

This pass progressively enhances the existing PromptForge interface. It does not change routing, stored schemas, generation algorithms, deterministic RNG, lock semantics, project references, or the product's visual identity. The guiding principle is **quiet while browsing, alive while creating**.

## Motion system

`studio-overhaul.css` now owns reusable motion tokens:

- Timings: `--motion-instant` (100ms), `--motion-fast` (160ms), `--motion-ui` (220ms), `--motion-panel` (300ms), `--motion-generate` (550ms), and `--motion-ambient` (10s).
- Easing: `--ease-ui`, `--ease-enter`, and `--ease-exit`.
- Motion primarily uses opacity and transforms. The generation highlight is short-lived and no continuous DOM animation runs while idle.
- The existing global `prefers-reduced-motion` override remains in force. The JavaScript presentation controller also checks that preference and removes staged delays from generation feedback.

## Interaction patterns added

- Buttons receive consistent hover elevation, press compression, focus, disabled, busy, and temporary success feedback.
- Normal cards, library cards, and Forge panels share restrained level-1 to level-2 elevation.
- The primary rail uses one measured active indicator that translates between routes.
- Persona generation presents a brief assembling state, an accent-energy pass, grouped section reveals, completion feedback, and a toast. The real persona is generated synchronously first; reveal effects never insert fake values.
- Field and section rerolls reuse the existing controller, then animate the rendered value. Locked rows remain visually stable and have a persistent selected treatment.
- Seed controls add randomise and copy actions. Randomisation scrambles only the input's presentation before settling on the actual new seed; generation determinism is untouched.
- A reusable non-modal, stacked, dismissible, live-region toast surface reports save, copy, export, reroll, seed, and generation outcomes.
- A compact contextual action bar appears only when a persona exists and delegates to the existing controls.

## Inspector and dependency explanation

At narrower desktop/tablet widths, the Inspector becomes a right-side utility drawer with an explicit trigger, close control, slide/fade motion, focus handoff, and `aria-expanded` state. It remains a permanent utility column on wide screens.

The Decision Inspector is titled “Why this result?” and renders connector rows from existing decision-trace context or direct dependency metadata. When the engine did not record causal data, it explicitly says so. No causal relationship is inferred or invented.

## Command palette

Ctrl/Cmd+K opens a native-dialog command palette. It supports text filtering, Arrow Up/Down selection, Enter execution, Escape dismissal, mouse/touch selection, visible selected state, and a labelled listbox. Commands delegate to existing actions for generation, reroll, save, library, projects, Pool Editor, Inspector, copy, Markdown/TXT export, and visual reroll. No third-party dependency was added.

## Persona Library

Search, collection filters, sort, metadata filters, and existing card actions are preserved. A user-selectable compact layout improves scanning larger libraries; standard cards remain the default. Quick actions stay visible rather than hover-only, so touch and keyboard users retain equivalent access.

## Accessibility

- All new icon buttons have accessible labels and tooltips where appropriate.
- Toasts use polite status announcements (errors use alerts) and can be dismissed manually.
- Lock buttons expose pressed state, while text and persistent styling communicate the same state without motion.
- The command palette uses a labelled dialog, search field, listbox/options, selected state, and keyboard navigation.
- Focus-visible styling remains high contrast. The Inspector trigger and close path preserve focus.
- Reduced motion disables animation and JavaScript sequencing delays.

## Responsive verification

The Inspector changes to an overlay drawer at 1250px and below. At mobile sizes the contextual action bar scrolls horizontally, toasts sit above the bottom navigation, the command palette remains viewport-bounded, dependency rows use balanced narrow columns, and all hover enhancements have persistent touch/keyboard equivalents. Existing mobile navigation and form stacking are preserved.

## Performance considerations

The pass adds no animation library, canvas, WebGL, continuous timers, or expensive layout loop. The navigation indicator is measured only on route/current-item changes and resize. Generation and seed timers are bounded and short. Visual effects use transforms, opacity, border colour, and modest shadows; blur is limited to the modal backdrop and a short value transition.

## Validation performed

- JavaScript suite without the timing benchmark: 219 tests passed, including the new motion/accessibility contract tests.
- Full `npm test`: 219 passed; the pre-existing `project-performance.test.js` timing assertion missed its two-second host ceiling (about 4.0 seconds). It has no presentation-layer dependency and reported no functional assertion failure.
- `python -m unittest discover -s tests -v`: 103 tests passed.
- `python -m populator.main validate`: 42 canonical JSON files passed.
- `node --check src/app.js` and `node --check src/motion-ui.js`: passed.
- Live browser pass: same-seed UI generation produced identical output; a locked field remained stable through Reroll Unlocked; command palette keyboard open/filter/execute worked; dependency traces rendered and unavailable evidence degraded honestly; compact Persona Library mode rendered existing records; no console errors were reported; no document-level horizontal overflow was present at the live desktop viewport.

## Known limitations

- The dependency visualizer can only be as detailed as existing decision-trace metadata. Derived or legacy fields may show the explicit unavailable state.
- The Inspector is a drawer below 1250px rather than at all widths; a fixed wide-screen column remains faster for power users and matches the existing studio structure.
- Library gallery thumbnails are not added because saved personas do not currently guarantee image assets. Card and compact-list modes provide useful density without fabricating imagery or changing the data model.
