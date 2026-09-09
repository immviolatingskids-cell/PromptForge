import { createReference, validateReference } from "./reference-model.js";

export const SCENE_KEY = "personaforge.scenes.v1";
export const SCENE_SCHEMA_VERSION = 1;
const now = () => new Date().toISOString();
const makeId = () => `scene_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const text = (value, limit = 500) => String(value || "").trim().slice(0, limit);

export function normalizeScene(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const characterRef = validateReference(source.characterRef).state === "valid" ? validateReference(source.characterRef).reference : null;
  const projectRef = validateReference(source.projectRef).state === "valid" ? validateReference(source.projectRef).reference : null;
  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    id: text(source.id, 160) || makeId(),
    title: text(source.title, 120) || "Untitled Scene",
    characterRef: characterRef?.type === "persona" ? characterRef : null,
    projectRef: projectRef?.type === "project" ? projectRef : null,
    requirements: {
      location: text(source.requirements?.location, 160),
      activity: text(source.requirements?.activity, 240),
      time: text(source.requirements?.time, 120),
      socialContext: text(source.requirements?.socialContext, 160),
      mood: text(source.requirements?.mood, 160)
    },
    controls: source.controls && typeof source.controls === "object" && !Array.isArray(source.controls) ? structuredClone(source.controls) : {},
    resolved: source.resolved && typeof source.resolved === "object" && !Array.isArray(source.resolved) ? structuredClone(source.resolved) : null,
    output: { prompt: text(source.output?.prompt, 12000), negativePrompt: text(source.output?.negativePrompt, 4000) },
    createdAt: source.createdAt || now(),
    modifiedAt: source.modifiedAt || now()
  };
}

export class SceneStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  all() { try { const value = JSON.parse(this.storage.getItem(SCENE_KEY) || "[]"); return Array.isArray(value) ? value.map(normalizeScene) : []; } catch { return []; } }
  write(items) { this.storage.setItem(SCENE_KEY, JSON.stringify(items.map(normalizeScene))); }
  open(id) { return this.all().find(scene => scene.id === id) || null; }
  create(fields = {}) { const scene = normalizeScene({ ...fields, id: makeId(), createdAt: now(), modifiedAt: now() }); this.write([scene, ...this.all()]); return scene; }
  update(id, patch = {}) { const items = this.all(); const index = items.findIndex(scene => scene.id === id); if (index < 0) return null; items[index] = normalizeScene({ ...items[index], ...patch, id, modifiedAt: now() }); this.write(items); return items[index]; }
  delete(id) { const items = this.all(); const next = items.filter(scene => scene.id !== id); this.write(next); return next.length !== items.length; }
  browserData() { return { scenes: this.all(), sceneSchemaVersion: SCENE_SCHEMA_VERSION }; }
  importBrowserData(snapshot, { personaMap = {}, projectMap = {} } = {}) {
    const incoming = Array.isArray(snapshot?.scenes) ? snapshot.scenes : [];
    const existing = this.all();
    const used = new Set(existing.map(scene => scene.id));
    const accepted = [];
    const idMap = new Map();
    for (const raw of incoming) {
      const scene = normalizeScene(raw);
      let id = scene.id;
      let suffix = 1;
      while (used.has(id)) id = `${scene.id}_import_${suffix++}`;
      used.add(id);
      idMap.set(scene.id, id);
      scene.id = id;
      if (scene.characterRef) scene.characterRef.id = personaMap[scene.characterRef.id] || scene.characterRef.id;
      if (scene.projectRef) scene.projectRef.id = projectMap[scene.projectRef.id] || scene.projectRef.id;
      accepted.push(scene);
    }
    this.write([...accepted, ...existing]);
    return { imported: accepted.length, idMap: Object.fromEntries(idMap) };
  }
}

export function sceneReferences(personaId, projectId = null) {
  return {
    characterRef: createReference("persona", personaId),
    projectRef: projectId ? createReference("project", projectId) : null
  };
}
