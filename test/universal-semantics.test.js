import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  UNIVERSAL_SEMANTICS_VERSION,
  UNIVERSAL_RELATION_TYPES,
  buildUniversalSemanticNetwork,
  resolveUniversalContext,
  universalSemanticCandidates
} from "../src/universal-semantics.js";

async function catalogue(path) {
  return JSON.parse(await fs.readFile(new URL(`../data/${path}.json`, import.meta.url)));
}

const selected = (id, name, extra = {}) => ({ id, name, ...extra });

async function library() {
  const [hobbies, traits, occupations] = await Promise.all([
    catalogue("lifestyle/hobbies"),
    catalogue("personality/traits"),
    catalogue("lifestyle/occupations")
  ]);
  return { hobbies, traits, occupations };
}

function persona() {
  return {
    meta: { persona_id: "persona_semantics", seed: "semantic-persona" },
    personality: {
      core: selected("observant", "Observant"),
      complementary: [selected("sociable", "Sociable")],
      contrast: selected("methodical", "Methodical")
    },
    life: {
      job: selected("librarian", "Librarian"),
      work_environment: "library",
      work_arrangement: "on_site",
      daily_rhythm: "structured_weekday"
    },
    interests: {
      hobbies: [selected("photography", "Photography", { commitment: "regular" })]
    }
  };
}

test("universal graph links catalogue concepts without copying catalogue records", async () => {
  const data = await library();
  const network = buildUniversalSemanticNetwork(data);
  const nodeIds = new Set(network.nodes.map(node => node.id));
  assert.equal(network.version, UNIVERSAL_SEMANTICS_VERSION);
  assert.ok(network.edges.length > data.hobbies.length + data.traits.length + data.occupations.length);
  assert.ok(network.edges.every(item => nodeIds.has(item.source) && nodeIds.has(`${item.target.domain}:${item.target.id}`)));
  assert.ok(network.edges.every(item => item.provenance.type === "universal_semantic_rule"));
  assert.ok(network.nodes.find(node => node.id === "hobby:photography")?.catalogueId === "photography");
  assert.equal(network.nodes.find(node => node.id === "hobby:photography")?.source, undefined);
});

test("every supported catalogue entry has its required semantic relation", async () => {
  const data = await library();
  const network = buildUniversalSemanticNetwork(data);
  const edgesFrom = source => network.edges.filter(item => item.source === source);
  for (const hobby of data.hobbies) {
    const edges = edgesFrom(`hobby:${hobby.id}`);
    assert.ok(edges.some(item => item.relation === "supports_activity"), hobby.id);
    assert.ok(edges.some(item => item.relation === "prefers_environment"), hobby.id);
  }
  for (const trait of data.traits) assert.ok(edgesFrom(`trait:${trait.id}`).some(item => item.relation === "supports_social_context"), trait.id);
  for (const occupation of data.occupations) {
    const edges = edgesFrom(`occupation:${occupation.id}`);
    assert.ok(edges.some(item => item.relation === "supports_occupation_context"), occupation.id);
    assert.ok(edges.some(item => item.relation === "prefers_environment"), occupation.id);
  }
  const usedEnvironments = new Set(data.occupations.flatMap(item => item.metadata?.environments || []));
  for (const environment of usedEnvironments) assert.ok(edgesFrom(`environment:${environment}`).some(item => item.relation === "supports_prop"), environment);
});

test("semantic candidates cover the five reusable human-context relationships", async () => {
  const candidates = universalSemanticCandidates(await library(), persona());
  const relations = new Set(candidates.map(item => item.relation));
  const domains = new Set(candidates.map(item => item.target.domain));
  for (const relation of UNIVERSAL_RELATION_TYPES) assert.ok(relations.has(relation), relation);
  for (const domain of ["activity", "socialContext", "lifestyle", "occupationContext", "environment", "props"]) assert.ok(domains.has(domain), domain);
  assert.ok(candidates.some(item => item.source === "hobby:photography" && item.target.domain === "activity"));
  assert.ok(candidates.some(item => item.source === "trait:sociable" && item.target.id === "socially_engaged"));
  assert.ok(candidates.some(item => item.source === "occupation:librarian" && item.target.id === "library"));
  assert.ok(candidates.some(item => item.source === "environment:library" && item.target.id === "books"));
});

test("universal resolution is deterministic, order-stable, and non-mutating", async () => {
  const data = await library();
  const originalData = structuredClone(data);
  const character = persona();
  const originalPersona = structuredClone(character);
  const first = resolveUniversalContext(data, character, { seed: "scene-17" });
  const second = resolveUniversalContext(data, character, { seed: "scene-17" });
  const reordered = structuredClone(character);
  reordered.personality.complementary.reverse();
  reordered.interests.hobbies.reverse();
  assert.deepEqual(first, second);
  assert.deepEqual(first, resolveUniversalContext(data, reordered, { seed: "scene-17" }));
  assert.deepEqual(data, originalData);
  assert.deepEqual(character, originalPersona);
  assert.ok(first.activity && first.socialContext && first.lifestyle && first.occupationContext && first.environment);
  assert.ok(first.props.length > 0);
});

test("exclusions filter universal suggestions without changing source data", async () => {
  const data = await library();
  const resolved = resolveUniversalContext(data, persona(), { seed: "exclude-books", exclusions: ["books", "reference"] });
  assert.ok(resolved.props.every(value => !value.includes("book") && !value.includes("reference")));
  assert.ok(resolved.sources.props.every(value => typeof value === "string"));
});

test("genre state neither creates nor changes universal semantic suggestions", async () => {
  const data = await library();
  const plain = persona();
  const styled = { ...persona(), style_profile: { version: 1, genres: [{ id: "dark-academia", weight: 1 }], exclusions: [], overrides: {} } };
  assert.deepEqual(
    resolveUniversalContext(data, plain, { seed: "genre-independent" }),
    resolveUniversalContext(data, styled, { seed: "genre-independent" })
  );
  assert.deepEqual(resolveUniversalContext(data, {}, { seed: "empty" }), {
    version: UNIVERSAL_SEMANTICS_VERSION,
    activity: null,
    socialContext: null,
    lifestyle: null,
    occupationContext: null,
    environment: null,
    props: [],
    sources: { activity: null, socialContext: null, lifestyle: null, occupationContext: null, environment: null, props: [] },
    trace: []
  });
});
