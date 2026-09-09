import { readFile } from "node:fs/promises";
import { generatePersona } from "../src/generator.js";
import { projectVisual, VISUAL_MODES } from "../src/visual-projection.js";
import { serializeVisual, VISUAL_TARGETS } from "../src/visual-adapters/index.js";

const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
const library = {};
for (const [key, path] of Object.entries(paths)) library[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
library.versions = { schema: "2.0", data: "0.4.0" };
const seeds = ["editorial-human-adult", "editorial-fantasy-young", "editorial-sf-mature", "editorial-grounded-older"];
const rows = [];
for (const seed of seeds) {
  const persona = generatePersona(library, { seed, mode: "varied" });
  for (const mode of VISUAL_MODES) {
    const projection = projectVisual(persona, mode);
    for (const target of VISUAL_TARGETS) rows.push({ seed, name: persona.origin.name, mode, target, prompt: serializeVisual(projection, target).slice(0, 420) });
  }
}
console.log(JSON.stringify({ samples: rows.length, rows }, null, 2));
