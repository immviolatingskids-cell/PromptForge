import test from "node:test";
import assert from "node:assert/strict";
import { PersonaController } from "../src/persona-controller.js";
import { projectVisual } from "../src/visual-projection.js";

const library = {};
const persona = { interests: { hobbies: [] }, state: { locks: {}, stale_fields: [], visual_locks: {}, visual_overrides: {} } };

test("visual locks and rerolls remain downstream of canonical persona", () => {
  const controller = new PersonaController(library, persona);
  controller.fresh = () => ({ state: { locks: {}, stale_fields: [] }, foundation: {}, appearance: {} });
  controller.visualProjection = () => ({ environment: "studio" });
  assert.equal(controller.toggleVisualLock("hobby", "environment"), true);
  assert.equal(controller.rerollVisualField("hobby", "environment"), false);
  assert.equal(persona.appearance, undefined);
});

test("visual invalidation is targeted", () => {
  const controller = new PersonaController(library, persona);
  const stale = controller.invalidateVisual("interests.hobbies");
  assert.ok(stale.includes("*.*.activity"));
  assert.ok(stale.includes("*.*.environment"));
  assert.ok(!stale.includes("*.*.appearance"));
});

test("canonical rerolls mark dependent visual fields stale", () => {
  const controller = new PersonaController(library, persona);
  controller.fresh = () => ({ foundation: {}, appearance: {}, state: { locks: {}, stale_fields: [] } });
  controller.rerollField("interests.hobbies");
  assert.ok(persona.state.visual_stale_fields.includes("*.*.activity"));
  assert.ok(persona.state.visual_stale_fields.includes("*.*.environment"));
});

test("canonical changes clear stale unlocked projection overrides but preserve locks", () => {
  const controlled = { ...persona, state: { ...persona.state, visual_overrides: { portrait: { environment: "old room", wardrobe: "locked coat" } }, visual_locks: { "portrait.wardrobe": true } } };
  const controller = new PersonaController(library, controlled);
  controller.invalidateVisual("life.housing");
  assert.equal(controlled.state.visual_overrides.portrait.environment, undefined);
  assert.equal(controlled.state.visual_overrides.portrait.wardrobe, "locked coat");
});

test("visual projection reroll does not mutate canonical appearance", () => {
  const controlled = { appearance: { visual: { hair: "canonical" } }, state: { locks: {}, stale_fields: [], visual_locks: {}, visual_overrides: {} } };
  const controller = new PersonaController(library, controlled);
  controller.visualProjection = () => ({ wardrobe: "wardrobe", activity: "activity", expression: "expression", pose: "pose", environment: "environment", camera: "camera", lighting: "lighting" });
  controller.rerollVisualField = (mode, field) => { controlled.state.visual_overrides[mode] ||= {}; controlled.state.visual_overrides[mode][field] = "projection-only"; return true; };
  controller.rerollVisualProjection("portrait");
  assert.equal(controlled.appearance.visual.hair, "canonical");
  assert.equal(controlled.state.visual_overrides.portrait.wardrobe, "projection-only");
});

test("projection overrides remain explainable in source trace", () => {
  const controlled = { ...persona, foundation: { life_stage: { name: "Adult" }, species: { name: "Human" } }, appearance: { visual: {} }, state: { ...persona.state, visual_overrides: { portrait: { environment: "override room" } } } };
  const projection = projectVisual(controlled, "portrait");
  assert.equal(projection.environment, "override room");
  assert.ok(projection.sources.some((item) => item.path === "visual_override.portrait.environment"));
});
