export const CHARACTER_INTELLIGENCE_VERSION = 1;

export const ASSERTION_KINDS = Object.freeze([
  "canonical_fact",
  "explicit_override",
  "preference",
  "affinity",
  "exclusion",
  "temporary_state",
  "scene_requirement",
  "project_context",
  "genre_influence",
  "universal_affinity"
]);

export const SOURCE_PRIORITY = Object.freeze({
  canonical_fact: 700,
  explicit_override: 710,
  temporary_state: 575,
  scene_requirement: 600,
  preference: 550,
  project_context: 500,
  affinity: 400,
  genre_influence: 300,
  universal_affinity: 200
});

const clean = value => String(value ?? "").trim();
const slug = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const asList = value => Array.isArray(value) ? value : value == null ? [] : [value];
const finiteStrength = value => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : 1;
const stableCompare = (left, right) => left === right ? 0 : left < right ? -1 : 1;

export function normalizeAssertion(raw, fallbackKind = "affinity") {
  if (typeof raw === "string") raw = { value: raw };
  if (!raw || typeof raw !== "object") return null;
  const kind = ASSERTION_KINDS.includes(raw.kind) ? raw.kind : fallbackKind;
  const domain = slug(raw.domain || "general");
  const value = clean(raw.value?.name ?? raw.value?.text ?? raw.value);
  if (!domain || !value) return null;
  const assertion = {
    id: clean(raw.id) || `${kind}:${domain}:${slug(value)}`,
    kind,
    domain,
    value,
    strength: finiteStrength(raw.strength),
    source: clean(raw.source) || kind.replaceAll("_", " ")
  };
  if (raw.temporary === true || kind === "temporary_state") assertion.temporary = true;
  if (clean(raw.expiresAt)) assertion.expiresAt = clean(raw.expiresAt);
  return assertion;
}

function normalizedList(value, kind) {
  const unique = new Map();
  for (const raw of asList(value)) {
    const item = normalizeAssertion(raw, kind);
    if (!item) continue;
    const key = `${item.kind}:${item.domain}:${item.value.toLowerCase()}`;
    const previous = unique.get(key);
    if (!previous || item.strength > previous.strength) unique.set(key, item);
  }
  return [...unique.values()].sort((left, right) => stableCompare(left.id, right.id));
}

export function normalizeCharacterIntelligence(raw = {}) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    version: CHARACTER_INTELLIGENCE_VERSION,
    preferences: normalizedList(source.preferences, "preference"),
    affinities: normalizedList(source.affinities, "affinity"),
    exclusions: normalizedList(source.exclusions, "exclusion")
  };
}

export function characterIntelligenceFor(persona) {
  return normalizeCharacterIntelligence(persona?.extensions?.promptforge?.characterIntelligence || {});
}

const fact = (domain, value, source) => normalizeAssertion({ kind: "canonical_fact", domain, value, source });
const override = (domain, value, source) => normalizeAssertion({ kind: "explicit_override", domain, value, source });

export function canonicalCharacterAssertions(persona = {}) {
  const assertions = [
    fact("identity_name", persona.origin?.name, "origin.name"),
    fact("identity_age", persona.foundation?.age, "foundation.age"),
    fact("identity_species", persona.foundation?.species, "foundation.species"),
    fact("appearance_body", persona.appearance?.visual?.body || persona.appearance?.surface?.body, "appearance.visual.body"),
    fact("appearance_hair", persona.appearance?.visual?.hair || persona.appearance?.surface?.hair, "appearance.visual.hair"),
    fact("appearance_eyes", persona.appearance?.visual?.eyes || persona.appearance?.surface?.eyes, "appearance.visual.eyes"),
    fact("appearance_feature", persona.appearance?.visual?.feature || persona.appearance?.surface?.feature, "appearance.visual.feature"),
    fact("wardrobe", persona.appearance?.signature_outfit, "appearance.signature_outfit"),
    fact("occupation", persona.life?.job, "life.job")
  ].filter(Boolean);
  const values = persona.personality?.values;
  for (const item of Array.isArray(values) ? values : [values?.primary, values?.secondary, values?.tension]) {
    const assertion = fact("personal_value", item, "personality.values");
    if (assertion) assertions.push(assertion);
  }
  return assertions;
}

const OVERRIDE_DOMAINS = Object.freeze({
  appearance: "appearance_direction",
  personality: "personality_direction",
  background: "background",
  occupation: "occupation",
  location: "location",
  interests: "interest",
  references: "reference_direction"
});

export function explicitCharacterAssertions(persona = {}) {
  const values = persona.extensions?.promptforge?.characterOverrides || {};
  return Object.entries(OVERRIDE_DOMAINS).map(([key, domain]) => override(domain, values[key], `characterOverrides.${key}`)).filter(Boolean);
}

export function characterAssertions(persona = {}) {
  const intelligence = characterIntelligenceFor(persona);
  return [
    ...canonicalCharacterAssertions(persona),
    ...explicitCharacterAssertions(persona),
    ...intelligence.preferences,
    ...intelligence.affinities,
    ...intelligence.exclusions
  ];
}

function matchesExclusion(candidate, exclusion) {
  if (exclusion.domain !== "general" && exclusion.domain !== candidate.domain) return false;
  const blocked = exclusion.value.toLowerCase();
  const value = candidate.value.toLowerCase();
  return value === blocked || value.includes(blocked) || blocked.includes(value);
}

function activeExclusions(persona, domain) {
  return characterIntelligenceFor(persona).exclusions.filter(item => item.domain === "general" || item.domain === slug(domain));
}

export function resolveSemanticField(domain, candidates = [], { persona = null } = {}) {
  const normalizedDomain = slug(domain);
  const normalized = asList(candidates).map(item => normalizeAssertion({ ...item, domain: item?.domain || normalizedDomain }, item?.kind || "affinity")).filter(item => item && item.domain === normalizedDomain);
  const characterCandidates = characterAssertions(persona || {}).filter(item => item.kind !== "exclusion" && item.domain === normalizedDomain);
  const unique = new Map();
  for (const item of [...normalized, ...characterCandidates]) {
    const key = `${item.kind}:${item.domain}:${item.value.toLowerCase()}:${item.source}`;
    if (!unique.has(key) || unique.get(key).strength < item.strength) unique.set(key, item);
  }
  const all = [...unique.values()];
  const exclusions = activeExclusions(persona, normalizedDomain);
  const accepted = [];
  const suppressed = [];
  for (const candidate of all) {
    const blocker = exclusions.find(exclusion => matchesExclusion(candidate, exclusion));
    if (blocker && !["canonical_fact", "explicit_override"].includes(candidate.kind)) suppressed.push({ candidate, reason: "character exclusion", exclusion: blocker });
    else accepted.push(candidate);
  }
  accepted.sort((left, right) => (SOURCE_PRIORITY[right.kind] || 0) - (SOURCE_PRIORITY[left.kind] || 0)
    || right.strength - left.strength
    || stableCompare(left.value.toLowerCase(), right.value.toLowerCase())
    || stableCompare(left.id, right.id));
  return {
    domain: normalizedDomain,
    value: accepted[0]?.value || null,
    selected: accepted[0] || null,
    candidates: accepted,
    suppressed,
    exclusions,
    source: accepted[0]?.source || null
  };
}

export function explainCharacterIntelligence(persona = {}) {
  const assertions = characterAssertions(persona);
  return {
    version: CHARACTER_INTELLIGENCE_VERSION,
    assertions,
    counts: Object.fromEntries(ASSERTION_KINDS.map(kind => [kind, assertions.filter(item => item.kind === kind).length]))
  };
}
