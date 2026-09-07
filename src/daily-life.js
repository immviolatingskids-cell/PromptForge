export function housingProfile(entry, income, stage) {
  const id = entry?.id || "small_apartment";
  const household = ["child", "teen"].includes(stage) ? "with_family" : id.includes("shared") || id.includes("dorm") ? "roommates" : id.includes("family") ? "family" : "alone";
  const tenure = id.includes("family") ? "family_home" : id.includes("dorm") ? "institutional" : id.includes("cooperative") ? "shared_ownership" : income === "high" ? "own_or_rent" : "renting";
  return { type: id, tenure, household };
}

export function mobilityProfile(entry, workArrangement, environment, rng) {
  const remote = workArrangement === "remote";
  const field = ["field_based", "mobile", "travelling"].includes(workArrangement) || ["field_site", "outdoors", "construction_site"].includes(environment);
  const primary = remote ? "remote_no_regular_commute" : entry?.id || "on_foot";
  const secondary = remote ? null : (field ? (entry?.id === "on_foot" ? "walking" : "walking") : rng.choice(["walking", "none", "public_access"]));
  const access = ["compact_car", "motorcycle", "personal_speeder", "horse"].includes(entry?.id) ? "owns_or_household_access" : entry?.id === "on_foot" ? "none_required" : "public_access";
  return { primary, secondary, access };
}

export function scheduleProfile(pattern, workArrangement, stage, educationStatus) {
  if (["child", "teen"].includes(stage)) return "student_schedule";
  if (educationStatus === "ongoing") return "mixed_study_work";
  if (workArrangement === "remote") return "flexible_remote";
  if (workArrangement === "hybrid") return "mixed_commute_rhythm";
  const map = { shift_based: "shift_based_routine", early_morning: "early_shift", flexible: "flexible_project_rhythm", variable: "irregular_work_rhythm", seasonal: "seasonal_rhythm", regular_daytime: "structured_weekday" };
  return map[pattern] || "structured_weekday";
}
