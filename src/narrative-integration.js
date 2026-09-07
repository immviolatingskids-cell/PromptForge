const id = (value) => value?.id ?? value ?? null;
const label = (value) => value?.name ?? value ?? "their current priorities";

const SHORT_GOALS = [
  { id: "complete_next_step", domain: "personal", text: "complete the next practical step they have been postponing" },
  { id: "protect_personal_time", domain: "lifestyle", text: "protect enough personal time for a meaningful commitment" },
  { id: "share_personal_work", domain: "creative", text: "share a piece of personal work with someone whose judgement they trust" },
  { id: "strengthen_connection", domain: "relationship", text: "strengthen an important everyday connection" },
  { id: "build_capability", domain: "mastery", text: "become more capable in an area that currently challenges them" },
  { id: "explore_opportunity", domain: "exploration", text: "investigate an opportunity outside their usual routine" }
];
const MOTIVATIONS = [
  { id: "create_room_to_choose", domain: "lifestyle", text: "They want enough room in their life to make deliberate choices rather than simply react." },
  { id: "make_effort_matter", domain: "mastery", text: "They want their sustained effort to lead to something tangible and personally meaningful." },
  { id: "balance_self_and_others", domain: "relationship", text: "They want to honour their own priorities without neglecting people and commitments that matter." },
  { id: "turn_interest_into_progress", domain: "creative", text: "They want curiosity and practice to produce visible progress in ordinary life." }
];
const PRESSURES = [
  { id: "limited_time", domain: "lifestyle", text: "Their current rhythm leaves limited uninterrupted time." },
  { id: "competing_commitments", domain: "personal", text: "Several worthwhile commitments are competing for attention." },
  { id: "work_expectations", domain: "career", text: "Their present role carries expectations that are difficult to ignore." },
  { id: "living_constraints", domain: "domestic", text: "Their living situation makes some choices less straightforward." }
];

function element(template, type, sources, extra = {}) { return { ...template, type, sources: [...new Set(sources.filter(Boolean))], ...extra }; }

export function buildNarrativeState(persona, rng, mode = "varied") {
  const value = persona.personality.values?.primary;
  const tensionValue = persona.personality.values?.tension;
  const flaw = persona.personality.flaw;
  const hobby = persona.interests.hobbies?.[0];
  const job = persona.life.job;
  const legacyGoal = persona.narrative.goal;
  const short = rng.choice(SHORT_GOALS);
  const motivation = rng.choice(MOTIVATIONS);
  const pressure = rng.choice(PRESSURES);
  const longDomains={master_a_craft:"mastery",build_stable_home:"lifestyle",reconnect_family:"relationship",document_hidden_places:"exploration",discover_wider_world:"exploration",earn_community_trust:"community",finish_life_work:"creative",mentor_successor:"relationship",repair_reputation:"personal",protect_local_place:"community",solve_old_mystery:"exploration",start_small_business:"career",chart_uncharted_route:"exploration"};
  const common = [`value:${id(value)}`];
  const internal = tensionValue && rng.next() < ({ grounded: 0.3, varied: 0.55, chaotic: 0.7 }[mode] || 0.55)
    ? element({ id: "competing_priorities", domain: short.domain, text: `What matters most to them can pull against ${label(tensionValue).toLowerCase()} when a decision cannot satisfy both.` }, "internal_conflict", [...common, `value:${id(tensionValue)}`])
    : element({ id: "friction_under_pressure", domain: pressure.domain, text: `Their tendency toward ${label(flaw).toLowerCase()} can complicate progress when pressure rises.` }, "internal_conflict", [`flaw:${id(flaw)}`, `goal:${short.id}`]);
  return {
    motivations: [element(motivation, "motivation", [...common, `life:${persona.life.daily_rhythm}`])],
    goals: {
      short_term: element(short, "goal", [`hobby:${id(hobby)}`, `life:${persona.life.daily_rhythm}`]),
      long_term: element({ id: id(legacyGoal), domain: legacyGoal?.metadata?.domain || longDomains[id(legacyGoal)] || "personal", text: label(legacyGoal) }, "goal", [...common, `occupation:${id(job)}`])
    },
    tensions: [internal],
    pressures: [element(pressure, "external_pressure", [`life:${persona.life.daily_rhythm}`, `housing:${persona.life.housing?.id}`])],
    relationship_hooks: [element({ id: "trusted_contact", domain: "relationship", text: "A trusted contact offers perspective but expects them to decide for themselves." }, "relationship_hook", [`trait:${id(persona.personality.core)}`, `goal:${short.id}`])],
    arc_seeds: [element({ id: "adapt_without_losing_priority", domain: short.domain, text: "They may discover a way to adapt without abandoning the priority that started the pursuit." }, "arc_seed", [`tension:${internal.id}`, `goal:${short.id}`])],
    scene_hooks: [element({ id: "choice_interrupts_routine", domain: short.domain, text: `An unexpected opportunity forces a choice between ${short.text} and an existing commitment.` }, "scene_hook", [`goal:${short.id}`, `pressure:${pressure.id}`])],
    intensity: mode === "grounded" ? "low" : mode === "chaotic" ? "high" : "moderate"
  };
}

export function narrativeProse(state) {
  if (!state) return "";
  const goal = state.goals?.short_term?.text, motivation = state.motivations?.[0]?.text, tension = state.tensions?.[0]?.text;
  return [goal ? `For now, they want to ${goal}.` : "", motivation || "", tension || ""].filter(Boolean).join(" ");
}
