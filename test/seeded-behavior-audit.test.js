import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generatePersona } from "../src/generator.js";
import { markStale } from "../src/dependency-engine.js";

const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
async function library() { const result = {}; for (const [key, path] of Object.entries(paths)) result[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url))); result.versions = { schema: "1.0", data: "0.2.7" }; return result; }
const ids = (values) => new Set(values.map((value) => typeof value === "string" ? value : value?.id).filter(Boolean));

test("300 deterministic seeds retain breadth across all variance modes", async () => {
  const data = await library();
  const modes = ["grounded", "varied", "chaotic"];
  const results = Object.fromEntries(modes.map((mode) => [mode, Array.from({ length: 300 }, (_, seed) => generatePersona(data, { seed, mode }))]));
  for (const mode of modes) {
    const personas = results[mode];
    assert.ok(ids(personas.map((p) => p.origin.name)).size >= 40, `${mode} names collapsed`);
    assert.ok(ids(personas.map((p) => p.life.job)).size >= 8, `${mode} occupations collapsed`);
    assert.ok(ids(personas.map((p) => p.interests.hobbies[0])).size >= 8, `${mode} hobbies collapsed`);
    assert.ok(ids(personas.map((p) => p.foundation.species)).size >= 3, `${mode} species collapsed`);
  }
  assert.notDeepEqual(results.grounded.map((p) => p.life.job?.id), results.chaotic.map((p) => p.life.job?.id));
  assert.deepEqual(generatePersona(data, { seed: "repro", mode: "varied" }), generatePersona(data, { seed: "repro", mode: "varied" }));
});

test("anchored contexts shift occupations and hobbies without making them deterministic stereotypes", async () => {
  const data = await library();
  const sample = (setting) => Array.from({ length: 120 }, (_, seed) => generatePersona(data, { seed, mode: "varied", anchors: { setting } }));
  const modern = sample("modern"); const fantasy = sample("fantasy");
  const modernJobs = ids(modern.map((p) => p.life.job)); const fantasyJobs = ids(fantasy.map((p) => p.life.job));
  assert.notDeepEqual([...modernJobs].sort(), [...fantasyJobs].sort());
  assert.ok(modernJobs.size >= 5 && fantasyJobs.size >= 5);
  assert.ok(ids(modern.map((p) => p.interests.hobbies[0])).size >= 5);
  assert.ok(ids(fantasy.map((p) => p.interests.hobbies[0])).size >= 5);
});

test("locale changes mark downstream cultural and presentation fields stale", () => {
  const persona = { state: { locks: {}, stale_fields: [] } };
  markStale(persona, "foundation.locale");
  assert.ok(persona.state.stale_fields.includes("origin.name"));
  assert.ok(persona.state.stale_fields.includes("appearance.clothing_style"));
});

test("legacy persona shape remains loadable by generation consumers", async () => {
  const data = await library();
  const legacy = generatePersona(data, { seed: 7 });
  delete legacy.foundation.species_type; delete legacy.origin.structured_name; delete legacy.life.structured_occupation; delete legacy.interests.structured_hobby;
  assert.ok(legacy.foundation.species && legacy.origin.name && legacy.life.transport);
  assert.ok(generatePersona(data, { seed: 7 }).foundation.species);
});
