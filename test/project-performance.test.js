import test from "node:test";
import assert from "node:assert/strict";
import { ProjectStore, normalizeProject } from "../src/project-store.js";
class Memory { constructor(){this.map=new Map();} getItem(k){return this.map.get(k)??null;} setItem(k,v){this.map.set(k,v);} }
test("project listing, resolution, and diagnostics remain bounded at representative sizes",()=>{for(const count of [10,50,100]){const store=new ProjectStore(new Memory());store.write(Array.from({length:count},(_,i)=>normalizeProject({id:`project_${i}`,name:`Project ${i}`,personaRefs:Array.from({length:Math.min(100,5+(i%4)*20)},(_,j)=>({type:"persona",id:`persona_${j}`}))})));const start=performance.now();for(let pass=0;pass<20;pass++){store.all();store.diagnostics(Array.from({length:100},(_,i)=>({meta:{persona_id:`persona_${i}`}})));}assert.ok(performance.now()-start<2000,`project operations exceeded 2s at ${count} projects`);}});
