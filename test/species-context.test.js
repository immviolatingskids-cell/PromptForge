import test from "node:test";
import assert from "node:assert/strict";
import { contextFromPersona, speciesTypeOf, filterCandidates } from "../src/context-engine.js";
import { affectedBy } from "../src/dependency-engine.js";

test("species resolves to a stable species type", () => {
  assert.equal(speciesTypeOf({ id: "species_android" }), "artificial");
  assert.deepEqual(contextFromPersona({ foundation: { species: { id: "species_android" } } }).species_types, ["artificial"]);
});

test("species type participates in compatibility filtering", () => {
  const entries = [
    { id: "synthetic", compatibility: { species_types: ["artificial"] } },
    { id: "organic", compatibility: { species_types: ["organic_humanoid"] } }
  ];
  assert.deepEqual(filterCandidates(entries, { species_types: ["artificial"] }).map((entry) => entry.id), ["synthetic"]);
});

test("species type changes invalidate species-dependent fields", () => {
  assert.ok(affectedBy("foundation.species_type").includes("appearance.visual"));
});
