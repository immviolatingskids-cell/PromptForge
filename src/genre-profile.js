export const GENRE_PROFILE_VERSION = 1;
export const GENRE_RECIPE_VERSION = 2;

export const GENRE_AFFINITY_DOMAINS = Object.freeze([
  "wardrobe", "activities", "environments", "props"
]);

export const GENRE_DIMENSION_DEFINITIONS = Object.freeze({
  calm: ["Calm", "Low-stimulation visual context."],
  casual: ["Casual", "Informal styling and situations."],
  expression: ["Expressive", "Visible styling or compositional contrast."],
  formal: ["Formal", "Polished, convention-aware presentation."],
  historic: ["Historic", "Aged materials and historic settings."],
  literary: ["Literary", "Reading, writing, and scholarly context."],
  minimalism: ["Minimal", "Restraint and reduced visual clutter."],
  moody: ["Moody", "Subdued, atmospheric visual context."],
  ornament: ["Ornate", "Decorative visual detail."],
  playful: ["Playful", "Light-hearted colour, form, or activity."],
  retro: ["Retro", "Cues associated with a recent past era."],
  structured: ["Structured", "Orderly styling and environments."],
  technology: ["Technology", "Everyday digital tools and spaces."],
  urban: ["Urban", "Active city environments and movement."],
  warmth: ["Warm", "Approachable, lived-in atmosphere."]
});

const deepFreeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const candidate = (id, label, strength, tags, contexts) => ({
  id, label, strength, tags, contexts
});
const relation = (genreId, strength, basis) => ({ genreId, strength, basis });

