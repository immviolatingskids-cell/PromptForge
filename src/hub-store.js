const KEY = "personaforge.control-centre.v1";
export const defaults = { profile: { name: "", avatar: "", tagline: "" }, preferences: { mode: "varied", setting: "", output: "structured", autoCopy: false }, appearance: { theme: "dark", accent: "violet", density: "comfortable", reducedMotion: false, background: "none" }, presets: [], activity: [], lastWork: null };
export function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c])); }
export function greeting(name, hour = new Date().getHours()) { return `Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}${name ? `, ${name}` : ""}`; }
export function coverageLabel(status) { return ({deficient:"Below minimum", minimum:"Minimum met", healthy:"Healthy · below target", target_met:"Target reached", saturated:"Saturated", Complete:"Complete"})[status] || status; }
export class HubStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let saved = {};
    try { saved = JSON.parse(storage.getItem(KEY) || "{}"); } catch { /* Empty or unavailable storage. */ }
    this.data = structuredClone(defaults);
    if (saved && typeof saved === "object") {
      for (const group of ["profile", "preferences", "appearance"]) {
        for (const key of Object.keys(defaults[group])) if (typeof saved[group]?.[key] === typeof defaults[group][key]) this.data[group][key] = saved[group][key];
      }
      for (const key of ["presets", "activity"]) if (Array.isArray(saved[key])) this.data[key] = saved[key].filter(item => item && typeof item === "object").slice(0, 200);
      if (saved.lastWork && typeof saved.lastWork === "object") this.data.lastWork = saved.lastWork;
    }
    this.session = [];
  }
  commit(next) { this.storage.setItem(KEY, JSON.stringify(next)); this.data = next; }
  update(group, value) { this.commit({ ...this.data, [group]: { ...this.data[group], ...value } }); }
  record(type, title, details = {}) {
    const item = { id: globalThis.crypto.randomUUID(), type, title, at: new Date().toISOString(), ...details };
    this.commit({ ...this.data, activity: [item, ...this.data.activity].slice(0, 200) });
    this.session.unshift(item);
  }
  remember(work) { this.commit({ ...this.data, lastWork: work }); }
  savePreset(preset) { this.commit({ ...this.data, presets: [preset, ...this.data.presets.filter(p => p.id !== preset.id)] }); }
  deletePreset(id) { this.commit({ ...this.data, presets: this.data.presets.filter(p => p.id !== id) }); }
}
export function applyAppearance(appearance, root = document.documentElement, systemLight = globalThis.matchMedia?.("(prefers-color-scheme: light)").matches) {
  root.dataset.theme = appearance.theme === "system" ? (systemLight ? "light" : "dark") : appearance.theme;
  root.dataset.accent = appearance.accent;
  root.dataset.density = appearance.density;
  root.dataset.motion = appearance.reducedMotion ? "reduced" : "auto";
  root.dataset.background = appearance.background;
}
