function listValue(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }

export function structuredName(given, family, options = {}) {
  return { given: given || null, family: family || null, display: [given, family].filter(Boolean).join(" "),
    script: options.script || null, locale: options.locale || null, order: options.order || "given_family" };
}

export function structuredOccupation(entry) {
  if (!entry) return null;
  const metadata = entry.metadata || {};
  return { id: entry.id, title: entry.name, family: metadata.family || metadata.category || metadata.occupation_category || null, cluster: metadata.cluster || null, category: metadata.category || metadata.occupation_category || null,
    specialisation: metadata.specialisation || metadata.specialization || null,
    skills: listValue(metadata.skills || metadata.related_skills), career_levels: listValue(metadata.career_levels), employment_types: listValue(metadata.employment_types), work_arrangements: listValue(metadata.work_arrangements), environments: listValue(metadata.environments), entry_routes: listValue(metadata.entry_routes || metadata.education), schedule_patterns: listValue(metadata.schedule_patterns), source: entry };
}

export function structuredHobby(entry) {
  if (!entry) return null;
  const metadata = entry.metadata || {};
  return { id: entry.id, name: entry.name, category: metadata.category || metadata.hobby_category || null,
    variant: metadata.variant || metadata.hobby_variant || null, source: entry };
}
