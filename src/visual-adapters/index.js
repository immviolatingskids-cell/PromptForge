import * as generic from "./generic.js";
import * as chatgpt from "./chatgpt.js";
import * as gemini from "./gemini.js";
import * as niji from "./niji.js";
import { normalizeDensity } from "./shared.js";

export const VISUAL_TARGETS = ["generic", "chatgpt", "gemini", "niji"];
export const VISUAL_ADAPTERS = Object.freeze({ generic, chatgpt, gemini, niji });
export function resolveAdapter(target = "generic") { return VISUAL_ADAPTERS[target] || VISUAL_ADAPTERS.generic; }
export function serializeVisual(projection, target = "generic", options = {}) { return resolveAdapter(target).serialize(projection, { ...options, density: normalizeDensity(options.density) }); }
export function adapterCapabilities(target = "generic") { return resolveAdapter(target).capabilities; }
