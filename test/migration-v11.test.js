import test from "node:test";
import assert from "node:assert/strict";
import { validateProject } from "../src/project-store.js";
import { validateScene } from "../src/scene-store.js";
import { validateCollection } from "../src/cast-group-store.js";
import { validateRelationship } from "../src/relationship-store.js";
import { validateLocation } from "../src/location-store.js";

const persona = id => ({ type: "persona", id });
const cases = [
  ["project", value => validateProject(value), { id: "p", name: "Project", schemaVersion: 1 }],
  ["scene", value => validateScene(value), { id: "s", title: "Scene", schemaVersion: 1 }],
  ["cast", value => validateCollection(value, "cast"), { id: "c", name: "Cast", schemaVersion: 1, personaRefs: [persona("p")] }],
  ["group", value => validateCollection(value, "group"), { id: "g", name: "Group", schemaVersion: 1, personaRefs: [persona("p")] }],
  ["relationship", value => validateRelationship(value), { id: "r", type: "friend", sourceRef: persona("a"), targetRef: persona("b"), schemaVersion: 1 }],
  ["location", value => validateLocation(value), { id: "l", name: "Location", schemaVersion: 1 }]
];

for (const [kind, validate, legacy] of cases) {
  test(`${kind} migration preserves unknown fields and does not mutate input`, () => {
    const raw = { ...structuredClone(legacy), futureSafe: { keep: true } };
    const before = structuredClone(raw);
    const result = validate(raw);
    assert.equal(result.valid, true, result.issues?.join(" "));
    assert.deepEqual(result.value.futureSafe, { keep: true });
    assert.deepEqual(raw, before);
  });

  test(`${kind} migration rejects malformed and future records`, () => {
    assert.equal(validate(null).valid, false);
    const future = { ...structuredClone(legacy), schemaVersion: 999 };
    assert.equal(validate(future).valid, false);
    assert.match(validate(future).issues.join(" "), /newer|unsupported/i);
  });
}
