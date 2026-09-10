import { createReference, validateReference } from "./reference-model.js";
import { migrateRecord, versionMetadata } from "./versioning.js";

export const SCENE_KEY = "personaforge.scenes.v1";
export const SCENE_SCHEMA_VERSION = 2;
const now = () => new Date().toISOString();
const makeId = () => `scene_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const text = (value, limit = 500) => String(value ?? "").trim().slice(0, limit);
const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const ref = (value, type) => { const checked = validateReference(value); return checked.state === "valid" && checked.reference.type === type ? checked.reference : null; };
const refs = (values, type) => [...new Map((Array.isArray(values) ? values : []).map(value => ref(value, type)).filter(Boolean).map(value => [value.id, value])).values()];

export function normalizeScene(raw = {}) {
  const source = object(raw), createdAt = typeof source.createdAt === "string" ? source.createdAt : now(), legacyCharacter = ref(source.characterRef, "persona");
  const participantRefs = refs(source.participantRefs?.length ? source.participantRefs : legacyCharacter ? [legacyCharacter] : [], "persona");
  const focusPersonaRef = ref(source.focusPersonaRef, "persona") || legacyCharacter || participantRefs[0] || null;
  return {
    schemaVersion: SCENE_SCHEMA_VERSION, id: text(source.id, 160) || makeId(), title: text(source.title, 120) || "Untitled Scene",
    versionMetadata: versionMetadata({ scene: 1 }),
    premise: text(source.premise, 2000), purpose: text(source.purpose, 500), seed: text(source.seed || source.controls?.seed || "scene-001", 160) || "scene-001",
    projectRef: ref(source.projectRef, "project"), locationRef: ref(source.locationRef, "location"), castRef: ref(source.castRef, "cast"), groupRef: ref(source.groupRef, "group"),
    relationshipRefs: refs(source.relationshipRefs, "relationship"), participantRefs, focusPersonaRef, characterRef: focusPersonaRef,
    inheritance: {
      location: ["explicit", "project", "independent"].includes(source.inheritance?.location) ? source.inheritance.location : (source.locationRef ? "explicit" : "project"),
      participants: ["explicit", "project", "independent"].includes(source.inheritance?.participants) ? source.inheritance.participants : (source.participantRefs?.length ? "explicit" : "project"),
      time: ["explicit", "project", "independent"].includes(source.inheritance?.time) ? source.inheritance.time : (source.requirements?.time ? "explicit" : "project")
    },
    requirements: { location: text(source.requirements?.location, 160), activity: text(source.requirements?.activity, 500), action: text(source.requirements?.action || source.requirements?.activity, 500), time: text(source.requirements?.time, 160), era: text(source.requirements?.era, 160), socialContext: text(source.requirements?.socialContext, 300), mood: text(source.requirements?.mood, 300), atmosphere: text(source.requirements?.atmosphere || source.requirements?.mood, 300), conflict: text(source.requirements?.conflict, 1000) },
    controls: structuredClone(object(source.controls)),
    projection: { focusPersonaId: text(source.projection?.focusPersonaId, 160) || focusPersonaRef?.id || null, composition: text(source.projection?.composition, 300), density: ["compact", "standard", "detailed"].includes(source.projection?.density) ? source.projection.density : "standard", visualTarget: text(source.projection?.visualTarget, 80) || text(source.controls?.target, 80) || "generic", mode: text(source.projection?.mode, 80) || "narrative_scene", locks: structuredClone(object(source.projection?.locks)), overrides: structuredClone(object(source.projection?.overrides)) },
    resolved: source.resolved && typeof source.resolved === "object" && !Array.isArray(source.resolved) ? structuredClone(source.resolved) : null,
    output: { summary: text(source.output?.summary, 12000), prompt: text(source.output?.prompt, 20000), negativePrompt: text(source.output?.negativePrompt, 5000), package: structuredClone(object(source.output?.package)) },
    state: { stale: source.state?.stale === true, needsReview: source.state?.needsReview === true }, createdAt, modifiedAt: typeof source.modifiedAt === "string" ? source.modifiedAt : createdAt
  };
}

export function validateScene(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { valid: false, issues: ["Scene must be an object."], value: null };
  const migrated = migrateRecord(raw, { kind: "scene", currentVersion: SCENE_SCHEMA_VERSION });
  if (!migrated.valid) return { valid: false, issues: migrated.issues, value: null };
  const issues = [];
  if (raw.id !== undefined && (typeof raw.id !== "string" || !raw.id.trim())) issues.push("id must be a non-empty string");
  for (const [key, type] of [["projectRef", "project"], ["locationRef", "location"], ["castRef", "cast"], ["groupRef", "group"], ["focusPersonaRef", "persona"], ["characterRef", "persona"]]) if (raw[key] && !ref(raw[key], type)) issues.push(`${key} must be a ${type} reference`);
  for (const [key, type] of [["participantRefs", "persona"], ["relationshipRefs", "relationship"]]) for (const [index, value] of (Array.isArray(raw[key]) ? raw[key] : []).entries()) if (!ref(value, type)) issues.push(`${key}[${index}] must be a ${type} reference`);
  return { valid: !issues.length, issues, value: issues.length ? null : normalizeScene(raw) };
}

export function serializeScene(scene) { return JSON.stringify(normalizeScene(scene), null, 2); }
export function sceneMarkdown(scene) { const item = normalizeScene(scene), trace = item.resolved?.sourceTrace || []; return [`# ${item.title}`, item.output.summary || item.premise, "## Scene prompt", item.output.prompt, item.output.negativePrompt ? `## Negative guidance\n${item.output.negativePrompt}` : "", trace.length ? `## Source trace\n${trace.map(entry => `- **${entry.domain}:** ${entry.detail} (${entry.source})`).join("\n")}` : ""].filter(Boolean).join("\n\n"); }

