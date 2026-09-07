const MIN_AGE = { secondary_school: 12, foundational_learning: 6 };
const DURATIONS = { degree: 4, postgraduate_degree: 2, apprenticeship: 3, trade_school: 2, professional_training: 2, service_academy: 3, guild_training: 3, scholarly_tutelage: 3, self_taught: 1, portfolio: 1, employer_training: 1, military_training: 2, certification: 1, inherited_trade: 2 };

export function educationMetadata(entry) {
  const id = entry?.id || entry;
  return { level: entry?.metadata?.level || (id === "degree" ? "undergraduate" : id === "postgraduate_degree" ? "postgraduate" : id === "secondary_school" ? "secondary" : "specialist_training"), route: entry?.metadata?.route || id, status: entry?.metadata?.status || "completed", duration_years: entry?.metadata?.duration_years ?? DURATIONS[id] ?? 1 };
}

export function chooseEducation(education, job, rng, mode, age, stage) {
  const allowed = job?.metadata?.entry_routes || job?.metadata?.education || [];
  const candidates = education.filter((entry) => !allowed.length || allowed.includes(entry.id));
  const pool = candidates.length ? candidates : education;
  const minor = ["child", "teen"].includes(stage);
  const eligible = pool.filter((entry) => !minor || (MIN_AGE[entry.id] ?? 16) <= age);
  return rng.choice(eligible.length ? eligible : pool);
}

export function buildLifePath({ education, job, entryRoute, age, stage, experienceYears, rng }) {
  const edu = educationMetadata(education);
  const path = [];
  if (stage === "child") path.push({ type: "education", route: "foundational_learning", status: "ongoing" });
  else if (stage === "teen") path.push({ type: "education", route: education.id, level: edu.level, status: "ongoing" });
  else {
    path.push({ type: "education", route: education.id, level: edu.level, status: edu.status, duration_years: edu.duration_years });
    if (entryRoute && entryRoute !== education.id) path.push({ type: "training", route: entryRoute, status: "completed", duration_years: DURATIONS[entryRoute] ?? 1 });
    if (experienceYears > 0) path.push({ type: "work", occupation: job?.id ?? null, role: "prior_or_current", years: experienceYears });
  }
  if (job) path.push({ type: "work", occupation: job.id, role: "current" });
  return path;
}

export function experienceProfile(age, stage, rng, education, entryRoute) {
  if (["child", "teen"].includes(stage)) return { total_years: 0, field_years: 0, current_role_years: 0, training_years: 0 };
  const available = Math.max(0, age - 16);
  const training = Math.min(available, educationMetadata(education).duration_years + (entryRoute === education?.id ? 0 : 1));
  const total = rng.integer(0, Math.max(0, available));
  const field = Math.min(total, Math.max(0, total - Math.floor(training / 2)));
  return { total_years: total, field_years: field, current_role_years: Math.min(field, rng.integer(0, Math.max(0, field))), training_years: training };
}
