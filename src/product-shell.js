import { GENRE_DIMENSION_DEFINITIONS, GENRE_REGISTRY, blendedGenreDimensions, genreById, genreProfileFor, genreProfileLabel, normalizeGenreProfile, relatedGenreSuggestions, weightedGenreInfluences } from "./genre-profile.js";
import { explainCharacterIntelligence } from "./character-intelligence.js";
import { continuityFor } from "./character-continuity.js";
import { REFERENCE_MEDIA_TYPES, REFERENCE_PURPOSES, REFERENCE_STRENGTHS, assemblePurposeReferences, createPurposeReference } from "./reference-model.js";
import { resolveScene } from "./scene-resolver.js";
import { sceneReferences } from "./scene-store.js";
import { resolveSceneForge } from "./scene-forge.js";
import { relationshipLabel } from "./relationship-types.js";
import { assembleProjectContext, projectContextMarkdown } from "./project-context-assembly.js";
import { auditProjectCoherence } from "./project-coherence.js";

const routeTitles = { home: "Home", characters: "Characters", scenes: "Scenes", projects: "Projects", genres: "Genres", library: "Library" };
const wizardSteps = ["Core details", "Appearance", "Personality", "Background", "Lifestyle", "Style & genre", "References", "Review"];
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const display = value => value?.name ?? value?.text ?? value ?? "—";
const initials = value => String(value || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const splitList = value => String(value || "").split(",").map(item => item.trim()).filter(Boolean);
const dateLabel = value => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value)) : "Saved locally";
const humanize = value => String(value || "").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const downloadJson = (filename, text) => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); link.download = filename; link.click(); URL.revokeObjectURL(link.href); };

export function sceneSuggestionsFor(persona) {
  const profile = genreProfileFor(persona);
  const continuity = continuityFor(persona);
  const activities = [continuity.current.situation, continuity.current.goal, ...weightedGenreInfluences(profile, "activities").map(item => item.value)].filter(Boolean);
  const locations = weightedGenreInfluences(profile, "environments").map(item => item.value);
  return {
    activities: [...new Set(activities)].slice(0, 4),
    locations: [...new Set(locations)].slice(0, 4)
  };
}

