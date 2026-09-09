import test from "node:test";
import assert from "node:assert/strict";
import { GENRE_REGISTRY, attachGenreProfile, genreProfileFor, normalizeGenreProfile, weightedGenreInfluences } from "../src/genre-profile.js";
import { normalizePersona, PersonaStore } from "../src/persona-store.js";
import { SceneStore, sceneReferences } from "../src/scene-store.js";
import { assembleProjectContext, resolveScene } from "../src/scene-resolver.js";

class Memory { constructor(){this.map=new Map();} getItem(key){return this.map.get(key)??null;} setItem(key,value){this.map.set(key,value);} removeItem(key){this.map.delete(key);} }
const value=(name,id=name.toLowerCase().replaceAll(" ","_"))=>({name,id});
const persona={
  meta:{persona_id:"persona_maya",seed:"maya-001",variance:"varied"},
  origin:{name:"Maya Chen",current_location:"Manchester"},
  foundation:{age:24,gender:"female",life_stage:value("Young Adult","young_adult"),species:value("Human","human"),country:value("United Kingdom","gb")},
  personality:{core:value("Curious"),complementary:[value("Reserved")],values:value("Independence")},
  appearance:{surface:{},visual:{body:value("slender"),hair:value("dark wavy hair"),eyes:value("brown eyes"),feature:value("glasses")},clothing_style:value("smart casual"),signature_outfit:value("soft black hoodie")},
  life:{job:value("Frontend Developer"),work_environment:"home office",housing:value("apartment")},
  interests:{hobbies:[{...value("Photography"),participation_style:"solo"}]},
  narrative:{integration:{scene_hooks:[{text:"building a personal app after work"}]}},
  state:{locks:{},stale_fields:[],warnings:[]}
};

test("genre profiles support zero, one, and normalized weighted blends",()=>{
  assert.deepEqual(normalizeGenreProfile().genres,[]);
  const one=normalizeGenreProfile({genres:[{id:"minimalist",weight:20}]});
  assert.deepEqual(one.genres,[{id:"minimalist",weight:1}]);
  const blend=normalizeGenreProfile({genres:[{id:"tech-girlie",weight:55},{id:"minimalist",weight:20},{id:"streetwear",weight:15},{id:"y2k",weight:10}]});
  assert.deepEqual(blend.genres.map(item=>item.weight),[.55,.2,.15,.1]);
  assert.equal(blend.genres.reduce((sum,item)=>sum+item.weight,0),1);
  assert.ok(GENRE_REGISTRY.every(genre=>genre.definition&&genre.family&&genre.affinities&&genre.provenance));
});

test("genre exclusions remove conflicting soft affinities",()=>{
  const profile=normalizeGenreProfile({genres:[{id:"tech-girlie",weight:1}],exclusions:["laptop"]});
  assert.ok(weightedGenreInfluences(profile,"props").every(item=>!item.value.includes("laptop")));
});

test("legacy personas normalize to a genre-free profile and persist additive profiles",()=>{
  const legacy=normalizePersona(persona);
  assert.deepEqual(legacy.style_profile.genres,[]);
  const styled=attachGenreProfile(legacy,{genres:[{id:"minimalist",weight:1}]});
  const store=new PersonaStore(new Memory());store.save(styled);
  assert.deepEqual(genreProfileFor(store.open("persona_maya")).genres,[{id:"minimalist",weight:1}]);
});

test("scene resolution is deterministic and respects scene over project over genre",()=>{
  const styled=attachGenreProfile(normalizePersona(persona),{genres:[{id:"tech-girlie",weight:1}],exclusions:["coffee"]});
  styled.extensions.promptforge.characterOverrides={personality:"quietly focused",currentLife:"building a personal app",exclusions:["coffee"]};
  const project={context:{setting:"Manchester",premise:"Everyday creative life"},locations:["Local café"],notes:"Grounded contemporary moments"};
  const input={persona:styled,project,requirements:{location:"Library",activity:"Sketching interface ideas",time:"Late afternoon",socialContext:"Alone",mood:"Calm and focused"},seed:"scene-1"};
  const first=resolveScene(input),second=resolveScene(input);
  assert.deepEqual(first,second);
  assert.equal(first.environment,"Library");
  assert.equal(first.activity,"Sketching interface ideas");
  assert.equal(first.sources.location,"scene requirement");
  assert.match(first.prompt,/Late afternoon/i);
  assert.doesNotMatch(first.prompt,/coffee/i);
});

test("project context fills blank scene fields before genre influence",()=>{
  const styled=attachGenreProfile(normalizePersona(persona),{genres:[{id:"dark-academia",weight:1}]});
  const result=resolveScene({persona:styled,project:{context:{setting:"University",premise:"Research term"},locations:["Archive room"]},requirements:{},seed:"scene-2"});
  assert.equal(result.environment,"Archive room");
  assert.equal(result.sources.location,"project context");
  assert.equal(assembleProjectContext(null).locations.length,0);
});

test("scene storage keeps references and output without copying character or project",()=>{
  const store=new SceneStore(new Memory());
  const refs=sceneReferences("persona_maya","project_life");
  const scene=store.create({title:"Café Coding",...refs,requirements:{location:"Café",activity:"Coding"},resolved:{sources:{location:"scene requirement"}},output:{prompt:"A focused coding scene"}});
  const saved=store.open(scene.id);
  assert.deepEqual(saved.characterRef,{type:"persona",id:"persona_maya"});
  assert.deepEqual(saved.projectRef,{type:"project",id:"project_life"});
  assert.equal(saved.persona,undefined);
  assert.equal(saved.project,undefined);
});
