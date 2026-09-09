import { contextFromPersona, filterCandidates } from "./context-engine.js";
import { resolveContextProfile } from "./context-profile.js";
import { DEPENDENCIES, affectedBy } from "./dependency-engine.js";

const FIELD_SOURCES = {
  "foundation.setting": ["settings", "foundation.setting"], "foundation.era": ["eras", "foundation.era"], "foundation.species": ["species", "foundation.species"], "foundation.life_stage": ["lifeStages", "foundation.life_stage"], "foundation.country": ["countries", "foundation.country"],
  "origin.heritage": ["heritage", "origin.heritage"], "personality.core": ["traits", "personality.core"], "personality.flaw": ["flaws", "personality.flaw"], "personality.values.primary": ["values", "personality.values.primary"], "life.job": ["occupations", "life.job"], "life.education": ["education", "life.education"], "life.housing": ["housing", "life.housing"], "life.transport": ["transport", "life.transport"], "interests.hobbies.0": ["hobbies", "interests.hobbies.0"], "interests.interests.0": ["interests", "interests.interests.0"], "appearance.clothing_style": ["clothingStyles", "appearance.clothing_style"], "appearance.signature_outfit": ["outfits", "appearance.signature_outfit"], "appearance.surface.hair": ["hair", "appearance.surface.hair"], "appearance.surface.eyes": ["eyes", "appearance.surface.eyes"], "appearance.surface.body": ["body", "appearance.surface.body"], "appearance.surface.feature": ["features", "appearance.surface.feature"]
};

const getAt = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
const label = value => value?.name ?? value?.text ?? value ?? "Unavailable";

function sourceEntry(library, persona, path) {
  const mapping = FIELD_SOURCES[path];
  if (!mapping) return null;
  const value = getAt(persona, mapping[1]);
  const entry = Array.isArray(value) ? value[0] : value;
  if (!entry) return { catalogue: mapping[0], path: mapping[1], unavailable: true };
  return { catalogue: mapping[0], path: mapping[1], id: entry.id ?? null, label: label(entry) };
}

function stateFor(persona, path) {
  const locked = Boolean(persona.state?.locks?.[path]);
  const stale = (persona.state?.stale_fields || []).includes(path);
  return { locked, stale, selection: locked ? "User-selected" : "Catalogue-selected" };
}

export function decisionTrace(library, persona, field) {
  const source = sourceEntry(library, persona, field);
  const state = stateFor(persona, field);
  const mapping = FIELD_SOURCES[field];
  if (!source) return { field, selected: { label: label(getAt(persona, field)) }, selection: "Derived or unavailable", source: { unavailable: true }, context: { status: "Not recorded" }, pool: { status: "Not applicable" }, dependencies: { direct: DEPENDENCIES[field] || [], downstream: affectedBy(field) }, state };
  const context = resolveContextProfile(library, persona);
  const candidates = library[mapping[0]] || [];
  const compatible = filterCandidates(candidates, context);
  const entry = candidates.find(item => item.id === source.id);
  const compatibility = entry?.compatibility || {};
  const used = Object.entries(context.ids || {}).filter(([key, values]) => values?.length && compatibility[key]?.length).map(([key, values]) => ({ field: key, status: values.some(value => compatibility[key].includes(value)) ? "Compatible" : "Neutral" }));
  const relevant = Object.entries(entry?.metadata?.context_affinities || {}).filter(([key, values]) => (context.ids[key] || []).some(value => (Array.isArray(values) ? values : [values]).includes(value))).map(([key]) => key);
  return { field, selected: { id: source.id, label: source.label }, source, context: { compatibility: used, relevant, neutral: Object.keys(context.ids || {}).filter(key => !used.some(item => item.field === key) && !relevant.includes(key)) }, selection: { type: state.selection, variance: persona.meta?.variance || "Unavailable", deterministic: true, fallback: "Not recorded" }, pool: { compatible: compatible.length, total: candidates.length }, dependencies: { direct: DEPENDENCIES[field] || [], downstream: affectedBy(field) }, state };
}

export function inspectableFields(persona) {
  return Object.keys(FIELD_SOURCES).filter(path => getAt(persona, path));
}

export function decisionSummary(trace) {
  if (trace.selection === "Derived or unavailable") return "This value is derived or its original selection evidence was not recorded.";
  const compatible = trace.context.compatibility?.filter(item => item.status === "Compatible").map(item => item.field).join(", ");
  const relevant = trace.context.relevant?.join(", ");
  return [`Selected from the ${trace.source.catalogue} catalogue.`, compatible ? `Compatible with: ${compatible}.` : "No recorded hard compatibility context was used.", relevant ? `Contextual relevance: ${relevant}.` : "No recorded contextual affinity was used.", `Original fallback status: ${trace.selection.fallback}.`].join(" ");
}
