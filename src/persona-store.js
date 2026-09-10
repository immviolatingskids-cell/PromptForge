import { normalizeValueProfile } from "./value-profile.js";
import { structuredOccupation } from "./structured-fields.js";
import { normalizeGenreProfile } from "./genre-profile.js";
import { normalizeCharacterIntelligence } from "./character-intelligence.js";
import { normalizePurposeReference } from "./reference-model.js";
import { applyContinuityEvent, normalizeCharacterContinuity } from "./character-continuity.js";
import { versionMetadata } from "./versioning.js";
const KEY="personaforge.personas.v1";
const DRAFT_KEY="personaforge.workspace.v1";
const META_KEY="personaforge.persona-library.v1";
export function normalizeLibraryMetadata(metadata={} , id=""){
  const source=metadata&&typeof metadata==="object"?metadata:{};
  const tags=Array.isArray(source.tags)?source.tags.map(tag=>String(tag).trim()).filter(Boolean).reduce((all,tag)=>all.some(existing=>existing.toLowerCase()===tag.toLowerCase())?all:[...all,tag],[]):[];
  const lineage=source.lineage&&typeof source.lineage==="object"&&source.lineage.relation==="variant"&&source.lineage.parentPersonaId&&source.lineage.parentPersonaId!==id
    ?{parentPersonaId:String(source.lineage.parentPersonaId),relation:"variant"}:null;
  return {favorite:source.favorite===true,tags,archived:source.archived===true,createdAt:typeof source.createdAt==="string"?source.createdAt:null,updatedAt:typeof source.updatedAt==="string"?source.updatedAt:null,lastOpenedAt:typeof source.lastOpenedAt==="string"?source.lastOpenedAt:null,variantLabel:typeof source.variantLabel==="string"?source.variantLabel.trim().slice(0,80):"",lineage};
}
export function normalizePersona(persona){
  const copy=structuredClone(persona);
  if(copy?.personality)copy.personality.values=normalizeValueProfile(copy.personality.values);
  if(copy?.life?.job && !copy.life.structured_occupation) copy.life.structured_occupation=structuredOccupation(copy.life.job);
  if(copy?.life && !copy.life.experience) copy.life.experience={total_years:copy.life.experience_years||0,field_years:copy.life.experience_years||0,current_role_years:copy.life.experience_years||0,training_years:0};
  if(copy?.life && !copy.life.housing_profile && copy.life.housing) copy.life.housing_profile={type:copy.life.housing.id||copy.life.housing,tenure:"unknown",household:"unknown"};
  if(copy?.life && !copy.life.mobility && copy.life.transport) copy.life.mobility={primary:copy.life.transport.id||copy.life.transport,secondary:null,access:"unknown"};
  if(copy?.interests?.hobbies) copy.interests.hobbies=copy.interests.hobbies.map((hobby)=>({commitment:"casual",participation_style:"solo",social_context:"independent",...hobby}));
  if(copy?.personality && !copy.personality.depth) copy.personality.depth={traits:[copy.personality.core?.id||copy.personality.core].filter(Boolean),flaw:copy.personality.flaw?.id||copy.personality.flaw||null,habit:copy.personality.habit?.id||copy.personality.habit||null,quirk:copy.personality.quirk?.id||copy.personality.quirk||null,value_families:[]};
  if(copy?.origin && !copy.origin.structured_origin) copy.origin.structured_origin={residence:copy.foundation?.country?.id||null,birthplace:copy.origin.birthplace?.id||copy.origin.birthplace||null,upbringing:null,name_origin:{given:null,surname:null},languages:[]};
  copy.style_profile=normalizeGenreProfile(copy.style_profile||copy.extensions?.promptforge?.styleProfile||{});
  copy.extensions ||= {};
  copy.extensions.promptforge ||= {};
  const projectContexts=copy.extensions.promptforge.projectContexts;
  copy.extensions.promptforge.projectContexts=projectContexts&&typeof projectContexts==="object"&&!Array.isArray(projectContexts)?projectContexts:{};
  const overrides=copy.extensions.promptforge.characterOverrides;
  copy.extensions.promptforge.characterOverrides=overrides&&typeof overrides==="object"&&!Array.isArray(overrides)?overrides:{};
  copy.extensions.promptforge.characterIntelligence=normalizeCharacterIntelligence(copy.extensions.promptforge.characterIntelligence||{});
  copy.extensions.promptforge.references=Array.isArray(copy.extensions.promptforge.references)
    ? copy.extensions.promptforge.references.map(normalizePurposeReference).filter(Boolean)
    : [];
  copy.extensions.promptforge.continuity=normalizeCharacterContinuity(copy.extensions.promptforge.continuity||{});
  copy.state ||= {}; copy.state.locks ||= {}; copy.state.stale_fields ||= []; copy.state.warnings ||= [];
  return copy;
}
export class PersonaStore{
  constructor(storage=globalThis.localStorage){this.storage=storage;}
  all(){try{const value=JSON.parse(this.storage.getItem(KEY)||"[]");return Array.isArray(value)?value:[];}catch{return[];}}
  write(items){this.storage.setItem(KEY,JSON.stringify(items));}
  metadata(){try{const value=JSON.parse(this.storage.getItem(META_KEY)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}catch{return{};}}
  writeMetadata(value){this.storage.setItem(META_KEY,JSON.stringify(value));}
  libraryMetadata(id){return normalizeLibraryMetadata(this.metadata()[id],id);}
  updateMetadata(id,patch={}){const all=this.metadata();const current=this.libraryMetadata(id);const next=normalizeLibraryMetadata({...current,...patch},id);all[id]=next;this.writeMetadata(all);return next;}
  allWithMetadata(){return this.all().map(persona=>({persona,metadata:this.libraryMetadata(persona.meta?.persona_id)}));}
  browserData(){return {personas:this.all(),personaLibrary:structuredClone(this.metadata()),versionMetadata:versionMetadata()};}
  importBrowserData(snapshot,{collision="rename"}={}){const incoming=Array.isArray(snapshot?.personas)?snapshot.personas:[];const incomingMeta=snapshot?.personaLibrary&&typeof snapshot.personaLibrary==="object"?snapshot.personaLibrary:{};const existing=this.all(),used=new Set(existing.map(persona=>persona.meta?.persona_id).filter(Boolean)),idMap=new Map(),accepted=[];for(const raw of incoming){const source=normalizePersona(raw);const original=source.meta?.persona_id;if(!original)continue;let id=String(original);if(used.has(id)){if(collision!=="rename")continue;let suffix=1;while(used.has(`${id}_import_${suffix}`))suffix++;id=`${id}_import_${suffix}`;}used.add(id);idMap.set(String(original),id);source.meta.persona_id=id;accepted.push(source);}const metadata=this.metadata();for(const persona of accepted){const sourceId=[...idMap].find(([,mapped])=>mapped===persona.meta.persona_id)?.[0]||persona.meta.persona_id;const source=normalizeLibraryMetadata(incomingMeta[sourceId],sourceId);if(source.lineage){source.lineage={...source.lineage,parentPersonaId:idMap.get(source.lineage.parentPersonaId)||source.lineage.parentPersonaId};}metadata[persona.meta.persona_id]=normalizeLibraryMetadata(source,persona.meta.persona_id);}this.write([...accepted,...existing]);this.writeMetadata(metadata);return {imported:accepted.length,skipped:incoming.length-accepted.length,idMap:Object.fromEntries(idMap),renamed:[...idMap].filter(([from,to])=>from!==to).map(([from,to])=>({from,to}))};}
  libraryDiagnostics(){const personas=this.all(),ids=personas.map(persona=>persona.meta?.persona_id).filter(Boolean),counts=ids.reduce((map,id)=>map.set(id,(map.get(id)||0)+1),new Map()),raw=this.metadata(),missingParents=[],selfParents=[],cycles=[];const parentOf=id=>raw[id]?.lineage?.relation==="variant"?raw[id].lineage.parentPersonaId:null;for(const id of ids){const parent=parentOf(id);if(!parent)continue;if(parent===id)selfParents.push(id);else if(!ids.includes(parent))missingParents.push({id,parent});let current=id,seen=[];while(current){if(seen.includes(current)){cycles.push([...seen.slice(seen.indexOf(current)),current]);break;}seen.push(current);current=parentOf(current);}}return {savedRecordCount:personas.length,duplicatePersonaIds:[...counts].filter(([,count])=>count>1).map(([id])=>id),metadataRecordCount:Object.keys(raw).length,missingParents,selfParents,cycles,archivedCount:this.allWithMetadata().filter(item=>item.metadata.archived).length,favoriteCount:this.allWithMetadata().filter(item=>item.metadata.favorite).length};}
  save(persona){const copy=structuredClone(persona),now=new Date().toISOString();const items=this.all();const index=items.findIndex((item)=>item.meta.persona_id===copy.meta.persona_id);copy.meta.created_at=index>=0?items[index].meta.created_at||now:copy.meta.created_at||now;copy.meta.modified_at=now;if(index>=0)items[index]=copy;else items.unshift(copy);this.write(items);const id=copy.meta.persona_id;const current=this.libraryMetadata(id);this.updateMetadata(id,{createdAt:current.createdAt||copy.meta.created_at,updatedAt:now});return copy;}
  open(id){const item=this.all().find((persona)=>persona.meta.persona_id===id);return item?normalizePersona(item):null;}
  updateContinuity(id,event,options={}){const persona=this.open(id);if(!persona)return null;persona.extensions.promptforge.continuity=applyContinuityEvent(persona.extensions.promptforge.continuity,event,options);return this.save(persona);}
  duplicate(id){const source=this.open(id);if(!source)throw new Error(`Persona not found: ${id}`);const sourceMeta=this.libraryMetadata(id);const suffix=Date.now();source.meta.persona_id=`${id}_copy_${suffix}`;source.meta.created_at=new Date().toISOString();source.meta.modified_at=source.meta.created_at;source.origin.name=`${source.origin.name} Copy`;const copy=this.save(source);this.updateMetadata(copy.meta.persona_id,{tags:sourceMeta.tags,variantLabel:"",lineage:null});return copy;}
  createVariant(id,label=""){const source=this.open(id);if(!source)throw new Error(`Persona not found: ${id}`);const sourceMeta=this.libraryMetadata(id);const suffix=Date.now();source.meta.persona_id=`${id}_variant_${suffix}`;source.meta.created_at=new Date().toISOString();source.meta.modified_at=source.meta.created_at;source.origin.name=`${source.origin.name} Variant`;const copy=this.save(source);this.updateMetadata(copy.meta.persona_id,{tags:sourceMeta.tags,variantLabel:String(label).trim().slice(0,80),lineage:{parentPersonaId:id,relation:"variant"}});return copy;}
  delete(id){const items=this.all();const next=items.filter((persona)=>persona.meta.persona_id!==id);if(next.length===items.length)return false;this.write(next);return true;}
  saveWorkspace(persona){if(!persona){if(this.storage.removeItem)this.storage.removeItem(DRAFT_KEY);else this.storage.setItem(DRAFT_KEY,null);return;}this.storage.setItem(DRAFT_KEY,JSON.stringify({saved_at:new Date().toISOString(),persona}));}
  workspace(){try{const value=JSON.parse(this.storage.getItem(DRAFT_KEY)||"null");return value?.persona?normalizePersona(value.persona):null;}catch{return null;}}
  clearWorkspace(){if(this.storage.removeItem)this.storage.removeItem(DRAFT_KEY);else this.storage.setItem(DRAFT_KEY,null);}
}
