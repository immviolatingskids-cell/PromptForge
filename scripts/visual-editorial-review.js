import { readFile } from "node:fs/promises";
import { generatePersona } from "../src/generator.js";
import { checkVisualContradictions, projectVisual, serializeVisualProjection, VISUAL_MODES } from "../src/visual-projection.js";

const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
const samples = Number(process.argv[2] || 100);
const library = {};
for (const [key, path] of Object.entries(paths)) library[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
library.versions = { schema: "2.0", data: "0.4.0" };
const findings = [];
const abstract = /\b(reserved|ambitious|honest|loyal|struggling|work[- ]life balance|personality|values|flaw)\b/i;
for (let i = 0; i < samples; i++) for (const mode of VISUAL_MODES) {
  const projection = projectVisual(generatePersona(library, { seed: `editorial-${mode}-${i}`, mode: "varied" }), mode);
  const prompt = serializeVisualProjection(projection);
  if (prompt.includes("unspecified")) findings.push({ mode, type: "unspecified", sample: i });
  if (abstract.test(prompt)) findings.push({ mode, type: "abstract_psychology", sample: i });
  if (prompt.length > 800) findings.push({ mode, type: "prompt_bloat", sample: i, length: prompt.length });
  for (const issue of checkVisualContradictions(projection)) findings.push({ mode, type: "contradiction", sample: i, issue: issue.message });
}
const counts = Object.fromEntries([...new Set(findings.map((item) => item.type))].map((type) => [type, findings.filter((item) => item.type === type).length]));
console.log(JSON.stringify({ samples, projections: samples * VISUAL_MODES.length, counts, findings: findings.slice(0, 25) }, null, 2));
