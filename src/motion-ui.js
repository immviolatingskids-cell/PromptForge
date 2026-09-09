const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

export function createMotionUI() {
  const toastRegion = document.querySelector("#toast-region");
  const drawer = document.querySelector("#inspector-drawer");
  const drawerTrigger = document.querySelector("#open-inspector-drawer");
  const palette = document.querySelector("#command-palette");
  const query = document.querySelector("#command-query");
  const results = document.querySelector("#command-results");
  let commands = [];
  let activeCommand = 0;

  function toast(message, { tone = "success", duration = 3600 } = {}) {
    const node = document.createElement("div");
    node.className = `pf-toast pf-toast-${tone}`;
    node.setAttribute("role", tone === "error" ? "alert" : "status");
    node.innerHTML = `<span aria-hidden="true">${tone === "error" ? "!" : "✓"}</span><p>${escapeHtml(message)}</p><button aria-label="Dismiss notification">×</button>`;
    const dismiss = () => { node.classList.add("is-leaving"); setTimeout(() => node.remove(), reduceMotion.matches ? 0 : 180); };
    node.querySelector("button").addEventListener("click", dismiss);
    toastRegion.appendChild(node);
    requestAnimationFrame(() => node.classList.add("is-visible"));
    setTimeout(dismiss, duration);
  }

  function setDrawer(open, { focus = true } = {}) {
    drawer.classList.toggle("is-open", open);
    document.body.classList.toggle("inspector-open", open);
    drawerTrigger.setAttribute("aria-expanded", String(open));
    if (open && focus) drawer.querySelector("button, [tabindex], summary")?.focus();
    if (!open && focus) drawerTrigger.focus();
  }

  function updateNavIndicator() {
    const active = document.querySelector('.app-rail a[aria-current="page"]');
    const rail = document.querySelector(".app-rail");
    if (!active || !rail) return;
    const railRect = rail.getBoundingClientRect(), rect = active.getBoundingClientRect();
    rail.style.setProperty("--nav-x", `${rect.left - railRect.left}px`);
    rail.style.setProperty("--nav-y", `${rect.top - railRect.top}px`);
    rail.style.setProperty("--nav-w", `${rect.width}px`);
    rail.style.setProperty("--nav-h", `${rect.height}px`);
    rail.classList.add("has-indicator");
  }

  function filteredCommands() {
    const terms = query.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return commands.filter(command => terms.every(term => `${command.label} ${command.keywords || ""}`.toLowerCase().includes(term)));
  }

  function renderCommands() {
    const items = filteredCommands();
    activeCommand = Math.min(activeCommand, Math.max(0, items.length - 1));
    results.innerHTML = items.length ? items.map((command, index) => `<button type="button" role="option" aria-selected="${index === activeCommand}" data-command-id="${escapeHtml(command.id)}"><span>${escapeHtml(command.label)}</span>${command.hint ? `<kbd>${escapeHtml(command.hint)}</kbd>` : ""}</button>`).join("") : '<p class="command-empty">No matching commands</p>';
    results.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }

  function openPalette() { activeCommand = 0; query.value = ""; renderCommands(); palette.showModal(); requestAnimationFrame(() => query.focus()); }
  function runCommand(id) { const command = commands.find(item => item.id === id); if (!command) return; palette.close(); command.run(); }
  function registerCommands(items) { commands = items; renderCommands(); }

  query.addEventListener("input", () => { activeCommand = 0; renderCommands(); });
  query.addEventListener("keydown", event => {
    const items = filteredCommands();
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && items.length) { event.preventDefault(); activeCommand = (activeCommand + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; renderCommands(); }
    if (event.key === "Enter" && items[activeCommand]) { event.preventDefault(); runCommand(items[activeCommand].id); }
  });
  results.addEventListener("click", event => { const button = event.target.closest("[data-command-id]"); if (button) runCommand(button.dataset.commandId); });
  palette.addEventListener("click", event => { if (event.target === palette) palette.close(); });
  document.addEventListener("keydown", event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); palette.open ? palette.close() : openPalette(); } });
  drawerTrigger.addEventListener("click", () => setDrawer(!drawer.classList.contains("is-open")));
  document.querySelector("#close-inspector-drawer").addEventListener("click", () => setDrawer(false));
  addEventListener("pf-toast", event => toast(event.detail?.message || "Done", event.detail?.options));
  addEventListener("hashchange", () => requestAnimationFrame(updateNavIndicator));
  addEventListener("resize", updateNavIndicator, { passive: true });
  new MutationObserver(updateNavIndicator).observe(document.querySelector(".app-rail"), { subtree: true, attributes: true, attributeFilter: ["aria-current"] });
  requestAnimationFrame(updateNavIndicator);

  return { toast, setDrawer, openPalette, registerCommands, updateNavIndicator, reducedMotion: () => reduceMotion.matches };
}

function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[character])); }
