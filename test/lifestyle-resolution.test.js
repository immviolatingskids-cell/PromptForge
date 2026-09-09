import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { normalizePersona } from "../src/persona-store.js";
import { lifestyleCandidateLayers, resolveLifestyleContext } from "../src/lifestyle-resolution.js";

async function catalogue(path) {
  return JSON.parse(await fs.readFile(new URL(`../data/${path}.json`, import.meta.url)));
}

async function library() {
  const [hobbies, traits, occupations] = await Promise.all([
    catalogue("lifestyle/hobbies"), catalogue("personality/traits"), catalogue("lifestyle/occupations")
  ]);
  return { hobbies, traits, occupations };
}

function character() {
  return normalizePersona({
    meta: { persona_id: "maya", seed: "maya" },
    foundation: { age: 27, species: { id: "human", name: "Human" } },
    origin: { name: "Maya Chen" },
    personality: { core: { id: "observant", name: "Observant" }, complementary: [], values: [] },
    life: { job: { id: "photographer", name: "Photographer" }, work_environment: "studio", work_arrangement: "mobile", daily_rhythm: "flexible_project_rhythm" },
    interests: { hobbies: [{ id: "photography", name: "Photography", commitment: "regular" }] },
    appearance: { visual: {}, signature_outfit: { id: "field_layers", name: "Practical field layers" } },
    style_profile: { genres: [{ id: "streetwear", weight: 1 }], exclusions: [] },
    extensions: { promptforge: { characterIntelligence: { preferences: [], affinities: [], exclusions: [] } } },
    state: {}
  });
}

test("photography resolves through reusable activity, environment, prop, and lifestyle relations", async () => {
  const result = resolveLifestyleContext({ library: await library(), persona: character(), seed: "photo-day" });
  assert.ok(result.universal.activity.includes("photography"));
  assert.ok(result.universal.environment);
  assert.ok(result.universal.props.length > 0);
  assert.ok(result.universal.lifestyle);
  assert.equal(result.version, 1);
});

test("scene and project layers precede genre and universal suggestions", async () => {
  const data = await library();
  const persona = character();
  const explicit = resolveLifestyleContext({ library: data, persona, scene: { activity: "taking a portrait", location: "canal bridge" }, project: { locations: ["shared studio"] }, seed: "priority" });
  assert.equal(explicit.activity, "taking a portrait");
  assert.equal(explicit.environment, "canal bridge");
  const project = resolveLifestyleContext({ library: data, persona, scene: {}, project: { locations: ["shared studio"] }, seed: "priority" });
  assert.equal(project.environment, "shared studio");
  assert.equal(project.sources.environment, "project.location");
});

test("canonical wardrobe remains character truth above contextual styling", async () => {
  const result = resolveLifestyleContext({
    library: await library(), persona: character(), scene: { requirements: { wardrobe: "formal evening dress" } }, seed: "wardrobe"
  });
  assert.equal(result.wardrobe, "Practical field layers");
  assert.equal(result.decisions.wardrobe.selected.kind, "canonical_fact");
});

test("character exclusions suppress conflicting scene and genre suggestions", async () => {
  const persona = character();
  persona.extensions.promptforge.characterIntelligence.exclusions = [{ domain: "activity", value: "meeting friends" }];
  const result = resolveLifestyleContext({ library: await library(), persona, scene: { activity: "meeting friends" }, seed: "exclude" });
  assert.notEqual(result.activity, "meeting friends");
  assert.ok(result.decisions.activity.suppressed.some(item => item.candidate.source === "scene.activity"));
});

test("candidate assembly is deterministic and does not mutate inputs", async () => {
  const data = await library();
  const persona = character();
  const before = structuredClone(persona);
  const input = { library: data, persona, scene: {}, project: null, seed: "repeat" };
  assert.deepEqual(lifestyleCandidateLayers(input), lifestyleCandidateLayers(input));
  assert.deepEqual(resolveLifestyleContext(input), resolveLifestyleContext(input));
  assert.deepEqual(persona, before);
});
