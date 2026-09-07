export const CONTEXT_FIELDS = ["settings", "eras", "species", "species_types", "life_stages", "countries", "regions", "locales"];

function valueId(value) { return value && typeof value === "object" ? value.id : value; }

export function speciesTypeOf(species) {
  if (!species) return undefined;
  const explicit = species.species_type || species.speciesType || species.metadata?.species_type || species.metadata?.speciesType || species.metadata?.type;
  if (explicit) return explicit;
  if (species.id === "human" || species.id === "elf" || species.id === "species_dwarf" || species.id === "species_orc" || species.id === "species_beastkin") return "organic_humanoid";
  if (["species_angel", "species_demon", "species_vampire", "species_fae"].includes(species.id)) return "supernatural";
  if (species.id === "species_android") return "artificial";
  if (species.id === "species_energyform") return "non_corporeal";
  if (species.id === "species_merfolk") return "aquatic";
  if (species.id === "species_avian") return "avian";
  if (species.id === "species_insectoid") return "insectoid";
  if (species.id === "species_plantfolk") return "botanical";
  if (species.id === "species_cephalid") return "amorphous";
  if (species.id === "species_crystalline") return "crystalline";
  if (species.id === "species_gelatinous") return "amorphous";
  return undefined;
}

export function contextFromPersona(persona) {
  const foundation = persona.foundation || persona;
  const country = foundation.country;
  const countryMeta = country?.metadata || {};
  return {
    settings: foundation.setting ? [foundation.setting.id ?? foundation.setting] : [],
    eras: foundation.era ? [foundation.era.id ?? foundation.era] : [],
    species: foundation.species ? [valueId(foundation.species)] : [],
    species_types: foundation.species_type ? [valueId(foundation.species_type)] : (speciesTypeOf(foundation.species) ? [speciesTypeOf(foundation.species)] : []),
    life_stages: foundation.life_stage ? [foundation.life_stage.id ?? foundation.life_stage] : [],
    countries: country ? [valueId(country)] : [],
    regions: countryMeta.region ? [countryMeta.region] : [],
    locales: countryMeta.locale || countryMeta.locale_id ? [countryMeta.locale || countryMeta.locale_id] : [],
    cohort: foundation.cohort || persona.cohort ? [foundation.cohort || persona.cohort] : [],
    generation: foundation.generation || persona.generation ? [foundation.generation || persona.generation] : []
  };
}

export function isCompatible(entry, context, hardFields = CONTEXT_FIELDS) {
  context = context?.ids || context || {};
  const compatibility = entry.compatibility || {};
  return hardFields.every((field) => {
    const allowed = compatibility[field] || [];
    const active = context[field] || [];
    return allowed.length === 0 || active.length === 0 || active.some((value) => allowed.includes(value));
  });
}

export function filterCandidates(entries, context, hardFields) {
  return entries.filter((entry) => isCompatible(entry, context, hardFields));
}
