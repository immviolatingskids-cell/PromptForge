import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSERTION_KINDS,
  SOURCE_PRIORITY,
  canonicalCharacterAssertions,
  characterAssertions,
  characterIntelligenceFor,
  explainCharacterIntelligence,
  normalizeCharacterIntelligence,
  resolveSemanticField
} from "../src/character-intelligence.js";
import { normalizePersona } from "../src/persona-store.js";

const value = (id, name) => ({ id, name });

function maya() {
  return normalizePersona({
    meta: { persona_id: "maya", seed: "maya" },
    foundation: { age: 27, species: value("human", "Human") },
    origin: { name: "Maya Chen" },
    personality: { values: { primary: value("curiosity", "Curiosity") } },
    life: { job: value("developer", "Software developer") },
    interests: { hobbies: [] },
    appearance: {
      visual: { body: value("average", "Average build"), hair: value("bob", "Dark bob"), eyes: value("brown", "Brown eyes"), feature: value("freckles", "Freckles") },
      signature_outfit: value("soft_tailoring", "Soft tailored layers")
    },
    extensions: { promptforge: {
      characterOverrides: { personality: "quietly direct" },
      characterIntelligence: {
        preferences: [{ domain: "beverage", value: "tea", strength: 0.9 }],
        affinities: [{ domain: "environment", value: "cafés", strength: 0.7 }],
        exclusions: [{ domain: "beverage", value: "coffee" }]
      }
    } },
    state: {}
  });
}

test("character intelligence preserves every semantic distinction", () => {
  const persona = maya();
  const assertions = characterAssertions(persona);
  const kinds = new Set(assertions.map(item => item.kind));
  for (const kind of ["canonical_fact", "explicit_override", "preference", "affinity", "exclusion"]) assert.ok(kinds.has(kind), kind);
  assert.deepEqual(ASSERTION_KINDS, [
    "canonical_fact", "explicit_override", "preference", "affinity", "exclusion", "temporary_state",
    "scene_requirement", "project_context", "genre_influence", "universal_affinity"
  ]);
  assert.ok(SOURCE_PRIORITY.scene_requirement > SOURCE_PRIORITY.project_context);
  assert.ok(SOURCE_PRIORITY.project_context > SOURCE_PRIORITY.genre_influence);
  assert.ok(SOURCE_PRIORITY.genre_influence > SOURCE_PRIORITY.universal_affinity);
});

test("legacy personas gain empty intelligence without invented preferences", () => {
  const legacy = normalizePersona({ personality: { values: [] }, state: {} });
  assert.deepEqual(characterIntelligenceFor(legacy), { version: 1, preferences: [], affinities: [], exclusions: [] });
  assert.equal(explainCharacterIntelligence(legacy).counts.preference, 0);
  assert.equal(explainCharacterIntelligence(legacy).counts.exclusion, 0);
});

test("canonical assertions are derived views and never mutate canonical data", () => {
  const persona = maya();
  const before = structuredClone(persona);
  const facts = canonicalCharacterAssertions(persona);
  assert.ok(facts.some(item => item.domain === "identity_name" && item.value === "Maya Chen"));
  assert.ok(facts.some(item => item.domain === "wardrobe" && item.value === "Soft tailored layers"));
  assert.deepEqual(persona, before);
});

test("character exclusions block scene and genre conflicts while preferences remain plausible", () => {
  const result = resolveSemanticField("beverage", [
    { kind: "scene_requirement", value: "coffee", source: "scene beverage" },
    { kind: "genre_influence", value: "coffee", source: "tech-girlie" },
    { kind: "universal_affinity", value: "water", source: "universal" }
  ], { persona: maya() });
  assert.equal(result.value, "tea");
  assert.equal(result.selected.kind, "preference");
  assert.equal(result.suppressed.length, 2);
  assert.ok(result.suppressed.every(item => item.candidate.value === "coffee"));
});

test("scene then project then genre then universal priority is stable", () => {
  const persona = normalizePersona({ personality: { values: [] }, state: {} });
  const candidates = [
    { kind: "universal_affinity", value: "park", source: "universal" },
    { kind: "genre_influence", value: "studio", source: "genre" },
    { kind: "project_context", value: "office", source: "project" },
    { kind: "scene_requirement", value: "library", source: "scene" }
  ];
  assert.equal(resolveSemanticField("environment", candidates, { persona }).value, "library");
  assert.equal(resolveSemanticField("environment", candidates.slice(0, 3), { persona }).value, "office");
  assert.equal(resolveSemanticField("environment", candidates.slice(0, 2), { persona }).value, "studio");
  assert.equal(resolveSemanticField("environment", candidates.slice(0, 1), { persona }).value, "park");
});

test("normalization is deterministic, deduplicated, and strength-aware", () => {
  const raw = {
    preferences: [
      { domain: "beverage", value: "tea", strength: 0.4 },
      { domain: "Beverage", value: "tea", strength: 0.9 }
    ],
    exclusions: ["coffee"]
  };
  const result = normalizeCharacterIntelligence(raw);
  assert.equal(result.preferences.length, 1);
  assert.equal(result.preferences[0].strength, 0.9);
  assert.equal(result.exclusions[0].domain, "general");
  assert.deepEqual(result, normalizeCharacterIntelligence(structuredClone(raw)));
});
