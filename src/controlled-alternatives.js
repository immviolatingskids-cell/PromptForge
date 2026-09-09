import { contextFromPersona, filterCandidates } from "./context-engine.js";
import { compatibilityScore } from "./candidate-ranker.js";
import { decisionTrace } from "./decision-inspector.js";

const SOURCES = {
  "foundation.setting": ["settings", "foundation.setting"], "foundation.era": ["eras", "foundation.era"], "foundation.species": ["species", "foundation.species"], "foundation.life_stage": ["lifeStages", "foundation.life_stage"], "foundation.country": ["countries", "foundation.country"],
  "origin.heritage": ["heritage", "origin.heritage"], "personality.core": ["traits", "personality.core"], "personality.flaw": ["flaws", "personality.flaw"], "personality.values.primary": ["values", "personality.values.primary"],
  "life.job": ["occupations", "life.job"], "life.education": ["education", "life.education"], "life.housing": ["housing", "life.housing"], "life.transport": ["transport", "life.transport"],
  "interests.hobbies.0": ["hobbies", "interests.hobbies.0"], "interests.interests.0": ["interests", "interests.interests.0"], "appearance.clothing_style": ["clothingStyles", "appearance.clothing_style"], "appearance.signature_outfit": ["outfits", "appearance.signature_outfit"],
  "appearance.surface.hair": ["hair", "appearance.surface.hair"], "appearance.surface.eyes": ["eyes", "appearance.surface.eyes"], "appearance.surface.body": ["body", "appearance.surface.body"], "appearance.surface.feature": ["features", "appearance.surface.feature"]
};

const getAt = (value, path) => path.split(".").reduce((item, key) => item?.[key], value);
const label = (value) => value?.name ?? value?.text ?? value?.id ?? String(value ?? "Unavailable");
const id = (value) => value?.id ?? value;
const cluster = (value) => value?.metadata?.semantic_cluster || value?.metadata?.cluster || null;

function candidatePool(library, persona, source) {
  const context = { ids: contextFromPersona(persona) };
  const all = library[source] || [];
  let eligible = filterCandidates(all, context);
  let fallback = false;
  if (!eligible.length) { eligible = filterCandidates(all, context, ["settings", "eras", "species", "life_stages"]); fallback = true; }
  if (!eligible.length) { eligible = filterCandidates(all, context, ["settings", "eras", "life_stages"]); fallback = true; }
  return { eligible, all, context, fallback };
}

export function alternativeFields() { return Object.keys(SOURCES); }

export function alternativesFor(library, persona, field, limit = 4) {
  const mapping = SOURCES[field];
  if (!mapping || !getAt(persona, field)) return { field, supported: false, current: null, alternatives: [], reason: "Derived or unavailable" };
  const current = getAt(persona, field);
  const currentId = id(Array.isArray(current) ? current[0] : current);
  const pool = candidatePool(library, persona, mapping[0]);
  const ranked = pool.eligible.map((entry, index) => ({ entry, score: compatibilityScore(entry, pool.context), index }))
    .sort((a, b) => b.score - a.score || String(a.entry.id).localeCompare(String(b.entry.id)) || a.index - b.index);
  const seenClusters = new Set();
  const alternatives = [];
  for (const item of ranked) {
    if (item.entry.id === currentId) continue;
    const entryCluster = cluster(item.entry);
    if (entryCluster && seenClusters.has(entryCluster)) continue;
    if (entryCluster) seenClusters.add(entryCluster);
    const relation = item.score >= 3 ? "strong_alternative" : item.score > 1 ? "compatible_alternative" : "broader_alternative";
    const context = [];
    for (const [key, values] of Object.entries(item.entry.compatibility || {})) if (values.length && pool.context.ids[key]?.some((value) => values.includes(value))) context.push(`${key.replaceAll("_", " ")} compatible`);
    for (const [key, values] of Object.entries(item.entry.metadata?.context_affinities || {})) if ((pool.context.ids[key] || []).some((value) => (Array.isArray(values) ? values : [values]).includes(value))) context.push(`${key.replaceAll("_", " ")} relevant`);
    alternatives.push({ id: item.entry.id, label: label(item.entry), source: mapping[0], relation, context, trace: decisionTrace(library, { ...persona, [mapping[1].split(".")[0]]: persona[mapping[1].split(".")[0]] }, field) });
    if (alternatives.length >= limit) break;
  }
  return { field, supported: true, current: { id: currentId, label: label(Array.isArray(current) ? current[0] : current) }, alternatives, fallback: pool.fallback, poolSize: pool.eligible.length };
}

export function alternativeSummary(item) {
  return item.relation === "strong_alternative" ? "Strong contextual fit" : item.relation === "broader_alternative" ? "Broader compatible option" : "Compatible option";
}
