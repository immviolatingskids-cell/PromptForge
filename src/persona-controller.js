import { generatePersona } from "./generator.js";
import { markStale } from "./dependency-engine.js";

export function getAt(object, path) { return path.split(".").reduce((value, key) => value?.[key], object); }
export function setAt(object, path, value) { const keys = path.split("."); const last = keys.pop(); const parent = keys.reduce((value, key) => value[key], object); parent[last] = structuredClone(value); }

function sectionPaths(persona, section) {
  const paths=[];
  for(const key of Object.keys(persona[section])) {
    if(section==="personality"&&key==="values") for(const role of ["primary","secondary","tension"]) paths.push(`personality.values.${role}`);
    else paths.push(`${section}.${key}`);
  }
  return paths;
}

function foundationAnchors(persona) {
  return Object.fromEntries(["setting", "era", "gender", "species", "age", "life_stage", "country"].filter((key) => persona.state.locks[`foundation.${key}`]).map((key) => [key, persona.foundation[key]?.id ?? persona.foundation[key]]));
}

export class PersonaController {
  constructor(library, persona) { this.library = library; this.persona = persona; this.counter = 0; }
  toggleLock(path) {
    const next = !this.persona.state.locks[path];
    if (next) this.persona.state.locks[path] = true; else delete this.persona.state.locks[path];
    return next;
  }
  toggleSection(section) {
    const paths = sectionPaths(this.persona, section);
    const next = !paths.every((path) => this.persona.state.locks[path]);
    for (const path of paths) if (next) this.persona.state.locks[path] = true; else delete this.persona.state.locks[path];
  }
  fresh() { this.counter += 1; return generatePersona(this.library, {seed:`${this.persona.meta.seed}:${this.counter}`, mode:this.persona.meta.variance || "varied", anchors:foundationAnchors(this.persona)}); }
  rerollField(path) {
    if (this.persona.state.locks[path]) return false;
    const fresh = this.fresh(); setAt(this.persona, path, getAt(fresh, path)); markStale(this.persona, path); return true;
  }
  rerollSection(section) {
    const fresh = this.fresh();
    for (const path of sectionPaths(this.persona, section)) if (!this.persona.state.locks[path]) setAt(this.persona, path, getAt(fresh, path));
    markStale(this.persona, section); return true;
  }
  rerollUnlocked() {
    const fresh = this.fresh();
    for (const section of ["foundation","origin","personality","life","interests","appearance","narrative","expressions","character_hook"]) {
      for (const path of sectionPaths(this.persona, section)) if (!this.persona.state.locks[path]) setAt(this.persona, path, getAt(fresh, path));
    }
    this.persona.state.stale_fields = []; return this.persona;
  }
  regenerateAffected() {
    const fresh = this.fresh();
    for (const path of this.persona.state.stale_fields) if (!this.persona.state.locks[path] && getAt(fresh, path) !== undefined) setAt(this.persona, path, getAt(fresh, path));
    this.persona.state.stale_fields = []; return this.persona;
  }
  keepExisting() { this.persona.state.stale_fields = []; }
  rerollHook() { const fresh = this.fresh(); this.persona.character_hook = fresh.character_hook; return this.persona.character_hook; }
  rerollVisual() { const fresh=this.fresh(); for(const key of ["surface","visual","clothing_style","signature_outfit"]) if(!this.persona.state.locks[`appearance.${key}`]) this.persona.appearance[key]=structuredClone(fresh.appearance[key]); return this.persona.appearance; }
}
