import { SeededRng } from "./seed-rng.js";
import { contextFromPersona, filterCandidates, speciesTypeOf } from "./context-engine.js";
import { chooseRanked } from "./candidate-ranker.js";
import { distinctByCluster, selectDistinctRanked } from "./similarity-guard.js";
import { selectValueProfile } from "./value-profile.js";
import { runCoherence } from "./coherence.js";
import { createCharacterHook } from "./character-hook.js";
import { structuredName, structuredOccupation, structuredHobby } from "./structured-fields.js";
import { resolveContextProfile } from "./context-profile.js";
import { chooseEducation, buildLifePath, experienceProfile } from "./life-pathway.js";
import { housingProfile, mobilityProfile, scheduleProfile } from "./daily-life.js";
import { personalityProfile } from "./personality-depth.js";
import { originProfile } from "./origin-context.js";
import { buildNarrativeState } from "./narrative-integration.js";

const pick = (library, key, persona, rng, mode, soft = {}) => {
  const context = resolveContextProfile(library, persona);
  let candidates = filterCandidates(library[key], context);
  // Geography is useful for ranking culturally specific entries, but a current
  // country must not empty an otherwise valid pool. Species is similarly
  // contextual for pools that do not yet have variants for every species.
  if (!candidates.length) candidates = filterCandidates(library[key], context, ["settings", "eras", "species", "life_stages"]);
  if (!candidates.length) candidates = filterCandidates(library[key], context, ["settings", "eras", "life_stages"]);
  if (!candidates.length) throw new Error(`No valid ${key} candidates for ${JSON.stringify(context)}`);
  return chooseRanked(candidates, context, rng, mode, soft);
};
const anchor = (anchors, key, entries, rng) => {
  if (anchors[key] !== undefined) {
    const selected = entries.find((entry) => entry.id === anchors[key]);
    if (!selected) throw new Error(`Anchor '${anchors[key]}' is not compatible with ${key}`);
    return selected;
  }
  if (!entries.length) throw new Error(`No compatible ${key} candidates remain`);
  return rng.choice(entries);
};
function occupationalLevel(job, age, experience, rng) {
  const levels = job?.metadata?.career_levels || ["professional"];
  const plausible = levels.filter((level) => {
    if (["trainee", "apprentice", "junior"].includes(level)) return experience <= 4;
    if (["lead", "management", "manager", "executive", "owner", "independent"].includes(level)) return age >= 28 && experience >= 5;
    return true;
  });
  return rng.choice(plausible.length ? plausible : levels);
}

function ageFor(species, stage, rng) {
  const ranges = species.metadata?.life_stage_ranges;
  const range = ranges?.[stage.id] || stage.metadata?.human_age_range || [18, 80];
  return rng.integer(range[0], range[1]);
}

