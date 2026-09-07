import { normalizeValueProfile } from "./value-profile.js";
const KEY="personaforge.personas.v1";
export function normalizePersona(persona){
  const copy=structuredClone(persona);
  if(copy?.personality)copy.personality.values=normalizeValueProfile(copy.personality.values);
  copy.state ||= {}; copy.state.locks ||= {}; copy.state.stale_fields ||= []; copy.state.warnings ||= [];
  return copy;
}
export class PersonaStore{
  constructor(storage=globalThis.localStorage){this.storage=storage;}
  all(){try{const value=JSON.parse(this.storage.getItem(KEY)||"[]");return Array.isArray(value)?value:[];}catch{return[];}}
  write(items){this.storage.setItem(KEY,JSON.stringify(items));}
  save(persona){const copy=structuredClone(persona),now=new Date().toISOString();const items=this.all();const index=items.findIndex((item)=>item.meta.persona_id===copy.meta.persona_id);copy.meta.created_at=index>=0?items[index].meta.created_at||now:copy.meta.created_at||now;copy.meta.modified_at=now;if(index>=0)items[index]=copy;else items.unshift(copy);this.write(items);return copy;}
  open(id){const item=this.all().find((persona)=>persona.meta.persona_id===id);return item?normalizePersona(item):null;}
  duplicate(id){const source=this.open(id);if(!source)throw new Error(`Persona not found: ${id}`);const suffix=Date.now();source.meta.persona_id=`${id}_copy_${suffix}`;source.meta.created_at=new Date().toISOString();source.meta.modified_at=source.meta.created_at;source.origin.name=`${source.origin.name} Copy`;return this.save(source);}
  delete(id){const items=this.all();const next=items.filter((persona)=>persona.meta.persona_id!==id);if(next.length===items.length)return false;this.write(next);return true;}
}