// Recipes describe contextual possibilities only. Canonical domains such as identity,
// origin, appearance, personality, and occupation deliberately do not belong here.
export const GENRE_REGISTRY = deepFreeze([
  {
    id: "tech-girlie",
    name: "Tech Girlie",
    family: "contemporary-lifestyle",
    definition: "Human-centred technology, practical creativity, and a polished everyday workspace.",
    dimensions: { technology: 0.9, warmth: 0.55, minimalism: 0.45 },
    affinities: {
      wardrobe: [
        candidate("clean-layers", "clean layers", 0.72, ["layered", "restrained"], ["everyday"]),
        candidate("comfortable-contemporary-separates", "comfortable contemporary separates", 0.82, ["comfortable", "contemporary"], ["everyday", "work"]),
        candidate("subtle-tech-accessories", "subtle tech accessories", 0.58, ["technology", "accessory"], ["work", "social"])
      ],
      activities: [
        candidate("personal-project", "working on a personal project", 0.9, ["creative", "focused"], ["solo", "work"]),
        candidate("creative-coding", "creative coding", 0.78, ["creative", "technology"], ["solo", "work"]),
        candidate("digital-idea-planning", "planning a digital idea", 0.7, ["planning", "technology"], ["solo", "collaborative"])
      ],
      environments: [
        candidate("calm-workspace", "calm workspace", 0.84, ["calm", "technology", "work"], ["indoor", "solo"]),
        candidate("bright-cafe-corner", "bright café corner", 0.55, ["bright", "cafe", "social"], ["indoor", "public"]),
        candidate("creative-home-office", "creative home office", 0.76, ["creative", "home", "work"], ["indoor", "solo"])
      ],
      props: [
        candidate("laptop", "laptop", 0.9, ["computer", "technology"], ["work", "creative"]),
        candidate("notebook", "notebook", 0.62, ["paper", "planning"], ["work", "creative"]),
        candidate("headphones", "headphones", 0.66, ["audio", "technology"], ["solo", "travel"])
      ]
    },
    related: ["minimalist", "streetwear"],
    relations: [
      relation("y2k", 0.68, ["technology", "playfulness"]),
      relation("minimalist", 0.62, ["restraint", "workspace"]),
      relation("streetwear", 0.55, ["contemporary", "everyday"]),
      relation("corporate", 0.5, ["technology", "workplace"])
    ],
    provenance: { kind: "seed", version: GENRE_RECIPE_VERSION }
  },
  {
    id: "minimalist",
    name: "Minimalist",
    family: "design-lifestyle",
    definition: "Intentional simplicity, quiet materials, and uncluttered composition.",
    dimensions: { minimalism: 0.95, calm: 0.8, ornament: 0.1 },
    affinities: {
      wardrobe: [
        candidate("clean-monochrome-layers", "clean monochrome layers", 0.78, ["monochrome", "restrained", "layered"], ["everyday", "work"]),
        candidate("simple-tailored-basics", "simple tailored basics", 0.72, ["tailored", "restrained"], ["everyday", "work"])
      ],
      activities: [
        candidate("focused-reading", "focused reading", 0.68, ["quiet", "focused"], ["solo"]),
        candidate("quiet-planning", "quiet planning", 0.72, ["quiet", "planning"], ["solo", "work"])
      ],
      environments: [
        candidate("uncluttered-interior", "uncluttered interior", 0.9, ["calm", "restrained", "indoor"], ["solo", "social"]),
        candidate("calm-architectural-space", "calm architectural space", 0.76, ["architecture", "calm"], ["indoor", "public"])
      ],
      props: [
        candidate("plain-notebook", "plain notebook", 0.68, ["paper", "restrained"], ["work", "creative"]),
        candidate("minimal-desk-objects", "minimal desk objects", 0.58, ["desk", "restrained"], ["work"])
      ]
    },
    related: ["tech-girlie", "corporate"],
    relations: [
      relation("corporate", 0.72, ["structure", "restraint"]),
      relation("tech-girlie", 0.62, ["restraint", "workspace"]),
      relation("dark-academia", 0.38, ["quiet", "study"])
    ],
    provenance: { kind: "seed", version: GENRE_RECIPE_VERSION }
  },
  {
    id: "streetwear",
    name: "Streetwear",
    family: "contemporary-fashion",
    definition: "Relaxed urban styling with expressive layers and practical movement.",
    dimensions: { urban: 0.9, casual: 0.85, expression: 0.7 },
    affinities: {
      wardrobe: [
        candidate("relaxed-layered-streetwear", "relaxed layered streetwear", 0.9, ["relaxed", "layered", "urban"], ["everyday", "social"]),
        candidate("graphic-outerwear", "graphic outerwear", 0.72, ["graphic", "outerwear", "expressive"], ["outdoor", "social"]),
        candidate("comfortable-trainers", "comfortable trainers", 0.74, ["comfortable", "footwear", "movement"], ["everyday", "outdoor"])
      ],
      activities: [
        candidate("city-walk", "walking through the city", 0.82, ["walking", "urban"], ["outdoor", "solo", "social"]),
        candidate("meet-friends", "meeting friends", 0.7, ["social", "casual"], ["social"]),
        candidate("street-photography", "street photography", 0.66, ["creative", "photography", "urban"], ["outdoor", "solo"])
      ],
      environments: [
        candidate("lived-in-city-street", "lived-in city street", 0.86, ["urban", "outdoor", "active"], ["public", "social"]),
        candidate("independent-creative-district", "independent creative district", 0.72, ["urban", "creative"], ["public", "social"])
      ],
      props: [
        candidate("crossbody-bag", "crossbody bag", 0.72, ["bag", "practical"], ["travel", "everyday"]),
        candidate("phone", "phone", 0.58, ["technology", "communication"], ["everyday", "social"]),
        candidate("compact-camera", "compact camera", 0.55, ["camera", "photography"], ["creative", "travel"])
      ]
    },
    related: ["tech-girlie", "y2k"],
    relations: [
      relation("y2k", 0.8, ["fashion", "expression"]),
      relation("tech-girlie", 0.55, ["contemporary", "everyday"])
    ],
    provenance: { kind: "seed", version: GENRE_RECIPE_VERSION }
  },
  {
    id: "dark-academia",
    name: "Dark Academia",
    family: "literary-aesthetic",
    definition: "Scholarly atmosphere, historic texture, and introspective creative practice.",
    dimensions: { historic: 0.8, literary: 0.95, moody: 0.75 },
    affinities: {
      wardrobe: [
        candidate("textured-scholarly-layers", "textured scholarly layers", 0.86, ["textured", "layered", "scholarly"], ["study", "everyday"]),
        candidate("structured-vintage-inspired-pieces", "structured vintage-inspired pieces", 0.68, ["structured", "vintage"], ["study", "social"])
      ],
      activities: [
        candidate("annotate-book", "annotating a book", 0.86, ["reading", "writing", "study"], ["solo", "study"]),
        candidate("research", "researching", 0.78, ["research", "study"], ["solo", "work"]),
        candidate("handwriting", "writing by hand", 0.7, ["writing", "paper"], ["solo", "creative"])
      ],
      environments: [
        candidate("old-library", "old library", 0.9, ["library", "historic", "indoor"], ["public", "study"]),
        candidate("wood-panelled-study", "wood-panelled study", 0.8, ["historic", "study", "indoor"], ["solo"]),
        candidate("rainy-university-courtyard", "rainy university courtyard", 0.62, ["university", "rain", "outdoor"], ["public", "study"])
      ],
      props: [
        candidate("annotated-book", "annotated book", 0.86, ["book", "paper", "study"], ["reading", "work"]),
        candidate("fountain-pen", "fountain pen", 0.7, ["pen", "writing", "vintage"], ["study", "creative"]),
        candidate("weathered-satchel", "weathered satchel", 0.54, ["bag", "vintage"], ["study", "travel"])
      ]
    },
    related: ["minimalist"],
    relations: [relation("minimalist", 0.38, ["quiet", "study"])],
    provenance: { kind: "seed", version: GENRE_RECIPE_VERSION }
  },
  {
    id: "y2k",
    name: "Y2K",
    family: "retro-futurist-fashion",
    definition: "Optimistic turn-of-the-millennium colour, playful technology, and glossy details.",
    dimensions: { retro: 0.85, playful: 0.8, technology: 0.6 },
    affinities: {
      wardrobe: [
        candidate("playful-early-2000s-layers", "playful early-2000s layers", 0.86, ["layered", "playful", "retro"], ["everyday", "social"]),
        candidate("bright-compact-accessories", "bright compact accessories", 0.72, ["accessory", "bright", "playful"], ["social", "everyday"])
      ],
      activities: [
        candidate("make-playlist", "making a playlist", 0.76, ["audio", "creative", "technology"], ["solo", "social"]),
        candidate("browse-vintage-market", "browsing a vintage market", 0.64, ["shopping", "retro"], ["public", "social"])
      ],
      environments: [
        candidate("colourful-bedroom-studio", "colourful bedroom studio", 0.78, ["bright", "home", "creative"], ["indoor", "solo"]),
        candidate("neon-social-space", "neon-lit social space", 0.7, ["neon", "social", "indoor"], ["public", "social"])
      ],
      props: [
        candidate("compact-music-player", "compact music player", 0.82, ["audio", "retro", "technology"], ["everyday", "travel"]),
        candidate("small-shoulder-bag", "small shoulder bag", 0.66, ["bag", "accessory"], ["everyday", "social"]),
        candidate("colourful-headphones", "colourful headphones", 0.7, ["audio", "bright", "technology"], ["solo", "travel"])
      ]
    },
    related: ["streetwear", "tech-girlie"],
    relations: [
      relation("streetwear", 0.8, ["fashion", "expression"]),
      relation("tech-girlie", 0.68, ["technology", "playfulness"])
    ],
    provenance: { kind: "seed", version: GENRE_RECIPE_VERSION }
  },
  {
    id: "corporate",
    name: "Corporate",
    family: "professional",
    definition: "Polished professional presentation, clear structure, and contemporary workplace cues.",
    dimensions: { formal: 0.85, structured: 0.9, minimalism: 0.55 },
    affinities: {
      wardrobe: [
        candidate("modern-tailored-workwear", "modern tailored workwear", 0.88, ["tailored", "formal", "work"], ["work"]),
        candidate("refined-professional-layers", "refined professional layers", 0.72, ["layered", "formal", "work"], ["work", "social"])
      ],
      activities: [
        candidate("prepare-presentation", "preparing a presentation", 0.82, ["planning", "presentation", "work"], ["solo", "work"]),
        candidate("review-project-plan", "reviewing a project plan", 0.78, ["planning", "project", "work"], ["solo", "collaborative"])
      ],
      environments: [
        candidate("contemporary-office", "contemporary office", 0.86, ["office", "work", "indoor"], ["work", "collaborative"]),
        candidate("quiet-meeting-room", "quiet meeting room", 0.68, ["meeting", "quiet", "indoor"], ["work", "collaborative"])
      ],
      props: [
        candidate("work-folio", "work folio", 0.66, ["paper", "work"], ["work", "travel"]),
        candidate("laptop", "laptop", 0.82, ["computer", "technology"], ["work"]),
        candidate("presentation-notes", "presentation notes", 0.7, ["paper", "presentation"], ["work"])
      ]
    },
    related: ["minimalist", "tech-girlie"],
    relations: [
      relation("minimalist", 0.72, ["structure", "restraint"]),
      relation("tech-girlie", 0.5, ["technology", "workplace"])
    ],
    provenance: { kind: "seed", version: GENRE_RECIPE_VERSION }
  }
].map(recipe => ({
  ...recipe,
  // Kept as the legacy projection view for consumers that read the seed registry
  // directly. Resolution uses semanticAffinities below.
  affinities: Object.fromEntries(Object.entries(recipe.affinities)
    .map(([domain, items]) => [domain, items.map(item => item.label)])),
  semanticAffinities: recipe.affinities
})));

