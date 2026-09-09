export const REFERENCE_TYPES = Object.freeze(["persona", "project", "cast", "group", "relationship", "location", "scene"]);

// Structural references above link persisted PromptForge records. Purpose
// references below describe creative source material. Keeping the two models
// distinct prevents an image hint from being mistaken for a canonical entity.
export const REFERENCE_PURPOSES = Object.freeze(["appearance", "fashion", "genre", "lifestyle", "environment", "character"]);
export const REFERENCE_MEDIA_TYPES = Object.freeze(["image", "moodboard", "palette", "text", "url"]);
export const REFERENCE_STRENGTHS = Object.freeze({ subtle: 0.25, supporting: 0.5, strong: 0.75, anchor: 1 });
export const REFERENCE_INFLUENCE_FIELDS = Object.freeze([
  "identity", "appearance", "wardrobe", "activity", "props", "environment", "composition", "lighting", "palette", "atmosphere"
]);
export const PURPOSE_INFLUENCE_FIELDS = Object.freeze({
  appearance: Object.freeze(["appearance"]),
  fashion: Object.freeze(["wardrobe", "props", "palette"]),
  genre: Object.freeze(["wardrobe", "activity", "props", "environment", "palette", "atmosphere"]),
  lifestyle: Object.freeze(["wardrobe", "activity", "props", "environment", "atmosphere"]),
  environment: Object.freeze(["environment", "composition", "lighting", "palette", "atmosphere"]),
  character: Object.freeze(["identity", "appearance", "wardrobe", "props"])
});

const cleanString = value => typeof value === "string" && value.trim() ? value.trim() : null;
const purposeIndex = purpose => REFERENCE_PURPOSES.indexOf(purpose);
const stableStringCompare = (left, right) => left === right ? 0 : left < right ? -1 : 1;

export function createReference(type, id) {
  if (!REFERENCE_TYPES.includes(type) || typeof id !== "string" || !id.trim()) return null;
  return { type, id: id.trim() };
}

export function validateReference(reference) {
  return reference && typeof reference === "object" && REFERENCE_TYPES.includes(reference.type) && typeof reference.id === "string" && reference.id.trim()
    ? { state: "valid", reference: { type: reference.type, id: reference.id.trim() } }
    : { state: "invalid", reference: null };
}

export function resolveReference(reference, registries = {}) {
  const checked = validateReference(reference);
  if (checked.state === "invalid") return { state: "invalid", reference: null, target: null };
  const registry = registries[checked.reference.type];
  const target = registry?.has?.(checked.reference.id) ? checked.reference.id : registry?.get?.(checked.reference.id) ?? registry?.[checked.reference.id] ?? null;
  return { state: target ? "resolved" : "missing", reference: checked.reference, target };
}

export function normalizeReferenceStrength(strength = "supporting") {
  return Object.hasOwn(REFERENCE_STRENGTHS, strength) ? strength : "supporting";
}

export function referenceStrengthWeight(strength = "supporting") {
  return REFERENCE_STRENGTHS[normalizeReferenceStrength(strength)];
}

export function normalizePurposeReference(reference) {
  if (!reference || typeof reference !== "object") return null;
  const id = cleanString(reference.id);
  const purpose = REFERENCE_PURPOSES.includes(reference.purpose) ? reference.purpose : null;
  const mediaType = REFERENCE_MEDIA_TYPES.includes(reference.media_type) ? reference.media_type : null;
  if (!id || !purpose || !mediaType) return null;

  const allowed = PURPOSE_INFLUENCE_FIELDS[purpose];
  const requested = Array.isArray(reference.influence) ? reference.influence : allowed;
  const influence = [...new Set(requested.filter(field => allowed.includes(field)))].sort(
    (left, right) => REFERENCE_INFLUENCE_FIELDS.indexOf(left) - REFERENCE_INFLUENCE_FIELDS.indexOf(right)
  );
  const normalized = {
    id,
    purpose,
    media_type: mediaType,
    strength: normalizeReferenceStrength(reference.strength),
    influence,
    enabled: reference.enabled !== false
  };
  for (const key of ["label", "source", "notes"]) {
    const value = cleanString(reference[key]);
    if (value) normalized[key] = value;
  }
  return normalized;
}

