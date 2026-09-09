import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { normalizePersona } from "../src/persona-store.js";
import { SCENE_INTELLIGENCE_VERSION, resolveScene } from "../src/scene-resolver.js";

async function catalogue(path) {
  return JSON.parse(await fs.readFile(new URL(`../data/${path}.json`, import.meta.url)));
}

async function library() {
  const [hobbies, traits, occupations] = await Promise.all([
    catalogue("lifestyle/hobbies"), catalogue("personality/traits"), catalogue("lifestyle/occupations")
  ]);
  return { hobbies, traits, occupations };
}

function persona() {
  return normalizePersona({
    meta: { persona_id: "scene-maya", seed: "maya-scene" },
    foundation: { age: 29, life_stage: { id: "young_adult" }, species: { id: "human", name: "Human" } },
    origin: { name: "Maya Chen", current_location: "Manchester" },
    personality: { core: { id: "observant", name: "Observant" }, complementary: [], values: [] },
    life: { job: { id: "photographer", name: "Photographer" }, work_environment: "studio", daily_rhythm: "flexible_project_rhythm" },
    interests: { hobbies: [{ id: "photography", name: "Photography", commitment: "regular" }] },
    appearance: {
      visual: { body: { name: "slender build" }, hair: { name: "dark bob" }, eyes: { name: "brown eyes" }, feature: { name: "freckles" } },
      clothing_style: { name: "practical contemporary layers" }, signature_outfit: { name: "field jacket and relaxed trousers" }
    },
    narrative: { signature_item: { name: "compact camera" } },
    character_hook: { text: "Documents changing neighbourhoods." },
    style_profile: { genres: [{ id: "streetwear", weight: 1 }] },
    extensions: { promptforge: {
      characterOverrides: { currentLife: "preparing a neighbourhood photo essay" },
      references: [{ id: "city-board", purpose: "environment", media_type: "moodboard", strength: "supporting" }]
    } },
    state: {}
  });
}

test("scene intelligence resolves every contextual direction with explanations", async () => {
  const result = resolveScene({
    persona: persona(), library: await library(), seed: "golden-hour",
    requirements: { location: "canal bridge", activity: "framing a portrait", time: "golden hour", socialContext: "with a friend", mood: "warm and playful" }
  });
  assert.equal(result.scene_intelligence_version, SCENE_INTELLIGENCE_VERSION);
  for (const field of ["wardrobe", "props", "pose", "expression", "activity", "environment", "camera", "lighting"]) assert.ok(result[field], field);
  for (const field of ["activity", "environment", "wardrobe", "props", "expression", "pose", "composition", "lighting"]) assert.ok(result.source_details[field].selected, field);
  assert.equal(result.sources.location, "scene requirement");
  assert.match(result.lighting, /warm low-angle/i);
  assert.match(result.expression, /warm/i);
  assert.match(result.pose, /task|company|movement/i);
});

test("advanced direction remains explicit and source-labelled", async () => {
  const result = resolveScene({
    persona: persona(), library: await library(), seed: "advanced", requirements: {},
    controls: { wardrobe: "rainproof city layers", props: "a red umbrella", expression: "a restrained half-smile", pose: "leaning against the railing", composition: "wide symmetrical frame", lighting: "cool rainy daylight" }
  });
  assert.equal(result.wardrobe, "rainproof city layers");
  assert.equal(result.props, "a red umbrella");
  assert.equal(result.expression, "a restrained half-smile");
  assert.equal(result.pose, "leaning against the railing");
  assert.equal(result.camera, "wide symmetrical frame");
  assert.equal(result.lighting, "cool rainy daylight");
  assert.equal(result.sources.expression, "advanced override");
  assert.equal(result.sources.wardrobe, "advanced override");
});

test("typed references remain purpose-bounded and diagnostic in scene output", async () => {
  const character = persona();
  character.extensions.promptforge.references.push({ id: "genre-board", purpose: "genre", media_type: "moodboard", strength: "anchor", influence: ["identity", "atmosphere"] });
  const result = resolveScene({ persona: character, library: await library(), seed: "references" });
  assert.deepEqual(result.references.by_purpose.environment, ["city-board"]);
  assert.deepEqual(result.references.by_purpose.genre, ["genre-board"]);
  assert.equal(result.references.influence.identity, undefined);
  assert.equal(result.references.diagnostics.state, "warning");
  assert.deepEqual(result.references.diagnostics.ignored_influence, [{ index: 1, fields: ["identity"] }]);
});

test("same complete input is deterministic and canonical persona is not mutated", async () => {
  const character = persona();
  const before = structuredClone(character);
  const input = { persona: character, library: await library(), project: { context: { premise: "A changing city" }, locations: ["Northern Quarter"] }, seed: "repeat" };
  assert.deepEqual(resolveScene(input), resolveScene(input));
  assert.deepEqual(character, before);
});

test("current-life state guides blank scenes but explicit scene direction wins", async () => {
  const character = persona();
  character.extensions.promptforge.continuity.current = {
    project: "Neighbourhood essay", goal: "Finish the portrait series", situation: "reviewing contact sheets", updatedAt: "2026-09-09T00:00:00.000Z"
  };
  const contextual = resolveScene({ persona: character, library: await library(), seed: "continuity" });
  assert.equal(contextual.activity, "reviewing contact sheets");
  assert.equal(contextual.source_details.activity.selected.kind, "temporary_state");
  assert.match(contextual.prompt, /Current goal: Finish the portrait series/);
  const directed = resolveScene({ persona: character, library: await library(), seed: "continuity", requirements: { activity: "taking a canal portrait" } });
  assert.equal(directed.activity, "taking a canal portrait");
  assert.equal(directed.source_details.activity.selected.kind, "scene_requirement");
});
