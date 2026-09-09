import test from "node:test";
import assert from "node:assert/strict";

import {
  GENRE_AFFINITY_DOMAINS,
  GENRE_DIMENSION_DEFINITIONS,
  GENRE_PROFILE_VERSION,
  GENRE_RECIPE_VERSION,
  GENRE_REGISTRY,
  attachGenreProfile,
  blendedGenreDimensions,
  genreById,
  genreProfileFor,
  normalizeGenreProfile,
  relatedGenreSuggestions,
  weightedGenreInfluences
} from "../src/genre-profile.js";

test("genre recipes use bounded semantic dimensions and contextual affinity concepts", () => {
  const canonicalDomains = new Set(["identity", "origin", "appearance", "personality", "occupation"]);
  const ids = new Set(GENRE_REGISTRY.map(genre => genre.id));

  assert.equal(ids.size, GENRE_REGISTRY.length);
  for (const genre of GENRE_REGISTRY) {
    assert.match(genre.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(genre.definition && genre.family);
    assert.equal(genre.provenance.version, GENRE_RECIPE_VERSION);
    assert.deepEqual(Object.keys(genre.affinities).sort(), [...GENRE_AFFINITY_DOMAINS].sort());
    assert.ok(Object.keys(genre.affinities).every(domain => !canonicalDomains.has(domain)));
    for (const [dimension, strength] of Object.entries(genre.dimensions)) {
      assert.ok(GENRE_DIMENSION_DEFINITIONS[dimension], `unknown dimension ${dimension}`);
      assert.ok(strength >= 0 && strength <= 1);
    }
    assert.deepEqual(Object.keys(genre.semanticAffinities).sort(), [...GENRE_AFFINITY_DOMAINS].sort());
    assert.ok(Object.values(genre.affinities).flat().every(item => typeof item === "string"));
    for (const candidates of Object.values(genre.semanticAffinities)) {
      for (const item of candidates) {
        assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        assert.ok(item.label);
        assert.ok(item.strength > 0 && item.strength <= 1);
        assert.ok(Array.isArray(item.tags));
        assert.ok(Array.isArray(item.contexts));
      }
    }
    for (const item of genre.relations) {
      assert.ok(ids.has(item.genreId));
      assert.notEqual(item.genreId, genre.id);
      assert.ok(item.strength > 0 && item.strength <= 1);
      assert.ok(item.basis.length > 0);
    }
  }
  assert.ok(Object.isFrozen(GENRE_REGISTRY));
  assert.ok(Object.isFrozen(GENRE_REGISTRY[0].affinities.props[0]));
});

test("normalization accepts legacy and ergonomic inputs without changing the persisted schema", () => {
  const profile = normalizeGenreProfile({
    genres: [
      { id: "Tech-Girlie", weight: 2 },
      { id: "tech-girlie", weight: 1 },
      { id: "minimalist", weight: 1 },
      { id: "unknown", weight: 100 },
      { id: "y2k", weight: -1 }
    ],
    exclusions: ["Laptop", " laptop ", "neon"],
    overrides: { mood: "quiet" }
  });

  assert.equal(profile.version, GENRE_PROFILE_VERSION);
  assert.deepEqual(profile.genres, [
    { id: "tech-girlie", weight: 0.75 },
    { id: "minimalist", weight: 0.25 }
  ]);
  assert.deepEqual(profile.exclusions, ["Laptop", "neon"]);
  assert.deepEqual(profile.overrides, { mood: "quiet" });
  assert.deepEqual(normalizeGenreProfile({ genres: { minimalist: 3, corporate: 1 } }).genres, [
    { id: "minimalist", weight: 0.75 },
    { id: "corporate", weight: 0.25 }
  ]);
  assert.deepEqual(normalizeGenreProfile(["minimalist", "corporate"]).genres, [
    { id: "corporate", weight: 0.5 },
    { id: "minimalist", weight: 0.5 }
  ]);
});

test("normalization is deterministic and corrects rounding to exactly one", () => {
  const input = { genres: [
    { id: "y2k", weight: 1 },
    { id: "streetwear", weight: 1 },
    { id: "minimalist", weight: 1 }
  ] };
  const first = normalizeGenreProfile(input);
  const second = normalizeGenreProfile(structuredClone(input));
  assert.deepEqual(first, second);
  assert.equal(first.genres.reduce((sum, item) => sum + item.weight, 0), 1);
  assert.deepEqual(first.genres.map(item => item.id), ["minimalist", "streetwear", "y2k"]);
});

test("soft affinities expose semantic evidence and merge shared concepts", () => {
  const profile = normalizeGenreProfile({ genres: [
    { id: "tech-girlie", weight: 3 },
    { id: "corporate", weight: 1 }
  ] });
  const influences = weightedGenreInfluences(profile, "props");
  const laptop = influences.find(item => item.conceptId === "laptop");

  assert.ok(laptop);
  assert.equal(laptop.value, "laptop");
  assert.deepEqual(laptop.genreIds, ["corporate", "tech-girlie"]);
  assert.equal(laptop.genreId, "tech-girlie");
  assert.equal(laptop.weight, 0.88);
  assert.ok(laptop.tags.includes("technology"));
  assert.deepEqual(weightedGenreInfluences(profile, "identity"), []);
});

test("exclusions match concept IDs, labels, and semantic tags", () => {
  const profile = normalizeGenreProfile({
    genres: [{ id: "tech-girlie", weight: 1 }],
    exclusions: ["computer", "cafe"]
  });
  const props = weightedGenreInfluences(profile, "props", { exclusions: ["audio"] });
  const environments = weightedGenreInfluences(profile, "environments");

  assert.ok(props.every(item => item.conceptId !== "laptop" && item.conceptId !== "headphones"));
  assert.ok(environments.every(item => item.conceptId !== "bright-cafe-corner"));
});

test("context filters remain soft selectors rather than character facts", () => {
  const profile = { genres: [{ id: "streetwear", weight: 1 }] };
  const outdoor = weightedGenreInfluences(profile, "activities", { contexts: ["outdoor"] });
  assert.ok(outdoor.length > 0);
  assert.ok(outdoor.every(item => item.contexts.includes("outdoor")));
  assert.ok(outdoor.every(item => !Object.hasOwn(item, "canonical")));
});

test("dimension blends and related suggestions are weighted and deterministic", () => {
  const profile = { genres: [
    { id: "tech-girlie", weight: 3 },
    { id: "minimalist", weight: 1 }
  ] };
  assert.deepEqual(blendedGenreDimensions(profile), {
    calm: 0.2,
    minimalism: 0.575,
    ornament: 0.025,
    technology: 0.675,
    warmth: 0.4125
  });
  const suggestions = relatedGenreSuggestions(profile);
  assert.deepEqual(suggestions.map(item => item.id), ["corporate", "y2k", "streetwear", "dark-academia"]);
  assert.ok(suggestions.every(item => item.score > 0 && item.reasons.length));
  assert.deepEqual(relatedGenreSuggestions("unknown"), []);
});

test("genre profiles remain additive and do not mutate persona identity", () => {
  const persona = {
    meta: { persona_id: "persona_1" },
    foundation: { age: 42 },
    origin: { name: "Rae" },
    extensions: { promptforge: { styleProfile: { genres: [{ id: "minimalist", weight: 1 }] } } }
  };
  const before = structuredClone(persona);
  const attached = attachGenreProfile(persona, { genres: [{ id: "streetwear", weight: 1 }] });

  assert.deepEqual(persona, before);
  assert.deepEqual(attached.foundation, persona.foundation);
  assert.deepEqual(attached.origin, persona.origin);
  assert.deepEqual(genreProfileFor(persona).genres, [{ id: "minimalist", weight: 1 }]);
  assert.deepEqual(genreProfileFor(attached).genres, [{ id: "streetwear", weight: 1 }]);
  assert.equal(genreById("MINIMALIST")?.id, "minimalist");
});
