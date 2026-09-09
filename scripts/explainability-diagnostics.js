import { readFile } from "node:fs/promises";
import { generatePersona } from "../src/generator.js";
import { decisionTrace, inspectableFields } from "../src/decision-inspector.js";
import { affectedBy } from "../src/dependency-engine.js";

const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
const library = {};
for (const [key, path] of Object.entries(paths)) library[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
library.versions = { schema: "2.0", data: "0.4.0" };
const samples = Number(process.argv[2] || 100);
const result = { samples, eligible_fields: 0, source_identified: 0, selection_identified: 0, dependency_available: 0, state_available: 0, deterministic_failures: 0, mutation_failures: 0, unsupported_causality: 0, fields: {} };
for (let i = 0; i < samples; i++) {
  const persona = generatePersona(library, { seed: `explainability-${i}`, mode: ["grounded", "varied", "chaotic"][i % 3] }); const before = JSON.stringify(persona);
  for (const field of inspectableFields(persona)) {
    const trace = decisionTrace(library, persona, field); const repeat = decisionTrace(library, persona, field); result.eligible_fields++;
    result.source_identified += Number(!trace.source.unavailable); result.selection_identified += Number(Boolean(trace.selection)); result.dependency_available += Number(Boolean(trace.dependencies)); result.state_available += Number(Boolean(trace.state)); result.deterministic_failures += Number(JSON.stringify(trace) !== JSON.stringify(repeat));
    const key = trace.source.catalogue || "derived"; result.fields[key] = (result.fields[key] || 0) + 1;
    result.unsupported_causality += Number(/personality.*appearance|country.*personality|occupation.*personality|flaw.*expression/i.test(JSON.stringify(trace)));
  }
  result.mutation_failures += Number(JSON.stringify(persona) !== before);
}
console.log(JSON.stringify(result, null, 2));
