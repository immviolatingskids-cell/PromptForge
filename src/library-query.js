function text(value) { return String(value?.name ?? value?.id ?? value ?? "").toLowerCase(); }
function field(persona, path) { return path.split(".").reduce((value, key) => value?.[key], persona); }
export function libraryIndex(persona, metadata = {}) {
  const values = [persona.origin?.name, field(persona,"foundation.setting"), field(persona,"foundation.species"), field(persona,"foundation.life_stage"), field(persona,"foundation.country"), field(persona,"life.job"), ...(metadata.tags || [])];
  return values.map(text).filter(Boolean).join(" ");
}
export function queryLibrary(records, options = {}) {
  const query = String(options.query || "").trim().toLowerCase();
  const view = options.view || "all";
  const filtered = records.filter(({persona, metadata}) => {
    if (query && !libraryIndex(persona, metadata).includes(query)) return false;
    if (view === "favorites" && !metadata.favorite) return false;
    if (view === "archived" && !metadata.archived) return false;
    if (view === "recent" && !metadata.updatedAt && !metadata.lastOpenedAt) return false;
    if (view !== "archived" && view !== "favorites" && metadata.archived) return false;
    for (const [path, expected] of Object.entries(options.filters || {})) if (expected && (path === "tags" ? !(metadata.tags || []).some(tag => text(tag) === String(expected).toLowerCase()) : text(field(persona, path)) !== String(expected).toLowerCase())) return false;
    return true;
  });
  const sort = options.sort || (view === "recent" ? "recent" : "updated");
  return filtered.sort((a,b) => {
    if (sort === "name") return text(a.persona.origin?.name).localeCompare(text(b.persona.origin?.name)) || text(a.persona.meta?.persona_id).localeCompare(text(b.persona.meta?.persona_id));
    if (sort === "name-desc") return text(b.persona.origin?.name).localeCompare(text(a.persona.origin?.name)) || text(a.persona.meta?.persona_id).localeCompare(text(b.persona.meta?.persona_id));
    if (sort === "created") return (b.metadata.createdAt || b.persona.meta?.created_at || "").localeCompare(a.metadata.createdAt || a.persona.meta?.created_at || "") || text(a.persona.meta?.persona_id).localeCompare(text(b.persona.meta?.persona_id));
    if (sort === "recent") return Math.max(Date.parse(b.metadata.lastOpenedAt || "") || 0,Date.parse(b.metadata.updatedAt || b.persona.meta?.modified_at || "") || 0)-Math.max(Date.parse(a.metadata.lastOpenedAt || "") || 0,Date.parse(a.metadata.updatedAt || a.persona.meta?.modified_at || "") || 0) || text(a.persona.meta?.persona_id).localeCompare(text(b.persona.meta?.persona_id));
    return (b.metadata.updatedAt || b.persona.meta?.modified_at || "").localeCompare(a.metadata.updatedAt || a.persona.meta?.modified_at || "") || text(a.persona.meta?.persona_id).localeCompare(text(b.persona.meta?.persona_id));
  });
}
