import { isCompatible, CONTEXT_FIELDS } from "./context-engine.js";

export function effectiveCoverage(entries, contexts = []) {
  const raw = entries.length;
  const effectiveCounts = contexts.map((context) => entries.filter((entry) => isCompatible(entry, context)).length);
  const usable = effectiveCounts.length ? effectiveCounts.filter(Boolean).length : raw;
  return { raw, contexts: effectiveCounts.length, effectiveCounts, usableContexts: usable,
    effectiveRatio: effectiveCounts.length ? usable / effectiveCounts.length : (raw ? 1 : 0), fields: [...CONTEXT_FIELDS] };
}
