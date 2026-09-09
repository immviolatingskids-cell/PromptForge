import test from "node:test";
import assert from "node:assert/strict";

import { PersonaStore, normalizePersona } from "../src/persona-store.js";

class Memory {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.get(key) ?? null; }
  setItem(key, value) { this.map.set(key, value); }
  removeItem(key) { this.map.delete(key); }
}

function legacy() {
  return {
    meta: { persona_id: "legacy-character", seed: "legacy", schema_version: "2.0", data_version: "0.4.0" },
    origin: { name: "Legacy Character" },
    personality: { values: [] },
    state: { locks: {}, stale_fields: [], warnings: [] }
  };
}

test("legacy migration is additive and preserves canonical version metadata", () => {
  const migrated = normalizePersona(legacy());
  assert.equal(migrated.meta.schema_version, "2.0");
  assert.equal(migrated.meta.data_version, "0.4.0");
  assert.deepEqual(migrated.style_profile.genres, []);
  assert.deepEqual(migrated.extensions.promptforge.characterIntelligence.preferences, []);
  assert.deepEqual(migrated.extensions.promptforge.references, []);
  assert.deepEqual(migrated.extensions.promptforge.continuity.recentScenes, []);
  assert.equal(migrated.origin.name, "Legacy Character");
});

test("browser export/import round-trips all additive intelligence fields", () => {
  const source = new PersonaStore(new Memory());
  const character = normalizePersona(legacy());
  character.style_profile = { version: 1, genres: [{ id: "minimalist", weight: 1 }], exclusions: ["coffee"], overrides: {} };
  character.extensions.promptforge.characterIntelligence = {
    version: 1,
    preferences: [{ id: "preference:beverage:tea", kind: "preference", domain: "beverage", value: "tea", strength: 1, source: "preference" }],
    affinities: [], exclusions: [{ id: "exclusion:beverage:coffee", kind: "exclusion", domain: "beverage", value: "coffee", strength: 1, source: "exclusion" }]
  };
  character.extensions.promptforge.references = [{ id: "look", purpose: "appearance", media_type: "image", strength: "anchor", influence: ["appearance"], enabled: true }];
  character.extensions.promptforge.continuity = {
    version: 1, current: { project: "Editing a portrait", updatedAt: "2026-09-09T00:00:00.000Z" },
    threads: [], recentScenes: [{ ref: { type: "scene", id: "scene-1" }, title: "Portrait", occurredAt: "2026-09-09T00:00:00.000Z" }]
  };
  source.save(character);

  const destination = new PersonaStore(new Memory());
  const result = destination.importBrowserData(source.browserData());
  const imported = destination.open(result.idMap["legacy-character"]);
  assert.deepEqual(imported.style_profile, character.style_profile);
  assert.equal(imported.extensions.promptforge.characterIntelligence.preferences[0].value, "tea");
  assert.equal(imported.extensions.promptforge.references[0].purpose, "appearance");
  assert.deepEqual(imported.extensions.promptforge.continuity.recentScenes[0].ref, { type: "scene", id: "scene-1" });
});
