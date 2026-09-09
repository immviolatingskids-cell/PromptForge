import test from "node:test";
import assert from "node:assert/strict";
import { SceneStore, SCENE_SCHEMA_VERSION, normalizeScene, sceneMarkdown } from "../src/scene-store.js";
import { resolveSceneForge } from "../src/scene-forge.js";

class MemoryStorage { constructor() { this.data = new Map(); } getItem(key) { return this.data.get(key) ?? null; } setItem(key, value) { this.data.set(key, value); } }
const persona = (id, name) => ({ meta: { persona_id: id, seed: id }, origin: { name }, foundation: {}, personality: {}, life: {}, interests: {}, appearance: {}, narrative: {}, extensions: { promptforge: {} }, state: {} });

test("v1 scenes migrate to reference-only v2 records", () => {
  const scene = normalizeScene({ id: "old", characterRef: { type: "persona", id: "p1" }, requirements: { activity: "wait" } });
  assert.equal(scene.schemaVersion, SCENE_SCHEMA_VERSION);
  assert.deepEqual(scene.participantRefs, [{ type: "persona", id: "p1" }]);
  assert.equal(JSON.stringify(scene).includes('"origin"'), false);
});

test("scene store persists, edits, exports and diagnoses missing references", () => {
  const store = new SceneStore(new MemoryStorage());
  const created = store.create({ id: "s1", title: "Crossing", projectRef: { type: "project", id: "pr1" }, locationRef: { type: "location", id: "l1" }, participantRefs: [{ type: "persona", id: "p1" }] });
  assert.equal(store.open(created.id).title, "Crossing");
  store.update(created.id, { purpose: "Reveal a choice" });
  assert.match(store.export(created.id), /Reveal a choice/);
  assert.match(sceneMarkdown(store.open(created.id)), /# Crossing/);
  const diagnostics = store.diagnostics({ personas: [], projects: [], locations: [], casts: [], groups: [], relationships: [] });
  assert.deepEqual(diagnostics.staleScenes, [created.id]);
  assert.equal(store.delete(created.id), true);
});

test("collision import remaps every supported scene reference", () => {
  const store = new SceneStore(new MemoryStorage()); store.create({ id: "s1", participantRefs: [{ type: "persona", id: "p1" }] });
  const result = store.importBrowserData({ scenes: [{ id: "s1", projectRef: { type: "project", id: "pr" }, locationRef: { type: "location", id: "lo" }, castRef: { type: "cast", id: "ca" }, groupRef: { type: "group", id: "gr" }, participantRefs: [{ type: "persona", id: "p1" }], relationshipRefs: [{ type: "relationship", id: "re" }] }] }, { personaMap: { p1: "p2" }, projectMap: { pr: "pr2" }, locationMap: { lo: "lo2" }, castMap: { ca: "ca2" }, groupMap: { gr: "gr2" }, relationshipMap: { re: "re2" } });
  const imported = store.open(result.idMap.s1);
  assert.equal(imported.id, "s1_import_1"); assert.equal(imported.projectRef.id, "pr2"); assert.equal(imported.locationRef.id, "lo2"); assert.equal(imported.castRef.id, "ca2"); assert.equal(imported.groupRef.id, "gr2"); assert.equal(imported.participantRefs[0].id, "p2"); assert.equal(imported.relationshipRefs[0].id, "re2");
});

test("forge resolution is deterministic and only uses supported relationship evidence", () => {
  const people = [persona("p1", "Maya"), persona("p2", "Noor")], scene = normalizeScene({ id: "s", seed: "fixed", title: "Bridge", projectRef: { type: "project", id: "pr" }, participantRefs: [{ type: "persona", id: "p1" }], focusPersonaRef: { type: "persona", id: "p1" }, relationshipRefs: [{ type: "relationship", id: "r1" }, { type: "relationship", id: "missing" }], inheritance: { participants: "project" }, requirements: { action: "compare notes", conflict: "They disagree on timing" } });
  const input = { scene, personas: people, projects: [{ id: "pr", name: "Project", personaRefs: [{ type: "persona", id: "p2" }], context: { setting: "canal bridge" } }], relationships: [{ id: "r1", type: "friend", sourceRef: { id: "p1" }, targetRef: { id: "p2" }, description: "trusted collaborators" }], library: {} };
  const first = resolveSceneForge(input), second = resolveSceneForge(input);
  assert.equal(first.selectedHook, second.selectedHook); assert.equal(first.participants.length, 2); assert.match(first.interactionDynamics[0], /trusted collaborators/); assert.ok(first.warnings.some(value => value.includes("missing"))); assert.deepEqual(first.package.participantRefs.map(ref => ref.id), ["p1", "p2"]);
});

test("missing participants fail honestly instead of fabricating replacements", () => {
  const scene = normalizeScene({ id: "s", participantRefs: [{ type: "persona", id: "gone" }], inheritance: { participants: "explicit" } });
  assert.throws(() => resolveSceneForge({ scene, personas: [], library: {} }), /available participant/);
});

test("explicit location and time override project values while project fills blanks", () => {
  const maya = persona("p1", "Maya"), project = { id: "pr", name: "Project", personaRefs: [{ type: "persona", id: "p1" }], context: { setting: "project station", era: "project era" } };
  const explicit = normalizeScene({ id: "explicit", participantRefs: [{ type: "persona", id: "p1" }], focusPersonaRef: { type: "persona", id: "p1" }, projectRef: { type: "project", id: "pr" }, requirements: { location: "scene bridge", time: "midnight" } });
  const inherited = normalizeScene({ id: "inherited", projectRef: { type: "project", id: "pr" }, inheritance: { participants: "project", location: "project", time: "project" } });
  assert.equal(resolveSceneForge({ scene: explicit, personas: [maya], projects: [project], library: {} }).environment.includes("scene bridge"), true);
  const resolved = resolveSceneForge({ scene: inherited, personas: [maya], projects: [project], library: {} });
  assert.equal(resolved.sourceTrace.find(item => item.domain === "location").source, "project context"); assert.equal(resolved.time, "project era");
});

test("cast and group references compose participants without mutating personas", () => {
  const people = [persona("p1", "Maya"), persona("p2", "Noor"), persona("p3", "Ivo")], before = structuredClone(people);
  const scene = normalizeScene({ id: "collections", castRef: { type: "cast", id: "c1" }, groupRef: { type: "group", id: "g1" }, focusPersonaRef: { type: "persona", id: "p1" }, participantRefs: [{ type: "persona", id: "p1" }], inheritance: { participants: "explicit" } });
  const result = resolveSceneForge({ scene, personas: people, casts: [{ id: "c1", personaRefs: [{ type: "persona", id: "p2" }] }], groups: [{ id: "g1", personaRefs: [{ type: "persona", id: "p3" }] }], library: {} });
  assert.deepEqual(result.participants.map(item => item.id), ["p1", "p2", "p3"]); assert.deepEqual(people, before);
});

test("stored serialization is deterministic for identical timestamps and values", () => {
  const raw = { id: "stable", title: "Stable", createdAt: "2026-01-01T00:00:00.000Z", modifiedAt: "2026-01-01T00:00:00.000Z", participantRefs: [{ type: "persona", id: "p1" }] };
  assert.equal(JSON.stringify(normalizeScene(raw)), JSON.stringify(normalizeScene(structuredClone(raw))));
});
