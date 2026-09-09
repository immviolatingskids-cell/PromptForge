const text = (value, fallback = "unspecified") => value?.name ?? value?.text ?? value ?? fallback;
const id = (value) => value?.id ?? value;

export const VISUAL_MODES = ["reference", "portrait", "full_body", "lifestyle", "workplace", "hobby", "environmental", "narrative_scene"];

function source(path, value, relevance, reason) {
  return { path, value, relevance, reason };
}

function firstHobby(persona) {
  return persona.interests?.hobbies?.[0] || null;
}

function observableHobby(hobby) {
  const name = text(hobby, "a personal hobby").toLowerCase();
  const style = hobby?.participation_style || "independent";
  const patterns = [["photograph", "on a photography walk with a camera"], ["pottery", "shaping clay at a pottery wheel"], ["bird", "observing birds outdoors with binoculars"], ["stargaz", "studying the night sky with a telescope"], ["astronom", "examining a star chart beside a telescope"], ["garden", "tending plants in a garden workspace"], ["cook", "preparing ingredients at a kitchen work surface"], ["bread", "kneading dough at a kitchen work surface"], ["woodcarv", "carving a small piece at a workbench"], ["mapmak", "drawing a map at a desk with reference materials"], ["run", "running along a practical outdoor route"], ["dance", "rehearsing movement in an open studio"], ["robot", "assembling a small robot at a workbench"]];
  const match = patterns.find(([needle]) => name.includes(needle));
  if (match) return style === "social" || style === "community" ? `${match[1]} with other participants` : match[1];
  return `engaged in a hands-on ${name} activity`;
}

function observableWork(job) {
  if (!job) return "studying or completing a practical learning task";
  const name = text(job, "their work").toLowerCase();
  const patterns = [["librarian", "organising books at a public reference desk"], ["photographer", "reviewing photographs beside a camera kit"], ["teacher", "guiding learners through practical materials"], ["physician", "reviewing notes beside a clinical workstation"], ["care worker", "assisting with a practical care task"], ["baker", "preparing a batch at a commercial workbench"], ["farmer", "checking equipment and cultivated rows"], ["ranger", "recording observations in an outdoor field site"], ["cartographer", "examining maps and measurement tools"], ["developer", "reviewing code at a workstation"], ["engineer", "inspecting a technical design at a workbench"]];
  return patterns.find(([needle]) => name.includes(needle))?.[1] || `performing a visible task associated with ${name}`;
}

function rhythmCue(rhythm) {
  const value = String(rhythm || "").toLowerCase();
  if (value.includes("night") || value.includes("late")) return "with an evening-leaning but flexible time context";
  if (value.includes("early") || value.includes("morning")) return "with a morning-leaning but flexible time context";
  if (value.includes("rotat") || value.includes("shift")) return "with a variable time context";
  return null;
}

