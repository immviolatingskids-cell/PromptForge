import { createReference, resolveReference, validateReference } from "./reference-model.js";

export const PROJECT_KEY = "personaforge.projects.v1";
export const PROJECT_SCHEMA_VERSION = 3;
export const PROJECT_APPLICATION_VERSION = "0.5.0";
const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2, PROJECT_SCHEMA_VERSION]);
const CONTEXT_KEYS = ["setting", "era", "country", "species"];
const now = () => new Date().toISOString();
const makeId = () => `project_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const clean = (value, limit = 200) => String(value ?? "").trim().slice(0, limit);
const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const uniqueReferences = (values, type) => [...new Map((Array.isArray(values) ? values : []).map(value => {
  const checked = validateReference(value);
  return checked.state === "valid" && checked.reference.type === type ? checked.reference : null;
}).filter(Boolean).map(value => [value.id, value])).values()];

export function normalizeProjectContext(context = {}) {
  const source = object(context);
  return { setting: clean(source.setting), era: clean(source.era), country: clean(source.country), species: clean(source.species), premise: clean(source.premise, 1000), extensions: structuredClone(object(source.extensions)) };
}

export function normalizeProjectDefaults(defaults = {}) {
  const source = object(defaults);
  const varianceMode = source.varianceMode === "wild" ? "chaotic" : source.varianceMode;
  return { varianceMode: ["grounded", "varied", "chaotic"].includes(varianceMode) ? varianceMode : "varied", extensions: structuredClone(object(source.extensions)) };
}

function normalizeMemberState(value = {}) {
  const source = object(value);
  return { needsReview: source.needsReview === true, changedContext: [...new Set((Array.isArray(source.changedContext) ? source.changedContext : []).filter(key => CONTEXT_KEYS.includes(key)))].sort(), affectedFields: [...new Set((Array.isArray(source.affectedFields) ? source.affectedFields : []).map(String))].sort(), markedAt: typeof source.markedAt === "string" ? source.markedAt : null, reviewedAt: typeof source.reviewedAt === "string" ? source.reviewedAt : null };
}

export function validateProject(raw, { allowLegacy = true } = {}) {
  const issues = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { valid: false, issues: ["Project must be an object."], value: null };
  const version = Number(raw.schemaVersion ?? raw.schema_version ?? 1);
  if (!Number.isInteger(version) || version < 1) issues.push("Project schemaVersion must be a positive integer.");
  else if (!SUPPORTED_SCHEMA_VERSIONS.has(version)) issues.push(version > PROJECT_SCHEMA_VERSION ? `Project schema ${version} is newer than supported schema ${PROJECT_SCHEMA_VERSION}.` : `Project schema ${version} is unsupported.`);
  else if (!allowLegacy && version !== PROJECT_SCHEMA_VERSION) issues.push(`Project schema ${version} requires migration.`);
  if (typeof raw.id !== "string" || !raw.id.trim()) issues.push("Project id is required.");
  if (typeof raw.name !== "string" || !raw.name.trim()) issues.push("Project name is required.");
  for (const [index, ref] of (Array.isArray(raw.personaRefs) ? raw.personaRefs : []).entries()) { const checked = validateReference(ref); if (checked.state !== "valid" || checked.reference.type !== "persona") issues.push(`personaRefs[${index}] must be a persona reference.`); }
  for (const field of ["castRefs", "groupRefs"]) for (const [index, ref] of (Array.isArray(raw[field]) ? raw[field] : []).entries()) { const checked = validateReference(ref); const type = field === "castRefs" ? "cast" : "group"; if (checked.state !== "valid" || checked.reference.type !== type) issues.push(`${field}[${index}] must be a ${type} reference.`); }
  for (const [index, ref] of (Array.isArray(raw.relationshipRefs) ? raw.relationshipRefs : []).entries()) { const checked = validateReference(ref); if (checked.state !== "valid" || checked.reference.type !== "relationship") issues.push(`relationshipRefs[${index}] must be a relationship reference.`); }
  for (const [index, ref] of (Array.isArray(raw.locationRefs) ? raw.locationRefs : []).entries()) { const checked = validateReference(ref); if (checked.state !== "valid" || checked.reference.type !== "location") issues.push(`locationRefs[${index}] must be a location reference.`); }
  return { valid: issues.length === 0, issues, value: issues.length ? null : normalizeProject(raw) };
}

export function normalizeProject(raw = {}) {
  const project = object(raw), createdAt = typeof project.createdAt === "string" ? project.createdAt : now();
  const personaRefs = uniqueReferences(project.personaRefs, "persona"), memberStateSource = object(project.memberState);
  const memberState = Object.fromEntries(personaRefs.map(ref => [ref.id, normalizeMemberState(memberStateSource[ref.id])]));
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION, id: clean(project.id || makeId(), 160), name: clean(project.name || "Untitled Project", 120) || "Untitled Project", description: clean(project.description, 1000), createdAt,
    updatedAt: typeof project.updatedAt === "string" ? project.updatedAt : (typeof project.modifiedAt === "string" ? project.modifiedAt : createdAt),
    versions: { projectSchema: PROJECT_SCHEMA_VERSION, application: clean(project.versions?.application || project.applicationVersion || PROJECT_APPLICATION_VERSION, 40), data: clean(project.versions?.data || project.dataVersion || "unknown", 40), personaSchema: clean(project.versions?.personaSchema || "unknown", 40) },
    context: normalizeProjectContext(project.context), defaults: normalizeProjectDefaults(project.defaults), personaRefs, castRefs: uniqueReferences(project.castRefs || project.entities?.casts, "cast"), groupRefs: uniqueReferences(project.groupRefs || project.entities?.groups, "group"), relationshipRefs: uniqueReferences(project.relationshipRefs || project.entities?.relationships, "relationship"), locationRefs: uniqueReferences(project.locationRefs || project.entities?.locations, "location"), memberState,
    state: { needsReview: project.state?.needsReview === true || Object.values(memberState).some(value => value.needsReview), revision: Math.max(1, Number(project.state?.revision) || 1), lastContextChange: typeof project.state?.lastContextChange === "string" ? project.state.lastContextChange : null },
    entities: { casts: [], groups: [], relationships: [], locations: Array.isArray(project.entities?.locations) ? structuredClone(project.entities.locations) : [], scenes: Array.isArray(project.entities?.scenes) ? structuredClone(project.entities.scenes) : [] },
    extensions: structuredClone(object(project.extensions)),
    workspace: { favorite: project.workspace?.favorite === true, archived: project.workspace?.archived === true, tags: [...new Set((Array.isArray(project.workspace?.tags) ? project.workspace.tags : []).map(value => clean(value, 60)).filter(Boolean))].slice(0, 20), lastOpenedAt: typeof project.workspace?.lastOpenedAt === "string" ? project.workspace.lastOpenedAt : null },
    provenance: structuredClone(object(project.provenance?.kind ? project.provenance : { kind: "manual" })),
    sceneRefs: uniqueReferences(project.sceneRefs, "scene"), locations: [...new Set((Array.isArray(project.locations) ? project.locations : []).map(value => clean(value)).filter(Boolean))].slice(0, 100), notes: clean(project.notes, 4000),
    genreProfile: project.genreProfile && typeof project.genreProfile === "object" ? structuredClone(project.genreProfile) : { version: 1, genres: [], exclusions: [], overrides: {} }
  };
}

export function serializeProject(project) { const portable = normalizeProject(project); portable.relationshipRefs = []; return JSON.stringify({ format: "promptforge-project", formatVersion: 1, project: portable }, null, 2); }

export function parseProjectImport(text) {
  let parsed;
  try { parsed = typeof text === "string" ? JSON.parse(text) : structuredClone(text); } catch (error) { return { valid: false, issues: [`Invalid JSON: ${error.message}`], preview: null, project: null }; }
  const raw = parsed?.format === "promptforge-project" ? parsed.project : parsed, checked = validateProject(raw);
  return { valid: checked.valid, issues: checked.issues, project: checked.value, preview: checked.valid ? { id: checked.value.id, name: checked.value.name, description: checked.value.description, context: checked.value.context, memberCount: checked.value.personaRefs.length, schemaVersion: checked.value.schemaVersion } : null };
}

export class ProjectStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  all() { try { const value = JSON.parse(this.storage.getItem(PROJECT_KEY) || "[]"); return Array.isArray(value) ? value.filter(item => validateProject(item).valid).map(normalizeProject) : []; } catch { return []; } }
  write(items) { this.storage.setItem(PROJECT_KEY, JSON.stringify(items.map(normalizeProject))); }
  open(projectId) { return this.all().find(project => project.id === projectId) || null; }
  create(fields = {}) { const stamp = now(), project = normalizeProject({ ...fields, id: fields.id || makeId(), createdAt: stamp, updatedAt: stamp }); this.write([project, ...this.all()]); return project; }
  update(projectId, patch = {}) { const items = this.all(), index = items.findIndex(project => project.id === projectId); if (index < 0) return null; items[index] = normalizeProject({ ...items[index], ...patch, id: projectId, createdAt: items[index].createdAt, updatedAt: now() }); this.write(items); return items[index]; }
  duplicate(projectId) { const source = this.open(projectId); if (!source) throw new Error(`Project not found: ${projectId}`); return this.create({ ...source, id: undefined, name: `${source.name} Copy`, relationshipRefs: [], state: { needsReview: false, revision: 1, lastContextChange: null }, memberState: Object.fromEntries(source.personaRefs.map(ref => [ref.id, normalizeMemberState()])), provenance: { kind: "duplicate", sourceProjectId: source.id } }); }
  addPersona(projectId, personaId) { const project = this.open(projectId), ref = createReference("persona", personaId); if (!project || !ref || project.personaRefs.some(item => item.id === ref.id)) return project; return this.update(projectId, { personaRefs: [...project.personaRefs, ref], memberState: { ...project.memberState, [ref.id]: normalizeMemberState() } }); }
  removePersona(projectId, personaId) { const project = this.open(projectId); if (!project) return null; const memberState = { ...project.memberState }; delete memberState[personaId]; return this.update(projectId, { personaRefs: project.personaRefs.filter(ref => ref.id !== personaId), memberState }); }
  addScene(projectId, sceneId) { const project = this.open(projectId), ref = createReference("scene", sceneId); if (!project || !ref || project.sceneRefs.some(item => item.id === ref.id)) return project; return this.update(projectId, { sceneRefs: [...project.sceneRefs, ref] }); }
  removeScene(projectId, sceneId) { const project = this.open(projectId); return project ? this.update(projectId, { sceneRefs: project.sceneRefs.filter(ref => ref.id !== sceneId) }) : null; }
  addLocation(projectId, locationId) { const project = this.open(projectId), ref = createReference("location", locationId); if (!project || !ref || project.locationRefs.some(item => item.id === ref.id)) return project; return this.update(projectId, { locationRefs: [...project.locationRefs, ref] }); }
  removeLocation(projectId, locationId) { const project = this.open(projectId); return project ? this.update(projectId, { locationRefs: project.locationRefs.filter(ref => ref.id !== locationId) }) : null; }
  markReviewed(projectId, personaId) { const project = this.open(projectId); if (!project?.memberState[personaId]) return project; const memberState = { ...project.memberState, [personaId]: { ...normalizeMemberState(), reviewedAt: now() } }; return this.update(projectId, { memberState, state: { ...project.state, needsReview: Object.entries(memberState).some(([id, value]) => id !== personaId && value.needsReview) } }); }
  delete(projectId) { const before = this.all(), next = before.filter(project => project.id !== projectId); if (next.length === before.length) return false; this.write(next); return true; }
  export(projectId) { const project = this.open(projectId); if (!project) throw new Error(`Project not found: ${projectId}`); return serializeProject(project); }
  previewImport(text) { return parseProjectImport(text); }
  confirmImport(preview, { collision = "rename" } = {}) { if (!preview?.valid || !preview.project) throw new Error("A valid import preview is required."); const project = normalizeProject(preview.project), used = new Set(this.all().map(item => item.id)), originalId = project.id; if (used.has(project.id)) { if (collision === "reject") return { imported: 0, collision: true, project: null, originalId }; let index = 1; while (used.has(`${originalId}_import_${index}`)) index++; project.id = `${originalId}_import_${index}`; } project.updatedAt = now(); this.write([project, ...this.all()]); return { imported: 1, collision: originalId !== project.id, project, originalId }; }
  browserData() { return { projects: this.all(), projectSchemaVersion: PROJECT_SCHEMA_VERSION }; }
  importBrowserData(snapshot, personaIds = new Set(), { collision = "rename", personaMap = {} } = {}) { const incoming = Array.isArray(snapshot?.projects) ? snapshot.projects : [], projectMap = {}, missingTargets = [], accepted = []; for (const raw of incoming) { const checked = validateProject(raw); if (!checked.valid) continue; const project = checked.value; project.personaRefs = project.personaRefs.map(ref => ({ ...ref, id: personaMap[ref.id] || ref.id })); project.personaRefs.forEach(ref => { if (!personaIds.has(ref.id)) missingTargets.push(ref.id); }); const result = this.confirmImport({ valid: true, project }, { collision }); if (result.imported) { projectMap[raw.id] = result.project.id; accepted.push(result.project); } } return { imported: accepted.length, skipped: incoming.length - accepted.length, idMap: projectMap, renamed: Object.entries(projectMap).filter(([from, to]) => from !== to).map(([from, to]) => ({ from, to })), missingTargets: [...new Set(missingTargets)] }; }
  diagnostics(personas = []) { const ids = new Set(personas.map(persona => persona.meta?.persona_id).filter(Boolean)), projects = this.all(), refs = projects.flatMap(project => project.personaRefs), states = refs.map(ref => resolveReference(ref, { persona: ids })); return { totalProjects: projects.length, totalReferences: refs.length, resolvedReferences: states.filter(value => value.state === "resolved").length, missingReferences: states.filter(value => value.state === "missing").length, invalidReferences: states.filter(value => value.state === "invalid").length, duplicateReferences: [], projectsNeedingReview: projects.filter(project => project.state.needsReview).length }; }
}