export function generatePersona(library, options = {}) {
  const seed = options.seed ?? Date.now(); const mode = options.mode || "varied"; const anchors = options.anchors || {}; const rng = new SeededRng(seed);
  const persona = { meta: { persona_id: `persona_${String(seed).replace(/\W/g, "_")}`, seed, variance: mode, schema_version: library.versions?.schema || "1.0", data_version: library.versions?.data || "0.1.0" }, foundation: {}, origin: {}, personality: {}, life: {}, interests: {}, appearance: { surface: {}, visual: {}, clothing_style: {}, signature_outfit: {} }, narrative: {}, expressions: {}, character_hook: {}, state: { locks: {}, stale_fields: [], warnings: [] } };
  persona.foundation.cohort = anchors.cohort || options.cohort || null;
  persona.foundation.generation = anchors.generation || options.generation || null;
  persona.foundation.setting = anchor(anchors, "setting", library.settings, rng);
  persona.foundation.era = anchor(anchors, "era", filterCandidates(library.eras, contextFromPersona(persona)), rng);
  persona.foundation.species = anchor(anchors, "species", filterCandidates(library.species, contextFromPersona(persona)), rng);
  persona.foundation.species_type = speciesTypeOf(persona.foundation.species) || anchors.species_type || null;
  persona.foundation.life_stage = anchor(anchors, "life_stage", filterCandidates(library.lifeStages, contextFromPersona(persona)), rng);
  persona.foundation.age = anchors.age ?? ageFor(persona.foundation.species, persona.foundation.life_stage, rng);
  persona.foundation.gender = anchors.gender || rng.choice(["female", "male", "nonbinary"]);
  const countries = filterCandidates(library.countries, contextFromPersona(persona), ["settings", "species", "life_stages"]);
  persona.foundation.country = anchor(anchors, "country", countries, rng);
  for (const key of ["setting", "era", "species", "life_stage", "country", "age", "gender"]) if (anchors[key] !== undefined) persona.state.locks[`foundation.${key}`] = true;

  // Current country is a location anchor, not a hard heritage constraint.
  // Species is contextual here too: supernatural/synthetic personas still need
  // a usable cultural-origin value even when a heritage entry was authored for humans.
  const heritageContext = contextFromPersona(persona);
  const heritageCandidates = filterCandidates(library.heritage, heritageContext, ["settings", "eras", "life_stages"]);
  if (!heritageCandidates.length) throw new Error(`No valid heritage candidates for ${JSON.stringify(heritageContext)}`);
  persona.origin.heritage = chooseRanked(heritageCandidates, heritageContext, rng, mode);
  const nameContext = contextFromPersona(persona);
  const compatibleNames = filterCandidates(library.givenNames, nameContext, ["settings", "species", "life_stages"]);
  const broadNameCandidates = compatibleNames.length >= 5 ? compatibleNames : filterCandidates(library.givenNames, nameContext, ["settings", "eras", "life_stages"]);
  const generalNames = broadNameCandidates.length ? broadNameCandidates : library.givenNames;
  const names = generalNames.filter((entry) => [persona.foundation.gender, "neutral"].includes(entry.metadata?.gender));
  const given = chooseRanked(names.length ? names : generalNames, contextFromPersona(persona), rng, mode);
  const familyCandidates = filterCandidates(library.familyNames, nameContext, ["settings", "species", "life_stages"]);
  const broadFamilyCandidates = familyCandidates.length >= 5 ? familyCandidates : filterCandidates(library.familyNames, nameContext, ["settings", "eras", "life_stages"]);
  const family = chooseRanked(broadFamilyCandidates.length ? broadFamilyCandidates : library.familyNames, nameContext, rng, mode);
  persona.origin.name = `${given.name} ${family.name}`;
  persona.origin.structured_name = structuredName(given.name, family.name, { locale: persona.foundation.country?.metadata?.locale });
  persona.origin.birthplace = rng.next() < 0.8 ? persona.foundation.country : rng.choice(library.countries);
  persona.origin.current_location = persona.foundation.country.name;
  persona.origin.upbringing = persona.origin.birthplace.id === persona.foundation.country.id ? "same_region" : "international_upbringing";
  persona.origin.structured_origin = originProfile(persona, given, family);
  persona.origin.family_makeup = rng.choice(["close-knit", "small and independent", "large extended family"]);
  persona.origin.economic_upbringing = rng.choice(["low", "lower-middle", "moderate", "upper-middle"]);

  const shuffledTraits = [...filterCandidates(library.traits, contextFromPersona(persona))].sort(() => rng.next() - 0.5);
  const traits = distinctByCluster(shuffledTraits, 3); const core = traits[0];
  const complementary = shuffledTraits.find((item)=>core.metadata?.complements?.includes(item.id)) || traits[1];
  const contrast = shuffledTraits.find((item)=>core.metadata?.contrasts?.includes(item.id) && item.id!==complementary?.id) || traits.find((item)=>item.id!==core.id&&item.id!==complementary?.id);
  persona.personality.core = core; persona.personality.complementary = complementary ? [complementary] : []; persona.personality.contrast = contrast;
  persona.personality.flaw = pick(library, "flaws", persona, rng, mode, { fits_traits: traits.map((item) => item.id) });
  const valueContext = resolveContextProfile(library, persona);
  const valueCandidates = filterCandidates(library.values, valueContext);
  const valueSelection = selectValueProfile(valueCandidates, valueContext, rng, mode, options);
  persona.personality.values = valueSelection.profile;
  persona.state.selection_explanations = { values: valueSelection.explanation };
  persona.personality.habit = pick(library, "habits", persona, rng, mode); persona.personality.quirk = pick(library, "quirks", persona, rng, mode);
  persona.personality.depth = personalityProfile(persona);

  const isMinor = ["child", "teen"].includes(persona.foundation.life_stage.id);
  persona.life.primary_role = isMinor ? "Student" : "Employed";
  persona.life.job = isMinor ? null : pick(library, "occupations", persona, rng, mode);
  persona.life.education = chooseEducation(library.education, persona.life.job, rng, mode, persona.foundation.age, persona.foundation.life_stage.id);
  persona.life.structured_occupation = structuredOccupation(persona.life.job);
  persona.life.occupation_entry_route = isMinor ? null : rng.choice(persona.life.job?.metadata?.entry_routes || ["employer_training"]);
  persona.life.experience = experienceProfile(persona.foundation.age, persona.foundation.life_stage.id, rng, persona.life.education, persona.life.occupation_entry_route);
  persona.life.experience_years = persona.life.experience.total_years;
  persona.life.career_level = isMinor ? null : occupationalLevel(persona.life.job, persona.foundation.age, persona.life.experience_years, rng);
  persona.life.employment_type = isMinor ? null : rng.choice(persona.life.job?.metadata?.employment_types || ["employee"]);
  persona.life.work_arrangement = isMinor ? null : rng.choice(persona.life.job?.metadata?.work_arrangements || ["on_site"]);
  persona.life.work_environment = isMinor ? null : rng.choice(persona.life.job?.metadata?.environments || ["workplace"]);
  persona.life.pathway = buildLifePath({ education: persona.life.education, job: persona.life.job, entryRoute: persona.life.occupation_entry_route, age: persona.foundation.age, stage: persona.foundation.life_stage.id, experienceYears: persona.life.experience_years, rng });
  persona.life.income_band = persona.life.job?.metadata?.income_band || "low";
  persona.life.housing = pick(library, "housing", persona, rng, mode, { income_bands: [persona.life.income_band] });
  persona.life.transport = pick(library, "transport", persona, rng, mode, { income_bands: [persona.life.income_band] });
  persona.life.schedule = isMinor ? "school schedule" : rng.choice(persona.life.job?.metadata?.schedule_patterns || ["regular_daytime"]);
  persona.life.housing_profile = housingProfile(persona.life.housing, persona.life.income_band, persona.foundation.life_stage.id);
  persona.life.mobility = mobilityProfile(persona.life.transport, persona.life.work_arrangement, persona.life.work_environment, rng);
  persona.life.daily_rhythm = scheduleProfile(persona.life.schedule, persona.life.work_arrangement, persona.foundation.life_stage.id, persona.life.education?.metadata?.status);

  const hobbyCandidates = filterCandidates(library.hobbies, contextFromPersona(persona));
  const chosenHobbies = selectDistinctRanked(hobbyCandidates.length ? hobbyCandidates : library.hobbies, 2, (entries) => chooseRanked(entries, contextFromPersona(persona), rng, mode));
  persona.interests.hobbies = chosenHobbies.map((hobby) => ({ ...hobby, commitment: rng.choice(["casual", "regular", "dedicated"]), participation_style: hobby.metadata?.participation_style || rng.choice(["solo", "social", "creative_project", "observational", "practical_maker"]), social_context: hobby.metadata?.social_context || rng.choice(["independent", "occasional_group", "community"]) }));
  persona.interests.structured_hobby = structuredHobby(persona.interests.hobbies[0]);
  const interest = pick(library, "interests", persona, rng, mode);
  persona.interests.interests = [interest]; persona.interests.skills = [...new Set(persona.interests.hobbies.flatMap((item) => item.metadata?.related_skills || []))];
  persona.appearance.surface = { hair: pick(library, "hair", persona, rng, mode), eyes: pick(library, "eyes", persona, rng, mode), body: pick(library, "body", persona, rng, mode), feature: pick(library, "features", persona, rng, mode) };
  persona.appearance.visual = structuredClone(persona.appearance.surface); persona.appearance.clothing_style = pick(library, "clothingStyles", persona, rng, mode); persona.appearance.signature_outfit = pick(library, "outfits", persona, rng, mode);
  persona.narrative.goal = pick(library, "goals", persona, rng, mode); persona.narrative.secret = pick(library, "secrets", persona, rng, mode); persona.narrative.signature_item = pick(library, "signatureItems", persona, rng, mode, { linked_hobbies: persona.interests.hobbies.map((item) => item.id) });
  persona.narrative.integration = buildNarrativeState(persona, rng, mode);
  persona.expressions = Object.fromEntries(["default", "happy", "annoyed", "embarrassed", "angry", "focused"].map((emotion) => [emotion, pick(library, "expressions", persona, rng, mode)]));
  persona.character_hook = createCharacterHook(persona, rng);
  return runCoherence(persona);
}
