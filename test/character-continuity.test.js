import test from "node:test";
import assert from "node:assert/strict";

import {
  CHARACTER_CONTINUITY_VERSION,
  CONTINUITY_RECENT_SCENE_LIMIT,
  applyContinuityEvent,
  continuityAssertions,
  continuityFor,
  normalizeCharacterContinuity
} from "../src/character-continuity.js";
import { normalizePersona, PersonaStore } from "../src/persona-store.js";

class Memory {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.get(key) ?? null; }
  setItem(key, value) { this.map.set(key, value); }
  removeItem(key) { this.map.delete(key); }
}

const at = "2026-09-09T00:00:00.000Z";

function persona() {
  return normalizePersona({
    meta: { persona_id: "continuity-maya", seed: "maya" },
    origin: { name: "Maya Chen" },
    personality: { values: [] },
    state: {}
  });
}

test("legacy characters receive empty bounded continuity without invented history", () => {
  assert.deepEqual(continuityFor(persona()), {
    version: CHARACTER_CONTINUITY_VERSION,
    current: { project: null, goal: null, situation: null, updatedAt: null },
    threads: [], recentScenes: []
  });
  assert.deepEqual(continuityAssertions(persona()), []);
});

test("current state is explicitly temporary and separate from canonical identity", () => {
  let continuity = normalizeCharacterContinuity();
  continuity = applyContinuityEvent(continuity, { type: "set_current", current: { project: "Photo essay", goal: "Finish the first edit", situation: "Working after hours" } }, { at });
  const character = persona();
  character.extensions.promptforge.continuity = continuity;
  const assertions = continuityAssertions(character);
  assert.equal(assertions.length, 3);
  assert.ok(assertions.every(item => item.kind === "temporary_state" && item.temporary));
  assert.equal(character.origin.name, "Maya Chen");
  assert.equal(character.narrative, undefined);
});

test("thread lifecycle is explicit and preserves resolved history", () => {
  let continuity = applyContinuityEvent({}, { type: "upsert_thread", thread: { id: "client_pitch", title: "Prepare the client pitch" } }, { at });
  assert.equal(continuity.threads[0].status, "active");
  continuity = applyContinuityEvent(continuity, { type: "resolve_thread", id: "client_pitch" }, { at: "2026-09-10T00:00:00.000Z" });
  assert.equal(continuity.threads[0].status, "resolved");
  assert.equal(continuity.threads[0].resolvedAt, "2026-09-10T00:00:00.000Z");
  const character = persona(); character.extensions.promptforge.continuity = continuity;
  assert.ok(continuityAssertions(character).every(item => item.domain !== "current_thread"));
});

test("recent scenes store bounded references rather than scene copies", () => {
  let continuity = normalizeCharacterContinuity();
  for (let index = 0; index < CONTINUITY_RECENT_SCENE_LIMIT + 5; index++) {
    continuity = applyContinuityEvent(continuity, { type: "record_scene", scene: { id: `scene-${index}`, title: `Scene ${index}`, prompt: "must not persist" } }, { at });
  }
  assert.equal(continuity.recentScenes.length, CONTINUITY_RECENT_SCENE_LIMIT);
  assert.deepEqual(Object.keys(continuity.recentScenes[0]).sort(), ["occurredAt", "ref", "title"]);
  assert.equal(continuity.recentScenes[0].ref.type, "scene");
  assert.equal(continuity.recentScenes[0].prompt, undefined);
});

test("PersonaStore persists lifecycle events without changing canonical fields", () => {
  const store = new PersonaStore(new Memory());
  store.save(persona());
  store.updateContinuity("continuity-maya", { type: "set_current", current: { goal: "Ship the photo essay" } }, { at });
  store.updateContinuity("continuity-maya", { type: "record_scene", scene: { id: "scene-1", title: "Canal portrait" } }, { at });
  const saved = store.open("continuity-maya");
  assert.equal(saved.origin.name, "Maya Chen");
  assert.equal(saved.extensions.promptforge.continuity.current.goal, "Ship the photo essay");
  assert.deepEqual(saved.extensions.promptforge.continuity.recentScenes[0].ref, { type: "scene", id: "scene-1" });
});
