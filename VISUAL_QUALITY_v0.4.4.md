# Visual Quality v0.4.4

Status: implementation in progress / quality pass recorded. The change keeps the existing projection and adapter boundaries; it adds deterministic composition decisions to the projection output.

## 1–5. Audit and quality model

The pre-change serializer was semantically ordered but flat: activities were mostly fixed labels, pose/camera were mode defaults, environment detail was often generic, and lighting was always “coherent natural lighting.” The quality model used here is deliberately heuristic: coherence, focus, composition, specificity, relevance, economy, variety, identity consistency, and observability.

## 6–12. Activity, pose, expression, wardrobe, accessories

Hobby and supported workplace activities now use compact deterministic action families keyed by the persona seed. Existing personas without a seed retain the prior first action for compatibility. Composition resolves task-aware body language, framing, and expression without deriving emotion from personality or flaws. Wardrobe remains sourced from the projection and is not replaced by occupational costume. Accessories remain optional and bounded.

## 13–17. Props, environments, scale, hierarchy

Hobby environments now provide small context-specific spaces such as ceramics workshops, garden beds, practical kitchens, and park paths. The environment remains one projection field, with the activity and camera establishing hierarchy. Identity/reference modes remain subject-dominant; environmental and contextual modes receive wider scene language.

## 18–24. Camera, lighting, palette

Camera composition now varies by mode and activity: readable reference, eye-level portrait, full-body silhouette, medium task framing, and wide environmental framing. Lighting is mode/context-aware, preserving facial readability for identity modes and practical light for workplaces/hobbies. No palette or camera-brand folklore was added.

## 25–31. Storytelling, economy, and token control

Activities are observable moments rather than abstract labels. Narrative source text remains converted into visible circumstances. Existing deduplication remains in the generic serializer. No quality-token spam or abstract psychology was introduced.

## 32–36. Target quality and parity

Generic remains the semantic baseline. ChatGPT and Gemini continue to use natural prose; Niji remains compact and phrase-oriented. They consume the same enriched projection, so identity, activity, wardrobe, environment, camera, and lighting remain target-independent.

## 37–38. Thresholds and comparison

`scripts/visual-quality-diagnostics.js` reports transparent mode-level metrics and zero-value gates for identity-anchor loss, contradictions, and abstract leakage. Studio now offers an optional `Compare Targets` export containing one projection serialized for Generic, ChatGPT, Gemini, and Niji. A larger default side-by-side UI was not added to avoid clutter.

## 39–44. Diagnostics

The quality diagnostic reports average prompt length, distinct actions, distinct environments, distinct cameras, contradiction rate, identity failures, abstract leakage, and activity/pose mismatches per visual mode. It uses fixed seeds and can be run with `npm run diagnostics:visual-quality`.

## 45–46. Editorial and before/after review

The deterministic review command remains `npm run review:visual`. Before the pass, common weaknesses were fixed phrases and universal framing/light. After the pass, hobby/workplace samples show action families, task-compatible pose, activity-readable framing, and differentiated practical light. Reference/portrait outputs remain intentionally stable and restrained.

## 47–49. Studio, overrides, repair

The Studio projection inspector and locks/rerolls remain in place. Manual projection overrides are applied after composition resolution, so explicit user choices continue to win. Canonical data is never mutated to resolve scene presentation.

## 50. JavaScript tests

The suite includes composition/action determinism and compatibility coverage. Latest quality-pass run: 99/99 passing.

## 51–53. Repository gates

The v0.4.3 baseline remains Python 102/102, canonical validation 42/42, and health 0 errors / 22 warnings / 69 info. These gates must be rerun after the final correction.

## 54. Known limitations

Action families are intentionally compact rather than catalogue-sized. Environment variants remain heuristic and do not yet model every occupation/hobby taxonomy. Quality diagnostics are transparent heuristics, not subjective image-quality scores. No image-generation API or external model evaluation is used.

## Recommendation for v0.4.5

Add a small explicit projection `density` option and an editor-facing side-by-side target comparison panel only if further editorial review demonstrates a need; keep composition deterministic and upstream of all adapters.

## Final validation and visual review closure

Status: complete. No v0.4.5 implementation was started.

- JavaScript: 99/99 passing.
- Python: 102/102 passing.
- Canonical validation: 42/42 JSON files passed.
- Health: 0 errors / 22 warnings / 69 info. The warnings and info match the reviewed catalogue-quality baseline.
- Generation diagnostics: completed with no reported warnings and an empty coverage queue.
- Narrative diagnostics: 1,000 unique profiles in each variance mode; completed successfully.
- Visual diagnostics: 1,000 samples per mode; 8,000 cross-mode identity checks with 0 failures.
- Adapter diagnostics: all 8 modes × 4 targets deterministic, projection unchanged, and 0 missing components.
- Visual-quality diagnostics: 0 contradictions, 0 identity-anchor failures, 0 abstract leakage, and 0 activity/pose mismatches. Workplace produced 35 distinct actions and 53 environments; hobby produced 34 distinct actions and 6 environments.
- Editorial review: `review:visual` completed 800 projections with no automated findings. The fixed-seed `review:visual-samples` suite inspected 128 prompt samples across all modes and targets.

Editorial findings: reference, portrait, and full-body modes are intentionally concentrated around identity clarity; lifestyle and environmental modes vary primarily through contextual environments; workplace and hobby modes show the strongest action variance. Target prompts preserve all required semantic components. A duplication issue in shared adapter appearance grouping was found in the sample review and removed before closure.

Remaining weaknesses are bounded and evidence-backed: camera distributions remain intentionally concentrated by mode; narrative scenes still use a conservative observable circumstance template; database-sourced visual labels can be less editorial than hand-authored phrasing. No current regression or architectural failure warrants catalogue expansion.

Selected v0.4.5 direction: A — projection density / editorial UX. The quality gates show composition and semantic parity are stable, while the next useful improvement is user control over compact versus standard versus detailed prompt review/export. This is a recommendation only; no v0.4.5 work is included here.
