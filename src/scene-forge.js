import { resolveScene } from "./scene-resolver.js";
import { relationshipLabel } from "./relationship-types.js";

const clean = value => String(value ?? "").trim();
const byId = values => new Map((values || []).map(value => [value.meta?.persona_id || value.id, value]));
const unique = values => [...new Set(values.filter(Boolean))];
function pick(seed, values) { let hash = 2166136261; for (const char of String(seed)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return values[Math.abs(hash) % values.length]; }

export function resolveSceneForge({ scene, personas = [], projects = [], locations = [], casts = [], groups = [], relationships = [], library = {} }) {
  const personaIndex = byId(personas), projectIndex = byId(projects), locationIndex = byId(locations), castIndex = byId(casts), groupIndex = byId(groups), relationshipIndex = byId(relationships);
  const project = scene.projectRef ? projectIndex.get(scene.projectRef.id) : null, cast = scene.castRef ? castIndex.get(scene.castRef.id) : null, group = scene.groupRef ? groupIndex.get(scene.groupRef.id) : null;
  const inheritedIds = scene.inheritance?.participants === "independent" ? [] : [...(cast?.personaRefs || []), ...(group?.personaRefs || []), ...(scene.inheritance?.participants === "project" ? project?.personaRefs || [] : [])].map(ref => ref.id);
  const participantIds = unique([...(scene.participantRefs || []).map(ref => ref.id), ...inheritedIds]);
  const participants = participantIds.map(id => personaIndex.get(id)).filter(Boolean), missingParticipants = participantIds.filter(id => !personaIndex.has(id));
  if (!participants.length) throw new Error("Choose at least one available participant. Missing references cannot become scene facts.");
  const focus = personaIndex.get(scene.focusPersonaRef?.id) || participants[0];
  const location = scene.locationRef ? locationIndex.get(scene.locationRef.id) : null;
  const relationshipEvidence = (scene.relationshipRefs || []).map(ref => relationshipIndex.get(ref.id)).filter(Boolean).filter(item => participantIds.includes(item.sourceRef?.id) && participantIds.includes(item.targetRef?.id));
  const unsupportedRelationships = (scene.relationshipRefs || []).filter(ref => !relationshipIndex.has(ref.id) || !relationshipEvidence.some(item => item.id === ref.id)).map(ref => ref.id);
  const requirements = { ...scene.requirements, location: clean(scene.requirements?.location) || clean(location?.name) || (scene.inheritance?.location === "project" ? clean(project?.context?.setting) : ""), time: clean(scene.requirements?.time) || (scene.inheritance?.time === "project" ? clean(project?.context?.era) : ""), socialContext: clean(scene.requirements?.socialContext) || participants.map(item => item.origin?.name).join(", "), mood: clean(scene.requirements?.atmosphere || scene.requirements?.mood), activity: clean(scene.requirements?.action || scene.requirements?.activity) };
  const visual = resolveScene({ persona: focus, requirements, project, library, seed: scene.seed, controls: scene.controls, target: scene.controls?.target || "generic", density: scene.controls?.density || "standard" });
  const dynamics = relationshipEvidence.map(item => `${personaIndex.get(item.sourceRef.id)?.origin?.name} and ${personaIndex.get(item.targetRef.id)?.origin?.name}: ${relationshipLabel(item.type)}${item.description ? ` — ${item.description}` : ""}`);
  const hooks = unique([clean(scene.premise), clean(scene.purpose), clean(scene.requirements?.conflict), ...dynamics]).slice(0, 5);
  const hook = pick(`${scene.seed}:hook`, hooks.length ? hooks : ["A revealing choice changes the immediate direction of the moment."]);
  const summary = `${scene.title}. ${requirements.location ? `At ${requirements.location}, ` : ""}${participants.map(item => item.origin?.name).join(", ")} ${requirements.activity || "enter a consequential moment"}.${scene.requirements?.conflict ? ` Tension: ${scene.requirements.conflict}.` : ""}`;
  const sourceTrace = [
    { domain: "participants", source: scene.inheritance?.participants || "explicit", detail: participants.map(item => item.origin?.name).join(", ") },
    { domain: "location", source: scene.locationRef ? "explicit location reference" : project ? "project context" : "independent scene value", detail: requirements.location || "unspecified" },
    { domain: "relationships", source: "selected evidence only", detail: dynamics.join("; ") || "No relationship facts applied" },
    { domain: "project", source: project ? "project reference" : "independent", detail: project?.name || "No project" }
  ];
  return { ...visual, participants: participants.map(item => ({ id: item.meta.persona_id, name: item.origin?.name })), focusCharacter: { id: focus.meta.persona_id, name: focus.origin?.name }, interactionDynamics: dynamics, hooks, selectedHook: hook, conflict: clean(scene.requirements?.conflict), sourceTrace, warnings: [...missingParticipants.map(id => `Missing participant: ${id}`), ...unsupportedRelationships.map(id => `Unsupported relationship omitted: ${id}`), ...(scene.locationRef && !location ? [`Missing location: ${scene.locationRef.id}`] : []), ...(scene.projectRef && !project ? [`Missing project: ${scene.projectRef.id}`] : [])], summary,
    package: { schemaVersion: 1, sceneId: scene.id, seed: scene.seed, participantRefs: participantIds.map(id => ({ type: "persona", id })), focusPersonaRef: { type: "persona", id: focus.meta.persona_id }, locationRef: scene.locationRef, relationshipRefs: relationshipEvidence.map(item => ({ type: "relationship", id: item.id })), direction: { hook, action: visual.activity, pose: visual.pose, framing: visual.camera, atmosphere: visual.mood, conflict: clean(scene.requirements?.conflict) }, visualProjection: { prompt: visual.prompt, negativeGuidance: visual.negativePrompt }, sourceTrace }
  };
}
