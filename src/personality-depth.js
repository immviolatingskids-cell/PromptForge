export function personalityProfile(persona) {
  const traits=[persona.personality.core,...(persona.personality.complementary||[]),persona.personality.contrast].filter(Boolean);
  return { traits: traits.map((x)=>x.id||x), flaw: persona.personality.flaw?.id||persona.personality.flaw||null, habit: persona.personality.habit?.id||persona.personality.habit||null, quirk: persona.personality.quirk?.id||persona.personality.quirk||null, value_families:(persona.personality.values?.map?.((x)=>x.metadata?.family||x.id)||[])};
}

export function personalityText(persona) {
  const traits=[persona.personality.core?.name,...(persona.personality.complementary||[]).map((x)=>x.name),persona.personality.contrast?.name].filter(Boolean);
  const flaw=persona.personality.flaw?.name, habit=persona.personality.habit?.name, quirk=persona.personality.quirk?.name;
  return `${traits.join(" but ")}${flaw?`, though they ${flaw.toLowerCase()}`:""}${habit?`. They often ${habit.toLowerCase()}`:""}${quirk?`, and ${quirk.toLowerCase()}`:""}.`;
}
