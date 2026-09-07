const n=(value)=>value?.name??value??"unspecified";
export function apparentAge(persona){const stage=persona.foundation.life_stage.id;const range=persona.foundation.species.metadata?.apparent_age_ranges?.[stage];return range?`${range[0]}–${range[1]}`:`${persona.foundation.age}`;}
function visualTraits(p){return `${n(p.foundation.life_stage).toLowerCase()} ${n(p.foundation.species).toLowerCase()}, apparent age ${apparentAge(p)}, ${n(p.appearance.visual.body).toLowerCase()}, ${n(p.appearance.visual.hair).toLowerCase()}, ${n(p.appearance.visual.eyes).toLowerCase()}, ${n(p.appearance.visual.feature).toLowerCase()}`;}
export function referencePackage(persona,mode="structured"){
  const p=persona, traits=visualTraits(p), style=n(p.appearance.clothing_style), outfit=n(p.appearance.signature_outfit), item=n(p.narrative.signature_item);
  const structured={
    master:`SUBJECT: ${traits}\nSTYLE: ${style}\nOUTFIT: ${outfit}\nSETTING: ${n(p.foundation.setting)}, ${n(p.foundation.era)}\nSIGNATURE ITEM: ${item}\nRENDER: full character reference, neutral lighting, consistent identity`,
    headshot:`SUBJECT: ${traits}\nFRAMING: head and shoulders, front three-quarter view\nEXPRESSION: neutral and approachable\nDETAIL: face, hair, eyes, distinguishing feature`,
    full_body:`SUBJECT: ${traits}\nFRAMING: full body, neutral standing pose\nOUTFIT: ${outfit}\nDETAIL: clear silhouette and proportions`,
    casual_outfit:`SUBJECT: ${traits}\nCLOTHING: a casual outfit derived from ${style}\nPOSE: relaxed natural stance`,
    signature_outfit:`SUBJECT: ${traits}\nCLOTHING: ${outfit}\nPOSE: confident character-defining stance`,
    expression_sheet:`SUBJECT: same identity, ${traits}\nSHEET: six consistent headshots\nEXPRESSIONS: default, happy, annoyed, embarrassed, angry, focused`,
    signature_item:`OBJECT: ${item}\nOWNER: ${p.origin.name}\nMEANING: ${p.character_hook.text}\nRENDER: isolated object reference, multiple angles, neutral background`,
    visual_traits:`${traits}. General clothing style: ${style}. Signature outfit: ${outfit}.`
  };
  if(mode==="structured")return structured;
  return Object.fromEntries(Object.entries(structured).map(([key,value])=>[key,`Create a polished, internally consistent character reference of ${value.replaceAll("\n","; ").toLowerCase()}. Preserve the same facial identity, apparent age, proportions, and distinguishing features.`]));
}

export function referenceMarkdown(persona,mode="structured"){const prompts=referencePackage(persona,mode);return `# ${persona.origin.name} — Reference Package\n\n${Object.entries(prompts).map(([key,value])=>`## ${key.replaceAll("_"," ")}\n\n${value}`).join("\n\n")}`;}

export function roleplayPackage(persona){const n=persona.narrative?.integration;return {current_goal:n?.goals?.short_term?.text||persona.narrative?.goal?.name||null,current_tension:n?.tensions?.[0]?.text||null,external_pressure:n?.pressures?.[0]?.text||null,relationship_hook:n?.relationship_hooks?.[0]?.text||null,scene_hook:n?.scene_hooks?.[0]?.text||null};}
