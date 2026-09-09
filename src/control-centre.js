import { askText, confirmAction } from "./hub-dialog.js";
import { HubStore, applyAppearance } from "./hub-store.js?v=0.4.9.2";
import { hubRequest, hubPost } from "./hub-api.js?v=0.4.9.2";
import { pages, renderPage } from "./hub-views.js?v=0.4.9.2";

export function initControlCentre(bridge) {
  const store = new HubStore();
  const root = document.querySelector("#control-centre");
  const content = document.querySelector("#hub-content");
  const notice = document.querySelector("#hub-notice");
  let data = null, page = "overview", query = "", filter = "all", selected = "", busy = false, connecting = true, poolPreview = null;
  applyAppearance(store.data.appearance);
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => applyAppearance(store.data.appearance));
  bridge.defaults(store.data.preferences);
  const report = (message, error = false) => { notice.textContent = message; notice.classList.toggle("warning", error); };
  function render() {
    const activity = [...store.data.activity, ...(data?.activity || [])].sort((a,b) => b.at.localeCompare(a.at));
    content.innerHTML = renderPage(page, {model:store.data, data, activity, query, filter, selected, settings:bridge.settings(), session:store.session, poolPreview});
    if (page === "editor" && poolPreview) document.querySelector("#pool-review").innerHTML = `<p>${poolPreview.valid.length} valid · ${poolPreview.duplicates.length} duplicates · ${poolPreview.variants.length} variants · ${poolPreview.errors.length} errors</p><pre>${JSON.stringify(poolPreview.errors.length ? poolPreview.errors : poolPreview.valid, null, 2)}</pre>`;
    if (page === "editor" && poolPreview) document.querySelector('[data-hub-action="pool-apply"]').disabled = !poolPreview.can_apply;
    document.querySelector("#hub-title").textContent = pages[page] || "Control Centre";
    for (const link of document.querySelectorAll("#hub-nav a")) {
      const active = link.hash === `#hub/${page}`;
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    }
    for (const button of root.querySelectorAll('[data-hub-action="audit"], [data-hub-action="backup"]')) button.disabled = busy || !data;
    document.querySelector("#hub-connection").textContent = data ? `Local Forge · ${data.catalogues} catalogues` : connecting ? "Connecting to local Forge…" : "Local Forge · offline";
  }
  function navigate() {
    const parts = location.hash.slice(1).split("/");
    const studio = parts[0] === "studio" || parts[1] === "studio";
    document.querySelectorAll(".app-rail a[data-product-route]").forEach(link => link.removeAttribute("aria-current"));
    root.hidden = studio;
    document.querySelector("#studio-shell").hidden = !studio;
    document.querySelector("#primary-hub").setAttribute("aria-current", studio ? "false" : "page");
    document.querySelector("#primary-studio").setAttribute("aria-current", studio ? "page" : "false");
    if (studio) { document.title = "Advanced PersonaForge · PromptForge"; return; }
    page = pages[parts[1]] ? parts[1] : "overview";
    try { selected = decodeURIComponent(parts.slice(2).join("/")); } catch { selected = ""; }
    query = ""; filter = "all";
    if (selected) {
      try { store.remember({title:selected.split(":").slice(1).join(":"), route:location.hash}); } catch (error) { report(`Could not remember workspace: ${error.message}`,true); }
    }
    render();
    document.title = `${pages[page] || "Control Centre"} · PromptForge`;
    document.querySelector("#hub-title").focus({preventScroll:true});
  }
  async function refresh() {
    connecting = true;
    try { data = await hubRequest(); report("Live catalogue data connected."); }
    catch (error) { report(error.message, true); }
    connecting = false;
    render();
  }
  async function perform(action) {
    if (busy) return;
    busy = true; report(action === "audit" ? "Running schema, coverage, and similarity checks…" : "Creating a catalogue backup…"); render();
    try {
      await hubRequest(action);
      store.session.unshift({type:action === "audit" ? "diagnostics" : "backups"});
      data = await hubRequest();
      report(action === "audit" ? "Health audit completed." : "Backup created. Download it from Data & Backup.");
    } catch (error) { report(error.message, true); }
    finally { busy = false; render(); }
  }
  function download(value) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));
    const link = document.createElement("a"); link.href = url; link.download = `prompt-forge-browser-${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  root.addEventListener("click", async event => {
    const category = event.target.closest("button[data-hub-category]");
    if (category) { query = category.dataset.hubCategory + "/"; filter = "all"; selected = ""; render(); document.querySelector("#hub-search").focus(); return; }
    const button = event.target.closest("button[data-hub-action]");
    if (!button) return;
    const action = button.dataset.hubAction;
    try {
      if (action === "refresh") { await refresh(); return; }
      if (["audit","backup"].includes(action)) { await perform(action); return; }
      if (action === "generate") { location.hash = "studio"; bridge.generate(); return; }
      if (action === "continue") { location.hash = store.data.lastWork?.route || "studio"; return; }
      if (action === "export-browser") { download({format:"prompt-forge-browser-v2", at:new Date().toISOString(), hub:store.data, ...(bridge.browserData?.() || {personas:bridge.personas(),personaLibrary:bridge.personaLibrary?.() || {},projects:bridge.projects?.() || []})}); report("Browser data exported."); return; }
      if (action === "import-browser") { document.querySelector("#browser-import-file")?.click(); return; }
      if (action === "save-preset") {
        const name = await askText("Name this generation preset:", "My generation setup");
        if (!name?.trim()) return;
        const preset = {...bridge.capture(), id:crypto.randomUUID(), name:name.trim().slice(0,80), tags:[], favorite:false, createdAt:new Date().toISOString()};
        store.savePreset(preset); store.record("presets", `Saved preset: ${preset.name}`);
      }
      const preset = store.data.presets.find(p => p.id === button.dataset.id);
      if (preset) {
        if (action === "favorite") store.savePreset({...preset,favorite:!preset.favorite});
        if (action === "preset-delete") {
          if (!await confirmAction(`Delete “${preset.name}”? This cannot be undone.`)) return;
          store.deletePreset(preset.id); store.record("presets",`Deleted preset: ${preset.name}`);
        }
        if (action === "preset-rename") {
          const name = await askText("Preset name:",preset.name); if (!name?.trim()) return;
          store.savePreset({...preset,name:name.trim().slice(0,80)}); store.record("presets",`Renamed preset to ${name.trim().slice(0,80)}`);
        }
        if (action === "preset-tags") {
          const tags = await askText("Tags, separated by commas:",(preset.tags || []).join(", ")); if (tags === null) return;
          store.savePreset({...preset,tags:tags.split(",").map(t => t.trim().slice(0,40)).filter(Boolean).slice(0,12)});
        }
        if (action === "preset-duplicate") {
          store.savePreset({...preset,id:crypto.randomUUID(),name:`${preset.name} copy`,favorite:false}); store.record("presets",`Duplicated preset: ${preset.name}`);
        }
        if (["preset-open","preset-use"].includes(action)) {
          bridge.apply(preset); location.hash = "studio";
          if (action === "preset-use") {
            bridge.generate(); store.savePreset({...preset,lastUsed:new Date().toISOString()}); store.record("presets",`Used preset: ${preset.name}`);
          }
          store.remember({title:preset.name,route:"#studio"});
        }
      }
      render();
      report("Changes saved.");
    } catch (error) { report(`Could not complete action: ${error.message}`,true); }
  });
  root.addEventListener("change", async event => {
    const input = event.target.closest("#browser-import-file"); if (!input?.files?.[0]) return;
    try { const snapshot = JSON.parse(await input.files[0].text()); const result = bridge.importBrowserData?.(snapshot); if (!result) throw new Error("Browser-data import is unavailable."); report(`Imported ${result.imported} saved character${result.imported === 1 ? "" : "s"}${result.projectsImported ? ` and ${result.projectsImported} project${result.projectsImported === 1 ? "" : "s"}` : ""}${result.renamed.length ? `; renamed ${result.renamed.length} collision${result.renamed.length === 1 ? "" : "s"}` : ""}.`); }
    catch (error) { report(`Browser-data import failed: ${error.message}`, true); }
    finally { input.value = ""; }
  });
  root.addEventListener("submit", event => {
    const form = event.target.closest("form[data-hub-form]"); if (!form) return; event.preventDefault();
    try {
      const group = form.dataset.hubForm;
      const value = Object.fromEntries(new FormData(form));
      if (group === "restore-backup") {
        hubPost("/api/pools/restore", {archive:value.archive, conflicts:value.replace ? "replace" : "reject"}).then(result => {
          if (result.status === "conflict") report(`Restore stopped: ${result.files.length} files changed locally. Check Replace conflicting files to continue.`, true);
          else { report(`Restored ${result.files} files. Safety backup ${result.safety_backup} created.`); refresh(); }
        }).catch(error => report(error.message, true));
        return;
      }
      if (group === "pool-editor") {
        event.submitter?.dataset.hubAction === "pool-apply" ? hubPost("/api/pools/apply", {token:poolPreview.token}).then(result => { poolPreview = null; report(`Applied ${result.added} entries; backup ${result.backup} created.`); refresh(); }).catch(error => report(error.message, true)) : hubPost("/api/pools/preview", {category:value.category, entries:JSON.parse(value.entries)}).then(result => { poolPreview = result; report("Import preview ready. Review the findings before applying."); render(); }).catch(error => report(error.message, true));
        return;
      }
      for (const input of form.querySelectorAll('input[type="checkbox"]')) value[input.name] = input.checked;
      store.update(group,value); if (group === "appearance") applyAppearance(store.data.appearance);
      store.record("settings",`Updated ${group}`); report(`${pages[group]} saved.`);
    } catch (error) { report(`Preferences could not be saved: ${error.message}`,true); }
  });
  root.addEventListener("input", event => {
    if (event.target.id !== "hub-search") return;
    query = event.target.value; const cursor = event.target.selectionStart; render();
    const input = document.querySelector("#hub-search"); input.focus(); input.setSelectionRange(cursor,cursor);
  });
  root.addEventListener("change", event => {
    if (event.target.id === "hub-filter") { filter = event.target.value; render(); document.querySelector("#hub-filter").focus(); }
  });
  window.addEventListener("hashchange",navigate);
  window.addEventListener("forge-event", event => {
    try { store.record(event.detail.type,event.detail.title); store.remember({title:event.detail.title,route:"#studio"}); if (!root.hidden) render(); }
    catch (error) { document.querySelector("#status").textContent = `Activity not saved: ${error.message}`; }
  });
  navigate(); refresh();
  return { preferences: () => store.data.preferences };
}
