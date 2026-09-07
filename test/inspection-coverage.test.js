import test from "node:test";
import assert from "node:assert/strict";
import { inspectCandidates } from "../src/selection-inspector.js";
import { effectiveCoverage } from "../src/effective-coverage.js";

test("selection inspector explains contextual exclusion", () => {
  const result = inspectCandidates([{ id: "x", compatibility: { settings: ["fantasy"] } }], { settings: ["modern"] }, "x")[0];
  assert.deepEqual(result.excludedBy, ["settings"]);
  assert.equal(result.compatible, false);
});

test("effective coverage distinguishes raw entries from usable contexts", () => {
  const result = effectiveCoverage([{ id: "x", compatibility: { settings: ["modern"] } }], [{ settings: ["modern"] }, { settings: ["fantasy"] }]);
  assert.equal(result.raw, 1);
  assert.deepEqual(result.effectiveCounts, [1, 0]);
  assert.equal(result.effectiveRatio, 0.5);
});
