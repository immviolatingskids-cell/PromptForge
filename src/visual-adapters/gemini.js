import { blocks, filterProjection } from "./shared.js";
export const capabilities = { supports_negative_prompt: true, prefers_natural_language: true, prefers_compact_phrases: false };
export function serialize(projection, options = {}) { const filtered = filterProjection(projection, options.density); const lead = options.style === "polished" ? "Render a polished character scene" : "Render a character scene"; return `${lead} with ${blocks(filtered, options).map(([key, value]) => `${key.toLowerCase()} described as ${value}`).join("; ")}.`; }
