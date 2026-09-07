import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { generatePersona } from "../src/generator.js";
import { structuredOccupation } from "../src/structured-fields.js";
import { normalizePersona } from "../src/persona-store.js";

const values = JSON.parse(await fs.readFile(new URL("../data/lifestyle/occupations.json", import.meta.url)));
const paths = {settings:"core/settings", eras:"core/eras", lifeStages:"core/life_stages", countries:"core/countries", species:"identity/species", heritage:"identity/heritage", givenNames:"identity/names/given_names", familyNames:"identity/names/family_names", traits:"personality/traits", flaws:"personality/flaws", values:"personality/values", habits:"personality/habits", quirks:"personality/quirks", hobbies:"lifestyle/hobbies", interests:"lifestyle/interests", occupations:"lifestyle/occupations", education:"lifestyle/education", housing:"lifestyle/housing", transport:"lifestyle/transport", hair:"appearance/hair", eyes:"appearance/eyes", body:"appearance/body", features:"appearance/features", clothingStyles:"clothing/styles", outfits:"clothing/signature_outfits", goals:"narrative/goals", secrets:"narrative/secrets", signatureItems:"narrative/signature_items", expressions:"narrative/expressions"};
const library={}; for(const [key,path] of Object.entries(paths)) library[key]=JSON.parse(await fs.readFile(new URL(`../data/${path}.json`,import.meta.url)));

test("occupation catalogue has meaningful family and role structure",()=>{assert.equal(values.length,40);assert.ok(new Set(values.map(x=>x.metadata.family)).size>=15);assert.ok(values.every(x=>x.metadata.cluster&&x.metadata.career_levels&&x.metadata.employment_types&&x.metadata.environments));});
test("structured occupation exposes taxonomy and life-structure metadata",()=>{const item=structuredOccupation(values.find(x=>x.id==="software_developer"));assert.equal(item.family,"technology");assert.ok(item.career_levels.includes("senior"));assert.ok(item.work_arrangements.includes("remote"));});
test("generated occupation profile is deterministic and context-rich",()=>{const a=generatePersona(library,{seed:"occupation-profile",mode:"varied"});const b=generatePersona(library,{seed:"occupation-profile",mode:"varied"});assert.deepEqual(a.life,b.life);assert.ok(a.life.job);assert.ok(a.life.career_level);assert.ok(a.life.employment_type);assert.ok(a.life.work_environment);assert.ok(a.life.occupation_entry_route);});
test("legacy occupation data normalizes without fabricating life facts",()=>{const p=normalizePersona({personality:{values:[{id:"loyalty"}]},life:{job:{id:"librarian",name:"Librarian"}},state:{}});assert.equal(p.life.structured_occupation.id,"librarian");assert.equal(p.life.career_level,undefined);assert.equal(p.life.employment_type,undefined);});
