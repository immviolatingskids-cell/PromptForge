import { SeededRng } from "./seed-rng.js";

export const UNIVERSAL_SEMANTICS_VERSION = 1;
export const UNIVERSAL_RELATION_TYPES = Object.freeze([
  "supports_activity", "supports_social_context", "supports_lifestyle",
  "supports_occupation_context", "prefers_environment", "supports_prop"
]);

const HOBBY_CONTEXTS = Object.freeze({
  visual_arts: { environments: ["creative_workspace", "public_observation_space"], props: ["portable_visual_tools", "reference_materials"], social: ["independent"], lifestyle: ["creative_practice"] },
  culinary: { environments: ["kitchen_workspace"], props: ["ingredients", "kitchen_tools"], social: ["shared_or_independent"], lifestyle: ["home_craft"] },
  combat_sport: { environments: ["training_space"], props: ["protective_training_gear"], social: ["guided_or_partnered"], lifestyle: ["active_practice"] },
  horticulture: { environments: ["garden_workspace"], props: ["plants", "hand_tools"], social: ["independent"], lifestyle: ["outdoor_routine"] },
  tinkering: { environments: ["workshop"], props: ["components", "hand_tools"], social: ["independent_or_small_group"], lifestyle: ["maker_practice"] },
  craft: { environments: ["craft_workspace"], props: ["hand_tools", "work_in_progress"], social: ["independent_or_small_group"], lifestyle: ["maker_practice"] },
  nature_observation: { environments: ["quiet_outdoor_space"], props: ["observation_tools", "field_notes"], social: ["independent_or_small_group"], lifestyle: ["outdoor_routine"] },
  endurance_sport: { environments: ["outdoor_route"], props: ["practical_sports_gear"], social: ["independent_or_group"], lifestyle: ["active_practice"] },
  social_games: { environments: ["shared_table_space"], props: ["game_materials"], social: ["small_group"], lifestyle: ["social_routine"] },
  performing_arts: { environments: ["rehearsal_space"], props: ["practice_materials"], social: ["ensemble_or_partnered"], lifestyle: ["creative_practice"] },
  community_history: { environments: ["community_or_archive_space"], props: ["recording_tools", "archive_materials"], social: ["one_to_one_or_community"], lifestyle: ["community_practice"] },
  outdoor_lore: { environments: ["natural_landscape"], props: ["field_guide", "collection_bag"], social: ["independent_or_small_group"], lifestyle: ["outdoor_routine"] },
  social_arts: { environments: ["community_gathering_space"], props: ["shared_story_materials"], social: ["community_group"], lifestyle: ["community_practice"] }
});

const TRAIT_SOCIAL_CONTEXTS = Object.freeze({
  perception: ["attentive_observer"], temperament: ["calm_company"], autonomy: ["comfortable_independently"], humour: ["informal_company"], drive: ["purposeful_collaboration"], empathy: ["supportive_company"], adaptability: ["flexible_company"], reasoning: ["task_focused_company"], worldview: ["values_led_conversation"], social: ["socially_engaged"], introspection: ["one_to_one_or_independent"], organisation: ["structured_collaboration"]
});

const ENVIRONMENT_PROPS = Object.freeze({
  library: ["books", "reference_materials"], museum: ["display_materials", "catalogue_notes"], university: ["books", "study_materials"], school: ["learning_materials", "writing_tools"],
  home_workspace: ["work_materials", "notebook"], corporate_office: ["work_materials", "notebook"], media_office: ["work_materials", "recording_tools"], government_office: ["documents", "work_materials"], startup: ["work_materials", "planning_notes"],
  workshop: ["hand_tools", "work_in_progress"], studio: ["creative_tools", "work_in_progress"], laboratory: ["lab_tools", "observation_notes"], construction_site: ["protective_gear", "site_tools"],
  clinic: ["clinical_notes", "care_equipment"], hospital: ["clinical_notes", "care_equipment"], field_site: ["field_notes", "observation_tools"], outdoors: ["weather_appropriate_gear", "field_notes"],
  restaurant: ["ingredients", "kitchen_tools"], market: ["goods", "carrying_bag"], retail_floor: ["display_goods", "work_materials"], small_business: ["work_materials", "customer_items"]
});

