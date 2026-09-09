import { projectVisual, negativePrompt } from "./visual-projection.js";
import { serializeVisual } from "./visual-adapters/index.js";
import { blendedGenreDimensions, genreProfileFor } from "./genre-profile.js";
import { resolveSemanticField } from "./character-intelligence.js";
import { resolveLifestyleContext } from "./lifestyle-resolution.js";
import { assemblePurposeReferences } from "./reference-model.js";
import { continuityFor } from "./character-continuity.js";

export const SCENE_INTELLIGENCE_VERSION = 2;

const clean = value => String(value ?? "").trim();
const assertion = (kind, domain, value, source, strength = 1) => clean(value) ? ({ kind, domain, value: clean(value), source, strength }) : null;
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];

export function assembleProjectContext(project = null) {
  if (!project) return { setting: "", era: "", premise: "", notes: "", locations: [], relationships: [], genreProfile: { genres: [] }, references: [] };
  return {
    setting: clean(project.context?.setting),
    era: clean(project.context?.era),
    premise: clean(project.context?.premise),
    notes: clean(project.notes),
    locations: Array.isArray(project.locations) ? project.locations.map(clean).filter(Boolean) : [],
    relationships: Array.isArray(project.relationships) ? structuredClone(project.relationships) : [],
    genreProfile: project.genreProfile || { genres: [] },
    references: Array.isArray(project.references) ? structuredClone(project.references) : []
  };
}

function lightingFor(time, fallback) {
  const value = clean(time).toLowerCase();
  if (/night|midnight|late evening/.test(value)) return "soft practical night lighting with readable facial detail";
  if (/sunrise|dawn|early morning/.test(value)) return "gentle early light with long soft shadows";
  if (/sunset|golden hour|dusk/.test(value)) return "warm low-angle light with natural contrast";
  if (/afternoon|day|morning|noon/.test(value)) return "clear natural daylight shaped by the environment";
  return fallback;
}

function expressionFor(mood, fallback) {
  const value = clean(mood).toLowerCase();
  if (/happy|joy|warm|playful|excited/.test(value)) return "a warm, naturally engaged expression";
  if (/calm|focused|quiet|reflective/.test(value)) return "a calm, attentive expression";
  if (/tense|urgent|anxious|alert/.test(value)) return "an alert expression with restrained tension";
  if (/sad|melancholy|somber|sombre/.test(value)) return "a subdued, reflective expression";
  return fallback;
}

function poseFor(activity, socialContext, fallback) {
  const value = `${clean(activity)} ${clean(socialContext)}`.toLowerCase();
  if (/run|walk|dance|moving|crossing/.test(value)) return "caught in purposeful natural movement with a readable silhouette";
  if (/write|draw|build|cook|work|read|photograph|game|play/.test(value)) return "body language engaged with the task, hands and intent clearly visible";
  if (/friend|group|team|together|partner/.test(value)) return "open conversational body language oriented toward the company";
  return fallback;
}

function compositionFor(activity, socialContext, fallback) {
  const value = `${clean(activity)} ${clean(socialContext)}`.toLowerCase();
  if (/friend|group|team|together|partner/.test(value)) return "balanced environmental composition with clear spacing between participants";
  if (/run|walk|dance|moving/.test(value)) return "dynamic three-quarter composition with room for movement";
  if (activity) return "medium environmental composition keeping face, hands, task, and context readable";
  return fallback;
}

function readableSource(source) {
  if (!source) return "persona projection";
  if (source.startsWith("scene.controls.")) return "advanced override";
  if (source.startsWith("scene.")) return "scene requirement";
  if (source.startsWith("project.")) return "project context";
  if (source.startsWith("genre:")) return source.replace("genre:", "genre: ");
  if (/^(origin|foundation|appearance|life|personality)\./.test(source)) return "canonical persona";
  if (source.startsWith("characterOverrides.")) return "explicit character override";
  if (source === "persona projection") return source;
  return `universal affinity: ${source}`;
}

function decide(domain, candidates, persona, fallback) {
  return resolveSemanticField(domain, [...candidates, assertion("universal_affinity", domain, fallback, "persona projection", 0.5)].filter(Boolean), { persona });
}

function purposeReferences(persona, project, controls) {
  return [
    ...list(persona?.extensions?.promptforge?.references),
    ...list(project?.references),
    ...list(controls?.references)
  ];
}

