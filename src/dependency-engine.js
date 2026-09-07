export const DEPENDENCIES = {
  "foundation.setting": ["foundation.era", "foundation.species", "foundation.country", "life.education", "life.job", "appearance.clothing_style"],
  "foundation.era": ["origin.name", "life.education", "life.job", "appearance.clothing_style"],
  "foundation.species": ["foundation.species_type", "foundation.life_stage", "foundation.age", "appearance.surface", "appearance.visual"],
  "foundation.species_type": ["foundation.species", "foundation.life_stage", "foundation.age", "appearance.surface", "appearance.visual"],
  "foundation.life_stage": ["foundation.age", "life.education", "life.pathway", "life.experience", "life.experience_years", "life.job", "interests.hobbies", "appearance.surface"],
  "foundation.country": ["foundation.region", "foundation.locale", "origin.heritage", "origin.name", "origin.birthplace", "life.job", "life.housing", "life.transport", "life.employment_type", "life.work_arrangement", "appearance.clothing_style"],
  "foundation.region": ["foundation.locale", "origin.heritage", "origin.name", "appearance.clothing_style"],
  "foundation.locale": ["origin.heritage", "origin.name", "appearance.clothing_style"],
  "origin.heritage": ["origin.name", "appearance.surface", "appearance.visual"],
  "life.job": ["life.structured_occupation", "life.career_level", "life.employment_type", "life.work_arrangement", "life.work_environment", "life.occupation_entry_route", "life.pathway", "life.experience", "life.experience_years", "life.income_band", "life.housing", "life.schedule", "interests.skills", "appearance.clothing_style"],
  "life.education": ["life.occupation_entry_route", "life.pathway", "life.experience", "life.experience_years", "life.career_level"],
  "life.income_band": ["life.housing", "life.transport", "appearance.clothing_style"],
  "personality.core": ["personality.complementary", "personality.contrast", "personality.flaw", "personality.values.primary", "personality.values.secondary", "personality.values.tension", "interests.hobbies"],
  "personality.values.primary": ["personality.values.secondary", "personality.values.tension"],
  "personality.values.secondary": ["personality.values.tension"],
  "interests.hobbies": ["interests.skills", "narrative.signature_item", "character_hook"],
  "appearance.surface": ["appearance.visual"],
  "narrative.signature_item": ["character_hook"]
};

export function affectedBy(path) {
  const found = new Set(); const queue = [path];
  while (queue.length) for (const child of DEPENDENCIES[queue.shift()] || []) if (!found.has(child)) { found.add(child); queue.push(child); }
  return [...found];
}

export function markStale(persona, changedPath) {
  const locked = persona.state.locks || {};
  persona.state.stale_fields = [...new Set([...(persona.state.stale_fields || []), ...affectedBy(changedPath).filter((path) => !locked[path])])];
  return persona.state.stale_fields;
}
