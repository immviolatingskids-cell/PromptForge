import { compatibilityScore, chooseRanked } from "./candidate-ranker.js";

export const VALUE_PROFILE_DEPTH = {
  grounded: { secondary: 0.82, tension: 0.15 },
  varied: { secondary: 0.95, tension: 0.45 },
  chaotic: { secondary: 0.90, tension: 0.65 }
};

const id = (value) => value?.id ?? value ?? null;
const family = (value) => value?.metadata?.family;
const cluster = (value) => value?.metadata?.cluster;
const related = (left, right) => (left?.metadata?.tension_with || []).includes(id(right))
  || (right?.metadata?.tension_with || []).includes(id(left));

export function normalizeValueProfile(values) {
  if (values && !Array.isArray(values) && ("primary" in values || "secondary" in values || "tension" in values)) {
    return { primary: values.primary || null, secondary: values.secondary || null, tension: values.tension || null };
  }
  const legacy = Array.isArray(values) ? values[0] : values;
  return { primary: legacy || null, secondary: null, tension: null };
}

export function secondaryScore(candidate, primary, context) {
  if (!candidate || id(candidate) === id(primary) || cluster(candidate) === cluster(primary)) return 0;
  let score = compatibilityScore(candidate, context);
  if (family(candidate) !== family(primary)) score += 1.25;
  else score += 0.2;
  return score;
}

export function tensionScore(candidate, primary, secondary, context) {
  if (!candidate || [id(primary), id(secondary)].includes(id(candidate))) return 0;
  if ([cluster(primary), cluster(secondary)].filter(Boolean).includes(cluster(candidate))) return 0;
  const links = [primary, secondary].filter(Boolean).filter((selected) => related(candidate, selected)).length;
  if (!links) return 0;
  let score = compatibilityScore(candidate, context) + links * 4;
  if (![family(primary), family(secondary)].includes(family(candidate))) score += 0.75;
  return score;
}

function weightedChoice(candidates, score, rng, mode) {
  const exponent = { grounded: 1.6, varied: 1.15, chaotic: 0.8 }[mode] || 1.15;
  const eligible = candidates.map((entry) => ({ entry, score: score(entry) })).filter((item) => item.score > 0);
  return eligible.length ? rng.weighted(eligible.map((item) => item.entry), eligible.map((item) => item.score ** exponent)) : null;
}

export function selectValueProfile(candidates, context, rng, mode = "varied", options = {}) {
  const primary = chooseRanked(candidates, context, rng, mode);
  const depth = VALUE_PROFILE_DEPTH[mode] || VALUE_PROFILE_DEPTH.varied;
  const forcedCount = Number.isInteger(options.valueCount) ? Math.max(1, Math.min(3, options.valueCount)) : null;
  const wantsSecondary = forcedCount ? forcedCount >= 2 : rng.next() < depth.secondary;
  const wantsTension = wantsSecondary && (forcedCount ? forcedCount >= 3 : rng.next() < depth.tension);
  const tensionCapable = wantsTension ? candidates.filter((entry) => (entry.metadata?.tension_with || []).some((target) => target !== id(primary))) : candidates;
  const secondaryPool = tensionCapable.some((entry) => secondaryScore(entry, primary, context) > 0) ? tensionCapable : candidates;
  const secondary = wantsSecondary ? weightedChoice(secondaryPool, (entry) => secondaryScore(entry, primary, context), rng, mode) : null;
  const tension = wantsTension ? weightedChoice(candidates, (entry) => tensionScore(entry, primary, secondary, context), rng, mode) : null;
  const strength = tension ? (related(tension, primary) && related(tension, secondary) ? "strong" : "moderate") : "none";
  return {
    profile: { primary, secondary, tension },
    explanation: {
      primary: { context_compatible: true, deterministic_ranked_candidate: true },
      secondary: secondary ? { distinct_cluster: true, family_diverse: family(secondary) !== family(primary) } : null,
      tension: tension ? { distinct_cluster: true, competing_priority: true, context_compatible: true, strength } : null
    }
  };
}

export function valueProfileText(values) {
  const { primary, secondary, tension } = normalizeValueProfile(values);
  const n = (value) => value?.name ?? value;
  if (!secondary) return `${n(primary)} matters deeply to them`;
  if (!tension) return `they place particular importance on ${n(primary)}, alongside ${n(secondary)}`;
  return `they place particular importance on ${n(primary)} while also valuing ${n(secondary)}, though ${n(tension)} can sometimes pull against those priorities`;
}