export function resolveScene({ persona, requirements = {}, project = null, library = {}, seed = "scene", controls = {}, target = "generic", density = "standard" }) {
  if (!persona) throw new Error("A saved character is required to resolve a scene.");
  const projection = structuredClone(projectVisual(persona, "narrative_scene"));
  const projectContext = assembleProjectContext(project);
  const continuity = continuityFor(persona);
  const lifestyle = resolveLifestyleContext({ library, persona, scene: { requirements, controls }, project, seed: `${persona.meta?.seed || persona.meta?.persona_id}:${seed}` });
  const mood = clean(requirements.mood) || "natural atmosphere";
  const time = clean(requirements.time) || "unspecified time";
  const socialContext = lifestyle.socialContext || clean(requirements.socialContext) || "unspecified company";

  const activity = decide("activity", [
    assertion("temporary_state", "activity", continuity.current.situation, "continuity.current.situation"),
    ...lifestyle.decisions.activity.candidates
  ].filter(Boolean), persona, projection.activity);
  const environment = decide("environment", lifestyle.decisions.environment.candidates, persona, projection.environment);
  const wardrobe = decide("wardrobe", lifestyle.decisions.wardrobe.candidates, persona, projection.wardrobe);
  const props = decide("props", lifestyle.decisions.props.candidates, persona, projection.props);
  const expression = decide("expression", [
    controls.expression
      ? assertion("explicit_override", "expression", controls.expression, "scene.controls.expression")
      : assertion("scene_requirement", "expression", requirements.expression, "scene.expression"),
    assertion("scene_requirement", "expression", expressionFor(mood, ""), "scene.mood", 0.8)
  ].filter(Boolean), persona, projection.expression);
  const pose = decide("pose", [
    controls.pose
      ? assertion("explicit_override", "pose", controls.pose, "scene.controls.pose")
      : assertion("scene_requirement", "pose", requirements.pose, "scene.pose"),
    assertion("scene_requirement", "pose", poseFor(activity.value, socialContext, ""), "scene.activity", 0.8)
  ].filter(Boolean), persona, projection.pose);
  const composition = decide("composition", [
    controls.composition
      ? assertion("explicit_override", "composition", controls.composition, "scene.controls.composition")
      : assertion("scene_requirement", "composition", requirements.composition, "scene.composition"),
    assertion("scene_requirement", "composition", compositionFor(activity.value, socialContext, ""), "scene.activity", 0.8)
  ].filter(Boolean), persona, projection.camera);
  const lighting = decide("lighting", [
    controls.lighting
      ? assertion("explicit_override", "lighting", controls.lighting, "scene.controls.lighting")
      : assertion("scene_requirement", "lighting", requirements.lighting, "scene.lighting"),
    assertion("scene_requirement", "lighting", lightingFor(time, ""), "scene.time", 0.8)
  ].filter(Boolean), persona, projection.lighting);
  const references = assemblePurposeReferences(purposeReferences(persona, project, controls));
  const dimensions = blendedGenreDimensions(genreProfileFor(persona));
  const characterOverrides = persona.extensions?.promptforge?.characterOverrides || {};

  const decisions = { activity, environment, wardrobe, props, expression, pose, composition, lighting };
  const resolved = {
    ...projection,
    scene_intelligence_version: SCENE_INTELLIGENCE_VERSION,
    environment: environment.value,
    activity: activity.value,
    activity_detail: activity.value,
    wardrobe: wardrobe.value,
    props: props.value,
    expression: expression.value,
    pose: pose.value,
    camera: composition.value,
    lighting: lighting.value,
    time,
    social_context: socialContext,
    mood,
    project_context: [projectContext.premise, projectContext.notes].filter(Boolean).join(" — ") || null,
    style_influence: genreProfileFor(persona).genres.map(item => ({ ...item })),
    genre_dimensions: dimensions,
    references,
    continuity: {
      current: continuity.current,
      active_threads: continuity.threads.filter(thread => thread.status === "active"),
      recent_scene_refs: continuity.recentScenes.map(scene => scene.ref)
    },
    exclusions: [...new Set([...genreProfileFor(persona).exclusions, ...lifestyle.decisions.activity.exclusions.map(item => item.value)])],
    resolution_order: ["canonical-and-overrides", "scene", "preference", "project", "affinity", "genre", "universal"],
    sources: {
      character: "canonical persona",
      location: readableSource(environment.source),
      environment: readableSource(environment.source),
      activity: readableSource(activity.source),
      wardrobe: readableSource(wardrobe.source),
      props: readableSource(props.source),
      expression: readableSource(expression.source),
      pose: readableSource(pose.source),
      composition: readableSource(composition.source),
      lighting: readableSource(lighting.source),
      atmosphere: clean(requirements.mood) || clean(requirements.time) ? "scene requirement" : "persona projection"
    },
    source_details: Object.fromEntries(Object.entries(decisions).map(([domain, decision]) => [domain, {
      selected: decision.selected,
      suppressed: decision.suppressed,
      alternatives: decision.candidates.slice(1, 5)
    }]))
  };

  const basePrompt = serializeVisual(resolved, target, { style: "polished", density });
  const context = [
    time && `Time: ${time}`,
    socialContext && `Company: ${socialContext}`,
    mood && `Mood: ${mood}`,
    resolved.props && `Contextual props: ${resolved.props}`,
    resolved.project_context && `Project context: ${resolved.project_context}`,
    characterOverrides.personality && `Character requirement: ${characterOverrides.personality}`,
    characterOverrides.currentLife && `Current life: ${characterOverrides.currentLife}`,
    continuity.current.project && `Current project: ${continuity.current.project}`,
    continuity.current.goal && `Current goal: ${continuity.current.goal}`,
    continuity.current.situation && `Current situation: ${continuity.current.situation}`,
    continuity.threads.some(thread => thread.status === "active") && `Current threads: ${continuity.threads.filter(thread => thread.status === "active").map(thread => thread.title).join(", ")}`
  ].filter(Boolean).join("; ");
  return { ...resolved, prompt: `${basePrompt} ${context}.`, negativePrompt: negativePrompt(resolved) };
}
