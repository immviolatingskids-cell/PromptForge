import { createReference, resolveReference, validateReference } from "./reference-model.js";

export const PROJECT_KEY = "personaforge.projects.v1";
export const PROJECT_SCHEMA_VERSION = 2;
const now = () => new Date().toISOString();
const id = () => `project_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function normalizeProject(raw = {}) {
  const project = raw && typeof raw === "object" ? raw : {};
  const refs = Array.isArray(project.personaRefs) ? project.personaRefs.map(ref => validateReference(ref).state === "valid" ? validateReference(ref).reference : ref).filter(Boolean) : [];
  const unique = [...new Map(refs.map(ref => [ref.id, ref])).values()];
  const sceneRefs = Array.isArray(project.sceneRefs) ? project.sceneRefs.map(ref => validateReference(ref).state === "valid" ? validateReference(ref).reference : ref).filter(Boolean) : [];
  const uniqueScenes = [...new Map(sceneRefs.map(ref => [ref.id, ref])).values()];
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: String(project.id || id()),
    name: String(project.name || "Untitled Project").trim().slice(0, 120) || "Untitled Project",
    description: String(project.description || "").slice(0, 1000),
    notes: String(project.notes || "").slice(0, 4000),
    context: { setting: String(project.context?.setting || ""), era: String(project.context?.era || ""), premise: String(project.context?.premise || "") },
    personaRefs: unique,
    sceneRefs: uniqueScenes,
    locations: Array.isArray(project.locations) ? [...new Set(project.locations.map(value => String(value).trim()).filter(Boolean))].slice(0, 100) : [],
    relationships: Array.isArray(project.relationships) ? project.relationships.filter(value => value && typeof value === "object").map(value => structuredClone(value)).slice(0, 200) : [],
    genreProfile: project.genreProfile && typeof project.genreProfile === "object" ? structuredClone(project.genreProfile) : { version: 1, genres: [], exclusions: [], overrides: {} },
    workspace: { favorite: project.workspace?.favorite === true, archived: project.workspace?.archived === true, tags: Array.isArray(project.workspace?.tags) ? project.workspace.tags.map(String).filter(Boolean).slice(0, 20) : [], lastOpenedAt: project.workspace?.lastOpenedAt || null },
    createdAt: project.createdAt || now(),
    modifiedAt: project.modifiedAt || now(),
    provenance: project.provenance && typeof project.provenance === "object" ? project.provenance : { kind: "manual" }
  };
}

export class ProjectStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  all() { try { const value = JSON.parse(this.storage.getItem(PROJECT_KEY) || "[]"); return Array.isArray(value) ? value.map(normalizeProject) : []; } catch { return []; } }
  write(items) { this.storage.setItem(PROJECT_KEY, JSON.stringify(items.map(normalizeProject))); }
  open(projectId) { return this.all().find(project => project.id === projectId) || null; }
  create(fields = {}) { const project = normalizeProject({ ...fields, id: id(), createdAt: now(), modifiedAt: now() }); this.write([project, ...this.all()]); return project; }
  update(projectId, patch = {}) { const items = this.all(); const index = items.findIndex(project => project.id === projectId); if (index < 0) return null; items[index] = normalizeProject({ ...items[index], ...patch, id: projectId, modifiedAt: now() }); this.write(items); return items[index]; }
  addPersona(projectId, personaId) { const project = this.open(projectId); const ref = createReference("persona", personaId); if (!project || !ref || project.personaRefs.some(item => item.id === ref.id)) return project; return this.update(projectId, { personaRefs: [...project.personaRefs, ref] }); }
  removePersona(projectId, personaId) { const project = this.open(projectId); if (!project) return null; return this.update(projectId, { personaRefs: project.personaRefs.filter(ref => ref.id !== personaId) }); }
  addScene(projectId, sceneId) { const project = this.open(projectId); const ref = createReference("scene", sceneId); if (!project || !ref || project.sceneRefs.some(item => item.id === ref.id)) return project; return this.update(projectId, { sceneRefs: [...project.sceneRefs, ref] }); }
  removeScene(projectId, sceneId) { const project = this.open(projectId); if (!project) return null; return this.update(projectId, { sceneRefs: project.sceneRefs.filter(ref => ref.id !== sceneId) }); }
  delete(projectId) { const before = this.all(); this.write(before.filter(project => project.id !== projectId)); return before.length !== this.all().length; }
  browserData() { return { projects: this.all(), projectSchemaVersion: PROJECT_SCHEMA_VERSION }; }
  importBrowserData(snapshot, personaIds = new Set(), { collision = "rename", personaMap = {} } = {}) { const incoming = Array.isArray(snapshot?.projects) ? snapshot.projects : []; const existing = this.all(); const used = new Set(existing.map(project => project.id)); const projectMap = new Map(); const accepted = []; const missingTargets = []; for (const raw of incoming) { const source = normalizeProject(raw); const original = source.id; let mapped = original; if (used.has(mapped)) { if (collision !== "rename") continue; let n = 1; while (used.has(`${original}_import_${n}`)) n++; mapped = `${original}_import_${n}`; } used.add(mapped); projectMap.set(original, mapped); source.id = mapped; source.personaRefs = source.personaRefs.map(ref => { const remapped = personaMap[ref.id] || ref.id; if (!personaIds.has(remapped)) missingTargets.push(remapped); return { ...ref, id: remapped }; }); accepted.push(source); } this.write([...accepted, ...existing]); return { imported: accepted.length, skipped: incoming.length - accepted.length, idMap: Object.fromEntries(projectMap), renamed: [...projectMap].filter(([from, to]) => from !== to).map(([from, to]) => ({ from, to })), missingTargets: [...new Set(missingTargets)] }; }
  diagnostics(personas = []) { const ids = new Set(personas.map(p => p.meta?.persona_id).filter(Boolean)); const projects = this.all(); const refs = projects.flatMap(p => p.personaRefs); const states = refs.map(ref => resolveReference(ref, { persona: ids })); return { totalProjects: projects.length, totalReferences: refs.length, resolvedReferences: states.filter(s => s.state === "resolved").length, missingReferences: states.filter(s => s.state === "missing").length, invalidReferences: states.filter(s => s.state === "invalid").length, duplicateReferences: projects.flatMap(p => { const ids = p.personaRefs.map(r => r.id); return ids.filter((x, i) => ids.indexOf(x) !== i); }) }; }
}
