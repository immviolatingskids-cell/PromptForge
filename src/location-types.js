export const LOCATION_TYPES = Object.freeze([
  ["country", "Country"], ["region", "Region"], ["city", "City"], ["town", "Town"], ["village", "Village"], ["district", "District"], ["neighbourhood", "Neighbourhood"], ["street", "Street"],
  ["house", "House"], ["apartment", "Apartment"], ["estate", "Estate"], ["residence", "Residence"], ["dormitory", "Dormitory"],
  ["office", "Office"], ["workplace", "Workplace"], ["laboratory", "Laboratory"], ["university", "University"], ["school", "School"], ["campus", "Campus"], ["studio", "Studio"], ["workshop", "Workshop"],
  ["cafe", "Café"], ["restaurant", "Restaurant"], ["bar", "Bar"], ["nightclub", "Nightclub"], ["shop", "Shop"], ["market", "Market"], ["park", "Park"], ["plaza", "Plaza"], ["library", "Library"],
  ["hospital", "Hospital"], ["station", "Station"], ["airport", "Airport"], ["government_building", "Government building"],
  ["castle", "Castle"], ["palace", "Palace"], ["fortress", "Fortress"], ["temple", "Temple"], ["settlement", "Settlement"],
  ["spacecraft", "Spacecraft"], ["space_station", "Space station"], ["colony", "Colony"], ["futuristic_facility", "Futuristic facility"],
  ["venue", "Venue"], ["interior", "Interior"], ["exterior", "Exterior"], ["landmark", "Landmark"], ["other", "Other"]
].map(([id, label]) => Object.freeze({ id, label })));
export const LOCATION_TYPE_MAP = Object.freeze(Object.fromEntries(LOCATION_TYPES.map(item => [item.id, item])));
export const getLocationType = value => LOCATION_TYPE_MAP[String(value || "").trim()] || null;
export const locationTypeLabel = value => getLocationType(value)?.label || String(value || "Unknown");
