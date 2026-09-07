export function createCharacterHook(persona, rng) {
  const hobby = persona.interests.hobbies[0]; const item = persona.narrative.signature_item; const quirk = persona.personality.quirk;
  const connections = [
    `${persona.origin.name} is a ${(persona.life.job?.name || persona.life.primary_role).toLowerCase()} who pursues ${hobby.name.toLowerCase()}`,
    `keeps ${item.name.toLowerCase()} close because it connects their past to the present`,
    `and ${quirk.name.toLowerCase()}`
  ];
  const count = rng.integer(1, 3);
  return { text: `${connections.slice(0, count).join(", ")}.`, connections: connections.slice(0, count).map((text, index) => ({id:`connection_${index + 1}`, text})) };
}
