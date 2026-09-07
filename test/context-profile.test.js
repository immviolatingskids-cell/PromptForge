import test from "node:test";
import assert from "node:assert/strict";
import { resolveContextProfile } from "../src/context-profile.js";

test("context profile resolves selected entities and inferred species type", () => {
  const library = { species: [{ id: "species_android", name: "Android" }], speciesTypes: [{ id: "artificial", name: "Artificial" }] };
  const profile = resolveContextProfile(library, { foundation: { species: library.species[0] } });
  assert.equal(profile.entities.species[0].id, "species_android");
  assert.equal(profile.ids.species_types[0], "artificial");
  assert.equal(profile.has("species_types", "artificial"), true);
});

test("country resolves its region and optional locale without changing the country anchor", () => {
  const country = { id: "country_test", metadata: { region: "region_test", locale: "locale_test" } };
  const profile = resolveContextProfile({ countries: [country], regions: [{ id: "region_test" }] }, { foundation: { country } }, { cohort: ["millennial"] });
  assert.deepEqual(profile.ids.countries, ["country_test"]);
  assert.deepEqual(profile.ids.regions, ["region_test"]);
  assert.deepEqual(profile.ids.locales, ["locale_test"]);
  assert.deepEqual(profile.ids.cohort, ["millennial"]);
});
