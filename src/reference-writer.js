const n=(value)=>value?.name??value??"unspecified";
import { projectVisual, serializeVisualProjection, VISUAL_MODES } from "./visual-projection.js";
import { serializeVisual, VISUAL_TARGETS, adapterCapabilities } from "./visual-adapters/index.js";
import { assemblePurposeReferences } from "./reference-model.js";

export const REFERENCE_PACKAGE_SCHEMA_VERSION = 1;
export const REFERENCE_PACKAGE_SEMANTICS = Object.freeze({
  master: Object.freeze({ purpose: "character", strength: "anchor", role: "identity master" }),
  headshot: Object.freeze({ purpose: "appearance", strength: "strong", role: "facial continuity" }),
  full_body: Object.freeze({ purpose: "character", strength: "strong", role: "proportion and silhouette continuity" }),
  casual_outfit: Object.freeze({ purpose: "fashion", strength: "supporting", role: "everyday wardrobe exploration" }),
  signature_outfit: Object.freeze({ purpose: "fashion", strength: "strong", role: "signature wardrobe continuity" }),
  expression_sheet: Object.freeze({ purpose: "character", strength: "strong", role: "expression range with stable identity" }),
  signature_item: Object.freeze({ purpose: "lifestyle", strength: "strong", role: "character-linked prop continuity" }),
  visual_traits: Object.freeze({ purpose: "appearance", strength: "anchor", role: "compact identity constraints" })
});
export function apparentAge(persona){const stage=persona.foundation.life_stage.id;const range=persona.foundation.species.metadata?.apparent_age_ranges?.[stage];return range?`${range[0]}–${range[1]}`:`${persona.foundation.age}`;}
function visualTraits(p){return `${n(p.foundation.life_stage).toLowerCase()} ${n(p.foundation.species).toLowerCase()}, apparent age ${apparentAge(p)}, ${n(p.appearance.visual.body).toLowerCase()}, ${n(p.appearance.visual.hair).toLowerCase()}, ${n(p.appearance.visual.eyes).toLowerCase()}, ${n(p.appearance.visual.feature).toLowerCase()}`;}
export function referencePackage(persona,mode="structured"){
  const p=persona, traits=visualTraits(p), style=n(p.appearance.clothing_style), outfit=n(p.appearance.signature_outfit), item=n(p.narrative.signature_item);
  const projected = (visualMode) => serializeVisualProjection(projectVisual(p, visualMode), mode);
  const structured={
    master:`${projected("reference")}\nSTYLE: ${style}\nOUTFIT: ${outfit}\nSETTING: ${n(p.foundation.setting)}, ${n(p.foundation.era)}\nSIGNATURE ITEM: ${item}\nRENDER: full character reference, neutral lighting, consistent identity`,
    headshot:projected("portrait"),
    full_body:projected("full_body"),
    casual_outfit:`SUBJECT: ${traits}\nCLOTHING: a casual outfit derived from ${style}\nPOSE: relaxed natural stance`,
    signature_outfit:`SUBJECT: ${traits}\nCLOTHING: ${outfit}\nPOSE: confident character-defining stance`,
    expression_sheet:`SUBJECT: same identity, ${traits}\nSHEET: six consistent headshots\nEXPRESSIONS: default, happy, annoyed, embarrassed, angry, focused`,
    signature_item:`OBJECT: ${item}\nOWNER: ${p.origin.name}\nMEANING: ${p.character_hook.text}\nRENDER: isolated object reference, multiple angles, neutral background`,
    visual_traits:`${traits}. General clothing style: ${style}. Signature outfit: ${outfit}.`
  };
  if(mode==="structured")return structured;
  return Object.fromEntries(Object.entries(structured).map(([key,value])=>[key,`Create a polished, internally consistent character reference of ${value.replaceAll("\n","; ").toLowerCase()}. Preserve the same facial identity, apparent age, proportions, and distinguishing features.`]));
}

export function visualProjectionPackage(persona, mode = "structured") {
  return Object.fromEntries(VISUAL_MODES.map((visualMode) => [visualMode, serializeVisualProjection(projectVisual(persona, visualMode), mode)]));
}

export function visualReferencePackage(persona, mode = "structured") {
  return Object.fromEntries(VISUAL_MODES.map((visualMode) => {
    const projection = projectVisual(persona, visualMode);
    return [visualMode, { projection, prompt: serializeVisualProjection(projection, mode), negative_prompt: projection.negative_prompt, contradictions: projection.contradictions }];
  }));
}

export function targetVisualPackage(persona, mode = "structured", target = "generic", density = "standard") {
  return { target: VISUAL_TARGETS.includes(target) ? target : "generic", style: mode, density, capabilities: adapterCapabilities(target), modes: Object.fromEntries(VISUAL_MODES.map((visualMode) => {
    const projection = projectVisual(persona, visualMode);
    return [visualMode, { projection, prompt: serializeVisual(projection, target, { style: mode, density }), negative_prompt: projection.negative_prompt, contradictions: projection.contradictions }];
  })) };
}

export function visualTargetComparison(persona, mode = "structured", visualMode = "reference", density = "standard") {
  const projection = projectVisual(persona, visualMode);
  return { mode, visual_mode: visualMode, density, projection, targets: Object.fromEntries(VISUAL_TARGETS.map(target => [target, serializeVisual(projection, target, { style: mode, density })])) };
}

export function referencePackageSemantics() {
  return Object.fromEntries(Object.entries(REFERENCE_PACKAGE_SEMANTICS).map(([key, value]) => [key, { ...value }]));
}

export function assembleReferencePackage(persona, references = [], options = {}) {
  const mode = options.mode === "polished" ? "polished" : "structured";
  const target = VISUAL_TARGETS.includes(options.target) ? options.target : "generic";
  const density = ["compact", "standard", "detailed"].includes(options.density) ? options.density : "standard";
  return {
    schema_version: REFERENCE_PACKAGE_SCHEMA_VERSION,
    persona_id: persona?.meta?.persona_id || null,
    mode,
    target,
    density,
    semantics: referencePackageSemantics(),
    references: assemblePurposeReferences(references),
    prompts: referencePackage(persona, mode),
    visual: targetVisualPackage(persona, mode, target, density)
  };
}

export function referenceMarkdown(persona,mode="structured"){const prompts=referencePackage(persona,mode);const visual=visualProjectionPackage(persona,mode);return `# ${persona.origin.name} — Reference Package\n\n${Object.entries(prompts).map(([key,value])=>`## ${key.replaceAll("_"," ")}\n\n${value}`).join("\n\n")}\n\n## Visual Projection Modes\n\n${Object.entries(visual).map(([key,value])=>`### ${key.replaceAll("_"," ")}\n\n${value}`).join("\n\n")}`;}

export function roleplayPackage(persona){const n=persona.narrative?.integration;return {current_goal:n?.goals?.short_term?.text||persona.narrative?.goal?.name||null,current_tension:n?.tensions?.[0]?.text||null,external_pressure:n?.pressures?.[0]?.text||null,relationship_hook:n?.relationship_hooks?.[0]?.text||null,scene_hook:n?.scene_hooks?.[0]?.text||null};}
