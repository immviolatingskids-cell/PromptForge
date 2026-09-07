import { isCompatible, CONTEXT_FIELDS } from "./context-engine.js";
import { compatibilityScore } from "./candidate-ranker.js";

export function inspectCandidates(entries, context, selectedId) {
  const ids = context?.ids || context || {};
  return entries.map((entry) => {
    const excludedBy = CONTEXT_FIELDS.filter((field) => {
      const allowed = entry.compatibility?.[field] || [];
      const active = ids[field] || [];
      return allowed.length && active.length && !active.some((value) => allowed.includes(value));
    });
    return { id: entry.id, selected: entry.id === selectedId, compatible: !excludedBy.length,
      excludedBy, score: compatibilityScore(entry, ids), source: entry.metadata?.source || "catalogue" };
  });
}
