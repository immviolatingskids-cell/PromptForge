import test from "node:test";
import assert from "node:assert/strict";
import { comparePersonas } from "../src/library-compare.js";
const base={foundation:{setting:{id:"modern"},species:{id:"human"}},life:{job:{id:"baker"}},personality:{core:{id:"patient"}},state:{stale_fields:[]}};
test("comparison reports same and changed canonical fields by section",()=>{const result=comparePersonas(base,{...base,life:{job:{id:"cartographer"}}});assert.equal(result.changedSections,1);assert.equal(result.sections.find(s=>s.id==="life").differences[0].status,"Changed");assert.equal(result.sections.find(s=>s.id==="foundation").same,true);});
test("comparison handles missing fields without similarity scores",()=>{const result=comparePersonas(base,{foundation:{setting:{id:"fantasy"}}});const foundation=result.sections.find(s=>s.id==="foundation");assert.ok(foundation.differences.some(item=>item.path.includes("species")));assert.equal(Object.hasOwn(result,"similarity"),false);});