export class SceneStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  rawAll() { try { const value = JSON.parse(this.storage.getItem(SCENE_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
  all() { return this.rawAll().filter(item => validateScene(item).valid).map(normalizeScene); }
  write(items) { this.storage.setItem(SCENE_KEY, JSON.stringify(items.map(normalizeScene))); }
  open(id) { return this.all().find(scene => scene.id === id) || null; }
  create(fields = {}) { const stamp = now(), proposed = { ...fields, id: fields.id || makeId(), createdAt: stamp, modifiedAt: stamp }, checked = validateScene(proposed); if (!checked.valid) throw new Error(checked.issues.join(". ")); if (this.all().some(scene => scene.id === checked.value.id)) throw new Error(`Scene ID already exists: ${checked.value.id}`); this.write([checked.value, ...this.all()]); return checked.value; }
  update(id, patch = {}) { const items = this.all(), index = items.findIndex(scene => scene.id === id); if (index < 0) return null; const checked = validateScene({ ...items[index], ...patch, id, createdAt: items[index].createdAt, modifiedAt: now() }); if (!checked.valid) throw new Error(checked.issues.join(". ")); items[index] = checked.value; this.write(items); return items[index]; }
  delete(id) { const items = this.all(), next = items.filter(scene => scene.id !== id); this.write(next); return next.length !== items.length; }
  export(id, format = "json") { const item = this.open(id); return item ? (format === "markdown" ? sceneMarkdown(item) : serializeScene(item)) : null; }
  browserData() { return { scenes: this.all(), sceneSchemaVersion: SCENE_SCHEMA_VERSION, versionMetadata: versionMetadata({ scene: 1 }) }; }
  importBrowserData(snapshot, maps = {}) {
    const incoming = Array.isArray(snapshot?.scenes) ? snapshot.scenes : [], existing = this.all(), used = new Set(existing.map(scene => scene.id)), accepted = [], idMap = {};
    for (const raw of incoming) { const checked = validateScene(raw); if (!checked.valid) continue; const scene = checked.value, original = scene.id; let id = original, suffix = 1; while (used.has(id)) id = `${original}_import_${suffix++}`; used.add(id); idMap[original] = id; scene.id = id;
      const remap = (reference, map) => reference ? { ...reference, id: map?.[reference.id] || reference.id } : null;
      scene.projectRef = remap(scene.projectRef, maps.projectMap); scene.locationRef = remap(scene.locationRef, maps.locationMap); scene.castRef = remap(scene.castRef, maps.castMap); scene.groupRef = remap(scene.groupRef, maps.groupMap); scene.participantRefs = scene.participantRefs.map(value => remap(value, maps.personaMap)); scene.focusPersonaRef = remap(scene.focusPersonaRef, maps.personaMap); scene.characterRef = scene.focusPersonaRef; scene.relationshipRefs = scene.relationshipRefs.map(value => remap(value, maps.relationshipMap)); accepted.push(normalizeScene(scene)); }
    this.write([...accepted, ...existing]); return { imported: accepted.length, skipped: incoming.length - accepted.length, idMap };
  }
  diagnostics(registry = {}) { const sets = Object.fromEntries(Object.entries(registry).map(([key, values]) => [key, new Set((values || []).map(value => value.meta?.persona_id || value.id).filter(Boolean))])), missingReferences = [];
    for (const scene of this.all()) { for (const [key, type] of [["projectRef", "projects"], ["locationRef", "locations"], ["castRef", "casts"], ["groupRef", "groups"], ["focusPersonaRef", "personas"]]) if (scene[key] && !sets[type]?.has(scene[key].id)) missingReferences.push({ sceneId: scene.id, field: key, id: scene[key].id }); for (const [key, type] of [["participantRefs", "personas"], ["relationshipRefs", "relationships"]]) for (const value of scene[key]) if (!sets[type]?.has(value.id)) missingReferences.push({ sceneId: scene.id, field: key, id: value.id }); }
    return { total: this.all().length, missingReferences, staleScenes: [...new Set(missingReferences.map(item => item.sceneId))] };
  }
}

export function sceneReferences(personaId, projectId = null) { return { participantRefs: personaId ? [createReference("persona", personaId)] : [], focusPersonaRef: personaId ? createReference("persona", personaId) : null, characterRef: personaId ? createReference("persona", personaId) : null, projectRef: projectId ? createReference("project", projectId) : null }; }
