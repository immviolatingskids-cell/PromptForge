import { readFile } from "node:fs/promises";
import { generatePersona } from "../src/generator.js";
import { projectVisual, VISUAL_MODES } from "../src/visual-projection.js";
import { serializeVisual, VISUAL_TARGETS } from "../src/visual-adapters/index.js";
import { values } from "../src/visual-adapters/shared.js";

const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
const library = {};
for (const [key, path] of Object.entries(paths)) library[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
library.versions = { schema: "2.0", data: "0.4.0" };
const result = { modes: {}, targets: VISUAL_TARGETS, deterministic: true, projection_unchanged: true, missing_components: [] };
for (const mode of VISUAL_MODES) for (const target of VISUAL_TARGETS) {
  const persona = generatePersona(library, { seed: `adapter-${mode}`, mode: "varied" });
  const projection = projectVisual(persona, mode); const before = JSON.stringify(projection);
  const first = serializeVisual(projection, target, { style: "structured" });
  const second = serializeVisual(projection, target, { style: "structured" });
  result.deterministic &&= first === second; result.projection_unchanged &&= before === JSON.stringify(projection);
  const required = ["subject", "appearance", "wardrobe", "environment", "camera", "lighting"].filter(key => {
    if (!projection[key]) return false;
    return target === "generic" ? !first.toLowerCase().includes(`${key}:`) : values(projection, key).some(value => !first.toLowerCase().includes(String(value).toLowerCase()));
  });
  if (required.length) result.missing_components.push({ mode, target, components: required });
  result.modes[`${mode}:${target}`] = { prompt_length: first.length, component_count: first.split(/\n|\|/).length, missing_components: required };
}
console.log(JSON.stringify(result, null, 2));
