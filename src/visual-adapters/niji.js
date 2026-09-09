import { blocks, filterProjection } from "./shared.js";
export const capabilities = { supports_negative_prompt: true, prefers_natural_language: false, prefers_compact_phrases: true };
export function serialize(projection, options = {}) { const filtered = filterProjection(projection, options.density); return blocks(filtered, options).map(([key, value]) => `${key.toLowerCase()}: ${value}`).join(" | "); }
