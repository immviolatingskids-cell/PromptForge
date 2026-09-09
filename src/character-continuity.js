import { createReference, validateReference } from "./reference-model.js";
import { normalizeAssertion } from "./character-intelligence.js";

export const CHARACTER_CONTINUITY_VERSION = 1;
export const CONTINUITY_THREAD_STATUSES = Object.freeze(["active", "paused", "resolved"]);
export const CONTINUITY_RECENT_SCENE_LIMIT = 20;

const clean = (value, limit = 500) => String(value ?? "").trim().slice(0, limit);
const timestamp = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
const idFor = value => clean(value, 120).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

function normalizeCurrent(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    project: clean(source.project, 240) || null,
    goal: clean(source.goal, 500) || null,
    situation: clean(source.situation, 1000) || null,
    updatedAt: timestamp(source.updatedAt)
  };
}

function normalizeThread(value) {
  if (!value || typeof value !== "object") return null;
  const title = clean(value.title || value.text, 240);
  const id = clean(value.id, 120) || idFor(title);
  if (!id || !title) return null;
  return {
    id,
    title,
    status: CONTINUITY_THREAD_STATUSES.includes(value.status) ? value.status : "active",
    startedAt: timestamp(value.startedAt),
    updatedAt: timestamp(value.updatedAt),
    resolvedAt: timestamp(value.resolvedAt)
  };
}

function normalizeSceneRecord(value) {
  const source = typeof value === "string" ? { id: value } : value;
  if (!source || typeof source !== "object") return null;
  const ref = validateReference(source.ref || createReference("scene", clean(source.id, 160))).reference;
  if (!ref || ref.type !== "scene") return null;
  return { ref, title: clean(source.title, 160) || null, occurredAt: timestamp(source.occurredAt) };
}

export function normalizeCharacterContinuity(raw = {}) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const threads = new Map();
  for (const rawThread of Array.isArray(source.threads) ? source.threads : []) {
    const thread = normalizeThread(rawThread);
    if (thread) threads.set(thread.id, thread);
  }
  const recent = new Map();
  for (const rawScene of Array.isArray(source.recentScenes) ? source.recentScenes : []) {
    const scene = normalizeSceneRecord(rawScene);
    if (scene && !recent.has(scene.ref.id)) recent.set(scene.ref.id, scene);
  }
  return {
    version: CHARACTER_CONTINUITY_VERSION,
    current: normalizeCurrent(source.current),
    threads: [...threads.values()].sort((left, right) => left.id.localeCompare(right.id)),
    recentScenes: [...recent.values()].slice(0, CONTINUITY_RECENT_SCENE_LIMIT)
  };
}

export function continuityFor(persona) {
  return normalizeCharacterContinuity(persona?.extensions?.promptforge?.continuity || {});
}

export function applyContinuityEvent(continuity, event, { at = new Date().toISOString() } = {}) {
  const current = normalizeCharacterContinuity(continuity);
  const type = event?.type;
  if (type === "set_current") {
    current.current = normalizeCurrent({ ...current.current, ...event.current, updatedAt: at });
  } else if (type === "clear_current") {
    current.current = normalizeCurrent({ updatedAt: at });
  } else if (type === "upsert_thread") {
    const item = normalizeThread({ ...event.thread, updatedAt: at, startedAt: event.thread?.startedAt || at });
    if (item) current.threads = [...current.threads.filter(thread => thread.id !== item.id), item].sort((left, right) => left.id.localeCompare(right.id));
  } else if (type === "resolve_thread") {
    current.threads = current.threads.map(thread => thread.id === event.id ? { ...thread, status: "resolved", updatedAt: at, resolvedAt: at } : thread);
  } else if (type === "remove_thread") {
    current.threads = current.threads.filter(thread => thread.id !== event.id);
  } else if (type === "record_scene") {
    const scene = normalizeSceneRecord({ ...event.scene, occurredAt: event.scene?.occurredAt || at });
    if (scene) current.recentScenes = [scene, ...current.recentScenes.filter(item => item.ref.id !== scene.ref.id)].slice(0, CONTINUITY_RECENT_SCENE_LIMIT);
  }
  return normalizeCharacterContinuity(current);
}

export function continuityAssertions(persona) {
  const continuity = continuityFor(persona);
  const assertions = [
    normalizeAssertion({ kind: "temporary_state", domain: "current_project", value: continuity.current.project, source: "continuity.current.project", temporary: true }),
    normalizeAssertion({ kind: "temporary_state", domain: "current_goal", value: continuity.current.goal, source: "continuity.current.goal", temporary: true }),
    normalizeAssertion({ kind: "temporary_state", domain: "current_situation", value: continuity.current.situation, source: "continuity.current.situation", temporary: true }),
    ...continuity.threads.filter(thread => thread.status === "active").map(thread => normalizeAssertion({ kind: "temporary_state", domain: "current_thread", value: thread.title, source: `continuity.threads.${thread.id}`, temporary: true }))
  ].filter(Boolean);
  return assertions;
}
