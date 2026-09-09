import test from "node:test";
import assert from "node:assert/strict";
import { APPLICATION_VERSION, versionMetadata, migrateRecord } from "../src/versioning.js";

test("v1 metadata keeps record families independent", () => {
  const metadata = versionMetadata();
  assert.equal(metadata.application, APPLICATION_VERSION);
  assert.deepEqual(Object.keys(metadata).sort(), ["application", "contextPackage", "project", "projection", "scene"]);
  assert.equal(metadata.project, 1);
  assert.equal(metadata.scene, 1);
  assert.equal(metadata.projection, 1);
  assert.equal(metadata.contextPackage, 1);
});

test("legacy migration is additive and preserves unknown future-safe fields", () => {
  const raw = { schemaVersion: 1, id: "legacy", unknownExtension: { keep: true } };
  const result = migrateRecord(raw, { kind: "project", currentVersion: 2 });
  assert.equal(result.valid, true);
  assert.equal(result.migrated, true);
  assert.deepEqual(result.value.unknownExtension, { keep: true });
  assert.deepEqual(raw, { schemaVersion: 1, id: "legacy", unknownExtension: { keep: true } });
});

test("future and malformed records are rejected honestly", () => {
  assert.equal(migrateRecord({ projectVersion: 9 }, { kind: "project", currentVersion: 1 }).valid, false);
  assert.equal(migrateRecord({ projectVersion: "nope" }, { kind: "project", currentVersion: 1 }).valid, false);
  assert.equal(migrateRecord(null, { kind: "project" }).valid, false);
});