function sceneSuggestionMarkup(persona) {
  const suggestions = sceneSuggestionsFor(persona);
  const buttons = [
    ...suggestions.activities.map(value => ["activity", value]),
    ...suggestions.locations.map(value => ["location", value])
  ];
  return `<span>Starting points</span>${buttons.map(([field, value]) => `<button type="button" data-product-action="use-scene-suggestion" data-field="${field}" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("") || "<small>Add a style blend or current focus to unlock suggestions.</small>"}`;
}

function referenceLabel(reference) {
  return reference.label || reference.source || humanize(reference.id);
}

function purposeReferencesFor(persona) {
  return assemblePurposeReferences(persona?.extensions?.promptforge?.references || []);
}

function sourceExplanation(domain, source, detail = {}) {
  const selected = detail.selected;
  const reason = source === "advanced override"
    ? "uses your fine-tuning"
    : selected?.kind === "canonical_fact" || selected?.kind === "explicit_override"
      ? "keeps the character consistent"
    : selected?.kind === "scene_requirement" ? "comes from this scene"
      : selected?.kind === "temporary_state" ? "follows their current life"
        : selected?.kind === "project_context" ? "fits the selected project"
          : selected?.kind === "preference" ? "matches a saved preference"
            : selected?.kind === "genre_influence" ? "supports the style blend"
              : "fills a detail you left open";
  return { label: humanize(domain), source: humanize(source || "Character context"), reason };
}

function characterSubtitle(persona) {
  const overrides=persona.extensions?.promptforge?.characterOverrides||{};
  return [overrides.occupation||display(persona.life?.job),overrides.location||display(persona.origin?.current_location||persona.foundation?.country),persona.foundation?.age?`${persona.foundation.age}`:""].filter(value=>value&&value!=="—").join(" · ");
}

function traitLabels(persona) {
  return [persona.personality?.core, ...(persona.personality?.complementary || []), persona.personality?.contrast].map(display).filter(value => value && value !== "—").slice(0, 4);
}

function emptyState(title, body, action = "") {
  return `<section class="pf-empty"><span class="pf-empty-mark" aria-hidden="true">✦</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p>${action}</section>`;
}

function characterCard(persona, metadata = {}) {
  const id = persona.meta?.persona_id;
  const styles = genreProfileLabel(genreProfileFor(persona)).slice(0, 2);
  const current = continuityFor(persona).current;
  const now = current.situation || current.goal || current.project;
  return `<article class="pf-character-card">
    <button class="pf-card-open" data-product-action="open-character" data-id="${escapeHtml(id)}" aria-label="Open ${escapeHtml(persona.origin?.name)}">
      <span class="pf-avatar" aria-hidden="true">${escapeHtml(initials(persona.origin?.name))}</span>
      <span class="pf-card-copy"><span class="pf-kicker">${metadata.favorite ? "Favourite character" : "Character"}</span><strong>${escapeHtml(persona.origin?.name || "Unnamed character")}</strong><small>${escapeHtml(characterSubtitle(persona) || "Canonical persona")}</small></span>
      <span class="pf-arrow" aria-hidden="true">↗</span>
    </button>
    ${now ? `<p class="pf-card-now"><span aria-hidden="true">●</span><span><strong>Right now</strong>${escapeHtml(now)}</span></p>` : ""}
    <div class="pf-chip-row">${traitLabels(persona).slice(0, 2).map(value => `<span class="pf-chip">${escapeHtml(value)}</span>`).join("")}${styles.map(value => `<span class="pf-chip pf-chip-accent">${escapeHtml(value)}</span>`).join("")}</div>
    <div class="pf-card-actions"><button data-product-action="scene-for-character" data-id="${escapeHtml(id)}">New scene</button><button data-product-action="edit-character" data-id="${escapeHtml(id)}">Edit</button></div>
  </article>`;
}

function sceneCard(scene, persona) {
  return `<article class="pf-scene-card"><div class="pf-scene-icon" aria-hidden="true">◫</div><div><p class="pf-kicker">${escapeHtml(scene.requirements?.time || "Scene")}</p><h3>${escapeHtml(scene.title)}</h3><p>${escapeHtml(persona?.origin?.name || "Missing character")} · ${escapeHtml(scene.requirements?.location || "Contextual location")}</p></div><button data-product-action="open-scene" data-id="${escapeHtml(scene.id)}" class="pf-icon-button" aria-label="Open ${escapeHtml(scene.title)}">→</button></article>`;
}

function projectCard(project) {
  return `<article class="pf-project-card"><div class="pf-project-mark" aria-hidden="true">${escapeHtml(initials(project.name))}</div><div><p class="pf-kicker">Project · ${project.personaRefs.length} persona${project.personaRefs.length === 1 ? "" : "s"}${project.state.needsReview ? " · Review needed" : ""}</p><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.context?.premise || project.description || [project.context?.setting, project.context?.era, project.context?.country].filter(Boolean).join(" · ") || "A shared creative context")}</p></div><button class="pf-icon-button" data-product-action="open-project" data-id="${escapeHtml(project.id)}" aria-label="Open ${escapeHtml(project.name)}">→</button></article>`;
}

export function initProductShell(bridge) {
  const root = document.querySelector("#product-shell");
  const view = document.querySelector("#product-view");
  const dialog = document.querySelector("#product-dialog");
  const sceneStore = bridge.sceneStore;
  const projectStore = bridge.projectStore;
  const relationshipStore = bridge.relationshipStore;
  const state = { wizardStep: 0, draft: {}, sceneResult: null, editingCharacterId: null };

  const personas = () => bridge.personas().filter(item => !item.metadata.archived);
  const personById = id => bridge.openPersona(id);
  const projectById = id => projectStore.open(id);

  function setChrome(area, title, subtitle = "") {
    document.querySelector("#product-breadcrumb").textContent = `PromptForge / ${routeTitles[area] || area}`;
    document.querySelector("#product-title").textContent = title;
    document.querySelector("#product-subtitle").textContent = subtitle;
    document.title = `${title} · PromptForge`;
  }

  function setActive(area) {
    document.querySelectorAll(".app-rail a[data-product-route]").forEach(link => {
      if (link.dataset.productRoute === area) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    document.querySelector("#primary-hub")?.removeAttribute("aria-current");
    document.querySelector("#primary-studio")?.removeAttribute("aria-current");
  }

  function homeView() {
    const characters = personas();
    const scenes = sceneStore.all();
    const projects = projectStore.all().filter(project => !project.workspace.archived);
    const latest = scenes[0] || characters[0]?.persona || projects[0];
    setChrome("home", "Good evening", "Pick up where you left off, or begin something new.");
    const continuation = latest ? `<section class="pf-continue pf-surface">
      <div><p class="pf-kicker">Continue working</p><h2>${escapeHtml(latest.title || latest.origin?.name || latest.name)}</h2><p>${escapeHtml(latest.requirements?.activity || characterSubtitle(latest) || latest.context?.premise || "Your latest creative work")}</p></div>
      <button class="pf-primary" data-product-action="${latest.title ? "open-scene" : latest.origin ? "open-character" : "open-project"}" data-id="${escapeHtml(latest.id || latest.meta?.persona_id)}">Open workspace <span aria-hidden="true">→</span></button>
    </section>` : "";
    view.innerHTML = `${continuation}<section class="pf-action-grid" aria-label="Create">
      <button class="pf-action-card pf-action-featured" data-product-action="create-character"><span class="pf-action-icon" aria-hidden="true">＋</span><span><strong>Create a character</strong><small>Start simple. Shape the details as you go.</small></span><span aria-hidden="true">→</span></button>
      <button class="pf-action-card" data-product-action="new-scene"><span class="pf-action-icon" aria-hidden="true">◫</span><span><strong>Create a scene</strong><small>Put a saved character into a moment.</small></span><span aria-hidden="true">→</span></button>
      <button class="pf-action-card" data-product-action="browse-genres"><span class="pf-action-icon" aria-hidden="true">✣</span><span><strong>Explore genres</strong><small>Blend style influences without changing identity.</small></span><span aria-hidden="true">→</span></button>
    </section>
    <section class="pf-section"><div class="pf-section-heading"><div><p class="pf-kicker">Your cast</p><h2>Recent characters</h2></div><a href="#characters">View all</a></div>${characters.length ? `<div class="pf-character-grid">${characters.slice(0, 4).map(item => characterCard(item.persona, item.metadata)).join("")}</div>` : emptyState("No saved characters yet", "Create your first character to begin building scenes and projects.", '<button class="pf-primary" data-product-action="create-character">Create character</button>')}</section>
    <section class="pf-home-lower"><div class="pf-section"><div class="pf-section-heading"><div><p class="pf-kicker">Story contexts</p><h2>Recent projects</h2></div><a href="#projects">View all</a></div>${projects.length ? `<div class="pf-list">${projects.slice(0, 3).map(projectCard).join("")}</div>` : `<div class="pf-compact-empty">Projects bring characters and scenes together. <a href="#projects">Create one</a></div>`}</div><div class="pf-section"><div class="pf-section-heading"><div><p class="pf-kicker">Moments</p><h2>Recent scenes</h2></div><a href="#scenes">View all</a></div>${scenes.length ? `<div class="pf-list">${scenes.slice(0, 3).map(scene => sceneCard(scene, personById(scene.characterRef?.id))).join("")}</div>` : `<div class="pf-compact-empty">Scene Forge is ready when your first character is saved.</div>`}</div></section>`;
  }

  function charactersView(id = "") {
    if (id) return characterDetailView(id);
    setChrome("characters", "Characters", "A living cast, powered by PersonaForge underneath.");
    const records = personas();
    view.innerHTML = `<div class="pf-page-actions"><div class="pf-search"><span aria-hidden="true">⌕</span><input id="character-search" type="search" placeholder="Search characters" aria-label="Search characters"></div><button class="pf-primary" data-product-action="create-character">＋ New character</button></div>${records.length ? `<div id="character-results" class="pf-character-grid pf-character-grid-large">${records.map(item => characterCard(item.persona, item.metadata)).join("")}</div>` : emptyState("Create your first character", "Guided mode keeps the first decisions light. PersonaForge handles the depth behind the scenes.", '<button class="pf-primary" data-product-action="create-character">Create character</button>')}`;
  }

  function characterDetailView(id) {
    const persona = personById(id);
    if (!persona) { location.hash = "characters"; return; }
    const profile = genreProfileFor(persona);
    const overrides = persona.extensions?.promptforge?.characterOverrides || {};
    const hobbies = (persona.interests?.hobbies || []).map(display).filter(Boolean).slice(0, 5);
    const continuity = continuityFor(persona);
    const references = purposeReferencesFor(persona);
    const intelligence = explainCharacterIntelligence(persona);
    const dimensions = Object.entries(blendedGenreDimensions(profile)).sort((left, right) => right[1] - left[1]).slice(0, 6);
    const related = relatedGenreSuggestions(profile, { limit: 3 });
    const currentSummary = continuity.current.situation || continuity.current.goal || continuity.current.project || overrides.currentLife || "No current focus set";
    setChrome("characters", persona.origin?.name || "Character", characterSubtitle(persona));
    view.innerHTML = `<div class="pf-detail-actions"><a href="#characters" class="pf-back">← All characters</a><div><button data-product-action="edit-character" data-id="${escapeHtml(id)}">Edit character</button><button data-product-action="focus-current-life">Update current life</button><button data-product-action="open-advanced" data-id="${escapeHtml(id)}">Advanced PersonaForge ↗</button><button class="pf-primary" data-product-action="scene-for-character" data-id="${escapeHtml(id)}">Create scene</button></div></div>
    <section class="pf-profile-hero pf-surface"><div class="pf-avatar pf-avatar-large" aria-hidden="true">${escapeHtml(initials(persona.origin?.name))}</div><div class="pf-profile-main"><p class="pf-kicker">Character profile</p><h2>${escapeHtml(persona.origin?.name)}</h2><p class="pf-profile-subtitle">${escapeHtml(characterSubtitle(persona))}</p><div class="pf-chip-row">${traitLabels(persona).map(value => `<span class="pf-chip">${escapeHtml(value)}</span>`).join("")}</div></div><div class="pf-profile-now"><span><i aria-hidden="true"></i> Right now</span><strong>${escapeHtml(currentSummary)}</strong><small>${continuity.current.updatedAt ? `Updated ${escapeHtml(dateLabel(continuity.current.updatedAt))}` : "Ready to shape"}</small></div></section>
    <div class="pf-profile-grid"><section class="pf-surface pf-profile-panel pf-style-panel"><p class="pf-kicker">Style blend</p><h3>${profile.genres.length ? "Visual influences" : "Character-led, no genres"}</h3>${profile.genres.length ? `<div class="pf-weight-list">${profile.genres.map(item => `<div><span>${escapeHtml(genreById(item.id)?.name || item.id)}</span><div><i style="width:${Math.round(item.weight * 100)}%"></i></div><strong>${Math.round(item.weight * 100)}%</strong></div>`).join("")}</div>${dimensions.length ? `<div class="pf-dimension-map" aria-label="Combined style qualities">${dimensions.map(([key, strength]) => `<span style="--strength:${Math.round(strength * 100)}%"><i></i><strong>${escapeHtml(GENRE_DIMENSION_DEFINITIONS[key]?.[0] || humanize(key))}</strong><small>${Math.round(strength * 100)}%</small></span>`).join("")}</div>` : ""}${related.length ? `<p class="pf-related"><span>You may also like</span>${related.map(item => `<a href="#genres" title="${escapeHtml(item.reasons.join(", "))}">${escapeHtml(item.name)}</a>`).join("")}</p>` : ""}` : `<p class="pf-muted">Genres are optional. Scenes can follow the character and moment alone.</p>`}</section>
    <section class="pf-surface pf-profile-panel"><p class="pf-kicker">Interests</p><h3>Everyday touchpoints</h3><div class="pf-chip-row">${[...hobbies, ...splitList(overrides.interests)].slice(0, 7).map(value => `<span class="pf-chip">${escapeHtml(value)}</span>`).join("") || '<span class="pf-muted">No interests added yet.</span>'}</div></section>
    <section id="current-life" class="pf-surface pf-profile-panel pf-current-life"><p class="pf-kicker">Current life</p><h3>${escapeHtml(currentSummary)}</h3><dl>${continuity.current.project ? `<div><dt>Project</dt><dd>${escapeHtml(continuity.current.project)}</dd></div>` : ""}${continuity.current.goal ? `<div><dt>Goal</dt><dd>${escapeHtml(continuity.current.goal)}</dd></div>` : ""}${continuity.threads.filter(thread => thread.status === "active").map(thread => `<div><dt>Open thread</dt><dd>${escapeHtml(thread.title)}</dd></div>`).join("")}</dl>${typeof bridge.updateCharacterContinuity === "function" ? `<details><summary>Update current life</summary><form id="character-continuity-form" data-persona-id="${escapeHtml(id)}"><label>Current project<input name="project" value="${escapeHtml(continuity.current.project || "")}" placeholder="What are they part of?"></label><label>Current goal<input name="goal" value="${escapeHtml(continuity.current.goal || "")}" placeholder="What are they working toward?"></label><label>Situation<textarea name="situation" rows="3" placeholder="What is happening in their life now?">${escapeHtml(continuity.current.situation || "")}</textarea></label><label>New open thread<input name="thread" placeholder="An unresolved plan or relationship"></label><button type="submit">Save current life</button></form></details>` : ""}</section>
    <section class="pf-surface pf-profile-panel"><p class="pf-kicker">Creative guardrails</p><h3>Keep these choices intact</h3><p>${escapeHtml((profile.exclusions || []).join(" · ") || "No style exclusions")}</p><small>Your explicit character choices take priority over project and style suggestions.</small></section></div>
    <section class="pf-surface pf-reference-panel"><div><p class="pf-kicker">Creative references</p><h2>${references.references.length ? `${references.references.length} purposeful reference${references.references.length === 1 ? "" : "s"}` : "No references yet"}</h2><p>Each reference has one clear job, so a moodboard cannot quietly rewrite identity.</p></div>${references.references.length ? `<div class="pf-reference-list">${references.references.map(reference => `<article><span class="pf-reference-type">${escapeHtml(humanize(reference.purpose))}</span><strong>${escapeHtml(referenceLabel(reference))}</strong><small>${escapeHtml(humanize(reference.strength))} influence · guides ${escapeHtml(reference.influence.map(humanize).join(", "))}</small></article>`).join("")}</div>` : `<button data-product-action="edit-character" data-id="${escapeHtml(id)}">Add a reference</button>`}<details><summary>How this character is understood</summary><p>${intelligence.counts.canonical_fact || 0} fixed facts, ${intelligence.counts.explicit_override || 0} choices you made, and ${(intelligence.counts.preference || 0) + (intelligence.counts.affinity || 0)} softer preferences. Fixed facts always lead.</p></details></section>`;
  }

  function genresView() {
    setChrome("genres", "Genre library", "Style recipes that influence a character without rewriting who they are.");
    view.innerHTML = `<div class="pf-page-actions"><div class="pf-search"><span aria-hidden="true">⌕</span><input id="genre-search" type="search" placeholder="Search genres" aria-label="Search genres"></div><span class="pf-count">${GENRE_REGISTRY.length} foundation genres</span></div><div id="genre-results" class="pf-genre-grid">${GENRE_REGISTRY.map(genre => `<article class="pf-genre-card" data-search="${escapeHtml(`${genre.name} ${genre.family} ${genre.definition}`.toLowerCase())}"><div class="pf-genre-swatch" data-genre="${escapeHtml(genre.id)}"><span>${escapeHtml(initials(genre.name))}</span></div><div><p class="pf-kicker">${escapeHtml(genre.family.replaceAll("-", " "))}</p><h2>${escapeHtml(genre.name)}</h2><p>${escapeHtml(genre.definition)}</p><div class="pf-chip-row">${Object.keys(genre.dimensions).slice(0, 3).map(item => `<span class="pf-chip">${escapeHtml(item)}</span>`).join("")}</div></div></article>`).join("")}</div><section class="pf-note"><strong>Designed for blending.</strong><span>Each genre carries semantic dimensions and soft affinities for wardrobe, activities, places, and props. Canonical character facts and explicit exclusions always win.</span></section>`;
  }

  function libraryView() {
    setChrome("library", "Library", "Reusable building blocks for characters, genres, and scenes.");
    const lib = bridge.library();
    const domains = [
      ["Personality", (lib.traits?.length || 0) + (lib.values?.length || 0) + (lib.quirks?.length || 0), "Traits, values, quirks, and habits"],
      ["Lifestyle & interests", (lib.hobbies?.length || 0) + (lib.interests?.length || 0), "Hobbies, interests, routines, and activities"],
      ["Appearance", (lib.hair?.length || 0) + (lib.eyes?.length || 0) + (lib.body?.length || 0), "Reusable visual characteristics"],
      ["Locations & context", (lib.countries?.length || 0) + (lib.settings?.length || 0), "Places, eras, and environmental context"],
      ["Genre recipes", GENRE_REGISTRY.length, "Weighted style and environment affinities"],
      ["Reference packages", personas().length, "Structured character outputs and prompt projections"]
    ];
    view.innerHTML = `<div class="pf-library-grid">${domains.map(([name, count, copy], index) => `<article class="pf-library-card"><span class="pf-library-icon" aria-hidden="true">${["◌", "◇", "◎", "⌖", "✣", "▤"][index]}</span><div><p class="pf-kicker">${count} available</p><h2>${escapeHtml(name)}</h2><p>${escapeHtml(copy)}</p></div>${name === "Genre recipes" ? '<a href="#genres">Explore →</a>' : name === "Reference packages" ? '<a href="#studio">Open advanced →</a>' : '<span class="pf-library-status">Managed in Control Centre</span>'}</article>`).join("")}</div><section class="pf-note"><strong>Universal first.</strong><span>General human traits stay reusable across every character. Genres add affinity and atmosphere rather than duplicating identity.</span></section>`;
  }

  function scenesView(id = "") {
    const records = personas();
    const existing = id ? sceneStore.open(id) : null;
    if (!records.length) {
      setChrome("scenes", "Scene Forge", "Turn a saved character into a moment.");
      view.innerHTML = existing ? `<section class="pf-empty"><span class="pf-empty-mark" aria-hidden="true">⚠</span><h2>${escapeHtml(existing.title)}</h2><p>This scene's persona references are missing. PromptForge has preserved the references and will not invent replacements.</p><div class="pf-inline-actions"><button data-product-action="export-scene-json" data-id="${escapeHtml(existing.id)}">Export diagnostic JSON</button><button data-product-action="delete-scene" data-id="${escapeHtml(existing.id)}">Delete scene</button></div></section>` : emptyState("A scene begins with a character", "Create and save a character first. Scene Forge will carry their canonical identity forward.", '<button class="pf-primary" data-product-action="create-character">Create character</button>');
      return;
    }
    const preferred = existing?.focusPersonaRef?.id || existing?.characterRef?.id || state.draft.sceneCharacterId || records[0].persona.meta.persona_id;
    setChrome("scenes", existing ? existing.title : "Scene Forge", "Choose the moment. PromptForge resolves the supporting detail.");
    const requirements = existing?.requirements || {};
    const controls = existing?.controls || {};
    const projects = projectStore.all().filter(project => !project.workspace.archived);
    const selectedProjectId = existing?.projectRef?.id || state.draft.sceneProjectId || "";
    const locations = bridge.locationStore?.all?.() || [], casts = bridge.castStore?.all?.() || [], groups = bridge.groupStore?.all?.() || [], relationships = relationshipStore?.all?.() || [];
    const selectedParticipants = new Set(existing?.participantRefs?.map(ref => ref.id) || [preferred]);
    const sceneDiagnostics = sceneStore.diagnostics({ personas: records.map(item => item.persona), projects: projectStore.all(), locations, casts, groups, relationships });
    const currentIssues = existing ? sceneDiagnostics.missingReferences.filter(item => item.sceneId === existing.id) : [];
    const relationshipChoiceLabel = item => `${personById(item.sourceRef?.id)?.origin?.name || "Missing participant"} — ${relationshipLabel(item.type)} — ${personById(item.targetRef?.id)?.origin?.name || "Missing participant"}`;
    const result = existing?.output?.prompt ? existing : state.sceneResult;
    const sources = result?.resolved?.sources || {};
    const sourceDetails = result?.resolved?.source_details || {};
    const sceneReference = controls.references?.[0] || null;
    view.innerHTML = `<div class="pf-scene-layout"><form id="scene-form" class="pf-scene-form pf-surface" data-scene-id="${escapeHtml(existing?.id || "")}"><div class="pf-form-heading"><div><p class="pf-kicker">Scene Forge v0.5.4</p><h2>${existing ? "Edit the moment" : "Define the moment"}</h2></div><span class="pf-step-badge">Reference-first</span></div>
      <label>Scene title<input name="title" required maxlength="120" value="${escapeHtml(existing?.title || "")}" placeholder="A clear name for this moment"></label><label>Premise<textarea name="premise" rows="2" maxlength="2000" placeholder="What is happening?">${escapeHtml(existing?.premise || "")}</textarea></label><label>Purpose<input name="purpose" value="${escapeHtml(existing?.purpose || "")}" placeholder="What should this reveal?"></label>
      <label>Focus character<select name="characterId" required>${records.map(item => `<option value="${escapeHtml(item.persona.meta.persona_id)}" ${item.persona.meta.persona_id === preferred ? "selected" : ""}>${escapeHtml(item.persona.origin.name)}</option>`).join("")}</select></label>
      <div id="scene-suggestions" class="pf-suggestion-box" aria-live="polite">${sceneSuggestionMarkup(personById(preferred))}</div>
      <fieldset><legend>Participants <small>explicit choices</small></legend><div class="pf-chip-row">${records.map(item => `<label class="pf-chip" title="Persona ID: ${escapeHtml(item.persona.meta.persona_id)}"><input type="checkbox" name="participantIds" value="${escapeHtml(item.persona.meta.persona_id)}" ${selectedParticipants.has(item.persona.meta.persona_id) ? "checked" : ""}> ${escapeHtml(item.persona.origin.name)}</label>`).join("")}</div></fieldset>
      <div class="pf-form-grid"><label>Location<input name="location" value="${escapeHtml(requirements.location || "")}" placeholder="e.g. Café"></label><label>Activity<input name="activity" value="${escapeHtml(requirements.activity || "")}" placeholder="e.g. Working on a personal project"></label><label>Time<input name="time" value="${escapeHtml(requirements.time || "")}" placeholder="e.g. Late afternoon"></label><label>Company<input name="socialContext" value="${escapeHtml(requirements.socialContext || "")}" placeholder="e.g. Alone"></label><label class="pf-span-2">Mood / atmosphere<input name="mood" value="${escapeHtml(requirements.mood || "")}" placeholder="e.g. Cozy and focused"></label></div>
      <div class="pf-form-grid"><label>Conflict / tension<textarea name="conflict" rows="2">${escapeHtml(requirements.conflict || "")}</textarea></label><label>Era override<input name="era" value="${escapeHtml(requirements.era || "")}" placeholder="Leave blank to inherit"></label><label>Location record<select name="locationRef"><option value="">Inherit / independent</option>${locations.map(item => `<option value="${escapeHtml(item.id)}" ${existing?.locationRef?.id === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label><label>Cast<select name="castRef"><option value="">No cast</option>${casts.map(item => `<option value="${escapeHtml(item.id)}" ${existing?.castRef?.id === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label><label>Group<select name="groupRef"><option value="">No group</option>${groups.map(item => `<option value="${escapeHtml(item.id)}" ${existing?.groupRef?.id === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label><label>Participant source<select name="participantInheritance">${["project", "explicit", "independent"].map(value => `<option value="${value}" ${existing?.inheritance?.participants === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label></div>
      <fieldset><legend>Relationship emphasis <small>evidence only</small></legend><div class="pf-chip-row">${relationships.map(item => `<label class="pf-chip" title="Relationship ID: ${escapeHtml(item.id)}"><input type="checkbox" name="relationshipIds" value="${escapeHtml(item.id)}" ${existing?.relationshipRefs?.some(ref => ref.id === item.id) ? "checked" : ""}> ${escapeHtml(relationshipChoiceLabel(item))}</label>`).join("") || '<span class="pf-muted">No relationships available.</span>'}</div></fieldset>
      <details class="pf-advanced"><summary>Fine-tune the scene</summary><div class="pf-form-grid"><label>Project<select name="projectId"><option value="">No project context</option>${projects.map(project => `<option value="${escapeHtml(project.id)}" ${existing?.projectRef?.id === project.id ? "selected" : ""}>${escapeHtml(project.name)}</option>`).join("")}</select></label><label>Seed<input name="seed" value="${escapeHtml(controls.seed || "scene-001")}"></label><label>Output target<select name="target">${["generic", "chatgpt", "gemini", "niji"].map(value => `<option value="${value}" ${controls.target === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label><label>Detail<select name="density">${["compact", "standard", "detailed"].map(value => `<option value="${value}" ${(controls.density || "standard") === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label><label>Wardrobe<input name="wardrobe" value="${escapeHtml(controls.wardrobe || "")}" placeholder="Let the character and context decide"></label><label>Props<input name="props" value="${escapeHtml(controls.props || "")}" placeholder="Objects important to this moment"></label><label>Expression<input name="expression" value="${escapeHtml(controls.expression || "")}" placeholder="e.g. quietly delighted"></label><label>Pose / body language<input name="pose" value="${escapeHtml(controls.pose || "")}" placeholder="e.g. leaning into the task"></label><label>Composition<input name="composition" value="${escapeHtml(controls.composition || "")}" placeholder="e.g. intimate medium portrait"></label><label>Lighting<input name="lighting" value="${escapeHtml(controls.lighting || "")}" placeholder="e.g. soft window light"></label></div><details class="pf-reference-controls"><summary>Add a reference for this scene</summary><div class="pf-form-grid"><label>Reference ID or URL<input name="referenceSource" value="${escapeHtml(sceneReference?.source || sceneReference?.id || "")}" placeholder="A moodboard, image, palette, or note"></label><label>Use it for<select name="referencePurpose">${REFERENCE_PURPOSES.map(value => `<option value="${value}" ${sceneReference?.purpose === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label><label>Reference type<select name="referenceMediaType">${REFERENCE_MEDIA_TYPES.map(value => `<option value="${value}" ${sceneReference?.media_type === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label><label>Influence<select name="referenceStrength">${Object.keys(REFERENCE_STRENGTHS).map(value => `<option value="${value}" ${(sceneReference?.strength || "supporting") === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label></div><p>A fashion reference guides clothing; an environment reference guides place and light. Its purpose limits what it can change.</p></details><p>Your saved character choices remain active. Leave any field blank and PromptForge will choose from the character, project, and style context.</p></details>
      <fieldset class="pf-projection-controls"><legend>Multi-person visual projection</legend><div class="pf-form-grid"><label>Projection focus<select name="projectionFocus">${records.map(item => `<option value="${escapeHtml(item.persona.meta.persona_id)}" ${(existing?.projection?.focusPersonaId || preferred) === item.persona.meta.persona_id ? "selected" : ""}>${escapeHtml(item.persona.origin.name)}</option>`).join("")}</select></label><label>Composition mode<select name="projectionCompositionMode">${["balanced", "focus-led", "tableau", "shared-action"].map(value => `<option value="${value}" ${(existing?.projection?.compositionMode || "balanced") === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label><label>Projection density<select name="projectionDensity">${["compact", "standard", "detailed"].map(value => `<option value="${value}" ${(existing?.projection?.density || controls.density || "standard") === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label><label>Visual target<select name="projectionTarget">${["generic", "chatgpt", "gemini", "niji"].map(value => `<option value="${value}" ${(existing?.projection?.visualTarget || controls.target || "generic") === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label></div><p class="pf-muted">Identity stays anchored to each referenced persona; composition controls affect only this projection.</p></fieldset><button class="pf-primary pf-generate" type="submit">${existing ? "Save and regenerate" : "Create scene"} <span aria-hidden="true">→</span></button></form>
      <aside class="pf-scene-preview pf-surface">${result ? `<p class="pf-kicker">Scene prompt</p><h2>${escapeHtml(result.title)}</h2><pre>${escapeHtml(result.output.prompt)}</pre><details class="pf-why-panel"><summary>Why these choices?</summary><div>${Object.entries(sources).map(([key, source]) => { const explanation = sourceExplanation(key, source, sourceDetails[key]); return `<article><span>${escapeHtml(explanation.label)}</span><strong>${escapeHtml(explanation.source)}</strong><small>${escapeHtml(explanation.reason)}</small>${sourceDetails[key]?.alternatives?.length ? `<em>${sourceDetails[key].alternatives.length} other option${sourceDetails[key].alternatives.length === 1 ? "" : "s"} considered</em>` : ""}</article>`; }).join("")}</div></details>${result.resolved?.references?.references?.length ? `<div class="pf-used-references"><span>References used</span>${result.resolved.references.references.filter(reference => reference.enabled).map(reference => `<strong>${escapeHtml(referenceLabel(reference))} · ${escapeHtml(humanize(reference.purpose))}</strong>`).join("")}</div>` : ""}<div class="pf-inline-actions"><button data-product-action="copy-scene" data-id="${escapeHtml(result.id)}">Copy prompt</button><button class="pf-primary" data-product-action="scene-for-character" data-id="${escapeHtml(result.characterRef?.id)}">Create variation</button></div>` : `<div class="pf-preview-empty"><span aria-hidden="true">◫</span><h2>Your scene will appear here</h2><p>PromptForge can suggest the supporting detail, while your character choices stay intact.</p></div>`}</aside></div>
      ${result ? `<section class="pf-surface pf-profile-panel"><p class="pf-kicker">Scene export</p><h2>Portable reference package</h2>${result.output.summary ? `<p>${escapeHtml(result.output.summary)}</p>` : ""}${currentIssues.length ? `<div class="warning"><strong>Missing dependencies</strong><ul>${currentIssues.map(item => `<li>${escapeHtml(`${humanize(item.field)}: ${item.id}`)}</li>`).join("")}</ul></div>` : ""}${result.resolved?.warnings?.length ? `<div class="warning"><strong>Needs review</strong><ul>${result.resolved.warnings.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}${result.resolved?.sourceTrace?.length ? `<details><summary>Source trace</summary><ul>${result.resolved.sourceTrace.map(item => `<li><strong>${escapeHtml(humanize(item.domain))}</strong> — ${escapeHtml(item.detail)} <small>${escapeHtml(item.source)}</small></li>`).join("")}</ul></details>` : ""}<div class="pf-inline-actions"><button data-product-action="export-scene-json" data-id="${escapeHtml(result.id)}">Export JSON</button><button data-product-action="export-scene-md" data-id="${escapeHtml(result.id)}">Export Markdown</button><button data-product-action="delete-scene" data-id="${escapeHtml(result.id)}">Delete scene</button></div></section>` : ""}
      <section class="pf-section"><div class="pf-section-heading"><div><p class="pf-kicker">Saved locally</p><h2>Recent scenes</h2></div></div><div class="pf-list">${sceneStore.all().slice(0, 6).map(scene => sceneCard(scene, personById(scene.focusPersonaRef?.id || scene.characterRef?.id))).join("") || '<div class="pf-compact-empty">No scenes generated yet.</div>'}</div></section>`;
  }

  function projectsView(id = "") {
    if (id) return projectDetailView(id);
    setChrome("projects", "Projects", "Contextual homes for casts, locations, and scenes.");
    const projects = projectStore.all().filter(project => !project.workspace.archived);
    view.innerHTML = `<div class="pf-page-actions"><div><p class="pf-muted">Projects reference saved personas. They never own, duplicate, or rewrite them.</p></div><div><button data-product-action="import-project">Import JSON</button><button class="pf-primary" data-product-action="create-project">＋ New project</button></div></div><input id="project-import-file" type="file" accept="application/json" hidden>${projects.length ? `<div class="pf-project-grid">${projects.map(projectCard).join("")}</div>` : emptyState("Create a project", "Set a few shared assumptions, then add or generate personas.", '<button class="pf-primary" data-product-action="create-project">Create project</button>')}`;
  }

  function getProjectAssembly(id) {
    const project = projectById(id); if (!project) return null;
    const scenes = project.sceneRefs.map(ref => sceneStore.open(ref.id)).filter(Boolean);
    const projections = scenes.map(scene => ({ sceneId: scene.id, projection: scene.output?.package?.multiPersonProjection || scene.resolved?.multiPersonProjection })).filter(item => item.projection).map(item => ({ ...item.projection, sceneId: item.sceneId }));
    const settings = project.workspace?.contextAssembly || {};
    return assembleProjectContext({ project, personas: personas().map(item => item.persona), casts: bridge.castStore?.all?.() || [], groups: bridge.groupStore?.all?.() || [], relationships: relationshipStore?.all?.() || [], locations: bridge.locationStore?.all?.() || [], scenes, projections, settings: { ...settings, density: settings.density || "standard" } });
  }

  function projectDetailView(id) {
    const project = projectById(id);
    if (!project) { location.hash = "projects"; return; }
    setChrome("projects", project.name, [project.context.setting, project.context.era].filter(Boolean).join(" · ") || "Shared creative context");
    const characters = project.personaRefs.map(ref => personById(ref.id)).filter(Boolean);
    const scenes = project.sceneRefs.map(ref => sceneStore.open(ref.id)).filter(Boolean);
    const missingSceneRefs = project.sceneRefs.filter(ref => !sceneStore.open(ref.id));
    const available = personas().filter(item => !project.personaRefs.some(ref => ref.id === item.persona.meta.persona_id));
    const locations = (bridge.locationStore?.all?.() || []).filter(item => item.projectRef?.id === id);
    const assemblySettings = project.workspace?.contextAssembly || {};
    const assembly = getProjectAssembly(id);
    const coherence = auditProjectCoherence({ project, personas: personas().map(item => item.persona), casts: bridge.castStore?.all?.() || [], groups: bridge.groupStore?.all?.() || [], relationships: relationshipStore?.all?.() || [], locations, scenes, assembly });
    view.innerHTML = `<div class="pf-detail-actions"><a href="#projects" class="pf-back">← All projects</a><div><button data-product-action="duplicate-project" data-id="${escapeHtml(id)}">Duplicate</button><button data-product-action="export-project" data-id="${escapeHtml(id)}">Export JSON</button><button data-product-action="delete-project" data-id="${escapeHtml(id)}">Delete</button><button class="pf-primary" data-product-action="project-character" data-id="${escapeHtml(id)}">Generate persona</button></div></div><section class="pf-project-hero pf-surface"><div><p class="pf-kicker">PromptForge → Project → Personas</p><h2>${escapeHtml(project.name)}</h2><p>${escapeHtml(project.description || project.context.premise || "A shared creative context.")}</p>${project.state.needsReview ? '<p class="warning">Project context changed. Inheriting members are marked for review; explicit overrides were preserved.</p>' : ""}</div><div class="pf-project-stats"><span><strong>${characters.length}</strong>Personas</span><span><strong>${project.state.revision}</strong>Revision</span><span><strong>${escapeHtml(dateLabel(project.updatedAt))}</strong>Updated</span></div></section>
    <div class="pf-project-columns"><section class="pf-surface pf-profile-panel"><div class="pf-section-heading"><div><p class="pf-kicker">Members</p><h2>Personas</h2></div></div>${characters.length ? `<div class="pf-list">${characters.map(persona => { const member=project.memberState[persona.meta.persona_id]; const link=persona.extensions?.promptforge?.projectContexts?.[id]; const inherited=Object.keys(link?.inherited||{}); const overrides=Object.keys(link?.overrides||{}); return `<article class="pf-scene-card"><div><h3>${escapeHtml(persona.origin.name)}</h3><p>${inherited.length ? `Inherits ${escapeHtml(inherited.join(", "))}` : "Independent context"}${overrides.length ? ` · Overrides ${escapeHtml(overrides.join(", "))}` : ""}${member?.needsReview ? " · Review needed" : ""}</p></div><div><button data-product-action="open-character" data-id="${escapeHtml(persona.meta.persona_id)}">Open</button><button data-product-action="remove-project-persona" data-project-id="${escapeHtml(id)}" data-persona-id="${escapeHtml(persona.meta.persona_id)}">Remove</button></div></article>`; }).join("")}</div>` : '<p class="pf-muted">No personas attached yet.</p>'}${available.length ? `<form id="project-add-character" data-project-id="${escapeHtml(id)}" class="pf-inline-form"><select name="personaId" aria-label="Persona to add">${available.map(item => `<option value="${escapeHtml(item.persona.meta.persona_id)}">${escapeHtml(item.persona.origin.name)}</option>`).join("")}</select><button type="submit">Add existing persona</button></form>` : ""}</section>
    <section class="pf-surface pf-profile-panel"><div class="pf-section-heading"><div><p class="pf-kicker">Shared assumptions</p><h2>Project context</h2></div></div><form id="project-context-form" data-project-id="${escapeHtml(id)}"><label>Description<textarea name="description" rows="2">${escapeHtml(project.description)}</textarea></label><label>Premise<textarea name="premise" rows="2">${escapeHtml(project.context.premise)}</textarea></label><div class="pf-form-grid"><label>Setting<select name="setting"><option value="">No default</option>${bridge.library().settings.map(entry=>`<option value="${escapeHtml(entry.id)}" ${entry.id===project.context.setting?"selected":""}>${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Era<select name="era"><option value="">No default</option>${bridge.library().eras.map(entry=>`<option value="${escapeHtml(entry.id)}" ${entry.id===project.context.era?"selected":""}>${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Country<select name="country"><option value="">No default</option>${bridge.library().countries.map(entry=>`<option value="${escapeHtml(entry.id)}" ${entry.id===project.context.country?"selected":""}>${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Species<select name="species"><option value="">No default</option>${bridge.library().species.map(entry=>`<option value="${escapeHtml(entry.id)}" ${entry.id===project.context.species?"selected":""}>${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Variance<select name="varianceMode">${["grounded","varied","chaotic"].map(value=>`<option value="${value}" ${value===project.defaults.varianceMode?"selected":""}>${humanize(value)}</option>`).join("")}</select></label></div><button type="submit">Save context</button></form><details><summary>Version metadata</summary><p>Project schema ${project.versions.projectSchema} · Persona schema ${escapeHtml(project.versions.personaSchema)} · Data ${escapeHtml(project.versions.data)} · App ${escapeHtml(project.versions.application)}</p></details></section><section class="pf-surface pf-profile-panel"><div class="pf-section-heading"><div><p class="pf-kicker">Graph</p><h2>Relationships</h2></div></div>${(relationshipStore?.all?.()||[]).filter(r=>r.projectRef?.id===id).map(r=>`<article class="pf-scene-card"><div><h3>${escapeHtml(personById(r.sourceRef?.id)?.origin?.name||r.sourceRef?.id||"Missing")} → ${escapeHtml(r.type)} → ${escapeHtml(personById(r.targetRef?.id)?.origin?.name||r.targetRef?.id||"Missing")}</h3><p>${escapeHtml(r.description||"Explicit relationship")}</p></article>`).join("")||'<p class="pf-muted">No relationships yet.</p>'}</section></div>`;
    view.insertAdjacentHTML("beforeend", `<section class="pf-section"><div class="pf-section-heading"><div><p class="pf-kicker">Scene Forge</p><h2>Project scenes</h2></div><button class="pf-primary" data-product-action="project-scene" data-id="${escapeHtml(id)}">New scene</button></div>${missingSceneRefs.length ? `<p class="warning">${missingSceneRefs.length} scene reference${missingSceneRefs.length === 1 ? " is" : "s are"} missing. IDs: ${escapeHtml(missingSceneRefs.map(ref => ref.id).join(", "))}</p>` : ""}<div class="pf-list">${scenes.map(scene => sceneCard(scene, personById(scene.focusPersonaRef?.id || scene.characterRef?.id))).join("") || '<div class="pf-compact-empty">No scenes yet. Project context will be inherited by default.</div>'}</div></section>`);
    view.insertAdjacentHTML("beforeend", `<section class="pf-section pf-coherence-panel"><div class="pf-section-heading"><div><p class="pf-kicker">Graph health</p><h2>Coherence and review</h2></div><span class="pf-status-chip">${escapeHtml(coherence.status)}</span></div><p>${coherence.counts.error} errors · ${coherence.counts.warning} warnings</p>${coherence.issues.length ? `<ul>${coherence.issues.map(item => `<li><strong>${escapeHtml(item.severity)}</strong> ${escapeHtml(item.message)} <small>${escapeHtml(item.recovery)}</small></li>`).join("")}</ul>` : '<p class="pf-muted">All current project references resolve cleanly.</p>'}</section>`);
    view.insertAdjacentHTML("beforeend", `<section class="pf-section pf-context-assembly"><div class="pf-section-heading"><div><p class="pf-kicker">Context assembly</p><h2>Portable project package</h2></div><span class="pf-status-chip">${escapeHtml(assembly.status)}</span></div><p>${escapeHtml(assembly.summary)}</p><form id="project-assembly-settings" data-project-id="${escapeHtml(id)}"><div class="pf-form-grid"><label>Density<select name="density">${["compact", "standard", "detailed"].map(value => `<option value="${value}" ${(assemblySettings.density || "standard") === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label><label>Output purpose<input name="purpose" value="${escapeHtml(assemblySettings.purpose || "")}" placeholder="e.g. continuity brief"></label><label class="pf-span-2">Working notes<textarea name="notes" rows="2">${escapeHtml(assemblySettings.notes || project.notes || "")}</textarea></label></div><fieldset><legend>Include sources</legend><div class="pf-chip-row">${[["personas", "Characters", project.personaRefs], ["casts", "Casts", project.castRefs], ["groups", "Groups", project.groupRefs], ["relationships", "Relationships", project.relationshipRefs], ["locations", "Locations", project.locationRefs], ["scenes", "Scenes", project.sceneRefs]].map(([key, label, refs]) => `<label class="pf-chip"><input type="checkbox" name="include-${key}" ${assemblySettings.selected?.[key] === undefined ? "checked" : (assemblySettings.selected[key].length ? "checked" : "")}> ${label} (${(refs || []).length})</label>`).join("")}</div></fieldset><button class="pf-primary" type="submit">Save assembly settings</button></form>${assembly.warnings.length ? `<div class="warning"><strong>Needs review</strong><ul>${assembly.warnings.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}<details><summary>Included sources and provenance</summary><ul>${assembly.sourceTrace.map(item => `<li><strong>${escapeHtml(item.domain)}</strong> — ${escapeHtml(item.detail)} <small>${escapeHtml(item.source)}</small></li>`).join("")}</ul></details><div class="pf-inline-actions"><button type="button" data-project-assembly="json" data-id="${escapeHtml(id)}">Export JSON</button><button type="button" data-project-assembly="markdown" data-id="${escapeHtml(id)}">Export Markdown</button></div></section>`);
    const assemblyFieldset = document.querySelector("#project-assembly-settings fieldset"); if (assemblyFieldset) assemblyFieldset.insertAdjacentHTML("beforeend", `<label class="pf-chip"><input type="checkbox" name="include-projections" ${assemblySettings.selected?.projections === undefined || assemblySettings.selected?.projections?.length ? "checked" : ""}> Visual projections</label>`);
  }

  function openWizard(personaId = "") {
    state.editingCharacterId = personaId;
    const persona = personaId ? personById(personaId) : null;
    const overrides = persona?.extensions?.promptforge?.characterOverrides || {};
    state.wizardStep = 0;
    state.draft = persona ? {
      name: persona.origin?.name, age: persona.foundation?.age, gender: persona.foundation?.gender,
      setting: persona.foundation?.setting?.id, era: persona.foundation?.era?.id, country: persona.foundation?.country?.id, species: persona.foundation?.species?.id, life_stage: persona.foundation?.life_stage?.id,
      appearance: overrides.appearance || "", personality: overrides.personality || "", background: overrides.background || "",
      occupation: overrides.occupation || "", location: overrides.location || "", interests: overrides.interests || "",
      currentLife: continuityFor(persona).current.situation || overrides.currentLife || "", references: overrides.references || "", exclusions: genreProfileFor(persona).exclusions.join(", "),
      purposeReferences: purposeReferencesFor(persona).references,
      genres: Object.fromEntries(genreProfileFor(persona).genres.map(item => [item.id, Math.round(item.weight * 100)])), seed: persona.meta?.seed
    } : { genres: {}, purposeReferences: [], seed: `character-${Date.now().toString(36)}`, projectId: state.draft.projectId || "" };
    renderWizard();
    if (!dialog.open) dialog.showModal();
    dialog.querySelector("input, textarea, select")?.focus({preventScroll:true});
  }

  function saveWizardFields() {
    const form = dialog.querySelector("#character-wizard-form");
    if (!form) return;
    const values = Object.fromEntries(new FormData(form));
    Object.assign(state.draft, values);
    if (state.wizardStep === 5) {
      state.draft.genres = Object.fromEntries(GENRE_REGISTRY.map(genre => [genre.id, Number(values[`genre-${genre.id}`] || 0)]).filter(([, weight]) => weight > 0));
    }
  }

  function wizardStepContent() {
    const draft = state.draft;
    if (state.wizardStep === 0) { const project=draft.projectId?projectById(draft.projectId):null; return `${project?`<section class="pf-note"><strong>Project context: ${escapeHtml(project.name)}</strong><span>Blank contextual fields inherit from the project. Any selection you make here becomes an explicit persona override.</span></section>`:""}<input type="hidden" name="projectId" value="${escapeHtml(draft.projectId||"")}"><div class="pf-form-grid"><label class="pf-span-2">Name <input name="name" value="${escapeHtml(draft.name || "")}" placeholder="Leave blank for a generated name"></label><label>Age <input type="number" min="0" name="age" value="${escapeHtml(draft.age || "")}" placeholder="Let PromptForge decide"></label><label>Gender <select name="gender"><option value="">Let PromptForge decide</option>${["female", "male", "nonbinary"].map(value => `<option value="${value}" ${draft.gender === value ? "selected" : ""}>${value[0].toUpperCase() + value.slice(1)}</option>`).join("")}</select></label><label>Setting<select name="setting"><option value="">${project?.context.setting?"Inherit project setting":"Let PromptForge decide"}</option>${bridge.library().settings.map(entry => `<option value="${escapeHtml(entry.id)}" ${draft.setting === entry.id ? "selected" : ""}>${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Era<select name="era"><option value="">${project?.context.era?"Inherit project era":"Let PromptForge decide"}</option>${bridge.library().eras.map(entry => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Country<select name="country"><option value="">${project?.context.country?"Inherit project country":"Let PromptForge decide"}</option>${bridge.library().countries.map(entry => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Species<select name="species"><option value="">${project?.context.species?"Inherit project species":"Let PromptForge decide"}</option>${bridge.library().species.map(entry => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Life stage<select name="life_stage"><option value="">Let PromptForge decide</option>${bridge.library().lifeStages.map(entry => `<option value="${escapeHtml(entry.id)}" ${draft.life_stage === entry.id ? "selected" : ""}>${escapeHtml(entry.name)}</option>`).join("")}</select></label></div>`; }
    if (state.wizardStep === 1) return `<label>Appearance direction <textarea name="appearance" rows="6" placeholder="Optional: the details that matter most. Canonical appearance remains generated and inspectable in Advanced PersonaForge.">${escapeHtml(draft.appearance || "")}</textarea></label><p class="pf-helper">Use this for explicit creative requirements, not every possible detail.</p>`;
    if (state.wizardStep === 2) return `<label>Personality direction <textarea name="personality" rows="6" placeholder="Optional: thoughtful, direct, slow to trust…">${escapeHtml(draft.personality || "")}</textarea></label><p class="pf-helper">PromptForge still builds a coherent canonical trait and value profile underneath.</p>`;
    if (state.wizardStep === 3) return `<div class="pf-form-grid"><label>Occupation <input name="occupation" value="${escapeHtml(draft.occupation || "")}" placeholder="Optional explicit role"></label><label>Current location <input name="location" value="${escapeHtml(draft.location || "")}" placeholder="Optional city or region"></label><label class="pf-span-2">Background notes <textarea name="background" rows="5" placeholder="The life context that should carry into scenes.">${escapeHtml(draft.background || "")}</textarea></label></div>`;
    if (state.wizardStep === 4) return `<label>Interests <input name="interests" value="${escapeHtml(draft.interests || "")}" placeholder="Photography, gaming, travel"></label><label>Current life <textarea name="currentLife" rows="5" placeholder="What are they doing or working toward now?">${escapeHtml(draft.currentLife || "")}</textarea></label>`;
    if (state.wizardStep === 5) return `<p class="pf-helper">Add any number of genres. Weights are normalized when saved; zero genres is fully supported.</p><div class="pf-genre-controls">${GENRE_REGISTRY.map(genre => `<label><span><strong>${escapeHtml(genre.name)}</strong><small>${escapeHtml(genre.definition)}</small></span><input type="range" min="0" max="100" step="5" name="genre-${escapeHtml(genre.id)}" value="${escapeHtml(draft.genres?.[genre.id] || 0)}"><output>${escapeHtml(draft.genres?.[genre.id] || 0)}</output></label>`).join("")}</div><label>Style exclusions <input name="exclusions" value="${escapeHtml(draft.exclusions || "")}" placeholder="coffee, formalwear, neon"></label>`;
    if (state.wizardStep === 6) return `${draft.purposeReferences?.length ? `<div class="pf-reference-list pf-reference-list-compact">${draft.purposeReferences.map(reference => `<article><span class="pf-reference-type">${escapeHtml(humanize(reference.purpose))}</span><strong>${escapeHtml(referenceLabel(reference))}</strong><small>${escapeHtml(humanize(reference.strength))} influence</small></article>`).join("")}</div>` : ""}<div class="pf-form-grid"><label class="pf-span-2">Reference ID or URL<input name="referenceSource" value="${escapeHtml(draft.referenceSource || "")}" placeholder="Paste a link or give this reference a memorable ID"></label><label>Use it for<select name="referencePurpose">${REFERENCE_PURPOSES.map(value => `<option value="${value}" ${draft.referencePurpose === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label><label>Reference type<select name="referenceMediaType">${REFERENCE_MEDIA_TYPES.map(value => `<option value="${value}" ${draft.referenceMediaType === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label><label>Influence<select name="referenceStrength">${Object.keys(REFERENCE_STRENGTHS).map(value => `<option value="${value}" ${(draft.referenceStrength || "supporting") === value ? "selected" : ""}>${humanize(value)}</option>`).join("")}</select></label><label>Label<input name="referenceLabel" value="${escapeHtml(draft.referenceLabel || "")}" placeholder="Optional friendly name"></label></div><label>Reference notes<textarea name="references" rows="4" placeholder="What should PromptForge notice or preserve?">${escapeHtml(draft.references || "")}</textarea></label><p class="pf-helper">Purpose creates a boundary: fashion guides clothes, environment guides setting and light, and appearance guides visible features.</p>`;
    const genres = Object.entries(draft.genres || {}).filter(([, weight]) => Number(weight) > 0).map(([id, weight]) => `${genreById(id)?.name || id} ${weight}`).join(" · ");
    return `<div class="pf-review"><div><span>Name</span><strong>${escapeHtml(draft.name || (state.editingCharacterId ? "Keep current name" : "Generated name"))}</strong></div><div><span>Foundation</span><strong>${escapeHtml([draft.age && `Age ${draft.age}`, draft.gender, draft.setting].filter(Boolean).join(" · ") || "Contextual")}</strong></div><div><span>Style</span><strong>${escapeHtml(genres || "No genre influence")}</strong></div><div><span>Explicit notes</span><strong>${escapeHtml([draft.personality, draft.background, draft.currentLife].filter(Boolean).join(" · ") || "None")}</strong></div></div><section class="pf-note"><strong>Canonical integrity</strong><span>${state.editingCharacterId ? "Core persona facts stay intact. This update changes only the friendly-layer overrides and style profile." : "PromptForge will generate one canonical persona, then attach your explicit creative choices as additive overrides."}</span></section>`;
  }

  function renderWizard() {
    dialog.innerHTML = `<div class="pf-dialog-head"><div><p class="pf-kicker">${state.editingCharacterId ? "Edit character" : "Create character"}</p><h2>${wizardSteps[state.wizardStep]}</h2></div><button class="pf-dialog-close" data-product-action="close-dialog" aria-label="Close">×</button></div><div class="pf-mode-tabs" role="tablist"><button class="active" role="tab" aria-selected="true">Guided</button><button role="tab" data-product-action="open-advanced" data-id="${escapeHtml(state.editingCharacterId || "")}">Advanced</button><button role="tab" data-product-action="import-character">Import</button></div><div class="pf-wizard"><ol>${wizardSteps.map((step, index) => `<li class="${index === state.wizardStep ? "active" : index < state.wizardStep ? "done" : ""}"><span>${index < state.wizardStep ? "✓" : index + 1}</span>${escapeHtml(step)}</li>`).join("")}</ol><form id="character-wizard-form"><div class="pf-wizard-content">${wizardStepContent()}</div><div class="pf-wizard-actions">${state.wizardStep ? '<button type="button" data-product-action="wizard-back">Back</button>' : '<span></span>'}<button class="pf-primary" type="submit">${state.wizardStep === wizardSteps.length - 1 ? (state.editingCharacterId ? "Save changes" : "Create character") : "Next →"}</button></div></form></div><input id="character-import-file" type="file" accept="application/json" hidden>`;
    dialog.querySelector("input, textarea, select")?.focus({ preventScroll: true });
  }

  function openProjectDialog() {
    dialog.innerHTML = `<div class="pf-dialog-head"><div><p class="pf-kicker">New project</p><h2>Create a shared context</h2></div><button class="pf-dialog-close" data-product-action="close-dialog" aria-label="Close">×</button></div><form id="product-project-create-form" class="pf-dialog-form"><label>Project name<input name="name" required maxlength="120" placeholder="Neon London"></label><label>Description<textarea name="description" rows="3" placeholder="What is this project for?"></textarea></label><details><summary>Shared context (optional)</summary><div class="pf-form-grid"><label>Setting<select name="setting"><option value="">No default</option>${bridge.library().settings.map(entry=>`<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Era<select name="era"><option value="">No default</option>${bridge.library().eras.map(entry=>`<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Country<select name="country"><option value="">No default</option>${bridge.library().countries.map(entry=>`<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Species<select name="species"><option value="">No default</option>${bridge.library().species.map(entry=>`<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`).join("")}</select></label><label>Variance<select name="varianceMode"><option value="varied">Varied</option><option value="grounded">Grounded</option><option value="chaotic">Chaotic</option></select></label></div></details><div class="pf-wizard-actions"><button type="button" data-product-action="close-dialog">Cancel</button><button class="pf-primary" type="submit">Create project</button></div></form>`;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector("input")?.focus();
  }

  function enhanceRelationshipControls(projectId) {
    const panel = document.querySelector("#product-view"); if (!panel || !relationshipStore || panel.querySelector("#relationship-create-form")) return;
    const project = projectStore.open(projectId), people = personas().filter(item => project?.personaRefs.some(ref => ref.id === item.persona.meta.persona_id)), options = people.map(item => `<option value="${escapeHtml(item.persona.meta.persona_id)}">${escapeHtml(item.persona.origin.name)}</option>`).join(""), types = Object.values(bridge.relationshipTypes || {}).map(type => `<option value="${escapeHtml(type.id)}">${escapeHtml(type.label)}</option>`).join("");
    const relationships = relationshipStore.all().filter(item => item.projectRef?.id === projectId), names = new Map(people.map(item => [item.persona.meta.persona_id, item.persona.origin.name]));
    const section = document.createElement("section"); section.className = "pf-surface pf-profile-panel"; section.innerHTML = `<div class="pf-section-heading"><div><p class="pf-kicker">Graph</p><h2>Relationship editor</h2></div></div><div id="relationship-lifecycle">${relationships.map(item => `<article class="pf-scene-card"><div><h3>${escapeHtml(names.get(item.sourceRef?.id) || item.sourceRef?.id || "Missing")} → ${escapeHtml(relationshipLabel(item.type))} → ${escapeHtml(names.get(item.targetRef?.id) || item.targetRef?.id || "Missing")}</h3><p><span class="pf-status-chip">${escapeHtml(humanize(item.status || "unspecified"))}</span> ${escapeHtml(item.description || "Explicit relationship")}</p></div><div><button type="button" data-relationship-shell="edit" data-id="${escapeHtml(item.id)}">Edit</button><button type="button" data-relationship-shell="delete" data-id="${escapeHtml(item.id)}">Delete</button></div></article>`).join("") || '<p class="pf-muted">No relationships yet.</p>'}</div><form id="relationship-create-form" data-project-id="${escapeHtml(projectId)}" class="pf-form-grid"><input type="hidden" name="id"><label>Source persona<select name="sourceRef" required>${options}</select></label><label>Relationship type<select name="type" required>${types}</select></label><label>Target persona<select name="targetRef" required>${options}</select></label><label>Status<select name="status"><option value="">Custom / unspecified</option>${["active","former","estranged","deceased","complicated","unknown"].map(value=>`<option value="${value}">${humanize(value)}</option>`).join("")}</select></label><label class="pf-span-2">Description<textarea name="description" rows="2"></textarea></label><button class="pf-primary" type="submit">Create relationship</button></form>`; panel.appendChild(section);
  }
  function enhanceLocationControls(projectId) {
    const panel = document.querySelector("#product-view"); if (!panel || !bridge.locationStore || panel.querySelector("#location-editor")) return;
    const locations = bridge.locationStore.all().filter(item => item.projectRef?.id === projectId), types = (bridge.locationTypes || []).map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join(""), parents = locations.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
    const section = document.createElement("section"); section.id = "location-editor"; section.className = "pf-surface pf-profile-panel"; section.innerHTML = `<div class="pf-section-heading"><div><p class="pf-kicker">Places</p><h2>Location editor</h2></div></div><form id="location-form" data-project-id="${escapeHtml(projectId)}" class="pf-form-grid"><input type="hidden" name="id"><label>Name<input name="name" required maxlength="160"></label><label>Type<select name="type" required>${types}</select></label><label>Parent location<select name="parentRef"><option value="">No parent</option>${parents}</select></label><label>Country / world<input name="country"></label><label>Region<input name="region"></label><label>City / settlement<input name="city"></label><label>District / neighbourhood<input name="district"></label><label class="pf-span-2">Description<textarea name="description" rows="2"></textarea></label><label class="pf-span-2">Environment metadata (JSON, optional)<textarea name="environment" rows="2" placeholder='{"indoorOutdoor":"indoor"}'></textarea></label><div class="pf-form-actions"><button class="pf-primary" type="submit">Save location</button><button type="button" data-location-action="clear">Clear</button></div></form><div class="pf-list">${locations.map(item => `<article class="pf-scene-card"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.type)}${item.geography?.city ? ` · ${escapeHtml(item.geography.city)}` : ""}</p></div><div><button type="button" data-location-action="edit" data-id="${escapeHtml(item.id)}">Edit</button><button type="button" data-location-action="delete" data-id="${escapeHtml(item.id)}">Delete</button></div></article>`).join("")}</div>`; panel.appendChild(section);
  }
  function navigate() {
    const parts = location.hash.slice(1).split("/");
    const area = routeTitles[parts[0]] ? parts[0] : "";
    if (!area) { root.hidden = true; return; }
    document.querySelector("#control-centre").hidden = true;
    document.querySelector("#studio-shell").hidden = true;
    root.hidden = false;
    setActive(area);
    if (area === "home") homeView();
    if (area === "characters") charactersView(parts[1] ? decodeURIComponent(parts.slice(1).join("/")) : "");
    if (area === "scenes") scenesView(parts[1] ? decodeURIComponent(parts.slice(1).join("/")) : "");
    if (area === "projects") projectsView(parts[1] ? decodeURIComponent(parts.slice(1).join("/")) : "");
    if (area === "genres") genresView();
    if (area === "library") libraryView();
    if (area === "projects" && parts[1]) { const projectId = decodeURIComponent(parts.slice(1).join("/")); enhanceRelationshipControls(projectId); enhanceLocationControls(projectId); }
    view.focus({ preventScroll: true });
  }

  root.addEventListener("input", event => {
    if (event.target.matches('#character-search')) {
      const query = event.target.value.toLowerCase();
      document.querySelectorAll("#character-results .pf-character-card").forEach(card => card.hidden = !card.textContent.toLowerCase().includes(query));
    }
    if (event.target.matches('#genre-search')) {
      const query = event.target.value.toLowerCase();
      document.querySelectorAll("#genre-results .pf-genre-card").forEach(card => card.hidden = !card.dataset.search.includes(query));
    }
  });

  document.addEventListener("click", async event => {
    const locationButton = event.target.closest("[data-location-action]");
    if (locationButton) {
      const form = document.querySelector("#location-form"), action = locationButton.dataset.locationAction;
      if (action === "clear") { form?.reset(); if (form) form.elements.id.value = ""; return; }
      const item = bridge.locationStore?.open(locationButton.dataset.id);
      if (action === "delete" && item && confirm(`Delete ${item.name}?`)) { bridge.locationStore.delete(item.id); const project = projectStore.open(form?.dataset.projectId); if (project) projectStore.update(project.id, { locationRefs: project.locationRefs.filter(ref => ref.id !== item.id) }); navigate(); }
      if (action === "edit" && item && form) { form.elements.id.value = item.id; form.elements.name.value = item.name; form.elements.type.value = item.type; form.elements.parentRef.value = item.parentRef?.id || ""; for (const key of ["country", "region", "city", "district"]) form.elements[key].value = item.geography?.[key] || ""; form.elements.description.value = item.description || ""; form.elements.environment.value = JSON.stringify(item.environment || {}); form.elements.name.focus(); }
      return;
    }
    const relationshipButton = event.target.closest("[data-relationship-shell]");
    if (relationshipButton) {
      const form = document.querySelector("#relationship-create-form"), item = relationshipStore?.open(relationshipButton.dataset.id), action = relationshipButton.dataset.relationshipShell;
      if (action === "delete" && item && confirm("Delete relationship?")) { relationshipStore.delete(item.id); const project = projectStore.open(form?.dataset.projectId); if (project) projectStore.update(project.id, { relationshipRefs: project.relationshipRefs.filter(ref => ref.id !== item.id) }); navigate(); }
      if (action === "edit" && item && form) { form.elements.id.value = item.id; form.elements.sourceRef.value = item.sourceRef?.id || ""; form.elements.targetRef.value = item.targetRef?.id || ""; form.elements.type.value = item.type; form.elements.status.value = item.status || ""; form.elements.description.value = item.description || ""; form.querySelector("button[type=submit]").textContent = "Save relationship"; form.elements.description.focus(); }
      return;
    }
    const assemblyButton = event.target.closest("[data-project-assembly]");
    if (assemblyButton) { const project = projectStore.open(assemblyButton.dataset.id), result = getProjectAssembly(assemblyButton.dataset.id); if (project && result) { const markdown = assemblyButton.dataset.projectAssembly === "markdown"; downloadJson(`${project.id}.promptforge-context.${markdown ? "md" : "json"}`, markdown ? projectContextMarkdown(result) : JSON.stringify(result.package, null, 2)); } return; }
    const button = event.target.closest("[data-product-action]");
    if (!button) return;
    const action = button.dataset.productAction;
    if (action === "create-character") openWizard();
    if (action === "edit-character") openWizard(button.dataset.id);
    if (action === "open-character") location.hash = `characters/${encodeURIComponent(button.dataset.id)}`;
    if (action === "open-project") location.hash = `projects/${encodeURIComponent(button.dataset.id)}`;
    if (action === "open-scene") location.hash = `scenes/${encodeURIComponent(button.dataset.id)}`;
    if (action === "new-scene") location.hash = "scenes";
    if (action === "browse-genres") location.hash = "genres";
    if (action === "scene-for-character") { state.draft.sceneCharacterId = button.dataset.id; location.hash = "scenes"; }
    if (action === "project-scene") { const project = projectById(button.dataset.id); state.draft.sceneCharacterId = project?.personaRefs[0]?.id || ""; state.draft.sceneProjectId = button.dataset.id; location.hash = "scenes"; setTimeout(() => { const select = document.querySelector('#scene-form select[name="projectId"]'); if (select) select.value = button.dataset.id; }, 0); }
    if (action === "open-advanced") { dialog.close(); bridge.openAdvanced(button.dataset.id || state.editingCharacterId); }
    if (action === "close-dialog") dialog.close();
    if (action === "wizard-back") { saveWizardFields(); state.wizardStep--; renderWizard(); }
    if (action === "import-character") document.querySelector("#character-import-file")?.click();
    if (action === "create-project") openProjectDialog();
    if (action === "project-character") { state.draft = { projectId: button.dataset.id }; openWizard(); }
    if (action === "remove-project-persona") { bridge.projectCoordinator.removePersona(button.dataset.projectId, button.dataset.personaId); navigate(); }
    if (action === "duplicate-project") { const copy=bridge.projectCoordinator.duplicateProject(button.dataset.id); location.hash=`projects/${encodeURIComponent(copy.id)}`; }
    if (action === "export-project") { const project=projectStore.open(button.dataset.id); if(project)downloadJson(`${project.id}.promptforge-project.json`,projectStore.export(project.id)); }
    if (action === "delete-project" && confirm("Delete this project? Its canonical personas will remain saved.")) { bridge.projectCoordinator.deleteProject(button.dataset.id); location.hash="projects"; }
    if (action === "import-project") document.querySelector("#project-import-file")?.click();
    if (action === "copy-scene") { const scene = sceneStore.open(button.dataset.id); if (scene?.output.prompt) await navigator.clipboard.writeText(scene.output.prompt); }
    if (action === "export-scene-json" || action === "export-scene-md") { const format = action.endsWith("md") ? "markdown" : "json", content = sceneStore.export(button.dataset.id, format); if (content) { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" })); link.download = `${button.dataset.id}.promptforge-scene.${format === "json" ? "json" : "md"}`; link.click(); URL.revokeObjectURL(link.href); } }
    if (action === "delete-scene" && confirm("Delete this scene? Referenced personas and project records will remain.")) { const scene = sceneStore.open(button.dataset.id); if (scene?.projectRef) projectStore.removeScene(scene.projectRef.id, scene.id); sceneStore.delete(button.dataset.id); location.hash = "scenes"; }
    if (action === "use-scene-suggestion") {
      const input = document.querySelector(`#scene-form [name="${button.dataset.field}"]`);
      if (input) { input.value = button.dataset.value || ""; input.focus(); }
    }
    if (action === "focus-current-life") {
      const panel = document.querySelector("#current-life");
      const details = panel?.querySelector("details");
      if (details) details.open = true;
      panel?.scrollIntoView({ behavior: "smooth", block: "center" });
      details?.querySelector("input, textarea")?.focus({ preventScroll: true });
    }
  });

  root.addEventListener("change", event => {
    if (event.target.id === "project-import-file" && event.target.files?.[0]) {
      event.target.files[0].text().then(text => { const preview=projectStore.previewImport(text); if(!preview.valid)throw new Error(preview.issues.join(" ")); if(!confirm(`Import “${preview.preview.name}” with ${preview.preview.memberCount} persona reference(s)? Existing projects will not be overwritten.`))return; const result=projectStore.confirmImport(preview,{collision:"rename"}); location.hash=`projects/${encodeURIComponent(result.project.id)}`; }).catch(error=>alert(`Import failed: ${error.message}`));
      return;
    }
    if (!event.target.matches('#scene-form select[name="characterId"]')) return;
    const suggestions = root.querySelector("#scene-suggestions");
    if (suggestions) suggestions.innerHTML = sceneSuggestionMarkup(personById(event.target.value));
  });
  root.addEventListener("submit", event => { const form = event.target.closest("#relationship-create-form"); if (!form) return; event.preventDefault(); const values = Object.fromEntries(new FormData(form)); try { const fields = { projectRef: { type: "project", id: form.dataset.projectId }, sourceRef: { type: "persona", id: values.sourceRef }, targetRef: { type: "persona", id: values.targetRef }, type: values.type, status: values.status || null, description: values.description }; const relationship = values.id ? relationshipStore.update(values.id, fields) : relationshipStore.create(fields); const project = projectStore.open(form.dataset.projectId); if (project && !project.relationshipRefs.some(ref => ref.id === relationship.id)) projectStore.update(project.id, { relationshipRefs: [...project.relationshipRefs, { type: "relationship", id: relationship.id }] }); navigate(); } catch (error) { alert(error.message); } });
  root.addEventListener("submit", event => { const form = event.target.closest("#location-create-form"); if (!form) return; event.preventDefault(); const values = Object.fromEntries(new FormData(form)); try { const locationRecord = bridge.locationStore.create({ projectRef: { type: "project", id: form.dataset.projectId }, name: values.name, type: values.type, description: values.description, geography: values.city ? { city: values.city } : {} }); const project = projectStore.open(form.dataset.projectId); projectStore.update(project.id, { locationRefs: [...project.locationRefs, { type: "location", id: locationRecord.id }] }); navigate(); } catch (error) { alert(error.message); } });
  root.addEventListener("submit", event => { const form = event.target.closest("#location-form"); if (!form) return; event.preventDefault(); const values = Object.fromEntries(new FormData(form)), geography = Object.fromEntries([["country", values.country], ["region", values.region], ["city", values.city], ["district", values.district]].filter(([, value]) => value?.trim())); let environment = {}; try { environment = values.environment?.trim() ? JSON.parse(values.environment) : {}; } catch { alert("Environment metadata must be valid JSON."); return; } try { const patch = { projectRef: { type: "project", id: form.dataset.projectId }, name: values.name, type: values.type, description: values.description, geography, environment, parentRef: values.parentRef ? { type: "location", id: values.parentRef } : null }; const item = values.id ? bridge.locationStore.update(values.id, patch) : bridge.locationStore.create(patch); const project = projectStore.open(form.dataset.projectId); if (item && project && !project.locationRefs.some(ref => ref.id === item.id)) projectStore.update(project.id, { locationRefs: [...project.locationRefs, { type: "location", id: item.id }] }); navigate(); } catch (error) { alert(error.message); } });

  dialog.addEventListener("input", event => {
    if (event.target.type === "range") event.target.nextElementSibling.textContent = event.target.value;
  });

  dialog.addEventListener("change", async event => {
    if (event.target.id !== "character-import-file" || !event.target.files?.[0]) return;
    try {
      const raw = JSON.parse(await event.target.files[0].text());
      const result = bridge.importCharacter(raw);
      dialog.close();
      location.hash = `characters/${encodeURIComponent(result.meta.persona_id)}`;
    } catch (error) { alert(`Import failed: ${error.message}`); }
  });

  document.addEventListener("submit", event => {
    if (event.target.id === "character-wizard-form") {
      event.preventDefault(); saveWizardFields();
      if (state.wizardStep < wizardSteps.length - 1) { state.wizardStep++; renderWizard(); return; }
      let persona = state.editingCharacterId ? bridge.updateCharacter(state.editingCharacterId, state.draft) : bridge.createCharacter(state.draft);
      if (typeof bridge.updateCharacterReferences === "function") {
        const newReference = state.draft.referenceSource ? createPurposeReference(state.draft.referenceSource, state.draft.referencePurpose || "appearance", {
          media_type: state.draft.referenceMediaType || "image",
          strength: state.draft.referenceStrength || "supporting",
          label: state.draft.referenceLabel,
          source: state.draft.referenceSource,
          notes: state.draft.references
        }) : null;
        const references = assemblePurposeReferences([...(state.draft.purposeReferences || []), ...(newReference ? [newReference] : [])]).references;
        persona = bridge.updateCharacterReferences(persona.meta.persona_id, references) || persona;
      }
      dialog.close();
      location.hash = `characters/${encodeURIComponent(persona.meta.persona_id)}`;
    }
    if (event.target.id === "scene-form") {
      event.preventDefault();
      const data = new FormData(event.target), values = Object.fromEntries(data);
      const persona = personById(values.characterId);
      if (!persona) { alert(`The selected participant is unavailable (${values.characterId || "no ID"}). Choose an available persona.`); return; }
      const project = values.projectId ? projectById(values.projectId) : null;
      const requirements = { location: values.location, activity: values.activity, action: values.activity, time: values.time, era: values.era, socialContext: values.socialContext, mood: values.mood, atmosphere: values.mood, conflict: values.conflict };
      const reference = values.referenceSource ? createPurposeReference(values.referenceSource, values.referencePurpose || "environment", {
        media_type: values.referenceMediaType || "image", strength: values.referenceStrength || "supporting", source: values.referenceSource
      }) : null;
      const controls = { seed: values.seed, target: values.target, density: values.density, wardrobe: values.wardrobe, props: values.props, expression: values.expression, pose: values.pose, composition: values.composition, lighting: values.lighting, references: reference ? [reference] : [] };
      const title = values.title || (values.activity ? `${values.activity} · ${values.location || "Scene"}` : `${persona.origin.name} · ${values.location || "New Scene"}`);
      const refs = sceneReferences(values.characterId, values.projectId), participantIds = [...new Set([...data.getAll("participantIds"), values.characterId])], relationshipIds = data.getAll("relationshipIds");
      const draft = { title, premise: values.premise, purpose: values.purpose, seed: values.seed, ...refs, locationRef: values.locationRef ? { type: "location", id: values.locationRef } : null, castRef: values.castRef ? { type: "cast", id: values.castRef } : null, groupRef: values.groupRef ? { type: "group", id: values.groupRef } : null, participantRefs: participantIds.map(id => ({ type: "persona", id })), relationshipRefs: relationshipIds.map(id => ({ type: "relationship", id })), inheritance: { participants: values.participantInheritance || "project", location: values.locationRef ? "explicit" : values.projectId ? "project" : "independent", time: values.time ? "explicit" : values.projectId ? "project" : "independent" }, requirements, controls, projection: { focusPersonaId: values.projectionFocus || values.characterId, composition: values.projectionCompositionMode || controls.composition || "balanced", density: values.projectionDensity || values.density || "standard", visualTarget: values.projectionTarget || values.target || "generic", mode: "narrative_scene" } };
      const candidate = { ...draft, id: event.target.dataset.sceneId || "scene_preview" };
      const resolved = resolveSceneForge({ scene: candidate, personas: personas().map(item => item.persona), projects: projectStore.all(), locations: bridge.locationStore?.all?.() || [], casts: bridge.castStore?.all?.() || [], groups: bridge.groupStore?.all?.() || [], relationships: relationshipStore?.all?.() || [], library: bridge.library() });
      const payload = { ...draft, resolved, output: { summary: resolved.summary, prompt: resolved.prompt, negativePrompt: resolved.negativePrompt, package: resolved.package } };
      const scene = event.target.dataset.sceneId ? sceneStore.update(event.target.dataset.sceneId, payload) : sceneStore.create(payload);
      if (project) projectStore.addScene(project.id, scene.id);
      if (typeof bridge.updateCharacterContinuity === "function") bridge.updateCharacterContinuity(values.characterId, { type: "record_scene", scene: { id: scene.id, title: scene.title } });
      state.sceneResult = scene;
      location.hash = `scenes/${encodeURIComponent(scene.id)}`;
    }
    if (event.target.id === "product-project-create-form") {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.target));
      const project = projectStore.create({ name: values.name, description: values.description, context: { setting: values.setting, era: values.era, country: values.country, species: values.species }, defaults:{varianceMode:values.varianceMode}, versions:{data:bridge.library().versions?.data||"unknown",personaSchema:bridge.library().versions?.schema||"unknown"} });
      dialog.close(); location.hash = `projects/${encodeURIComponent(project.id)}`;
    }
    if (event.target.id === "project-add-character") {
      event.preventDefault(); const personaId = new FormData(event.target).get("personaId"); bridge.projectCoordinator.addPersona(event.target.dataset.projectId, personaId); navigate();
    }
    if (event.target.id === "project-context-form") {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.target)); const project = projectById(event.target.dataset.projectId);
      bridge.projectCoordinator.updateContext(project.id, { setting:values.setting, era:values.era, country:values.country, species:values.species, premise:values.premise, extensions:project.context.extensions }); projectStore.update(project.id,{description:values.description,defaults:{...project.defaults,varianceMode:values.varianceMode}}); navigate();
    }
    if (event.target.id === "project-assembly-settings") {
      event.preventDefault(); const form = event.target, project = projectById(form.dataset.projectId), values = Object.fromEntries(new FormData(form));
      const selected = {}; for (const [key, refs] of [["personas", project.personaRefs], ["casts", project.castRefs], ["groups", project.groupRefs], ["relationships", project.relationshipRefs], ["locations", project.locationRefs], ["scenes", project.sceneRefs]]) selected[key] = values[`include-${key}`] === "on" ? undefined : [];
      selected.projections = values["include-projections"] === "on" ? undefined : [];
      const current = project.workspace?.contextAssembly || {}; projectStore.update(project.id, { workspace: { ...project.workspace, contextAssembly: { ...current, density: values.density, purpose: values.purpose, notes: values.notes, selected } } }); navigate();
    }
    if (event.target.id === "character-continuity-form") {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.target));
      const id = event.target.dataset.personaId;
      bridge.updateCharacterContinuity(id, { type: "set_current", current: { project: values.project, goal: values.goal, situation: values.situation } });
      if (values.thread) bridge.updateCharacterContinuity(id, { type: "upsert_thread", thread: { title: values.thread } });
      navigate();
    }
  });

  window.addEventListener("hashchange", navigate);
  if (!location.hash) location.hash = "home"; else navigate();
  return { navigate };
}
