import { readFile } from "node:fs/promises";
import { generatePersona } from "../src/generator.js";
import { projectVisual, serializeVisualProjection, VISUAL_MODES } from "../src/visual-projection.js";

const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
const samples = Number(process.argv[2] || 1000);
const library = {};
for (const [key, path] of Object.entries(paths)) library[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
library.versions = { schema: "2.0", data: "0.4.0" };

const count = (map, key) => map.set(key, (map.get(key) || 0) + 1);
const topShare = (map, total) => Math.max(0, ...map.values()) / total;
const result = { samples, modes: {}, identity_consistency: { checked: 0, failures: 0 }, contextual_variation: { checked: 0, average_unique_wardrobes: 0, average_unique_environments: 0, average_unique_activities: 0 } };
for (const mode of VISUAL_MODES) {
  const environments = new Map(), wardrobes = new Map(), activities = new Map();
  let promptLength = 0, componentCount = 0, suppressed = 0, occupationLeakage = 0, hobbyLeakage = 0, narrativeLeakage = 0, occupationInclusion = 0, hobbyInclusion = 0, housingInclusion = 0, residenceInclusion = 0;
  for (let i = 0; i < samples; i++) {
    const persona = generatePersona(library, { seed: `visual-${mode}-${i}`, mode: "varied" });
    const projection = projectVisual(persona, mode);
    const prompt = serializeVisualProjection(projection);
    count(environments, projection.environment); count(wardrobes, projection.wardrobe); count(activities, projection.activity || "none");
    promptLength += prompt.length; componentCount += prompt.split("\n").length; suppressed += projection.relevance.suppressed.length;
    if (["reference", "portrait", "full_body"].includes(mode)) {
      occupationLeakage += Number(projection.context.occupation !== undefined);
      hobbyLeakage += Number(projection.context.hobby !== undefined);
      narrativeLeakage += Number(projection.context.scene_hook !== undefined);
    }
    housingInclusion += Number(projection.context.housing !== undefined);
    residenceInclusion += Number(projection.context.residence !== undefined);
    occupationInclusion += Number(projection.context.occupation !== undefined);
    hobbyInclusion += Number(projection.context.hobby !== undefined);
  }
  result.modes[mode] = { environment_distribution: Object.fromEntries(environments), wardrobe_distribution: Object.fromEntries(wardrobes), activity_distribution: Object.fromEntries(activities), dominance: { environment_top_share: topShare(environments, samples), wardrobe_top_share: topShare(wardrobes, samples), activity_top_share: topShare(activities, samples) }, average_prompt_length: promptLength / samples, average_component_count: componentCount / samples, average_suppressed_field_count: suppressed / samples, relevance_inclusion: { occupation: occupationInclusion / samples, hobby: hobbyInclusion / samples, narrative: narrativeLeakage / samples, housing: housingInclusion / samples, residence: residenceInclusion / samples }, relevance_leakage: { occupation: occupationLeakage / samples, hobby: hobbyLeakage / samples, narrative: narrativeLeakage / samples } };
}
for (let i = 0; i < samples; i++) {
  const persona = generatePersona(library, { seed: `visual-consistency-${i}`, mode: "varied" });
  const base = projectVisual(persona, "reference").subject;
  const projections = VISUAL_MODES.map((mode) => projectVisual(persona, mode));
  result.contextual_variation.checked++;
  result.contextual_variation.average_unique_wardrobes += new Set(projections.map((projection) => projection.wardrobe)).size;
  result.contextual_variation.average_unique_environments += new Set(projections.map((projection) => projection.environment)).size;
  result.contextual_variation.average_unique_activities += new Set(projections.map((projection) => projection.activity || "none")).size;
  for (const mode of VISUAL_MODES) {
    result.identity_consistency.checked++;
    const subject = projectVisual(persona, mode).subject;
    if (JSON.stringify(subject) !== JSON.stringify(base)) result.identity_consistency.failures++;
  }
}
for (const key of ["average_unique_wardrobes", "average_unique_environments", "average_unique_activities"]) result.contextual_variation[key] /= samples;
console.log(JSON.stringify(result, null, 2));
