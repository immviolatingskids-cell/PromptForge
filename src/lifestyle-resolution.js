import { genreProfileFor, weightedGenreInfluences } from "./genre-profile.js";
import { characterIntelligenceFor, resolveSemanticField } from "./character-intelligence.js";
import { resolveUniversalContext } from "./universal-semantics.js";

export const LIFESTYLE_RESOLUTION_VERSION = 1;

const clean = value => String(value ?? "").trim();
const first = value => Array.isArray(value) ? value.find(item => clean(item)) : value;
const assertion = (kind, domain, value, source, strength = 1) => clean(value) ? ({ kind, domain, value: clean(value), source, strength }) : null;

function projectLocation(project) {
  return first(project?.locations) || project?.context?.setting || "";
}

function genreCandidates(persona, project, domain, genreDomain) {
  const characterProfile = genreProfileFor(persona);
  const profile = characterProfile.genres.length ? characterProfile : (project?.genreProfile || {});
  return weightedGenreInfluences(profile, genreDomain).map(item => ({
    kind: "genre_influence",
    domain,
    value: item.value,
    source: `genre:${item.genreId}`,
    strength: item.weight,
    evidence: item
  }));
}

function exclusionValues(persona) {
  const profile = genreProfileFor(persona);
  const overrides = persona?.extensions?.promptforge?.characterOverrides || {};
  const intelligence = characterIntelligenceFor(persona);
  return [...new Set([
    ...profile.exclusions,
    ...(Array.isArray(overrides.exclusions) ? overrides.exclusions : []),
    ...intelligence.exclusions.map(item => item.value)
  ].map(clean).filter(Boolean))];
}

export function lifestyleCandidateLayers({ library = {}, persona, scene = {}, project = null, seed = "lifestyle" }) {
  if (!persona) throw new Error("A character is required for lifestyle resolution.");
  const universal = resolveUniversalContext(library, persona, { seed, exclusions: exclusionValues(persona) });
  const controls = scene.controls || {};
  const requirements = scene.requirements || scene;
  return {
    universal,
    activity: [
      assertion("scene_requirement", "activity", requirements.activity, "scene.activity"),
      assertion("project_context", "activity", project?.context?.activity, "project.context.activity"),
      ...genreCandidates(persona, project, "activity", "activities"),
      assertion("universal_affinity", "activity", universal.activity, universal.sources.activity, 0.7)
    ].filter(Boolean),
    environment: [
      assertion("scene_requirement", "environment", requirements.location || requirements.environment, "scene.location"),
      assertion("project_context", "environment", projectLocation(project), "project.location"),
      ...genreCandidates(persona, project, "environment", "environments"),
      assertion("universal_affinity", "environment", universal.environment, universal.sources.environment, 0.7)
    ].filter(Boolean),
    social_context: [
      assertion("scene_requirement", "social_context", requirements.socialContext || requirements.social_context, "scene.socialContext"),
      assertion("project_context", "social_context", project?.context?.socialContext, "project.context.socialContext"),
      assertion("universal_affinity", "social_context", universal.socialContext, universal.sources.socialContext, 0.7)
    ].filter(Boolean),
    wardrobe: [
      controls.wardrobe
        ? assertion("explicit_override", "wardrobe", controls.wardrobe, "scene.controls.wardrobe")
        : assertion("scene_requirement", "wardrobe", requirements.wardrobe, "scene.wardrobe"),
      assertion("project_context", "wardrobe", project?.context?.wardrobe, "project.context.wardrobe"),
      ...genreCandidates(persona, project, "wardrobe", "wardrobe")
    ].filter(Boolean),
    props: [
      controls.props
        ? assertion("explicit_override", "props", controls.props, "scene.controls.props")
        : assertion("scene_requirement", "props", requirements.props, "scene.props"),
      assertion("project_context", "props", first(project?.context?.props), "project.context.props"),
      ...genreCandidates(persona, project, "props", "props"),
      ...universal.props.map((value, index) => assertion("universal_affinity", "props", value, universal.sources.props[index], 0.7)).filter(Boolean)
    ].filter(Boolean),
    lifestyle: [assertion("universal_affinity", "lifestyle", universal.lifestyle, universal.sources.lifestyle, 0.7)].filter(Boolean),
    occupation_context: [assertion("universal_affinity", "occupation_context", universal.occupationContext, universal.sources.occupationContext, 0.7)].filter(Boolean)
  };
}

export function resolveLifestyleContext(input) {
  const layers = lifestyleCandidateLayers(input);
  const domains = ["activity", "environment", "social_context", "wardrobe", "props", "lifestyle", "occupation_context"];
  const decisions = Object.fromEntries(domains.map(domain => [domain, resolveSemanticField(domain, layers[domain], { persona: input.persona })]));
  return {
    version: LIFESTYLE_RESOLUTION_VERSION,
    activity: decisions.activity.value,
    environment: decisions.environment.value,
    socialContext: decisions.social_context.value,
    wardrobe: decisions.wardrobe.value,
    props: decisions.props.value ? [decisions.props.value] : [],
    lifestyle: decisions.lifestyle.value,
    occupationContext: decisions.occupation_context.value,
    sources: Object.fromEntries(domains.map(domain => [domain, decisions[domain].source])),
    decisions,
    universal: layers.universal,
    resolution_order: ["character truth", "scene requirement", "character preference", "project context", "character affinity", "genre influence", "universal affinity"]
  };
}
