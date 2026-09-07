import test from "node:test";
import assert from "node:assert/strict";
import { structuredName, structuredOccupation, structuredHobby } from "../src/structured-fields.js";

test("structured fields normalize names, occupations, and hobbies", () => {
  assert.equal(structuredName("A", "B").display, "A B");
  assert.equal(structuredOccupation({ id: "x", name: "Archivist", metadata: { category: "knowledge", specialisation: "history" } }).specialisation, "history");
  assert.equal(structuredHobby({ id: "x", name: "Painting", metadata: { variant: "watercolour" } }).variant, "watercolour");
});
