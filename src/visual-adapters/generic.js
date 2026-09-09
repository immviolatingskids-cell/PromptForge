import { serializeVisualProjection } from "../visual-projection.js";
import { filterProjection, normalizeDensity } from "./shared.js";
export const capabilities = { supports_negative_prompt: true, prefers_natural_language: false, prefers_compact_phrases: false };
export function serialize(projection, options = {}) { const filtered = filterProjection(projection, options.density); const prompt = serializeVisualProjection(filtered, options.style || "structured"); return filtered.density === "detailed" && filtered.detail_context ? `${prompt}\nCONTEXT: ${filtered.detail_context}` : prompt; }
