import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { attachGenreProfile, weightedGenreInfluences } from "../src/genre-profile.js";
import { resolveUniversalContext } from "../src/universal-semantics.js";
import { assembleReferencePackage, referencePackage } from "../src/reference-writer.js";

async function catalogue(path) {
  return JSON.parse(await fs.readFile(new URL(`../data/${path}.json`, import.meta.url)));
}

async function library() {
  const [hobbies, traits, occupations] = await Promise.all([
    catalogue("lifestyle/hobbies"),
    catalogue("personality/traits"),
    catalogue("lifestyle/occupations")
  ]);
  return { hobbies, traits, occupations };
}

const selected = (id, name, extra = {}) => ({ id, name, ...extra });

function persona() {
  return {
    meta: { persona_id: "guardian-persona", seed: "guardian-seed" },
    origin: { name: "Mara Vale" },
    foundation: {
      age: 34,
      life_stage: selected("adult", "Adult"),
      species: selected("human", "Human", { metadata: {} }),
      setting: selected("modern", "Modern"),
      era: selected("modern", "Modern")
    },
    appearance: {
      visual: {
        body: selected("average", "Average build"),
        hair: selected("dark_bob", "Dark bob"),
        eyes: selected("brown", "Brown eyes"),
        feature: selected("freckles", "Freckles")
      },
      clothing_style: selected("practical", "Practical layers"),
      signature_outfit: selected("field_jacket", "Field jacket")
    },
    personality: {
      core: selected("observant", "Observant"),
      complementary: [selected("sociable", "Sociable")],
      contrast: selected("methodical", "Methodical")
    },
    interests: {
      hobbies: [selected("photography", "Photography", { commitment: "regular" })]
    },
    life: {
      job: selected("librarian", "Librarian"),
      work_environment: "library",
      work_arrangement: "on_site",
      daily_rhythm: "structured_weekday"
    },
    narrative: { signature_item: selected("camera", "Old camera") },
    character_hook: { text: "Documents places before they change." }
  };
}

test("Wave 1 intelligence remains catalogue-order deterministic and leaves canonical persona data untouched", async () => {
  const data = await library();
  const reversed = Object.fromEntries(Object.entries(data).map(([key, values]) => [key, [...values].reverse()]));
  const character = persona();
  const before = structuredClone(character);
  const options = { seed: "guardian-scene" };

  assert.deepEqual(resolveUniversalContext(data, character, options), resolveUniversalContext(reversed, character, options));

  const styled = attachGenreProfile(character, { genres: [{ id: "dark-academia", weight: 1 }] });
  assert.deepEqual(character, before);
  assert.deepEqual(styled.origin, before.origin);
  assert.deepEqual(styled.foundation, before.foundation);
  assert.deepEqual(styled.personality, before.personality);
  assert.ok(weightedGenreInfluences(styled.style_profile, "activities").every(item => !Object.hasOwn(item, "identity")));

  const legacyPrompts = referencePackage(character);
  const assembled = assembleReferencePackage(character, []);
  assert.deepEqual(assembled.prompts, legacyPrompts);
  assert.deepEqual(character, before);
});
