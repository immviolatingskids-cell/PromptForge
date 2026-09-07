import test from "node:test";
import assert from "node:assert/strict";
import { buildNarrativeState, narrativeProse } from "../src/narrative-integration.js";
import { roleplayPackage } from "../src/reference-writer.js";
import { normalizePersona } from "../src/persona-store.js";

const rng=(values=[0.2])=>{let i=0;return {choice:(items)=>items[Math.floor((values[i++%values.length]||0)*items.length)%items.length],next:()=>values[i++%values.length]||0};};
const persona={personality:{values:{primary:{id:"independence",name:"Independence"},secondary:null,tension:{id:"belonging",name:"Belonging"}},flaw:{id:"avoids_help",name:"Avoids asking for help"},core:{id:"reserved"}},life:{daily_rhythm:"structured_weekday",job:{id:"engineer"},housing:{id:"shared_flat"}},interests:{hobbies:[{id:"pottery"}]},narrative:{goal:{id:"master_a_craft",name:"Master a demanding craft"}}};

test("structured narrative is deterministic and source-traceable",()=>{const a=buildNarrativeState(persona,rng([0.1,0.2,0.3]),"varied");const b=buildNarrativeState(persona,rng([0.1,0.2,0.3]),"varied");assert.deepEqual(a,b);for(const group of [a.motivations,a.tensions,a.pressures,a.arc_seeds,a.scene_hooks])for(const item of group)assert.ok(item.sources.length>=1);});
test("goals, motivations and conflicts remain distinct concepts",()=>{const n=buildNarrativeState(persona,rng([0.1,0.2,0.3]),"varied");assert.notEqual(n.goals.short_term.type,n.motivations[0].type);assert.notEqual(n.tensions[0].text,n.goals.short_term.text);assert.ok(n.goals.short_term.domain);});
test("roleplay package exposes actionable present-tense hooks",()=>{const integration=buildNarrativeState(persona,rng(),"grounded");const rp=roleplayPackage({...persona,narrative:{...persona.narrative,integration}});assert.ok(rp.current_goal&&rp.current_tension&&rp.scene_hook);});
test("legacy normalization does not invent narrative integration",()=>{const old=normalizePersona({...persona,narrative:{goal:persona.narrative.goal},state:{}});assert.equal(old.narrative.integration,undefined);});
test("narrative prose projects only structured elements",()=>{const state=buildNarrativeState(persona,rng(),"grounded");const text=narrativeProse(state);assert.ok(text.includes(state.goals.short_term.text));assert.ok(text.includes(state.tensions[0].text));});
