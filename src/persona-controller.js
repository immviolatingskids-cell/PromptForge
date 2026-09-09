import { generatePersona } from "./generator.js";
import { markStale } from "./dependency-engine.js";
import { projectVisual } from "./visual-projection.js";
import { alternativesFor } from "./controlled-alternatives.js";

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
    const fresh = this.fresh(); setAt(this.persona, path, getAt(fresh, path)); markStale(this.persona, path); this.invalidateVisual(path); return true;
  }
  alternatives(path) { return alternativesFor(this.library, this.persona, path); }
  chooseAlternative(path, candidateId) {
    if (this.persona.state.locks[path]) return false;
    const projection = this.alternatives(path);
    const candidate = projection.alternatives.find((item) => item.id === candidateId);
    if (!candidate) return false;
    const mapping = projection.field;
    const source = candidate.source;
    const entry = (this.library[source] || []).find((item) => item.id === candidate.id);
    if (!entry) return false;
    setAt(this.persona, mapping, entry);
    this.persona.state.selection_provenance ||= {};
    this.persona.state.selection_provenance[path] = { origin: "user_alternative_choice", source_catalogue: source, source_id: candidate.id };
    markStale(this.persona, path); this.invalidateVisual(path); return true;
  }
  rerollSection(section) {
    const fresh = this.fresh();
    for (const path of sectionPaths(this.persona, section)) if (!this.persona.state.locks[path]) setAt(this.persona, path, getAt(fresh, path));
    markStale(this.persona, section); this.invalidateVisual(section); return true;
  }
  rerollUnlocked() {
    const fresh = this.fresh();
    for (const section of ["foundation","origin","personality","life","interests","appearance","narrative","expressions","character_hook"]) {
      for (const path of sectionPaths(this.persona, section)) if (!this.persona.state.locks[path]) { setAt(this.persona, path, getAt(fresh, path)); this.invalidateVisual(path); }
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
  visualProjection(mode = "reference") { return projectVisual(this.persona, mode); }
  toggleVisualLock(mode, field) {
    const locks = this.persona.state.visual_locks || (this.persona.state.visual_locks = {});
    const key = `${mode}.${field}`;
    if (locks[key]) { delete locks[key]; return false; }
    locks[key] = true; return true;
  }
  rerollVisualField(mode, field) {
    const locks = this.persona.state.visual_locks || {};
    if (locks[`${mode}.${field}`]) return false;
    const fresh = projectVisual(this.fresh(), mode);
    const overrides = this.persona.state.visual_overrides || (this.persona.state.visual_overrides = {});
    const modeOverrides = overrides[mode] || (overrides[mode] = {});
    if (!Object.prototype.hasOwnProperty.call(fresh, field)) return false;
    modeOverrides[field] = structuredClone(fresh[field]);
    this.persona.state.visual_stale_fields = (this.persona.state.visual_stale_fields || []).filter((item) => item !== `${mode}.${field}`);
    return true;
  }
  rerollVisualProjection(mode = "reference") {
    const projection = this.visualProjection(mode);
    for (const field of ["wardrobe", "accessories", "makeup", "activity", "expression", "pose", "environment", "camera", "lighting"]) if (projection[field] !== null && projection[field] !== undefined) this.rerollVisualField(mode, field);
    return this.visualProjection(mode);
  }
  invalidateVisual(changedPath) {
    const map = { "appearance.surface": ["appearance", "wardrobe"], "appearance.visual": ["appearance"], "appearance.clothing_style": ["wardrobe"], "appearance.signature_outfit": ["wardrobe"], "life.job": ["occupation", "environment"], "interests.hobbies": ["activity", "environment"], "life.housing": ["environment"], "origin.current_location": ["environment"], "narrative.integration": ["scene"] };
    const fields = map[changedPath] || [];
    const overrides = this.persona.state.visual_overrides || {};
    const locks = this.persona.state.visual_locks || {};
    for (const mode of Object.keys(overrides)) for (const field of fields) if (!locks[`${mode}.${field}`]) delete overrides[mode][field];
    this.persona.state.visual_stale_fields = [...new Set([...(this.persona.state.visual_stale_fields || []), ...fields.map((field) => `*.*.${field}`)])];
    return this.persona.state.visual_stale_fields;
  }
}
