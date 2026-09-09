import { readFile } from "node:fs/promises";
import { generatePersona } from "../src/generator.js";
import { projectVisual, VISUAL_MODES } from "../src/visual-projection.js";
import { serializeVisual, VISUAL_TARGETS } from "../src/visual-adapters/index.js";
const densities = ["compact", "standard", "detailed"];
const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
const library = {};
for (const [key, path] of Object.entries(paths)) library[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
library.versions = { schema: "2.0", data: "0.4.0" };
const result = { densities, modes: {}, targets: VISUAL_TARGETS, deterministic: true, projection_unchanged: true, identity_anchor_failures: 0, semantic_omissions: [] };
for (const mode of VISUAL_MODES) for (const target of VISUAL_TARGETS) {
  const projection = projectVisual(generatePersona(library, { seed: `density-${mode}`, mode: "varied" }), mode); const before = JSON.stringify(projection);
  const prompts = Object.fromEntries(densities.map(density => [density, serializeVisual(projection, target, { density })]));
  result.deterministic &&= densities.every(density => prompts[density] === serializeVisual(projection, target, { density })); result.projection_unchanged &&= before === JSON.stringify(projection);
  const anchors = [projection.subject.species, projection.subject.apparent_age].map(value => String(value).toLowerCase());
  result.identity_anchor_failures += densities.filter(density => anchors.some(anchor => !prompts[density].toLowerCase().includes(anchor))).length;
  for (const field of ["wardrobe", "environment", "camera", "lighting"]) if (projection[field] && densities.some(density => !prompts[density].toLowerCase().includes(String(projection[field]).toLowerCase()))) result.semantic_omissions.push({ mode, target, field });
  result.modes[`${mode}:${target}`] = Object.fromEntries(densities.map(density => [density, { length: prompts[density].length, components: prompts[density].split(/\n|\|/).length }]));
}
console.log(JSON.stringify(result, null, 2));
