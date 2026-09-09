import test from "node:test";
import assert from "node:assert/strict";
import { auditProjectCoherence } from "../src/project-coherence.js";
test("coherence audit reports actionable severity for missing and stale graph records", () => { const result = auditProjectCoherence({ project: { id: "p", personaRefs: [{ id: "gone" }], sceneRefs: [{ id: "s" }] }, personas: [], scenes: [{ id: "s", projectRef: { id: "p" }, state: { stale: true } }] }); assert.equal(result.status, "error"); assert.ok(result.issues.some(item => item.code === "missing-persona")); assert.ok(result.issues.some(item => item.code === "stale-scene")); assert.ok(result.issues.every(item => item.recovery)); });
test("coherence audit stays ready for a complete graph", () => { const result = auditProjectCoherence({ project: { id: "p", personaRefs: [{ id: "a" }] }, personas: [{ meta: { persona_id: "a" } }] }); assert.equal(result.status, "ready"); assert.deepEqual(result.counts, { error: 0, warning: 0, info: 0 }); });
