function name(value) { return value?.name ?? value ?? "unspecified"; }
function sentence(value) { const text=String(value); return text.charAt(0).toUpperCase()+text.slice(1); }
import { valueProfileText } from "./value-profile.js";

export function writePersona(persona) {
  const p=persona, job=p.life.job?.name || p.life.primary_role;
  return `# ${p.origin.name}

## Overview

${p.origin.name} is a ${p.foundation.age}-year-old ${name(p.foundation.life_stage).toLowerCase()} ${name(p.foundation.species).toLowerCase()} from ${name(p.foundation.country)}, living in a ${name(p.foundation.setting).toLowerCase()} context during the ${name(p.foundation.era)}.

## Background

Their heritage is ${name(p.origin.heritage)}. They were raised in a ${p.origin.family_makeup} family with a ${p.origin.economic_upbringing} upbringing, and currently call ${p.origin.current_location} home.

## Personality

At their core, ${p.origin.name} is ${name(p.personality.core).toLowerCase()}, supported by ${p.personality.complementary.map(name).join(" and ").toLowerCase()}. Their ${name(p.personality.contrast).toLowerCase()} side adds contrast. Their most persistent flaw is being ${name(p.personality.flaw).toLowerCase()}, while ${valueProfileText(p.personality.values)}. One regular habit is: ${name(p.personality.habit)}. A personal quirk is: ${name(p.personality.quirk)}.

## Life

Their primary role is ${p.life.primary_role.toLowerCase()}${p.life.job?`, working as a ${job.toLowerCase()}`:""}. They have ${p.life.experience_years} years of relevant experience and an income band of ${p.life.income_band}. They live in a ${name(p.life.housing).toLowerCase()}; their usual transport is ${name(p.life.transport).toLowerCase()}, and they keep a ${p.life.schedule} schedule.

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
