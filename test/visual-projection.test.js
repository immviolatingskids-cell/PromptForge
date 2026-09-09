import test from "node:test";
import assert from "node:assert/strict";
import { checkVisualContradictions, negativePrompt, projectVisual, resolveVisualRelevance, serializeVisualProjection } from "../src/visual-projection.js";

const value = (name, id = name.toLowerCase().replaceAll(" ", "_")) => ({ name, id });
const persona = {
  origin: { name: "Aiko Sato", current_location: "Tokyo" },
  foundation: { age: 24, life_stage: value("Young Adult", "young_adult"), species: value("Human", "human") },
  appearance: { visual: { body: value("slender"), hair: value("black hair"), eyes: value("brown eyes"), feature: value("light freckles") }, clothing_style: value("smart-casual"), signature_outfit: value("cream jacket") },
  life: { job: value("Librarian"), work_environment: "library", housing: value("small apartment") },
  interests: { hobbies: [{ ...value("Photography", "photography"), participation_style: "solo" }] },
  narrative: { integration: { scene_hooks: [{ text: "editing photographs at home" }] } }
};

test("projection is deterministic and does not mutate canonical persona", () => {
  const before = JSON.stringify(persona);
  assert.deepEqual(projectVisual(persona, "workplace"), projectVisual(persona, "workplace"));
  assert.equal(JSON.stringify(persona), before);
});

test("portrait suppresses occupation and hobby context", () => {
  const projection = projectVisual(persona, "portrait");
  assert.equal(projection.context.occupation, undefined);
  assert.equal(projection.context.hobby, undefined);
  assert.ok(resolveVisualRelevance(persona, "portrait").suppressed.includes("narrative"));
});

test("workplace and hobby modes select observable context", () => {
  const workplace = projectVisual(persona, "workplace");
  const hobby = projectVisual(persona, "hobby");
  assert.equal(workplace.context.occupation, "Librarian");
  assert.ok(workplace.activity.includes("organising books"));
  assert.equal(hobby.context.hobby, "Photography");
  assert.ok(hobby.activity.includes("photography walk"));
  assert.ok(serializeVisualProjection(workplace).includes("ENVIRONMENT:"));
});

test("composition resolves observable action, compatible pose, framing, and lighting", () => {
  const hobby = projectVisual({ ...persona, meta: { seed: "action-1" } }, "hobby");
  assert.match(hobby.activity, /camera|photograph|images/i);
  assert.match(hobby.pose, /task|movement|standing|leaning|framing/i);
  assert.match(hobby.camera, /framing/);
  assert.match(hobby.lighting, /light/);
  assert.ok(hobby.priority.primary.includes("activity"));
});

test("seeded activity variants are deterministic and can vary", () => {
  const first = projectVisual({ ...persona, meta: { seed: "action-a" } }, "hobby");
  const second = projectVisual({ ...persona, meta: { seed: "action-b" } }, "hobby");
  assert.equal(first.activity, projectVisual({ ...persona, meta: { seed: "action-a" } }, "hobby").activity);
  assert.notEqual(first.activity, second.activity);
});

test("narrative scenes convert hooks into observable circumstances", () => {
  const projection = projectVisual(persona, "narrative_scene");
  assert.ok(projection.environment.includes("open practical task"));
  assert.equal(projection.sources.at(-1).path, "narrative.integration.scene_hooks.0");
  assert.ok(!serializeVisualProjection(projection).includes("editing photographs at home"));
});

test("negative prompts remain mode-specific and do not negate identity", () => {
  const portrait = projectVisual(persona, "portrait");
  assert.ok(negativePrompt(portrait).includes("busy background"));
  assert.equal(portrait.negative_prompt, negativePrompt(portrait));
  assert.deepEqual(portrait.contradictions, []);
  assert.ok(!negativePrompt(portrait).includes("black hair"));
  assert.deepEqual(checkVisualContradictions(portrait), []);
});

test("legacy personas degrade without fabricated canonical visual facts", () => {
  const legacy = { foundation: { age: 31, life_stage: value("Adult"), species: value("Human") }, origin: { name: "Legacy Person" } };
  const projection = projectVisual(legacy, "portrait");
  assert.equal(projection.subject.name, "Legacy Person");
  assert.equal(projection.appearance.hair, "unspecified");
  assert.equal(projection.context.occupation, undefined);
  assert.ok(serializeVisualProjection(projection).includes("unspecified"));
});

