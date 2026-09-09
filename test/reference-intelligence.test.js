import test from "node:test";
import assert from "node:assert/strict";
import {
  REFERENCE_PURPOSES,
  PURPOSE_INFLUENCE_FIELDS,
  assemblePurposeReferences,
  createPurposeReference,
  createReference,
  diagnosePurposeReferences,
  normalizePurposeReference,
  referenceStrengthWeight,
  validateReference
} from "../src/reference-model.js";
import {
  REFERENCE_PACKAGE_SCHEMA_VERSION,
  assembleReferencePackage,
  referencePackage,
  referencePackageSemantics
} from "../src/reference-writer.js";

const value = name => ({ name });
const persona = {
  meta: { persona_id: "persona-aerin", seed: "aerin" },
  origin: { name: "Aerin Silverleaf" },
  foundation: {
    age: 127,
    life_stage: { id: "young_adult", name: "Young Adult" },
    species: { name: "Elf", metadata: { apparent_age_ranges: { young_adult: [20, 29] } } },
    setting: value("Fantasy"),
    era: value("Medieval-Inspired")
  },
  appearance: {
    visual: { body: value("Slender"), hair: value("Silver braids"), eyes: value("Green eyes"), feature: value("Pointed ears") },
    clothing_style: value("Practical layered"),
    signature_outfit: value("Forest cloak")
  },
  interests: { hobbies: [] },
  life: {},
  narrative: { signature_item: value("Broken pocket watch") },
  character_hook: { text: "A family mystery." }
};

test("structural reference API retains its exact legacy contract", () => {
  assert.deepEqual(createReference("persona", "  p-1  "), { type: "persona", id: "p-1" });
  assert.deepEqual(validateReference({ type: "persona", id: "p-1", purpose: "appearance" }).reference, { type: "persona", id: "p-1" });
});

test("all six creative purposes have bounded default influence", () => {
  assert.deepEqual(REFERENCE_PURPOSES, ["appearance", "fashion", "genre", "lifestyle", "environment", "character"]);
  for (const purpose of REFERENCE_PURPOSES) {
    const reference = createPurposeReference(`${purpose}-1`, purpose);
    assert.equal(reference.purpose, purpose);
    assert.equal(reference.media_type, "image");
    assert.equal(reference.strength, "supporting");
    assert.deepEqual(reference.influence, PURPOSE_INFLUENCE_FIELDS[purpose]);
  }
});

test("purpose boundaries prevent genre and fashion references from becoming identity", () => {
  const genre = normalizePurposeReference({
    id: "genre-board",
    purpose: "genre",
    media_type: "moodboard",
    strength: "strong",
    influence: ["identity", "appearance", "wardrobe", "atmosphere"]
  });
  assert.deepEqual(genre.influence, ["wardrobe", "atmosphere"]);
  const diagnostics = diagnosePurposeReferences([{ ...genre, influence: ["identity", "wardrobe"] }]);
  assert.equal(diagnostics.state, "warning");
  assert.deepEqual(diagnostics.ignored_influence, [{ index: 0, fields: ["identity"] }]);
});

test("strength has a stable ordinal weight and unsupported values degrade safely", () => {
  assert.equal(referenceStrengthWeight("subtle"), 0.25);
  assert.equal(referenceStrengthWeight("anchor"), 1);
  assert.equal(referenceStrengthWeight("unexpected"), 0.5);
  assert.equal(createPurposeReference("ref", "appearance", { strength: "unexpected" }).strength, "supporting");
});

test("assembly is deterministic, keeps disabled metadata, and chooses the strongest duplicate", () => {
  const references = [
    createPurposeReference("wardrobe", "fashion", { strength: "subtle" }),
    createPurposeReference("place", "environment", { strength: "strong" }),
    createPurposeReference("wardrobe", "fashion", { strength: "anchor" }),
    createPurposeReference("inactive", "lifestyle", { enabled: false })
  ];
  const forward = assemblePurposeReferences(references);
  const reverse = assemblePurposeReferences([...references].reverse());
  assert.deepEqual(forward, reverse);
  assert.deepEqual(forward.references.map(item => item.id), ["wardrobe", "place", "inactive"]);
  assert.deepEqual(forward.by_purpose.lifestyle, []);
  assert.equal(forward.influence.wardrobe[0].weight, 1);
  assert.deepEqual(forward.diagnostics.duplicate_references, ["fashion:wardrobe"]);
});

test("diagnostics identify invalid entries, ineffective references, and conflicting anchors", () => {
  const diagnostics = diagnosePurposeReferences([
    null,
    { id: "empty", purpose: "appearance", media_type: "image", influence: [] },
    createPurposeReference("face-a", "character", { strength: "anchor", influence: ["identity"] }),
    createPurposeReference("face-b", "character", { strength: "anchor", influence: ["identity"] })
  ]);
  assert.equal(diagnostics.state, "warning");
  assert.deepEqual(diagnostics.invalid, [{ index: 0, issues: ["reference must be an object"] }]);
  assert.deepEqual(diagnostics.ineffective_references, ["empty"]);
  assert.deepEqual(diagnostics.conflicting_anchors, [{ field: "identity", reference_ids: ["face-a", "face-b"] }]);
});

test("package semantics annotate every legacy key without changing legacy output", () => {
  const prompts = referencePackage(persona);
  const semantics = referencePackageSemantics();
  assert.deepEqual(Object.keys(semantics), Object.keys(prompts));
  assert.equal(semantics.master.purpose, "character");
  assert.equal(semantics.visual_traits.strength, "anchor");
  semantics.master.purpose = "genre";
  assert.equal(referencePackageSemantics().master.purpose, "character");
  assert.deepEqual(Object.keys(referencePackage(persona)), ["master", "headshot", "full_body", "casual_outfit", "signature_outfit", "expression_sheet", "signature_item", "visual_traits"]);
});

test("assembled package combines legacy prompts, target output, and typed references", () => {
  const reference = createPurposeReference("look-1", "appearance", { strength: "anchor" });
  const result = assembleReferencePackage(persona, [reference], { mode: "polished", target: "niji", density: "compact" });
  assert.equal(result.schema_version, REFERENCE_PACKAGE_SCHEMA_VERSION);
  assert.equal(result.persona_id, "persona-aerin");
  assert.deepEqual(Object.keys(result.prompts), Object.keys(referencePackage(persona)));
  assert.equal(result.visual.target, "niji");
  assert.equal(result.visual.density, "compact");
  assert.deepEqual(result.references.by_purpose.appearance, ["look-1"]);
});
