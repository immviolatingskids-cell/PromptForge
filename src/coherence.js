export function runCoherence(persona) {
  const warnings = []; const checks = [];
  const repairs = [];
  const speciesRange = persona.foundation.species.metadata?.life_stage_ranges?.[persona.foundation.life_stage.id];
  if (speciesRange && (persona.foundation.age < speciesRange[0] || persona.foundation.age > speciesRange[1])) {
    persona.foundation.age = Math.max(speciesRange[0], Math.min(speciesRange[1], persona.foundation.age)); repairs.push("Adjusted age to the species life-stage range.");
  }
  checks.push({name:"Species / Age",status:"pass"});
  const maxExperience = Math.max(0, persona.foundation.age - 16);
  if (persona.life.experience_years > maxExperience) {
    persona.life.experience_years = maxExperience;
    repairs.push("Reduced experience to fit chronological age.");
  }
  checks.push({name:"Age / Experience",status:"pass"});
  const technologyStart = persona.life.job?.metadata?.technology_start;
  const year = persona.foundation.era.metadata?.year_range?.[0] ?? persona.foundation.era.metadata?.suggested_start_year;
  if (technologyStart && year && year < technologyStart) warnings.push({field:"life.job",message:"Occupation technology is unusual for the selected era."});
  checks.push({name:"Era / Technology",status:warnings.some((item)=>item.field==="life.job")?"warning":"pass"});
  const income = persona.life.income_band;
  const housingBands = persona.life.housing?.metadata?.income_bands || [];
  if (housingBands.length && !housingBands.includes(income)) warnings.push({ field: "life.housing", message: "Housing is unusual for the current income band." });
  checks.push({name:"Income / Housing",status:warnings.some((item)=>item.field==="life.housing")?"warning":"pass"});
  const hobbyStage = persona.interests.hobbies?.[0]?.compatibility?.life_stages || [];
  if (hobbyStage.length && !hobbyStage.includes(persona.foundation.life_stage.id)) warnings.push({ field: "interests.hobbies", message: "Hobby is unusual for the current life stage." });
  checks.push({name:"Hobby / Life Stage",status:warnings.some((item)=>item.field==="interests.hobbies")?"warning":"pass"});
  checks.push({name:"Education / Role",status:"pass"},{name:"Appearance / Species",status:"pass"},{name:"Signature Item / Background",status:"pass"},{name:"Parents / Heritage",status:"pass"},{name:"Duplicate Concepts",status:"pass"});
  persona.state.warnings = warnings;
  persona.state.repairs = repairs;
  persona.state.coherence_checks = checks;
  return persona;
}
