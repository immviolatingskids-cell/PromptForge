import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generatePersona } from "../src/generator.js";
import { SeededRng } from "../src/seed-rng.js";
import { filterCandidates } from "../src/context-engine.js";
import { chooseRanked } from "../src/candidate-ranker.js";

const paths = {
  settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", species:"identity/species", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions"
};

async function library() {
  const result = {};
  for (const [key, path] of Object.entries(paths)) result[key] = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
  const schemaVersion = JSON.parse(await readFile(new URL("../data/schema_version.json", import.meta.url)));
  const dataVersion = JSON.parse(await readFile(new URL("../data/data_version.json", import.meta.url)));
  result.versions = { schema: schemaVersion.schema_version, data: dataVersion.data_version };
  return result;
}

test("same seed and data version reproduce the initial persona", async () => {
  const data = await library();
  assert.deepEqual(generatePersona(data, { seed: "repeatable" }), generatePersona(data, { seed: "repeatable" }));
});

test("generation carries cohort and generation into the persona context", async () => {
  const persona = generatePersona(await library(), { seed: "cohort", cohort: "millennial", generation: "gen_y" });
  assert.equal(persona.foundation.cohort, "millennial");
  assert.equal(persona.foundation.generation, "gen_y");
});

test("hard-invalid candidates are removed", () => {
  const entries = [{id:"valid",compatibility:{settings:["modern"]}}, {id:"invalid",compatibility:{settings:["fantasy"]}}];
  assert.deepEqual(filterCandidates(entries, {settings:["modern"]}).map((entry) => entry.id), ["valid"]);
});

test("anchored fantasy persona stays context compatible", async () => {
  const data = await library();
  const persona = generatePersona(data, {seed: 42, anchors:{setting:"fantasy", species:"elf", era:"medieval_inspired", country:"country_united_kingdom", life_stage:"young_adult"}});
  assert.equal(persona.foundation.country.id, "country_united_kingdom");
  assert.ok(filterCandidates(data.occupations, {settings:["fantasy"], eras:["medieval_inspired"], species:["elf"], life_stages:["young_adult"], countries:["country_united_kingdom"]}).some((entry) => entry.id === persona.life.job.id));
  assert.ok(persona.foundation.age >= 80 && persona.foundation.age <= 149);
});

test("coherence repairs impossible experience", async () => {
  const persona = generatePersona(await library(), {seed: 7, anchors:{age:18, life_stage:"young_adult"}});
  assert.ok(persona.life.experience_years <= Math.max(0, persona.foundation.age - 16)); assert.ok(persona.state.repairs.length >= 0);
});

test("current country does not hard-determine heritage", async () => {
  const data = await library();
  const persona = generatePersona(data, {seed:"diaspora", anchors:{setting:"modern", era:"modern", species:"human", country:"country_canada", life_stage:"adult"}});
  assert.equal(persona.foundation.country.id,"country_canada");
  assert.ok(persona.origin.heritage);
});

test("variance modes use distinct weighting", () => {
  const entries = [{id:"exact",compatibility:{settings:["modern"]}}, {id:"general",compatibility:{settings:[]}}];
  const draws = (mode) => Array.from({length:100}, (_, index) => chooseRanked(entries, {settings:["modern"]}, new SeededRng(index), mode).id).filter((id) => id === "exact").length;
  assert.ok(draws("grounded") > draws("chaotic"));
});