export function createPurposeReference(id, purpose, options = {}) {
  return normalizePurposeReference({
    id,
    purpose,
    media_type: options.media_type || "image",
    strength: options.strength,
    influence: options.influence,
    enabled: options.enabled,
    label: options.label,
    source: options.source,
    notes: options.notes
  });
}

export function validatePurposeReference(reference) {
  const normalized = normalizePurposeReference(reference);
  if (normalized) return { state: "valid", reference: normalized, issues: [] };
  const issues = [];
  if (!reference || typeof reference !== "object") issues.push("reference must be an object");
  else {
    if (!cleanString(reference.id)) issues.push("id is required");
    if (!REFERENCE_PURPOSES.includes(reference.purpose)) issues.push("purpose is unsupported");
    if (!REFERENCE_MEDIA_TYPES.includes(reference.media_type)) issues.push("media_type is unsupported");
  }
  return { state: "invalid", reference: null, issues };
}

function sortPurposeReferences(left, right) {
  return referenceStrengthWeight(right.strength) - referenceStrengthWeight(left.strength)
    || purposeIndex(left.purpose) - purposeIndex(right.purpose)
    || stableStringCompare(left.id, right.id)
    || stableStringCompare(left.media_type, right.media_type)
    || stableStringCompare(JSON.stringify(left), JSON.stringify(right));
}

export function diagnosePurposeReferences(references = []) {
  const input = Array.isArray(references) ? references : [];
  const checked = input.map((reference, index) => ({ index, result: validatePurposeReference(reference) }));
  const valid = checked.filter(item => item.result.state === "valid").map(item => item.result.reference);
  const invalid = checked.filter(item => item.result.state === "invalid").map(item => ({ index: item.index, issues: item.result.issues }));
  const ignoredInfluence = checked.flatMap(item => {
    if (item.result.state !== "valid" || !Array.isArray(input[item.index].influence)) return [];
    const allowed = PURPOSE_INFLUENCE_FIELDS[item.result.reference.purpose];
    const fields = [...new Set(input[item.index].influence.filter(field => !allowed.includes(field)))].sort();
    return fields.length ? [{ index: item.index, fields }] : [];
  });
  const ineffective = valid.filter(item => item.enabled && item.influence.length === 0).map(item => item.id).sort();
  const duplicateKeys = valid.map(item => `${item.purpose}:${item.id}`)
    .filter((key, index, all) => all.indexOf(key) !== index)
    .filter((key, index, all) => all.indexOf(key) === index)
    .sort();
  const conflictingAnchors = REFERENCE_INFLUENCE_FIELDS.flatMap(field => {
    const anchors = valid.filter(item => item.enabled && item.strength === "anchor" && item.influence.includes(field));
    const ids = [...new Set(anchors.map(item => item.id))].sort();
    return ids.length > 1 ? [{ field, reference_ids: ids }] : [];
  });
  return {
    state: invalid.length || ignoredInfluence.length || ineffective.length || duplicateKeys.length || conflictingAnchors.length ? "warning" : "valid",
    total: input.length,
    valid: valid.length,
    enabled: valid.filter(item => item.enabled).length,
    invalid,
    ignored_influence: ignoredInfluence,
    ineffective_references: ineffective,
    duplicate_references: duplicateKeys,
    conflicting_anchors: conflictingAnchors
  };
}

export function assemblePurposeReferences(references = []) {
  const input = Array.isArray(references) ? references : [];
  const diagnostics = diagnosePurposeReferences(input);
  const seen = new Set();
  const normalized = input.map(normalizePurposeReference).filter(Boolean).sort(sortPurposeReferences).filter(reference => {
    const key = `${reference.purpose}:${reference.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const enabled = normalized.filter(reference => reference.enabled);
  const byPurpose = Object.fromEntries(REFERENCE_PURPOSES.map(purpose => [purpose, enabled.filter(reference => reference.purpose === purpose).map(reference => reference.id)]));
  const influence = Object.fromEntries(REFERENCE_INFLUENCE_FIELDS.flatMap(field => {
    const sources = enabled.filter(reference => reference.influence.includes(field)).map(reference => ({
      reference_id: reference.id,
      purpose: reference.purpose,
      strength: reference.strength,
      weight: referenceStrengthWeight(reference.strength)
    }));
    return sources.length ? [[field, sources]] : [];
  }));
  return { schema_version: 1, references: normalized, by_purpose: byPurpose, influence, diagnostics };
}
