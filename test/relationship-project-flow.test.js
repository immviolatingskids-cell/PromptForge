import test from "node:test";
import assert from "node:assert/strict";
import { ProjectStore } from "../src/project-store.js";
import { RelationshipStore } from "../src/relationship-store.js";
class Memory { constructor(){this.data=new Map();} getItem(k){return this.data.get(k)||null;} setItem(k,v){this.data.set(k,v);} }
const ref = id => ({ type: "persona", id });
test("project relationship flow creates, displays, edits, deletes, exports, and duplicates coherently", () => {
  const memory = new Memory(), projects = new ProjectStore(memory), relationships = new RelationshipStore(memory), project = projects.create({ name: "Flow", personaRefs: [ref("a"), ref("b")] });
  const relationship = relationships.create({ projectRef: { type: "project", id: project.id }, sourceRef: ref("a"), targetRef: ref("b"), type: "romantic_interest", status: "active", description: "Shared history" });
  projects.update(project.id, { relationshipRefs: [{ type: "relationship", id: relationship.id }] });
  assert.equal(relationships.open(relationship.id).description, "Shared history");
  relationships.update(relationship.id, { status: "former", description: "Past connection" });
  assert.equal(relationships.open(relationship.id).status, "former");
  assert.deepEqual(JSON.parse(projects.export(project.id)).project.relationshipRefs, []);
  const copy = projects.duplicate(project.id); assert.deepEqual(copy.relationshipRefs, []);
  relationships.delete(relationship.id); projects.update(project.id, { relationshipRefs: [] }); assert.equal(relationships.open(relationship.id), null); assert.deepEqual(projects.open(project.id).relationshipRefs, []);
});
