import { createReference, resolveReference, validateReference } from "./reference-model.js";

const now = () => new Date().toISOString();
const clean = (value, limit = 200) => String(value ?? "").trim().slice(0, limit);
const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const makeId = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const uniqueRefs = values => [...new Map((Array.isArray(values) ? values : []).map(value => {
  const checked = validateReference(value); return checked.state === "valid" && checked.reference.type === "persona" ? checked.reference : null;
}).filter(Boolean).map(value => [value.id, value])).values()];

export const CAST_KEY = "personaforge.casts.v1";
export const GROUP_KEY = "personaforge.groups.v1";
export const CAST_SCHEMA_VERSION = 1;
export const GROUP_SCHEMA_VERSION = 1;

export function normalizeCollection(raw = {}, type = "cast") {
  const source = object(raw), isGroup = type === "group", createdAt = typeof source.createdAt === "string" ? source.createdAt : now();
  return {
    schemaVersion: isGroup ? GROUP_SCHEMA_VERSION : CAST_SCHEMA_VERSION,
    id: clean(source.id || makeId(type), 160) || makeId(type), name: clean(source.name || `Untitled ${isGroup ? "Group" : "Cast"}`, 120) || `Untitled ${isGroup ? "Group" : "Cast"}`,
    description: clean(source.description, 1000), type: isGroup ? (clean(source.type, 40) || null) : undefined,
    projectRef: validateReference(source.projectRef).state === "valid" && validateReference(source.projectRef).reference.type === "project" ? validateReference(source.projectRef).reference : null,
    personaRefs: uniqueRefs(source.personaRefs), workspace: { favorite: source.workspace?.favorite === true, archived: source.workspace?.archived === true, tags: [...new Set((Array.isArray(source.workspace?.tags) ? source.workspace.tags : []).map(value => clean(value, 60)).filter(Boolean))].slice(0, 20) },
    createdAt, modifiedAt: typeof source.modifiedAt === "string" ? source.modifiedAt : createdAt,
    provenance: structuredClone(object(source.provenance?.kind ? source.provenance : { kind: "manual" }))
  };
}

export function validateCollection(raw, type = "cast") {
  const issues = [], value = normalizeCollection(raw, type);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { valid: false, issues: ["Collection must be an object."], value: null };
  if (typeof raw.id !== "string" || !raw.id.trim()) issues.push("id is required");
  if (typeof raw.name !== "string" || !raw.name.trim()) issues.push("name is required");
  for (const [index, ref] of (Array.isArray(raw.personaRefs) ? raw.personaRefs : []).entries()) { const checked = validateReference(ref); if (checked.state !== "valid" || checked.reference.type !== "persona") issues.push(`personaRefs[${index}] must be a persona reference`); }
  return { valid: !issues.length, issues, value: issues.length ? null : value };
}

class CollectionStore {
  constructor(storage = globalThis.localStorage, type = "cast") { this.storage = storage; this.type = type; this.key = type === "group" ? GROUP_KEY : CAST_KEY; }
  all() { try { const value = JSON.parse(this.storage.getItem(this.key) || "[]"); return Array.isArray(value) ? value.filter(item => validateCollection(item, this.type).valid).map(item => normalizeCollection(item, this.type)) : []; } catch { return []; } }
  write(items) { this.storage.setItem(this.key, JSON.stringify(items.map(item => normalizeCollection(item, this.type)))); }
  open(id) { return this.all().find(item => item.id === id) || null; }
  create(fields = {}) { const stamp = now(), item = normalizeCollection({ ...fields, id: fields.id || makeId(this.type), createdAt: stamp, modifiedAt: stamp }, this.type); this.write([item, ...this.all()]); return item; }
  update(id, patch = {}) { const items = this.all(), index = items.findIndex(item => item.id === id); if (index < 0) return null; items[index] = normalizeCollection({ ...items[index], ...patch, id, createdAt: items[index].createdAt, modifiedAt: now() }, this.type); this.write(items); return items[index]; }
  addPersona(id, personaId) { const item = this.open(id), ref = createReference("persona", personaId); if (!item || !ref || item.personaRefs.some(value => value.id === ref.id)) return item; return this.update(id, { personaRefs: [...item.personaRefs, ref] }); }
  removePersona(id, personaId) { const item = this.open(id); return item ? this.update(id, { personaRefs: item.personaRefs.filter(ref => ref.id !== personaId) }) : null; }
  delete(id) { const before = this.all(), next = before.filter(item => item.id !== id); if (next.length === before.length) return false; this.write(next); return true; }
  browserData() { return this.type === "group" ? { groups: this.all(), groupSchemaVersion: GROUP_SCHEMA_VERSION } : { casts: this.all(), castSchemaVersion: CAST_SCHEMA_VERSION }; }
  importBrowserData(snapshot, { collision = "rename", personaMap = {}, projectMap = {} } = {}) { const key = this.type === "group" ? "groups" : "casts", incoming = Array.isArray(snapshot?.[key]) ? snapshot[key] : [], used = new Set(this.all().map(item => item.id)), idMap = {}, accepted = []; for (const raw of incoming) { const checked = validateCollection(raw, this.type); if (!checked.valid) continue; const item = checked.value, original = item.id; item.personaRefs = item.personaRefs.map(ref => ({ ...ref, id: personaMap[ref.id] || ref.id })); if (item.projectRef?.id && projectMap[item.projectRef.id]) item.projectRef = { ...item.projectRef, id: projectMap[item.projectRef.id] }; if (used.has(item.id)) { if (collision !== "rename") continue; let suffix = 1; while (used.has(`${item.id}_import_${suffix}`)) suffix++; item.id = `${item.id}_import_${suffix}`; } used.add(item.id); idMap[original] = item.id; this.write([item, ...this.all()]); accepted.push(item); } return { imported: accepted.length, skipped: incoming.length - accepted.length, idMap, renamed: Object.entries(idMap).filter(([from, to]) => from !== to).map(([from, to]) => ({ from, to })) }; }
  diagnostics(personas = [], projects = []) { const personaIds = new Set(personas.map(persona => persona.meta?.persona_id).filter(Boolean)), projectIds = new Set(projects.map(project => project.id)), items = this.all(), refs = items.flatMap(item => item.personaRefs.map(ref => ({ item, ref }))), states = refs.map(({ ref }) => resolveReference(ref, { persona: personaIds })); return { total: items.length, totalMembershipReferences: refs.length, resolvedPersonaReferences: states.filter(value => value.state === "resolved").length, missingPersonaReferences: states.filter(value => value.state === "missing").length, invalidReferences: states.filter(value => value.state === "invalid").length, duplicateMembershipReferences: [], missingProjectReferences: items.filter(item => item.projectRef && !projectIds.has(item.projectRef.id)).map(item => item.id) }; }
}
export class CastStore extends CollectionStore { constructor(storage) { super(storage, "cast"); } }
export class GroupStore extends CollectionStore { constructor(storage) { super(storage, "group"); } }