const REGISTRY_BY_ID = new Map(GENRE_REGISTRY.map(genre => [genre.id, genre]));
const finiteWeight = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const cleanText = value => String(value ?? "").trim();
const cleanList = value => {
  const items = Array.isArray(value) ? value : String(value || "").split(",");
  const seen = new Set();
  return items.map(cleanText).filter(item => {
    const key = item.toLocaleLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const roundWeight = value => Number(value.toFixed(4));

function genreEntries(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.entries(value).map(([id, weight]) => ({ id, weight }));
  }
  return [];
}

export function normalizeGenreProfile(raw = {}) {
  const source = Array.isArray(raw) ? { genres: raw } : raw && typeof raw === "object" ? raw : {};
  const merged = new Map();
  for (const entry of genreEntries(source.genres)) {
    const id = cleanText(typeof entry === "string" ? entry : entry?.id).toLocaleLowerCase();
    const weight = finiteWeight(typeof entry === "string" ? 1 : entry?.weight);
    if (!REGISTRY_BY_ID.has(id) || weight <= 0) continue;
    merged.set(id, (merged.get(id) || 0) + weight);
  }

  const total = [...merged.values()].reduce((sum, weight) => sum + weight, 0);
  const genres = total > 0
    ? [...merged].map(([id, weight]) => ({ id, weight: roundWeight(weight / total) }))
      .sort((left, right) => right.weight - left.weight || left.id.localeCompare(right.id))
    : [];
  if (genres.length) {
    const delta = roundWeight(1 - genres.reduce((sum, item) => sum + item.weight, 0));
    genres[0].weight = roundWeight(genres[0].weight + delta);
  }

  return {
    version: GENRE_PROFILE_VERSION,
    genres,
    exclusions: cleanList(source.exclusions),
    overrides: source.overrides && typeof source.overrides === "object" && !Array.isArray(source.overrides)
      ? structuredClone(source.overrides)
      : {}
  };
}

export function genreById(id) {
  return REGISTRY_BY_ID.get(cleanText(id).toLocaleLowerCase()) || null;
}

export function genreProfileFor(persona) {
  return normalizeGenreProfile(persona?.style_profile || persona?.extensions?.promptforge?.styleProfile || {});
}

export function attachGenreProfile(persona, profile) {
  const copy = structuredClone(persona);
  copy.style_profile = normalizeGenreProfile(profile);
  return copy;
}

function affinityIsExcluded(item, exclusions) {
  const terms = [item.id, item.label, ...item.tags, ...item.contexts]
    .map(term => cleanText(term).toLocaleLowerCase());
  return exclusions.some(exclusion => terms.some(term => term === exclusion || term.includes(exclusion)));
}

export function weightedGenreInfluences(profile, domain, { exclusions = [], contexts = [] } = {}) {
  if (!GENRE_AFFINITY_DOMAINS.includes(domain)) return [];
  const normalized = normalizeGenreProfile(profile);
  const blocked = cleanList([...normalized.exclusions, ...cleanList(exclusions)])
    .map(item => item.toLocaleLowerCase());
  const requestedContexts = new Set(cleanList(contexts).map(item => item.toLocaleLowerCase()));
  const blended = new Map();

  for (const selected of normalized.genres) {
    const genre = genreById(selected.id);
    for (const item of genre?.semanticAffinities?.[domain] || []) {
      if (affinityIsExcluded(item, blocked)) continue;
      if (requestedContexts.size && item.contexts.length
        && !item.contexts.some(context => requestedContexts.has(context.toLocaleLowerCase()))) continue;
      const contribution = selected.weight * item.strength;
      const current = blended.get(item.id) || {
        value: item.label, conceptId: item.id, weight: 0, affinityStrength: 0,
        genreWeight: 0, genreId: selected.id, genreIds: [], tags: new Set(), contexts: new Set()
      };
      current.weight += contribution;
      current.affinityStrength = Math.max(current.affinityStrength, item.strength);
      if (selected.weight > current.genreWeight
        || (selected.weight === current.genreWeight && selected.id.localeCompare(current.genreId) < 0)) {
        current.genreWeight = selected.weight;
        current.genreId = selected.id;
      }
      current.genreIds.push(selected.id);
      item.tags.forEach(tag => current.tags.add(tag));
      item.contexts.forEach(context => current.contexts.add(context));
      blended.set(item.id, current);
    }
  }

  return [...blended.values()].map(item => ({
    ...item,
    weight: roundWeight(item.weight),
    affinityStrength: roundWeight(item.affinityStrength),
    genreWeight: roundWeight(item.genreWeight),
    genreIds: [...new Set(item.genreIds)].sort(),
    tags: [...item.tags].sort(),
    contexts: [...item.contexts].sort()
  })).sort((left, right) => right.weight - left.weight || left.conceptId.localeCompare(right.conceptId));
}

export function blendedGenreDimensions(profile) {
  const normalized = normalizeGenreProfile(profile);
  const values = new Map();
  for (const selected of normalized.genres) {
    const genre = genreById(selected.id);
    for (const [dimension, strength] of Object.entries(genre?.dimensions || {})) {
      values.set(dimension, (values.get(dimension) || 0) + selected.weight * finiteWeight(strength));
    }
  }
  return Object.fromEntries([...values]
    .map(([dimension, strength]) => [dimension, roundWeight(Math.min(1, strength))])
    .filter(([, strength]) => strength > 0)
    .sort(([left], [right]) => left.localeCompare(right)));
}

export function relatedGenreSuggestions(profileOrId, { limit = 4 } = {}) {
  const profile = typeof profileOrId === "string"
    ? normalizeGenreProfile({ genres: [{ id: profileOrId, weight: 1 }] })
    : normalizeGenreProfile(profileOrId);
  const selectedIds = new Set(profile.genres.map(item => item.id));
  const scores = new Map();
  const reasons = new Map();
  for (const selected of profile.genres) {
    for (const item of genreById(selected.id)?.relations || []) {
      if (selectedIds.has(item.genreId)) continue;
      scores.set(item.genreId, (scores.get(item.genreId) || 0) + selected.weight * item.strength);
      const set = reasons.get(item.genreId) || new Set();
      item.basis.forEach(reason => set.add(reason));
      reasons.set(item.genreId, set);
    }
  }
  const maximum = Math.max(0, Math.floor(Number(limit) || 0));
  return [...scores].map(([id, score]) => ({
    id,
    name: genreById(id)?.name || id,
    score: roundWeight(score),
    reasons: [...(reasons.get(id) || [])].sort()
  })).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)).slice(0, maximum);
}

export function genreProfileLabel(profile) {
  return normalizeGenreProfile(profile).genres
    .map(item => `${genreById(item.id)?.name || item.id} ${Math.round(item.weight * 100)}%`);
}
