import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pools = {
  traits: "personality/traits", flaws: "personality/flaws", values: "personality/values",
  habits: "personality/habits", quirks: "personality/quirks", hobbies: "lifestyle/hobbies",
  interests: "lifestyle/interests", occupations: "lifestyle/occupations", education: "lifestyle/education",
  housing: "lifestyle/housing", transport: "lifestyle/transport", hair: "appearance/hair",
  eyes: "appearance/eyes", body: "appearance/body", features: "appearance/features",
  clothingStyles: "clothing/styles", outfits: "clothing/signature_outfits", goals: "narrative/goals",
  secrets: "narrative/secrets", signatureItems: "narrative/signature_items", expressions: "narrative/expressions"
};

test("v0.2 generation pools retain useful breadth", async () => {
  const version = JSON.parse(await readFile(new URL("../data/data_version.json", import.meta.url)));
  assert.equal(version.data_version, "0.4.0");
  for (const [name, path] of Object.entries(pools)) {
    const entries = JSON.parse(await readFile(new URL(`../data/${path}.json`, import.meta.url)));
    assert.ok(entries.length >= 11, `${name} has only ${entries.length} entries`);
    assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length, `${name} contains duplicate IDs`);
  }
});