test("geography and personality remain outside ordinary visual prompts", () => {
  const contextual = { ...persona, foundation: { ...persona.foundation, country: value("Japan") }, personality: { core: value("Reserved"), values: { primary: value("Honesty") } } };
  const projection = projectVisual(contextual, "portrait");
  const prompt = serializeVisualProjection(projection).toLowerCase();
  assert.ok(!prompt.includes("japan"));
  assert.ok(!prompt.includes("reserved"));
  assert.ok(!prompt.includes("honesty"));
});

test("optional canonical accessory and makeup fields project without invention", () => {
  const withPresentation = { ...persona, appearance: { ...persona.appearance, accessories: value("silver glasses"), makeup: value("subtle eyeliner") } };
  const projection = projectVisual(withPresentation, "portrait");
  assert.equal(projection.accessories, "silver glasses");
  assert.equal(projection.makeup, "subtle eyeliner");
  assert.ok(serializeVisualProjection(projection).includes("ACCESSORIES: silver glasses"));
});

test("lifestyle may use current residence without using birthplace or stereotypes", () => {
  const projection = projectVisual(persona, "lifestyle");
  assert.ok(projection.environment.includes("Tokyo"));
  assert.ok(!projection.environment.includes("Japan"));
  assert.ok(!projection.environment.includes("luxury"));
});

test("daily rhythm influences timing softly rather than deterministically", () => {
  const projection = projectVisual({ ...persona, life: { ...persona.life, daily_rhythm: "night oriented" } }, "lifestyle");
  assert.ok(projection.environment.includes("evening-leaning"));
  assert.ok(!projection.environment.includes("at night"));
});

test("workplace timing remains soft", () => {
  const projection = projectVisual({ ...persona, life: { ...persona.life, daily_rhythm: "rotating shifts" } }, "workplace");
  assert.ok(projection.environment.includes("variable time context"));
  assert.ok(projection.environment.includes("where"));
});

test("signature items are contextual rather than forced into portraits", () => {
  const contextual = { ...persona, narrative: { signature_item: value("grandfather's camera") } };
  assert.equal(projectVisual(contextual, "portrait").signature_item, null);
  assert.equal(projectVisual(contextual, "lifestyle").signature_item, "grandfather's camera");
});

test("projection carries its assembled prompt separately from metadata", () => {
  const projection = projectVisual(persona, "portrait");
  assert.equal(projection.prompt, serializeVisualProjection(projection));
  assert.ok(!projection.prompt.includes("Negative prompt"));
  assert.ok(Array.isArray(projection.sources));
});

test("workplace mode degrades minors to learning context", () => {
  const projection = projectVisual({ foundation: persona.foundation, origin: persona.origin, appearance: persona.appearance, life: {}, interests: {}, narrative: {} }, "workplace");
  assert.ok(projection.environment.includes("school or learning environment"));
  assert.ok(projection.activity.includes("studying"));
  assert.deepEqual(checkVisualContradictions(projection), []);
});

test("derived context retains canonical and interpretation sources", () => {
  const projection = projectVisual({ ...persona, life: { ...persona.life, daily_rhythm: "regular daytime" } }, "workplace");
  assert.ok(projection.sources.some((item) => item.path === "life.work_environment"));
  assert.ok(projection.sources.some((item) => item.path === "life.daily_rhythm"));
});

test("serializer removes repeated semantic values", () => {
  const projection = projectVisual(persona, "portrait");
  projection.appearance.feature = projection.appearance.hair;
  const count = serializeVisualProjection(projection).split(projection.appearance.hair).length - 1;
  assert.equal(count, 1);
});

test("identity context does not impose visual stereotypes", () => {
  const base = projectVisual(persona, "portrait");
  const alternate = projectVisual({ ...persona, foundation: { ...persona.foundation, gender: "female", country: value("Japan"), age: 70 }, personality: { core: value("Ambitious") } }, "portrait");
  assert.equal(base.wardrobe, alternate.wardrobe);
  assert.equal(base.pose, alternate.pose);
  assert.equal(base.environment, alternate.environment);
  assert.ok(!serializeVisualProjection(alternate).includes("Japan"));
  assert.ok(!serializeVisualProjection(alternate).includes("Ambitious"));
});
