import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sceneSuggestionsFor } from "../src/product-shell.js";

function character() {
  return {
    style_profile: {
      genres: [
        { id: "tech-girlie", weight: 0.7 },
        { id: "minimalist", weight: 0.3 }
      ]
    },
    extensions: {
      promptforge: {
        continuity: {
          current: {
            goal: "Finish the photo essay",
            situation: "Editing portraits after work"
          }
        }
      }
    }
  };
}

test("scene starting points put the character's current life before style affinities", () => {
  const suggestions = sceneSuggestionsFor(character());
  assert.deepEqual(suggestions.activities.slice(0, 2), [
    "Editing portraits after work",
    "Finish the photo essay"
  ]);
  assert.ok(suggestions.activities.includes("working on a personal project"));
  assert.equal(suggestions.locations[0], "calm workspace");
});

test("creative shell keeps advanced intelligence discoverable and purpose-bounded", () => {
  const source = readFileSync(new URL("../src/product-shell.js", import.meta.url), "utf8");
  for (const control of ["wardrobe", "props", "expression", "pose", "composition", "lighting"]) {
    assert.match(source, new RegExp(`name=\\"${control}\\"`));
  }
  assert.match(source, /Why these choices\?/);
  assert.match(source, /Use it for/);
  assert.match(source, /updateCharacterContinuity/);
  assert.match(source, /record_scene/);
});
