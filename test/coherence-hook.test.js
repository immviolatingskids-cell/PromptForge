import test from "node:test";
import assert from "node:assert/strict";
import { createCharacterHook } from "../src/character-hook.js";
import { runCoherence } from "../src/coherence.js";
import { distinctByCluster } from "../src/similarity-guard.js";

test("similarity guard keeps one concept from each cluster",()=>{const entries=[{id:"quiet",metadata:{cluster:"reserved"}},{id:"shy",metadata:{cluster:"reserved"}},{id:"playful",metadata:{cluster:"humour"}}];assert.deepEqual(distinctByCluster(entries,3).map((x)=>x.id),["quiet","playful"]);});
test("character hook only connects existing facts",()=>{const persona={origin:{name:"Aiko Sato"},life:{job:{name:"Librarian"},primary_role:"Employed"},interests:{hobbies:[{name:"Photography"}]},narrative:{signature_item:{name:"Grandfather's camera"}},personality:{quirk:{name:"Names houseplants"}}};const hook=createCharacterHook(persona,{integer:()=>3});for(const fact of ["Aiko Sato","librarian","photography","grandfather's camera","names houseplants"])assert.ok(hook.text.toLowerCase().includes(fact.toLowerCase()));assert.equal(hook.connections.length,3);});
test("coherence repairs species age and then rechecks experience",()=>{const persona={foundation:{age:200,species:{metadata:{life_stage_ranges:{young_adult:[80,149]}}},life_stage:{id:"young_adult"},era:{metadata:{}}},life:{experience_years:180,income_band:"moderate",housing:{metadata:{income_bands:["moderate"]}},job:null},interests:{hobbies:[{compatibility:{life_stages:[]}}]},state:{}};runCoherence(persona);assert.equal(persona.foundation.age,149);assert.ok(persona.life.experience_years<=133);assert.ok(persona.state.coherence_checks.length>=8);});
