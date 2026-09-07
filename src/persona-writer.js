function name(value) { return value?.name ?? value ?? "unspecified"; }
function sentence(value) { const text=String(value); return text.charAt(0).toUpperCase()+text.slice(1); }
import { valueProfileText } from "./value-profile.js";
import { personalityText } from "./personality-depth.js";

export function writePersona(persona) {
  const p=persona, job=p.life.job?.name || p.life.primary_role;
  return `# ${p.origin.name}

## Overview

${p.origin.name} is a ${p.foundation.age}-year-old ${name(p.foundation.life_stage).toLowerCase()} ${name(p.foundation.species).toLowerCase()} from ${name(p.foundation.country)}, living in a ${name(p.foundation.setting).toLowerCase()} context during the ${name(p.foundation.era)}.

## Background

Their heritage is ${name(p.origin.heritage)}. They were raised in a ${p.origin.family_makeup} family with a ${p.origin.economic_upbringing} upbringing, and currently call ${p.origin.current_location} home.${p.origin.structured_origin?.birthplace&&p.origin.structured_origin.birthplace!==p.origin.structured_origin.residence?` They were born in ${name(p.origin.birthplace)}.`:""}

## Personality

At their core, ${personalityText(p)} While ${valueProfileText(p.personality.values)}.

## Life

${p.life.pathway?.length?`Their pathway includes ${p.life.pathway.filter((stage)=>stage.type!=="work"||stage.role!=="current").map((stage)=>stage.type==="education"?`${stage.route.replaceAll("_"," ")} study`:stage.type==="training"?`${stage.route.replaceAll("_"," ")} training`:`earlier work`).join(", ")}, leading into their current role.`:""}
Their primary role is ${p.life.primary_role.toLowerCase()}${p.life.job?`, working as a ${job.toLowerCase()}`:""}. They have ${p.life.experience_years} years of relevant experience${p.life.career_level?` at a ${p.life.career_level} level`:""}, with a ${p.life.employment_type||"usual"} arrangement${p.life.work_arrangement?` that is ${p.life.work_arrangement.replaceAll("_"," ")}`:""}. Their work context is ${p.life.work_environment?p.life.work_environment.replaceAll("_"," "):"unspecified"}, with an income band of ${p.life.income_band}; they live in a ${name(p.life.housing).toLowerCase()} (${p.life.housing_profile?.tenure||"unspecified"}, ${p.life.housing_profile?.household?.replaceAll("_"," ")||"unspecified"}), use ${p.life.mobility?.primary?.replaceAll("_"," ")||name(p.life.transport).toLowerCase()} for mobility, and keep a ${p.life.daily_rhythm?.replaceAll("_"," ")||p.life.schedule.replaceAll("_"," ")} rhythm.

## Interests and Skills

${p.origin.name} practices ${p.interests.hobbies.map((item)=>`${name(item)} (${item.commitment})`).join(", ")} and is interested in ${p.interests.interests.map(name).join(", ")}. Associated skills include ${p.interests.skills.map((skill)=>skill.replaceAll("_"," ")).join(", ") || "practical self-direction"}.

## Appearance

Their build is ${name(p.appearance.surface.body).toLowerCase()}. They have ${name(p.appearance.surface.hair).toLowerCase()} and ${name(p.appearance.surface.eyes).toLowerCase()}. ${sentence(name(p.appearance.surface.feature))}. Their usual clothing style is ${name(p.appearance.clothing_style).toLowerCase()}; a signature outfit is ${name(p.appearance.signature_outfit).toLowerCase()}.

## Roleplay Core

Their main goal is to ${name(p.narrative.goal).toLowerCase()}. ${sentence(name(p.narrative.secret))}. Their signature item is ${name(p.narrative.signature_item)}, and its meaning connects directly to their history.

## Character Hook

${p.character_hook.text}`;
}

export function personaText(persona) { return writePersona(persona).replace(/^#+\s*/gm, "").replace(/\n{3,}/g, "\n\n"); }
