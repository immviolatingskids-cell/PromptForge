import { contextFromPersona, speciesTypeOf } from "./context-engine.js";

const ID_FIELDS = {
  settings: "settings", eras: "eras", species: "species", life_stages: "lifeStages", countries: "countries", regions: "regions", locales: "locales", species_types: "speciesTypes"
};

function idOf(value) { return value && typeof value === "object" ? value.id : value; }

export function resolveContextProfile(library, persona = {}, overrides = {}) {
  const ids = { ...contextFromPersona(persona), ...overrides };
  if (!ids.species_types?.length && persona.foundation?.species) {
    const type = speciesTypeOf(persona.foundation.species);
    if (type) ids.species_types = [type];
  }
  const country = (library.countries || []).find((entry) => entry.id === ids.countries?.[0]);
  const regionId = country?.metadata?.region;
  if (!ids.regions?.length && regionId) ids.regions = [regionId];
  const localeId = country?.metadata?.locale || country?.metadata?.locale_id || country?.id;
  if (!ids.locales?.length && localeId) ids.locales = [localeId];
  const entities = {};
  for (const [field, libraryKey] of Object.entries(ID_FIELDS)) {
    const values = ids[field] || [];
    entities[field] = values.map(idOf).map((id) => (library[libraryKey] || []).find((entry) => entry.id === id)).filter(Boolean);
  }
  return { ids, entities, has(field, value) { return (ids[field] || []).includes(value); } };
}