const normalId = value => String(value?.id ?? value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const label = value => String(value?.name ?? value?.title ?? value?.text ?? value ?? "").trim();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const stable = values => [...values].sort((a, b) => a.id.localeCompare(b.id));

function edge(source, relation, domain, value, weight, rationale) {
  const normalized = normalId(value);
  return normalized ? {
    id: `${source}|${relation}|${domain}:${normalized}`,
    source,
    relation,
    target: { domain, id: normalized, value: String(value).replaceAll("_", " ") },
    weight,
    rationale,
    provenance: { type: "universal_semantic_rule", version: UNIVERSAL_SEMANTICS_VERSION }
  } : null;
}

function addContextEdges(edges, source, profile) {
  for (const domain of ["environments", "props", "social", "lifestyle"]) {
    const targetDomain = domain === "environments" ? "environment" : domain === "social" ? "socialContext" : domain;
    const relation = domain === "environments" ? "prefers_environment" : domain === "props" ? "supports_prop" : domain === "social" ? "supports_social_context" : "supports_lifestyle";
    for (const value of profile?.[domain] || []) edges.push(edge(source, relation, targetDomain, value, domain === "environments" ? 0.72 : 0.64, `universal ${source.split(":")[0]} context`));
  }
}

export function buildUniversalSemanticNetwork(library = {}) {
  const nodes = [];
  const edges = [];
  for (const hobby of library.hobbies || []) {
    const source = `hobby:${normalId(hobby)}`;
    nodes.push({ id: source, domain: "hobby", catalogueId: normalId(hobby), label: label(hobby) });
    edges.push(edge(source, "supports_activity", "activity", `practising ${label(hobby).toLowerCase()}`, 1, "activity named by the selected hobby"));
    addContextEdges(edges, source, HOBBY_CONTEXTS[normalId(hobby.metadata?.cluster)]);
  }
  for (const trait of library.traits || []) {
    const source = `trait:${normalId(trait)}`;
    nodes.push({ id: source, domain: "trait", catalogueId: normalId(trait), label: label(trait) });
    for (const value of TRAIT_SOCIAL_CONTEXTS[normalId(trait.metadata?.cluster)] || []) edges.push(edge(source, "supports_social_context", "socialContext", value, 0.7, "universal personality-cluster relation"));
  }
  for (const occupation of library.occupations || []) {
    const source = `occupation:${normalId(occupation)}`;
    nodes.push({ id: source, domain: "occupation", catalogueId: normalId(occupation), label: label(occupation) });
    edges.push(edge(source, "supports_activity", "activity", `performing the practical work of ${label(occupation).toLowerCase()}`, 0.82, "activity named by the selected occupation"));
    const family = normalId(occupation.metadata?.family || occupation.metadata?.cluster || occupation.metadata?.category || "general");
    edges.push(edge(source, "supports_occupation_context", "occupationContext", `${family}_work_context`, 0.94, "occupation taxonomy relation"));
    for (const environment of list(occupation.metadata?.environments)) edges.push(edge(source, "prefers_environment", "environment", environment, 0.9, "occupation catalogue environment metadata"));
  }
  for (const [environment, props] of Object.entries(ENVIRONMENT_PROPS)) {
    const source = `environment:${environment}`;
    nodes.push({ id: source, domain: "environment", catalogueId: null, label: environment.replaceAll("_", " ") });
    for (const prop of props) edges.push(edge(source, "supports_prop", "props", prop, 0.68, "universal environment-to-prop relation"));
  }
  const cleanEdges = stable(edges.filter(Boolean));
  for (const item of cleanEdges) nodes.push({ id: `${item.target.domain}:${item.target.id}`, domain: item.target.domain, catalogueId: null, label: item.target.value });
  const uniqueNodes = new Map(nodes.map(node => [node.id, node]));
  return {
    version: UNIVERSAL_SEMANTICS_VERSION,
    nodes: stable([...uniqueNodes.values()]),
    edges: cleanEdges
  };
}

function personaSources(context) {
  const persona = context?.persona || context || {};
  const hobbies = list(context?.hobbies ?? persona.interests?.hobbies).map(value => ({ source: `hobby:${normalId(value)}`, commitment: normalId(value?.commitment) })).filter(value => !value.source.endsWith(":")).sort((a, b) => a.source.localeCompare(b.source));
  const personality = persona.personality || {};
  const traits = list(context?.traits ?? [personality.core, ...list(personality.complementary), personality.contrast]).map(value => `trait:${normalId(value)}`).filter(value => !value.endsWith(":"));
  const occupation = context?.occupation ?? persona.life?.job;
  const workEnvironment = normalId(context?.workEnvironment ?? persona.life?.work_environment);
  return {
    persona,
    sources: [...new Set([...hobbies.map(value => value.source), ...traits, ...(normalId(occupation) ? [`occupation:${normalId(occupation)}`] : []), ...(workEnvironment ? [`environment:${workEnvironment}`] : [])])].sort(),
    workEnvironment,
    hobbies
  };
}

function lifestyleCandidates(persona, hobbySources) {
  const candidates = [];
  const rhythm = normalId(persona.life?.daily_rhythm || persona.life?.schedule);
  if (rhythm) {
    const value = /night|evening|late/.test(rhythm) ? "evening_leaning_routine" : /shift|rotat|variable/.test(rhythm) ? "variable_schedule" : /flex|self_directed/.test(rhythm) ? "flexible_routine" : "structured_routine";
    candidates.push(edge(`lifestyle:rhythm:${rhythm}`, "supports_lifestyle", "lifestyle", value, 0.86, "daily rhythm relation"));
  }
  const arrangement = normalId(persona.life?.work_arrangement);
  if (arrangement) candidates.push(edge(`lifestyle:work_arrangement:${arrangement}`, "supports_lifestyle", "lifestyle", `${arrangement}_work_pattern`, 0.8, "work arrangement relation"));
  for (const hobby of hobbySources) if (hobby.commitment) candidates.push(edge(hobby.source, "supports_lifestyle", "lifestyle", `${hobby.commitment}_personal_practice`, 0.76, "hobby commitment relation"));
  return candidates.filter(Boolean);
}

export function universalSemanticCandidates(library, context = {}) {
  const network = buildUniversalSemanticNetwork(library);
  const extracted = personaSources(context);
  const sourceSet = new Set(extracted.sources);
  const candidates = network.edges.filter(item => sourceSet.has(item.source));
  for (const environment of candidates.filter(item => item.target.domain === "environment").map(item => item.target.id)) sourceSet.add(`environment:${environment}`);
  candidates.push(...network.edges.filter(item => sourceSet.has(item.source) && item.target.domain === "props"));
  candidates.push(...lifestyleCandidates(extracted.persona, extracted.hobbies));
  const unique = new Map();
  for (const candidate of candidates.filter(Boolean)) {
    const key = `${candidate.source}|${candidate.target.domain}|${candidate.target.id}`;
    if (!unique.has(key) || unique.get(key).weight < candidate.weight) unique.set(key, candidate);
  }
  return stable([...unique.values()]);
}

function allowed(candidate, exclusions) {
  const text = `${candidate.target.id} ${candidate.target.value}`.toLowerCase();
  return !exclusions.some(exclusion => text.includes(exclusion));
}

function choose(candidates, domain, rng, exclusions) {
  const values = stable(candidates.filter(candidate => candidate.target.domain === domain && allowed(candidate, exclusions)));
  return values.length ? rng.weighted(values, values.map(candidate => candidate.weight)) : null;
}

export function resolveUniversalContext(library, context = {}, options = {}) {
  const candidates = universalSemanticCandidates(library, context);
  const exclusions = list(options.exclusions).map(value => String(value).trim().toLowerCase()).filter(Boolean).sort();
  const rng = new SeededRng(options.seed ?? "universal-context");
  const selected = {
    activity: choose(candidates, "activity", rng, exclusions),
    socialContext: choose(candidates, "socialContext", rng, exclusions),
    lifestyle: choose(candidates, "lifestyle", rng, exclusions),
    occupationContext: choose(candidates, "occupationContext", rng, exclusions),
    environment: choose(candidates, "environment", rng, exclusions)
  };
  const propPool = candidates.filter(candidate => candidate.target.domain === "props" && allowed(candidate, exclusions));
  const sortedProps = stable(propPool);
  const firstProp = sortedProps.length ? rng.weighted(sortedProps, sortedProps.map(candidate => candidate.weight)) : null;
  const remainingProps = propPool.filter(candidate => candidate.target.id !== firstProp?.target.id);
  const secondProp = remainingProps.length ? rng.weighted(stable(remainingProps), stable(remainingProps).map(candidate => candidate.weight)) : null;
  const trace = [...Object.values(selected), firstProp, secondProp].filter(Boolean);
  return {
    version: UNIVERSAL_SEMANTICS_VERSION,
    activity: selected.activity?.target.value || null,
    socialContext: selected.socialContext?.target.value || null,
    lifestyle: selected.lifestyle?.target.value || null,
    occupationContext: selected.occupationContext?.target.value || null,
    environment: selected.environment?.target.value || null,
    props: [firstProp, secondProp].filter(Boolean).map(candidate => candidate.target.value),
    sources: {
      activity: selected.activity?.source || null,
      socialContext: selected.socialContext?.source || null,
      lifestyle: selected.lifestyle?.source || null,
      occupationContext: selected.occupationContext?.source || null,
      environment: selected.environment?.source || null,
      props: [firstProp, secondProp].filter(Boolean).map(candidate => candidate.source)
    },
    trace
  };
}
