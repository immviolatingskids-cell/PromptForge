import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseGeneration } from "../src/generation-diagnostics.js";
import { readFile } from "node:fs/promises";

const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
test("batch diagnostics report modes, contextual slices, and an actionable queue", async () => {
  const library = {}; for (const [key, path] of Object.entries(paths)) library[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
  const report = diagnoseGeneration(library, { samples: 40 });
  assert.deepEqual(Object.keys(report.modes), ["grounded", "varied", "chaotic"]);
  assert.equal(report.slices.length, library.settings.length);
  assert.ok(report.slices.every((slice) => slice.occupations.unique > 1 && slice.hobbies.unique > 1));
  assert.ok(report.coverage_queue.every((item) => item.branch && item.reason));
});
