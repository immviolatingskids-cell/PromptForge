function listValue(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }

export function structuredName(given, family, options = {}) {
  return { given: given || null, family: family || null, display: [given, family].filter(Boolean).join(" "),
    script: options.script || null, locale: options.locale || null, order: options.order || "given_family" };
}

export function structuredOccupation(entry) {
  if (!entry) return null;
  const metadata = entry.metadata || {};
  return { id: entry.id, title: entry.name, category: metadata.category || metadata.occupation_category || null,
    specialisation: metadata.specialisation || metadata.specialization || null,
    skills: listValue(metadata.skills || metadata.related_skills), source: entry };
}

export function structuredHobby(entry) {
  if (!entry) return null;
  const metadata = entry.metadata || {};
  return { id: entry.id, name: entry.name, category: metadata.category || metadata.hobby_category || null,
    variant: metadata.variant || metadata.hobby_variant || null, source: entry };
}
