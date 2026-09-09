import { blocks, filterProjection } from "./shared.js";
export const capabilities = { supports_negative_prompt: true, prefers_natural_language: true, prefers_compact_phrases: false };
export function serialize(projection, options = {}) { const filtered = filterProjection(projection, options.density); const lead = options.style === "polished" ? "Create a polished, coherent visual" : "Create a coherent visual"; return `${lead} of ${blocks(filtered, options).map(([key, value]) => `${key.toLowerCase()}: ${value}`).join("; ")}.`; }
