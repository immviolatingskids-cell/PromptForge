const valueOf = value => value?.name ?? value?.text ?? value ?? null;
export const DENSITIES = ["compact", "standard", "detailed"];
export function normalizeDensity(density = "standard") { return DENSITIES.includes(density) ? density : "standard"; }

export function filterProjection(projection, density = "standard") {
  const selected = normalizeDensity(density);
  const filtered = structuredClone(projection);
  if (selected === "compact") {
    filtered.accessories = null;
    filtered.makeup = null;
    filtered.signature_item = null;
    filtered.context = {};
  }
  if (selected === "detailed") {
    const context = Object.entries(projection.context || {}).map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`).join(", ");
    filtered.detail_context = context || null;
  }
  filtered.density = selected;
  return filtered;
}

export const componentMap = {
  subject: projection => [projection.subject, projection.subject?.species, projection.subject?.life_stage, projection.subject?.apparent_age, projection.subject?.gender],
  appearance: projection => [projection.appearance, projection.appearance?.body, projection.appearance?.hair, projection.appearance?.eyes, projection.appearance?.feature],
  wardrobe: projection => [projection.wardrobe],
  activity: projection => [projection.activity],
  environment: projection => [projection.environment],
  camera: projection => [projection.camera],
  lighting: projection => [projection.lighting]
};

export function values(projection, key) {
  const result = componentMap[key]?.(projection) || [];
  return result.flatMap(value => Array.isArray(value) ? value : [value]).flatMap(value => {
    if (value && typeof value === "object" && !value.name && !value.text) return Object.values(value);
    return [valueOf(value)];
  }).filter(Boolean).filter((value, index, list) => list.indexOf(value) === index);
}

export function phrase(projection, key, fallback = null) {
  const result = values(projection, key);
  return result.length ? result.join(", ") : fallback;
}

export function blocks(projection, options = {}) {
  return [
    ["SUBJECT", phrase(projection, "subject")],
    ["APPEARANCE", phrase(projection, "appearance")],
    ["WARDROBE", phrase(projection, "wardrobe")],
    ["ACCESSORIES", valueOf(projection.accessories)],
    ["MAKEUP", valueOf(projection.makeup)],
    ["SIGNATURE ITEM", valueOf(projection.signature_item)],
    ["ACTIVITY", phrase(projection, "activity")],
    ["EXPRESSION", valueOf(projection.expression)],
    ["POSE", valueOf(projection.pose)],
    ["ENVIRONMENT", phrase(projection, "environment")],
    ["CAMERA", phrase(projection, "camera")],
    ["LIGHTING", phrase(projection, "lighting")],
    ["CONTEXT", options.density === "detailed" ? projection.detail_context : null]
  ].filter(([, value]) => value);
}
