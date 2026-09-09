import { readFile } from "node:fs/promises";
import { generatePersona } from "../src/generator.js";
import { projectVisual, VISUAL_MODES, checkVisualContradictions } from "../src/visual-projection.js";
import { serializeVisual, VISUAL_TARGETS } from "../src/visual-adapters/index.js";

const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
const samples = Number(process.argv[2] || 100);
const library = {};
for (const [key, path] of Object.entries(paths)) library[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
library.versions = { schema: "2.0", data: "0.4.0" };
const result = { samples, quality_dimensions: ["coherence", "focus", "composition", "specificity", "relevance", "economy", "variety", "identity_consistency", "observability"], modes: {}, targets: VISUAL_TARGETS, thresholds: { identity_anchor_failures: 0, contradiction_rate: 0, abstract_leakage: 0 } };
for (const mode of VISUAL_MODES) {
  const actions = new Set(), environments = new Set(), cameras = new Set(); let promptLength = 0, contradictions = 0, abstractLeakage = 0, identityFailures = 0, poseMismatches = 0;
  for (let i = 0; i < samples; i++) {
    const persona = generatePersona(library, { seed: `quality-${mode}-${i}`, mode: "varied" }); const projection = projectVisual(persona, mode); const prompt = serializeVisual(projection, "generic");
    actions.add(projection.activity || "none"); environments.add(projection.environment); cameras.add(projection.camera); promptLength += prompt.length;
    contradictions += checkVisualContradictions(projection).length;
    identityFailures += Number(!projection.subject?.species || !projection.subject?.apparent_age);
    abstractLeakage += Number(/ambition|exhaustion|personality|motivation|tension/i.test(`${projection.activity} ${projection.environment}`));
    poseMismatches += Number(/running|mid-stride/.test(projection.activity || "") && /seated|desk-bound/.test(projection.pose || ""));
  }
  result.modes[mode] = { average_prompt_length: Math.round(promptLength / samples), distinct_actions: actions.size, distinct_environments: environments.size, distinct_cameras: cameras.size, contradiction_rate: contradictions / samples, identity_anchor_failures: identityFailures, abstract_leakage: abstractLeakage, activity_pose_mismatches: poseMismatches };
}
console.log(JSON.stringify(result, null, 2));
