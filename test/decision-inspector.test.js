import test from "node:test";
import assert from "node:assert/strict";
import { generatePersona } from "../src/generator.js";
import { decisionTrace, decisionSummary } from "../src/decision-inspector.js";

const library = {};
const paths = { settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", regions:"core/regions", locales:"core/locales", species:"identity/species", speciesTypes:"identity/species_types", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions" };
for (const [key, path] of Object.entries(paths)) library[key] = JSON.parse(await (await import("node:fs/promises")).readFile(new URL(`../data/${path}.json`, import.meta.url)));
library.versions = { schema: "2.0", data: "0.4.0" };

test("decision trace is deterministic, factual, and non-mutating", () => {
  const persona = generatePersona(library, { seed: "inspectable", mode: "varied" });
  const before = structuredClone(persona);
  const first = decisionTrace(library, persona, "life.job");
  const second = decisionTrace(library, persona, "life.job");
  assert.deepEqual(first, second);
  assert.deepEqual(persona, before);
  assert.equal(first.source.catalogue, "occupations");
  assert.equal(first.selection.deterministic, true);
  assert.match(decisionSummary(first), /catalogue|Compatible|context/i);
});

test("derived and unavailable history are explicit", () => {
  const persona = generatePersona(library, { seed: "legacy-inspect", mode: "varied" });
  const trace = decisionTrace(library, persona, "narrative.integration");
  assert.equal(trace.selection, "Derived or unavailable");
  assert.match(decisionSummary(trace), /derived|unavailable/i);
});

test("lock and stale state are reported without changing dependency truth", () => {
  const persona = generatePersona(library, { seed: "state-inspect", mode: "varied" });
  persona.state.locks["life.job"] = true;
  persona.state.stale_fields.push("life.job");
  const trace = decisionTrace(library, persona, "life.job");
  assert.equal(trace.state.locked, true);
  assert.equal(trace.state.stale, true);
  assert.ok(trace.dependencies.downstream.includes("life.work_environment"));
});
