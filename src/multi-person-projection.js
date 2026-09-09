import { projectVisual } from "./visual-projection.js";
import { relationshipLabel } from "./relationship-types.js";

export const MULTI_PERSON_PROJECTION_VERSION = 1;
const clean = value => String(value ?? "").trim();
const idOf = value => value?.meta?.persona_id || value?.id || value;
const nameOf = value => value?.origin?.name || idOf(value) || "Unnamed participant";
const unique = values => [...new Set(values.filter(Boolean))];
function hash(seed) { let h = 2166136261; for (const c of String(seed || "projection")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function order(values, seed) { return [...values].sort((a, b) => (hash(`${seed}:${idOf(a)}`) - hash(`${seed}:${idOf(b)}`)) || String(idOf(a)).localeCompare(String(idOf(b)))); }

function roleFor(persona, focusId, index) { return idOf(persona) === focusId ? "focus" : index === 1 ? "supporting" : "background"; }
function relationshipBetween(a, b, relationships) { return relationships.find(item => item.sourceRef?.id === idOf(a) && item.targetRef?.id === idOf(b)) || relationships.find(item => item.sourceRef?.id === idOf(b) && item.targetRef?.id === idOf(a)); }
function dynamicCue(relation) {
  if (!relation) return "shared attention toward the central action";
  const type = String(relation.type || "").toLowerCase();
  if (/mentor|manager|parent|supervis/.test(type)) return "the senior participant guides while the other listens and responds";
  if (/rival|compet/.test(type)) return "measured opposition, guarded posture, and a clear line of attention between them";
  if (/friend|romantic|partner/.test(type)) return "familiar proximity and reciprocal attention without invented dialogue";
  return "observable reciprocal attention shaped by the recorded relationship";
}

export function resolveMultiPersonProjection({ scene = {}, personas = [], project = null, cast = null, group = null, relationships = [], location = null, settings = {} } = {}) {
  const personaMap = new Map(personas.map(item => [idOf(item), item]));
  const refs = scene.participantRefs?.map(ref => ref.id) || [];
  const inherited = [...(cast?.personaRefs || []), ...(group?.personaRefs || []), ...(scene.inheritance?.participants === "project" ? project?.personaRefs || [] : [])].map(ref => ref.id);
  const participantIds = unique([...refs, ...inherited]);
  const missing = participantIds.filter(id => !personaMap.has(id));
  const available = order(participantIds.map(id => personaMap.get(id)).filter(Boolean), scene.seed || "scene");
  if (!available.length) return { schemaVersion: MULTI_PERSON_PROJECTION_VERSION, status: "empty", participants: [], warnings: ["No available participant references"], sourceTrace: [] };
  const focusId = settings.focusPersonaId || scene.focusPersonaRef?.id || idOf(available[0]);
  const focus = available.find(item => idOf(item) === focusId) || available[0];
  const density = ["compact", "standard", "detailed"].includes(settings.density) ? settings.density : "standard";
  const target = settings.visualTarget || scene.controls?.target || "generic";
  const participantRecords = available.map((persona, index) => {
    const visual = projectVisual(persona, settings.mode || "narrative_scene");
    const relation = relationshipBetween(focus, persona, relationships);
    return { id: idOf(persona), name: nameOf(persona), role: roleFor(persona, idOf(focus), index), identity: { name: visual.subject.name, species: visual.subject.species, apparentAge: visual.subject.apparent_age, body: visual.appearance.body, hair: visual.appearance.hair, eyes: visual.appearance.eyes }, visualFacts: { wardrobe: visual.wardrobe, activity: visual.activity, pose: visual.pose }, interaction: persona === focus ? "anchors the shared action" : dynamicCue(relation), relationshipEvidence: relation ? { id: relation.id, label: relationshipLabel(relation.type), source: relation.sourceRef?.id, target: relation.targetRef?.id } : null, sourceTrace: [{ path: `personas.${idOf(persona)}`, value: idOf(persona), reason: "canonical persona reference" }] };
  });
  const evidence = relationships.filter(item => participantIds.includes(item.sourceRef?.id) && participantIds.includes(item.targetRef?.id));
  const context = clean(location?.name || scene.requirements?.location || project?.context?.setting || "shared scene environment");
  const action = clean(scene.requirements?.action || scene.requirements?.activity || "undertake the shared scene action");
  const arrangement = settings.composition || (participantRecords.length === 2 ? "focus and supporting participant in a readable two-person medium shot" : "focus participant foreground, supporting participants in a balanced semicircle");
  const lines = participantRecords.map(item => `${item.name} (${item.role}): ${item.visualFacts.pose || "natural readable pose"}; ${item.interaction}.`);
  const prompt = [`MULTI-PERSON VISUAL PROJECTION v${MULTI_PERSON_PROJECTION_VERSION}`, `Scene: ${context}; ${action}.`, `Composition: ${arrangement}; ${settings.camera || "eye-level medium-wide framing"}; ${settings.lighting || "coherent soft directional light"}.`, ...lines, evidence.length ? `Relationship evidence: ${evidence.map(item => `${relationshipLabel(item.type)} (${item.sourceRef?.id}→${item.targetRef?.id})`).join("; ")}.` : "No compatible relationship evidence selected; do not invent history or dialogue.", density === "detailed" ? "Keep every silhouette, gaze line, limb, and clothing assignment distinct." : "Keep subjects distinct and readable as one shared scene."] .join(" ");
  const negativePrompt = "isolated portraits, merged limbs, duplicated clothing, identity leakage, invented dialogue, contradictory age/species, impossible spatial relationship, extra unnamed people";
  const sourceTrace = [{ domain: "participants", source: "scene references and inheritance", detail: participantRecords.map(item => `${item.name}:${item.role}`).join(", ") }, { domain: "composition", source: settings.composition ? "projection override" : "deterministic default", detail: arrangement }, { domain: "location", source: location ? "location reference" : project ? "project context" : "scene requirement", detail: context }, { domain: "relationships", source: evidence.length ? "selected relationship references" : "none", detail: evidence.map(item => relationshipLabel(item.type)).join(", ") || "No relationship evidence applied" }];
  return { schemaVersion: MULTI_PERSON_PROJECTION_VERSION, status: missing.length ? "degraded" : "ready", seed: scene.seed, density, target, focusCharacter: { id: idOf(focus), name: nameOf(focus) }, participants: participantRecords, arrangement, summary: `${nameOf(focus)} anchors a shared scene with ${participantRecords.filter(item => item.id !== idOf(focus)).map(item => item.name).join(", ") || "no supporting participant"} at ${context}.`, prompt, negativePrompt, sourceTrace, warnings: missing.map(id => `Missing participant reference: ${id}`), package: { schemaVersion: MULTI_PERSON_PROJECTION_VERSION, sceneId: scene.id, participantRefs: participantIds.map(id => ({ type: "persona", id })), focusPersonaRef: { type: "persona", id: idOf(focus) }, relationshipRefs: evidence.map(item => ({ type: "relationship", id: item.id })), settings: { density, target, ...settings }, sourceTrace } };
}

export function multiPersonMarkdown(projection) { return [`# ${projection.summary}`, `Status: ${projection.status}`, "## Visual prompt", projection.prompt, "## Negative guidance", projection.negativePrompt, "## Participants", ...(projection.participants || []).map(item => `- **${item.name}** (${item.role}): ${item.visualFacts.pose || "readable pose"}; ${item.interaction}`), "## Source trace", ...(projection.sourceTrace || []).map(item => `- **${item.domain}:** ${item.detail} (${item.source})`)].join("\n\n"); }
