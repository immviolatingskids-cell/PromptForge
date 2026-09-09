import { affectedBy } from "./dependency-engine.js";
import { normalizeProjectContext } from "./project-store.js";

export const PROJECT_CONTEXT_FIELDS = Object.freeze({ setting: "foundation.setting", era: "foundation.era", country: "foundation.country", species: "foundation.species" });
const valueId = value => value && typeof value === "object" ? value.id : value;
const cleanAnchors = anchors => Object.fromEntries(Object.entries(anchors || {}).filter(([, value]) => value !== undefined && value !== null && value !== ""));

export function resolveProjectInheritance(project, explicitAnchors = {}) {
  const context = normalizeProjectContext(project?.context), explicit = cleanAnchors(explicitAnchors), effective = {}, sources = {};
  for (const key of Object.keys(PROJECT_CONTEXT_FIELDS)) {
    if (Object.hasOwn(explicit, key)) { effective[key] = explicit[key]; sources[key] = { source: "persona", overridden: Boolean(context[key]), value: explicit[key], projectValue: context[key] || null }; }
    else if (context[key]) { effective[key] = context[key]; sources[key] = { source: "project", overridden: false, value: context[key], projectValue: context[key] }; }
    else sources[key] = { source: "independent", overridden: false, value: null, projectValue: null };
  }
  return { effective, sources, projectRevision: project?.state?.revision || 1 };
}

export function attachProjectContext(persona, project, explicitAnchors = {}, inherited = resolveProjectInheritance(project, explicitAnchors), generatedAt = new Date().toISOString()) {
  const copy = structuredClone(persona); copy.extensions ||= {}; copy.extensions.promptforge ||= {}; copy.extensions.promptforge.projectContexts ||= {};
  copy.extensions.promptforge.projectContexts[project.id] = { schemaVersion: 1, projectRef: { type: "project", id: project.id }, projectRevision: inherited.projectRevision, inherited: Object.fromEntries(Object.entries(inherited.sources).filter(([, value]) => value.source === "project").map(([key, value]) => [key, value.value])), overrides: Object.fromEntries(Object.entries(inherited.sources).filter(([, value]) => value.source === "persona" && value.overridden).map(([key, value]) => [key, value.value])), sources: inherited.sources, generation: { seed: copy.meta?.seed, varianceMode: copy.meta?.variance, effectiveAnchors: structuredClone(inherited.effective), generatedAt }, review: { needsReview: false, changedContext: [], affectedFields: [], markedAt: null } };
  return copy;
}

export function projectContextFor(persona, projectId) { return persona?.extensions?.promptforge?.projectContexts?.[projectId] || null; }

export function markPersonaProjectReview(persona, project, changedKeys, at = new Date().toISOString()) {
  const copy = structuredClone(persona), link = projectContextFor(copy, project.id); if (!link) return copy;
  const relevant = changedKeys.filter(key => link.sources?.[key]?.source === "project"), affectedFields = [...new Set(relevant.flatMap(key => [PROJECT_CONTEXT_FIELDS[key], ...affectedBy(PROJECT_CONTEXT_FIELDS[key])]))].sort();
  link.review = { needsReview: relevant.length > 0, changedContext: relevant, affectedFields, markedAt: relevant.length ? at : null }; return copy;
}

export function updatePersonaProjectOverride(persona, project, field, value) {
  if (!Object.hasOwn(PROJECT_CONTEXT_FIELDS, field)) throw new Error(`Unsupported project context field: ${field}`);
  const copy = structuredClone(persona), link = projectContextFor(copy, project.id); if (!link) throw new Error(`Persona is not linked to project ${project.id}.`);
  const explicit = valueId(value); link.overrides[field] = explicit; link.sources[field] = { source: "persona", overridden: Boolean(project.context?.[field]), value: explicit, projectValue: project.context?.[field] || null }; return copy;
}

export function changedProjectContext(before, after) { return Object.keys(PROJECT_CONTEXT_FIELDS).filter(key => (before?.context?.[key] || "") !== (after?.context?.[key] || "")); }
export function projectGenerationOptions(project, options = {}) {
  const inheritance = resolveProjectInheritance(project, options.anchors);
  const keys={setting:"settings",era:"eras",country:"countries",species:"species"};
  const anchors=options.library?Object.fromEntries(Object.entries(inheritance.effective).filter(([key,value])=>!keys[key]||(options.library[keys[key]]||[]).some(entry=>entry.id===value))):inheritance.effective;
  const { library, ...rest }=options;
  return { ...rest, mode: options.mode || project.defaults?.varianceMode || "varied", anchors, projectInheritance: inheritance };
}

export class ProjectCoordinator {
  constructor(projectStore, personaStore) { this.projects = projectStore; this.personas = personaStore; }
  addPersona(projectId, personaId) { const project = this.projects.addPersona(projectId, personaId), persona = this.personas.open(personaId); if (project && persona && !projectContextFor(persona, projectId)) { const anchors=Object.fromEntries(Object.keys(PROJECT_CONTEXT_FIELDS).map(key=>[key,valueId(persona.foundation?.[key])]).filter(([,value])=>value)); this.personas.save(attachProjectContext(persona, project, anchors)); } return project; }
  removePersona(projectId, personaId) { const project=this.projects.removePersona(projectId, personaId), persona=this.personas.open(personaId); if(persona?.extensions?.promptforge?.projectContexts?.[projectId]){delete persona.extensions.promptforge.projectContexts[projectId];this.personas.save(persona);} return project; }
  duplicateProject(projectId) { const copy=this.projects.duplicate(projectId); for(const ref of copy.personaRefs){const persona=this.personas.open(ref.id);if(persona)this.personas.save(attachProjectContext(persona,copy,Object.fromEntries(Object.keys(PROJECT_CONTEXT_FIELDS).map(key=>[key,valueId(persona.foundation?.[key])]).filter(([,value])=>value))));} return copy; }
  deleteProject(projectId) { const project=this.projects.open(projectId); if(!project)return false; for(const ref of project.personaRefs){const persona=this.personas.open(ref.id);if(persona?.extensions?.promptforge?.projectContexts?.[projectId]){delete persona.extensions.promptforge.projectContexts[projectId];this.personas.save(persona);}} return this.projects.delete(projectId); }
  updateContext(projectId, context) {
    const before = this.projects.open(projectId); if (!before) return null;
    const changed = changedProjectContext(before, { context }), stamp = new Date().toISOString(), memberState = { ...before.memberState };
    for (const ref of before.personaRefs) { const persona = this.personas.open(ref.id); if (!persona) continue; const marked = markPersonaProjectReview(persona, before, changed, stamp), review = projectContextFor(marked, projectId)?.review; if (review?.needsReview) { this.personas.save(marked); memberState[ref.id] = { needsReview: true, changedContext: review.changedContext, affectedFields: review.affectedFields, markedAt: stamp, reviewedAt: null }; } }
    return this.projects.update(projectId, { context, memberState, state: { ...before.state, revision: before.state.revision + (changed.length ? 1 : 0), needsReview: Object.values(memberState).some(value => value.needsReview), lastContextChange: changed.length ? stamp : before.state.lastContextChange } });
  }
}
