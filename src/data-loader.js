const CATEGORY_FILES = {
  settings: "core/settings", eras: "core/eras", lifeStages: "core/life_stages", countries: "core/countries", regions: "core/regions", locales: "core/locales",
  species: "identity/species", speciesTypes: "identity/species_types", heritage: "identity/heritage", givenNames: "identity/names/given_names", familyNames: "identity/names/family_names",
  traits: "personality/traits", flaws: "personality/flaws", values: "personality/values", habits: "personality/habits", quirks: "personality/quirks",
  hobbies: "lifestyle/hobbies", interests: "lifestyle/interests", occupations: "lifestyle/occupations", education: "lifestyle/education", housing: "lifestyle/housing", transport: "lifestyle/transport",
  hair: "appearance/hair", eyes: "appearance/eyes", body: "appearance/body", features: "appearance/features",
  clothingStyles: "clothing/styles", outfits: "clothing/signature_outfits", goals: "narrative/goals", secrets: "narrative/secrets", signatureItems: "narrative/signature_items", expressions: "narrative/expressions"
};

export async function loadLibrary(baseUrl = "./data") {
  const pairs = await Promise.all(Object.entries(CATEGORY_FILES).map(async ([key, path]) => {
    const response = await fetch(`${baseUrl}/${path}.json`);
    if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
    return [key, await response.json()];
  }));
  const [schema, data] = await Promise.all(["schema_version", "data_version"].map(async (name) => (await fetch(`${baseUrl}/${name}.json`)).json()));
  return { ...Object.fromEntries(pairs), versions: { schema: schema.schema_version, data: data.data_version } };
}
