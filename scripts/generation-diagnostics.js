import { mkdir, readFile, writeFile } from "node:fs/promises";
import { diagnoseGeneration } from "../src/generation-diagnostics.js";

const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
const args = process.argv.slice(2); const samplesAt = args.indexOf("--samples"); const samples = samplesAt >= 0 ? Number(args[samplesAt + 1]) : 300;
const library = {};
for (const [key, path] of Object.entries(paths)) library[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
library.versions = { schema: "1.3", data: "0.3.0" };
const report = diagnoseGeneration(library, { samples });
if (args.includes("--queue")) {
  const queueUrl = new URL("../.personaforge/population_queue.json", import.meta.url);
  await mkdir(new URL("../.personaforge/", import.meta.url), { recursive: true });
  let existing = []; try { existing = JSON.parse(await readFile(queueUrl)); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const definitions = {
    "identity/names/given_names": { category: "identity/names/given_names", current: library.givenNames.length, minimum: 20, healthy: 40, target: 80 },
    "identity/names/family_names": { category: "identity/names/family_names", current: library.familyNames.length, minimum: 15, healthy: 30, target: 60 },
    "identity/species_types": { category: "identity/species_types", current: library.speciesTypes.length, minimum: 10, healthy: 20, target: 40 },
    "lifestyle/occupations": { category: "lifestyle/occupations", current: library.occupations.length, minimum: 10, healthy: 20, target: 40 },
    "lifestyle/hobbies": { category: "lifestyle/hobbies", current: library.hobbies.length, minimum: 10, healthy: 20, target: 40 }
  };
  const diagnosticBranches = new Set(report.coverage_queue.map((item) => item.branch));
  existing = existing.filter((item) => !item.diagnostic_reason || diagnosticBranches.has(item.branch));
  for (const finding of report.coverage_queue) {
    const pool = definitions[finding.branch];
    const goalThreshold = Math.min(pool.target, Math.max(pool.healthy, pool.current + Math.max(5, Math.ceil(pool.current * 0.25))));
    const record = { kind: "legacy", branch: finding.branch, ...pool, subcategory: null, goal: "bring-to-healthy", goal_threshold: goalThreshold, diagnostic_reason: finding.reason, diagnostic_context: finding.context };
    const index = existing.findIndex((item) => item.branch === finding.branch);
    if (index >= 0 && existing[index].diagnostic_reason) existing[index] = record;
    else if (index < 0) existing.push(record);
  }
  await writeFile(queueUrl, `${JSON.stringify(existing, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));
