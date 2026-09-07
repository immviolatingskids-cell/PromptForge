import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { SeededRng } from "../src/seed-rng.js";
import { normalizeValueProfile, secondaryScore, selectValueProfile, tensionScore, valueProfileText } from "../src/value-profile.js";
import { affectedBy } from "../src/dependency-engine.js";

const values = JSON.parse(await fs.readFile(new URL("../data/personality/values.json", import.meta.url)));
const byId = Object.fromEntries(values.map((value) => [value.id, value]));
const context = { settings: [], eras: [], species: [], life_stages: [], countries: [] };

test("legacy values normalize without inventing roles", () => {
  assert.deepEqual(normalizeValueProfile(byId.independence), { primary: byId.independence, secondary: null, tension: null });
  assert.deepEqual(normalizeValueProfile([byId.loyalty]), { primary: byId.loyalty, secondary: null, tension: null });
});
test("value profiles are deterministic and contain distinct roles", () => {
  const left = selectValueProfile(values, context, new SeededRng("profile"), "varied", { valueCount: 3 });
  const right = selectValueProfile(values, context, new SeededRng("profile"), "varied", { valueCount: 3 });
  assert.deepEqual(left, right); assert.equal(new Set(Object.values(left.profile).map((value) => value.id)).size, 3);
});
test("secondary rejects duplicate clusters but permits distinct same-family values", () => {
  assert.equal(secondaryScore(byId.personal_freedom, byId.freedom, context), 0);
  assert.ok(secondaryScore(byId.self_reliance, byId.freedom, context) > 0);
});
test("tension scoring requires curated relationships and forbids self tension", () => {
  assert.ok(tensionScore(byId.stability, byId.independence, byId.family_loyalty, context) > 0);
  assert.equal(tensionScore(byId.compassion, byId.independence, byId.family_loyalty, context), 0);
  assert.equal(tensionScore(byId.independence, byId.independence, byId.family_loyalty, context), 0);
});
test("profile prose covers all depths without inventing an event", () => {
  assert.match(valueProfileText({ primary: byId.independence }), /matters deeply/);
  assert.match(valueProfileText({ primary: byId.curiosity, secondary: byId.compassion }), /alongside/);
  const text = valueProfileText({ primary: byId.independence, secondary: byId.family_loyalty, tension: byId.stability });
  assert.match(text, /can sometimes pull/); assert.doesNotMatch(text, /dispute|estranged|sacrifice|trauma/);
});
test("value role dependencies flow primary to secondary to tension", () => {
  assert.deepEqual(new Set(affectedBy("personality.values.primary")), new Set(["personality.values.secondary", "personality.values.tension", "narrative.integration"]));
  assert.deepEqual(affectedBy("personality.values.tension"), []);
});
test("curated relationships are valid, non-self, and symmetric", () => {
  for (const value of values) for (const target of value.metadata?.tension_with || []) {
    assert.ok(byId[target]); assert.notEqual(target, value.id);
    assert.ok(byId[target].metadata?.tension_with?.includes(value.id), `${value.id} <-> ${target}`);
  }
});
