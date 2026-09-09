// Independent format versions for the v1 foundation. These are deliberately
// separate: changing one record family must not silently change the others.
export const APPLICATION_VERSION = "1.0.0";
export const PROJECT_VERSION = 1;
export const SCENE_VERSION = 1;
export const PROJECTION_VERSION = 1;
export const CONTEXT_PACKAGE_VERSION = 1;

const isObject = value => value && typeof value === "object" && !Array.isArray(value);

export function versionMetadata(overrides = {}) {
  return {
    application: String(overrides.application || APPLICATION_VERSION),
    project: Number.isInteger(overrides.project) ? overrides.project : PROJECT_VERSION,
    scene: Number.isInteger(overrides.scene) ? overrides.scene : SCENE_VERSION,
    projection: Number.isInteger(overrides.projection) ? overrides.projection : PROJECTION_VERSION,
    contextPackage: Number.isInteger(overrides.contextPackage) ? overrides.contextPackage : CONTEXT_PACKAGE_VERSION
  };
}

// Migration is additive and preserves unknown fields. Callers still validate
// the returned record before persisting it, so malformed/newer records are not
// made to look valid by this helper.
export function migrateRecord(raw, { kind, currentVersion = 1 } = {}) {
  if (!isObject(raw)) return { valid: false, issues: ["Record must be an object."], value: null, migrated: false };
  const key = kind ? `${kind}Version` : "schemaVersion";
  const sourceVersion = Number(raw[key] ?? raw.schemaVersion ?? 1);
  if (!Number.isInteger(sourceVersion) || sourceVersion < 1) return { valid: false, issues: [`${key} must be a positive integer.`], value: null, migrated: false };
  if (sourceVersion > currentVersion) return { valid: false, issues: [`${kind || "Record"} version ${sourceVersion} is newer than supported version ${currentVersion}.`], value: null, migrated: false };
  const value = structuredClone(raw);
  if (kind && value[key] === undefined) value[key] = sourceVersion;
  return { valid: true, issues: [], value, migrated: sourceVersion !== currentVersion, from: sourceVersion, to: currentVersion };
}
