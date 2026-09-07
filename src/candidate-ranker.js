const MODE_EXPONENT = { grounded: 2.2, varied: 1.35, chaotic: 0.45 };

export function compatibilityScore(entry, context, soft = {}) {
  context = context?.ids || context || {};
  let score = 1;
  for (const [field, active] of Object.entries(context)) {
    const allowed = entry.compatibility?.[field] || [];
    if (allowed.length && active.some((value) => allowed.includes(value))) score += 2;
  }
  for (const [key, active] of Object.entries(soft)) {
    const values = entry.metadata?.[key] || [];
    const list = Array.isArray(values) ? values : [values];
    if (active.some((value) => list.includes(value))) score += 1;
  }
  // Affinities are intentionally soft. They may make a value more likely in a
  // context, but never remove it from the candidate pool.
  for (const [field, preferred] of Object.entries(entry.metadata?.context_affinities || {})) {
    const active = context[field] || [];
    const values = Array.isArray(preferred) ? preferred : [preferred];
    if (active.some((value) => values.includes(value))) score += 0.5;
  }
  return score;
}

export function chooseRanked(entries, context, rng, mode = "varied", soft = {}) {
  if (!entries.length) throw new Error("No valid candidates remain for the active context");
  const exponent = MODE_EXPONENT[mode] ?? MODE_EXPONENT.varied;
  const weights = entries.map((entry) => Math.max(0.1, compatibilityScore(entry, context, soft)) ** exponent);
  return rng.weighted(entries, weights);
}