function stableChoice(values, key) {
  if (!values.length) return null;
  if (!key || key === "persona" || String(key).startsWith("persona:")) return values[0];
  let hash = 0;
  for (const character of String(key)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return values[hash % values.length];
}

function activityVariants(activity, key) {
  const name = text(activity, "").toLowerCase();
  const variants = [
    ["photograph", ["on a photography walk with a camera", "raising a camera to frame a street scene", "reviewing images beside a camera kit"]],
    ["pottery", ["shaping clay at a pottery wheel", "trimming a vessel with hand tools", "arranging finished pieces on a worktable"]],
    ["bird", ["watching a bird through binoculars", "pausing on a path to record a bird sighting", "studying a field guide beside binoculars"]],
    ["stargaz", ["adjusting a telescope toward the night sky", "studying a star chart beside a telescope", "recording observations under an open sky"]],
    ["astronom", ["examining a star chart beside a telescope", "adjusting a telescope toward the night sky", "recording observations at an astronomy desk"]],
    ["garden", ["tending plants with a hand trowel", "checking seedlings beside a garden bed", "watering plants in a working garden"]],
    ["cook", ["slicing vegetables at a kitchen counter", "stirring a pan beside prepared ingredients", "arranging ingredients on a kitchen work surface"]],
    ["bread", ["kneading dough at a kitchen counter", "shaping loaves beside a floured work surface", "checking bread as it cools on a rack"]],
    ["woodcarv", ["carving a small piece at a workbench", "examining a carved form beside hand tools", "sanding a wooden piece at a workbench"]],
    ["mapmak", ["drawing a map at a desk with reference materials", "measuring a map beside a drafting table", "annotating a map with a fine pen"]],
    ["run", ["running along a practical outdoor route", "tying running shoes beside a trail", "cooling down after a run on a quiet path"]],
    ["dance", ["rehearsing movement in an open studio", "practising a sequence near a mirrored wall", "resting between movements in a rehearsal space"]],
    ["robot", ["assembling a small robot at a workbench", "testing a robot beside loose components", "adjusting a circuit on a workbench"]]
  ];
  return variants.find(([needle]) => name.includes(needle))?.[1] ? stableChoice(variants.find(([needle]) => name.includes(needle))[1], key) : `working on a visible ${name || "personal"} activity`;
}

function workVariants(job, key) {
  const name = text(job, "").toLowerCase();
  const variants = [["librarian", ["organising books at a public reference desk", "helping a visitor locate a book", "checking a return cart beside the shelves"]], ["photographer", ["reviewing photographs beside a camera kit", "framing a shot near a window", "sorting contact sheets at a worktable"]], ["teacher", ["guiding learners through practical materials", "writing examples on a board", "reviewing student work at a desk"]], ["developer", ["reviewing code at a workstation", "sketching a software plan beside a monitor", "testing a feature at a shared desk"]], ["engineer", ["inspecting a technical design at a workbench", "marking measurements on a design", "checking a prototype beside tools"]], ["cartographer", ["examining maps and measurement tools", "annotating a map at a drafting table", "comparing field notes beside a map"]]];
  return variants.find(([needle]) => name.includes(needle))?.[1] ? stableChoice(variants.find(([needle]) => name.includes(needle))[1], key) : observableWork(job);
}

function compositionFor(persona, mode, activity, environment) {
  const seed = persona.meta?.seed || persona.origin?.name || "persona";
  const activityText = String(activity || "").toLowerCase();
  const moving = /running|walking|rehearsing|moving/.test(activityText);
  const seated = /desk|wheel|counter|workbench|table|station|telescope/.test(activityText);
  const pose = mode === "full_body" ? (moving ? "mid-stride with a balanced full-body silhouette" : "standing with a relaxed, readable silhouette") : mode === "portrait" || mode === "reference" ? (mode === "reference" ? "a centered neutral stance" : "head and shoulders, relaxed attention") : seated ? "leaning naturally into the task with hands visible" : moving ? "caught in a practical movement" : "standing naturally within the scene";
  const camera = mode === "reference" ? "centered reference composition with clear facial features" : mode === "portrait" ? "eye-level portrait framing with the face dominant" : mode === "full_body" ? "full-body framing with space around the silhouette" : mode === "environmental" ? "wide environmental framing that places the subject within the space" : mode === "hobby" && seated ? "medium action framing that keeps hands, tools, and face readable" : mode === "workplace" ? "medium environmental framing that shows the task and workspace" : mode === "narrative_scene" ? "three-quarter framing focused on the visible circumstance" : "natural three-quarter framing with useful context";
  const lighting = /evening|night/.test(environment) ? "soft evening light with readable facial detail" : mode === "reference" || mode === "portrait" ? "soft, even light that keeps facial features and hair readable" : mode === "workplace" ? "practical overhead and window light across the workspace" : mode === "hobby" ? "clear directional daylight that reveals the hands and materials" : "diffused natural light shaped by the surrounding space";
  return { pose, camera, lighting, priority: { anchor: ["identity", "appearance"], primary: mode === "hobby" || mode === "workplace" || mode === "narrative_scene" ? ["activity", "environment"] : ["subject", "appearance"], supporting: ["wardrobe", "camera", "lighting"], optional: ["accessories", "signature_item"] } };
}

function identity(persona) {
  const foundation = persona.foundation || {};
  const appearance = persona.appearance || {};
  const visual = appearance.visual || appearance.surface || {};
  return {
    name: persona.origin?.name || null,
    life_stage: text(foundation.life_stage),
    apparent_age: apparentAge(persona),
    species: text(foundation.species),
    gender: text(foundation.gender),
    body: text(visual.body),
    hair: text(visual.hair),
    eyes: text(visual.eyes),
    feature: text(visual.feature)
  };
}

export function apparentAge(persona) {
  const stage = id(persona.foundation?.life_stage);
  const ranges = persona.foundation?.species?.metadata?.apparent_age_ranges;
  const range = ranges?.[stage];
  return range ? `${range[0]}–${range[1]}` : String(persona.foundation?.age ?? "unspecified");
}

export function resolveVisualRelevance(persona, mode = "reference") {
  const selected = VISUAL_MODES.includes(mode) ? mode : "reference";
  const result = {
    mode: selected,
    required: ["identity", "appearance"],
    relevant: [],
    optional: [],
    suppressed: [],
    reasons: {}
  };
  const add = (bucket, field, reason) => { result[bucket].push(field); result.reasons[field] = reason; };
  if (["reference", "portrait", "full_body"].includes(selected)) {
    add("relevant", "wardrobe", "identity-focused output needs a readable presentation");
    add("optional", "signature_features", "use when visible in the selected framing");
    add("suppressed", "occupation", "not visually necessary for identity output");
    add("suppressed", "hobby", "unrelated to identity output");
    add("suppressed", "narrative", "internal and contextual information is not directly visible");
  }
  if (["lifestyle", "environmental"].includes(selected)) {
    add("relevant", "wardrobe", "contextual presentation supports the life moment");
    add("relevant", "housing", "location is relevant to lifestyle output");
    add("relevant", "residence", "current place is a valid scene context");
    add("optional", "hobby", "use one coherent personal activity when compatible");
    add("optional", "daily_rhythm", "softly influences time context");
    add("suppressed", "narrative", "abstract psychology is not directly visible");
  }
  if (selected === "workplace") {
    add("relevant", "occupation", "workplace output requires an observable work context");
    add("relevant", "work_environment", "defines the scene setting");
    add("relevant", "wardrobe", "supports plausible work presentation");
    add("relevant", "daily_rhythm", "softly influences time context");
    add("suppressed", "hobby", "unrelated unless explicitly requested");
    add("suppressed", "narrative", "abstract goals and pressures are not directly visible");
  }
  if (selected === "hobby") {
    add("relevant", "hobby", "activity is the requested visual context");
    add("relevant", "wardrobe", "supports practical activity presentation");
    add("optional", "residence", "use only when the hobby setting is home-based");
    add("suppressed", "occupation", "unrelated to the requested activity");
    add("suppressed", "narrative", "abstract psychology is not directly visible");
  }
  if (selected === "narrative_scene") {
    add("relevant", "narrative_scene", "scene hooks become observable circumstances");
    add("relevant", "wardrobe", "supports the circumstance without replacing identity");
    add("optional", "occupation", "use only when the scene hook makes work observable");
    add("suppressed", "personality", "traits are not physical appearance");
  }
  if (!result.reasons.personality) add("suppressed", "personality", "personality is not directly visible");
  return result;
}

function sceneFor(persona, mode, hobby) {
  const life = persona.life || {};
  const integration = persona.narrative?.integration;
  if (mode === "workplace") {
    const rhythm = rhythmCue(life.daily_rhythm || life.schedule);
    const environment = life.job ? text(life.work_environment, "workplace") : "school or learning environment";
    return `a ${environment} where ${observableWork(life.job)}${rhythm ? `, ${rhythm}` : ""}`;
  }
  if (mode === "hobby" && hobby) {
    const name = text(hobby, "").toLowerCase();
    if (name.includes("photograph")) return "a street or park setting with room to frame a scene";
    if (name.includes("pottery")) return "a small ceramics workshop with shelves of unfinished vessels";
    if (name.includes("bird")) return "a quiet park path with open sightlines and field notes nearby";
    if (name.includes("garden")) return "a working garden with raised beds and hand tools";
    if (name.includes("cook") || name.includes("bread")) return "a practical kitchen with ingredients arranged on the counter";
    if (name.includes("woodcarv")) return "a compact workshop with a clear workbench and hand tools";
    return "a practical hobby workspace with a few relevant materials in view";
  }
  if (mode === "narrative_scene" && integration?.scene_hooks?.[0]?.text) return "an everyday setting with an open practical task, a nearby personal item, and a clear choice in progress";
  if (["lifestyle", "environmental"].includes(mode)) {
    const residence = persona.origin?.current_location;
    const rhythm = rhythmCue(life.daily_rhythm || life.schedule);
    const suffix = rhythm ? `, ${rhythm}` : "";
    return residence ? `a ${text(life.housing, "believable everyday")} living context in ${text(residence)}${suffix}` : `a ${text(life.housing, "believable everyday")} living context${suffix}`;
  }
  return "a neutral, minimally distracting background";
}

export function projectVisual(persona, mode = "reference") {
  const relevance = resolveVisualRelevance(persona, mode);
  const selectedMode = relevance.mode;
  const appearance = persona.appearance || {};
  const visual = appearance.visual || appearance.surface || {};
  const hobby = firstHobby(persona);
  const projectedAppearance = {
    body: text(visual.body), hair: text(visual.hair), eyes: text(visual.eyes), feature: text(visual.feature)
  };
  const projection = {
    mode: selectedMode,
    subject: identity(persona),
    appearance: projectedAppearance,
    wardrobe: selectedMode === "reference" || selectedMode === "portrait" ? text(appearance.signature_outfit || appearance.clothing_style) : text(appearance.clothing_style),
    accessories: appearance.accessories ? text(appearance.accessories) : null,
    makeup: appearance.makeup ? text(appearance.makeup) : null,
    signature_item: ["lifestyle", "environmental", "workplace", "hobby", "narrative_scene"].includes(selectedMode) && persona.narrative?.signature_item ? text(persona.narrative.signature_item) : null,
    activity: selectedMode === "hobby" ? activityVariants(hobby, `${persona.meta?.seed || "persona"}:${selectedMode}`) : selectedMode === "workplace" ? workVariants(persona.life?.job, `${persona.meta?.seed || "persona"}:${selectedMode}`) : null,
    expression: selectedMode === "portrait" || selectedMode === "reference" ? "composed neutral expression" : selectedMode === "hobby" ? "focused, relaxed attention" : selectedMode === "workplace" ? "attentive concentration" : "natural and context-appropriate",
    pose: "natural contextual pose",
    environment: sceneFor(persona, selectedMode, hobby),
    camera: "clear readable framing",
    lighting: "diffused natural light shaped by the surrounding space",
    palette: null,
    context: {},
    sources: [
      source("foundation.life_stage", text(persona.foundation?.life_stage), "required", "stable identity anchor"),
      source("foundation.species", text(persona.foundation?.species), "required", "stable identity anchor"),
      source("appearance.visual", projectedAppearance, "required", "canonical visible appearance")
    ]
  };
  const composition = compositionFor(persona, selectedMode, projection.activity, projection.environment);
  projection.pose = composition.pose;
  projection.camera = composition.camera;
  projection.lighting = composition.lighting;
  projection.priority = composition.priority;
  if (relevance.relevant.includes("occupation") && persona.life?.job) projection.context.occupation = text(persona.life.job);
  if (relevance.relevant.includes("work_environment") && persona.life?.work_environment) projection.context.work_environment = text(persona.life.work_environment);
  if (relevance.relevant.includes("hobby") && hobby) projection.context.hobby = text(hobby);
  if (relevance.relevant.includes("housing") && persona.life?.housing) projection.context.housing = text(persona.life.housing);
  if (relevance.relevant.includes("residence") && persona.origin?.current_location) projection.context.residence = text(persona.origin.current_location);
  if (selectedMode === "narrative_scene" && persona.narrative?.integration?.scene_hooks?.[0]) projection.context.scene_hook = persona.narrative.integration.scene_hooks[0].text;
  if (projection.context.occupation) projection.sources.push(source("life.job", projection.context.occupation, "relevant", relevance.reasons.occupation));
  if (projection.context.hobby) projection.sources.push(source("interests.hobbies.0", projection.context.hobby, "relevant", relevance.reasons.hobby));
  if (projection.context.housing) projection.sources.push(source("life.housing", projection.context.housing, "relevant", relevance.reasons.housing));
  if (projection.context.residence) projection.sources.push(source("origin.current_location", projection.context.residence, "relevant", relevance.reasons.residence));
  if (projection.context.scene_hook) projection.sources.push(source("narrative.integration.scene_hooks.0", projection.context.scene_hook, "relevant", "converted into observable circumstances; source text is not serialized directly"));
  if (selectedMode === "workplace" && persona.life?.work_environment) projection.sources.push(source("life.work_environment", text(persona.life.work_environment), "relevant", "selected workplace environment"));
  if (selectedMode === "hobby" && hobby) projection.sources.push(source("interests.hobbies.0.participation_style", hobby.participation_style || "unspecified", "relevant", "converted hobby metadata into an observable activity"));
  if (["lifestyle", "environmental", "workplace"].includes(selectedMode) && (persona.life?.daily_rhythm || persona.life?.schedule)) projection.sources.push(source("life.daily_rhythm", persona.life.daily_rhythm || persona.life.schedule, "optional", "soft timing cue; does not determine the scene"));
  if (projection.signature_item) projection.sources.push(source("narrative.signature_item", projection.signature_item, "optional", "contextual recognition anchor"));
  projection.relevance = relevance;
  const overrides = persona.state?.visual_overrides?.[selectedMode] || {};
  for (const [field, value] of Object.entries(overrides)) if (Object.prototype.hasOwnProperty.call(projection, field)) projection[field] = structuredClone(value);
  for (const field of Object.keys(overrides)) if (Object.prototype.hasOwnProperty.call(projection, field)) projection.sources.push(source(`visual_override.${selectedMode}.${field}`, projection[field], "selected", "user-targeted projection reroll"));
  projection.negative_prompt = negativePrompt(projection);
  projection.contradictions = checkVisualContradictions(projection);
  projection.prompt = serializeVisualProjection(projection);
  return projection;
}

export function serializeVisualProjection(projection, style = "structured") {
  const p = projection;
  const blocks = [
    `SUBJECT: ${p.subject.life_stage} ${p.subject.species}, apparent age ${p.subject.apparent_age}`,
    `APPEARANCE: ${[p.appearance.body, p.appearance.hair, p.appearance.eyes, p.appearance.feature].filter((value, index, values) => values.indexOf(value) === index).join(", ")}`,
    `WARDROBE: ${p.wardrobe}`,
    p.accessories ? `ACCESSORIES: ${p.accessories}` : null,
    p.makeup ? `MAKEUP: ${p.makeup}` : null,
    p.signature_item ? `SIGNATURE ITEM: ${p.signature_item}` : null,
    p.activity ? `ACTIVITY: ${p.activity}` : null,
    `EXPRESSION: ${p.expression}`,
    `POSE: ${p.pose}`,
    `ENVIRONMENT: ${p.environment}`,
    `CAMERA: ${p.camera}`,
    `LIGHTING: ${p.lighting}`
  ].filter(Boolean);
  const seen = new Set();
  const compact = blocks.filter((block) => {
    const value = block.replace(/^[A-Z ]+:\s*/, "").trim().toLowerCase();
    if (seen.has(value)) return false;
    seen.add(value); return true;
  });
  const output = compact.join("\n");
  return style === "structured" ? output : `Create a polished, internally consistent visual of ${output.replaceAll("\n", "; ").toLowerCase()}. Preserve the same identity anchors and do not add suppressed persona facts.`;
}

export function checkVisualContradictions(projection) {
  const issues = [];
  const textValue = `${projection.pose} ${projection.activity || ""} ${projection.environment || ""}`.toLowerCase();
  if (textValue.includes("seated") && textValue.includes("running")) issues.push({ field: "pose/activity", message: "Seated pose conflicts with running activity." });
  if (textValue.includes("extreme face close-up") && projection.camera?.includes("full body")) issues.push({ field: "camera/subject", message: "Close-up framing conflicts with full-body framing." });
  if (projection.mode === "workplace" && !projection.context.occupation && !projection.activity) issues.push({ field: "context.occupation", message: "Workplace mode has no occupation or learning activity context." });
  return issues;
}

export function negativePrompt(projection) {
  const negatives = ["duplicate person", "inconsistent identity", "extra limbs", "unreadable face", "text, watermark"];
  if (["reference", "portrait", "full_body"].includes(projection.mode)) negatives.push("busy background", "unrelated props");
  if (projection.mode === "workplace") negatives.push("unrelated hobby props", "luxury-status stereotypes");
  if (projection.mode === "hobby") negatives.push("occupation label", "caricatured hobby scene");
  return [...new Set(negatives)].join(", ");
}
