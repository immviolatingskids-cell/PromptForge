import { generatePersona } from "./generator.js";

const MODES = ["grounded", "varied", "chaotic"];
const valueId = (value) => typeof value === "string" ? value : value?.id;
const frequency = (values) => {
  const counts = new Map();
  for (const value of values.map(valueId).filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};
const distribution = (values) => {
  const counts = frequency(values); const total = values.length;
  return {
    unique: counts.length,
    top: counts.slice(0, 5).map(([id, count]) => ({ id, count, share: Number((count / total).toFixed(3)) })),
    top_share: total && counts.length ? Number((counts[0][1] / total).toFixed(3)) : 0,
    repeat_rate: total ? Number((1 - counts.length / total).toFixed(3)) : 0
  };
};
const signature = (report) => JSON.stringify(report.top.map(({ id, share }) => [id, share]));

export function diagnoseGeneration(library, options = {}) {
  const samples = options.samples || 300;
  const contexts = options.contexts || library.settings.map((setting) => ({ setting: setting.id }));
  const warnings = []; const slices = []; const modeReports = {};
  for (const mode of MODES) {
    const modeOffset = MODES.indexOf(mode) * samples;
    const personas = Array.from({ length: samples }, (_, seed) => generatePersona(library, { seed: modeOffset + seed, mode }));
    modeReports[mode] = {
      names: distribution(personas.map((p) => p.origin.name)),
      species: distribution(personas.map((p) => p.foundation.species)),
      occupations: distribution(personas.map((p) => p.life.job)),
      hobbies: distribution(personas.map((p) => p.interests.hobbies[0])),
      value_profiles: {
        primary: distribution(personas.map((p) => p.personality.values.primary)),
        secondary: distribution(personas.map((p) => p.personality.values.secondary).filter(Boolean)),
        tension: distribution(personas.map((p) => p.personality.values.tension).filter(Boolean)),
        pairs: distribution(personas.filter((p) => p.personality.values.secondary).map((p) => `${valueId(p.personality.values.primary)}+${valueId(p.personality.values.secondary)}`)),
        triples: distribution(personas.filter((p) => p.personality.values.tension).map((p) => `${valueId(p.personality.values.primary)}+${valueId(p.personality.values.secondary)}+${valueId(p.personality.values.tension)}`)),
        secondary_rate: Number((personas.filter((p) => p.personality.values.secondary).length / personas.length).toFixed(3)),
        tension_rate: Number((personas.filter((p) => p.personality.values.tension).length / personas.length).toFixed(3))
      }
    };
  }
  for (const anchors of contexts) {
    const label = Object.entries(anchors).map(([key, value]) => `${key}=${value}`).join(",");
    const sliceOffset = (contexts.indexOf(anchors) + 10) * samples;
    const personas = Array.from({ length: samples }, (_, seed) => generatePersona(library, { seed: sliceOffset + seed, mode: "varied", anchors }));
    const report = { context: anchors, names: distribution(personas.map((p) => p.origin.name)), occupations: distribution(personas.map((p) => p.life.job)), hobbies: distribution(personas.map((p) => p.interests.hobbies[0])) };
    slices.push(report);
    for (const field of ["names", "occupations", "hobbies"]) {
      if (report[field].unique < Math.min(8, Math.ceil(samples / 20)) || report[field].top_share > 0.25) warnings.push({ type: "weak_context_slice", field, context: anchors, metrics: report[field] });
    }
    const pairs = distribution(personas.map((p) => `${valueId(p.life.job)}+${valueId(p.interests.hobbies[0])}`));
    if (pairs.top_share > 0.12) warnings.push({ type: "stereotype_concentration", fields: ["occupations", "hobbies"], context: anchors, metrics: pairs });
  }
  for (const field of ["names", "species", "occupations", "hobbies"]) {
    const signatures = new Set(MODES.map((mode) => signature(modeReports[mode][field])));
    if (signatures.size === 1) warnings.push({ type: "variance_mode_collapse", field });
  }
  const queue = [];
  const branches = { names: ["identity/names/given_names", "identity/names/family_names"], species: ["identity/species_types"], occupations: ["lifestyle/occupations"], hobbies: ["lifestyle/hobbies"] };
  for (const warning of warnings) {
    for (const field of warning.fields || [warning.field]) for (const branch of branches[field] || []) if (!queue.some((item) => item.branch === branch)) queue.push({ branch, goal: "healthy", reason: warning.type, context: warning.context || {} });
  }
  return { samples_per_run: samples, modes: modeReports, slices, warnings, coverage_queue: queue };
}
