import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { VISUAL_TARGETS, resolveAdapter, serializeVisual } from "../src/visual-adapters/index.js";

const projection = {
  mode: "workplace",
  subject: { life_stage: "adult", species: "Human", apparent_age: "30", gender: "woman" },
  appearance: { body: "tall", hair: "long dark hair", eyes: "amber eyes", feature: "freckles" },
  wardrobe: "a blue work jacket", activity: "reviewing maps", environment: "a cartography studio",
  pose: "standing at a desk", camera: "environmental portrait", lighting: "soft window light",
  negative_prompt: "avoid duplicate person"
};

test("adapter registry resolves known and unknown targets", () => {
  for (const target of VISUAL_TARGETS) assert.equal(typeof resolveAdapter(target).serialize, "function");
  assert.equal(resolveAdapter("future-target"), resolveAdapter("generic"));
});

test("all adapters are deterministic, preserve semantics, and do not mutate projection", () => {
  const before = structuredClone(projection);
  for (const target of VISUAL_TARGETS) {
    const first = serializeVisual(projection, target, { style: "structured" });
    assert.equal(first, serializeVisual(projection, target, { style: "structured" }));
    for (const value of ["freckles", "a blue work jacket", "reviewing maps", "a cartography studio", "environmental portrait", "soft window light"]) assert.match(first, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.deepEqual(projection, before);
});

test("visual projection has no provider adapter dependency", async () => {
  const source = await readFile(new URL("../src/visual-projection.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /visual-adapters|chatgpt|gemini|niji/i);
});

test("density defaults to standard and changes detail without changing projection", () => {
  const densityProjection = { ...projection, accessories: "a brass compass", makeup: "subtle face paint", signature_item: "a marked notebook", context: { work_environment: "quiet room" } };
  const before = structuredClone(densityProjection);
  for (const target of ["generic", "chatgpt", "gemini", "niji"]) {
    const compact = serializeVisual(densityProjection, target, { density: "compact" });
    const standard = serializeVisual(densityProjection, target, { density: "standard" });
    const detailed = serializeVisual(densityProjection, target, { density: "detailed" });
    assert.notEqual(compact, standard);
    assert.notEqual(standard, detailed);
    assert.match(compact, /freckles|blue work jacket|reviewing maps|cartography studio/i);
  }
  assert.equal(serializeVisual(densityProjection, "generic"), serializeVisual(densityProjection, "generic", { density: "standard" }));
  assert.equal(serializeVisual(densityProjection, "generic", { density: "unknown" }), serializeVisual(densityProjection, "generic", { density: "standard" }));
  assert.deepEqual(densityProjection, before);
});
