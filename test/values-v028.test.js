import test from "node:test";
import assert from "node:assert/strict";
import { compatibilityScore } from "../src/candidate-ranker.js";
import { selectDistinctRanked } from "../src/similarity-guard.js";

test("value selection excludes a repeated conceptual cluster", () => {
  const entries = [
    {id:"autonomy",metadata:{family:"self_direction",cluster:"autonomy"}},
    {id:"independence",metadata:{family:"self_direction",cluster:"autonomy"}},
    {id:"friendship",metadata:{family:"connection",cluster:"friendship"}}
  ];
  const selected = selectDistinctRanked(entries, 2, (eligible) => eligible[0]);
  assert.deepEqual(selected.map((entry) => entry.id), ["autonomy", "friendship"]);
});

test("context affinity is a soft bonus and never a hard restriction", () => {
  const affinity = {id:"discovery",compatibility:{settings:[]},metadata:{context_affinities:{settings:["fantasy"]}}};
  const general = {id:"privacy",compatibility:{settings:[]}};
  assert.ok(compatibilityScore(affinity,{settings:["fantasy"]}) > compatibilityScore(general,{settings:["fantasy"]}));
  assert.equal(compatibilityScore(affinity,{settings:["modern"]}), compatibilityScore(general,{settings:["modern"]}));
});
