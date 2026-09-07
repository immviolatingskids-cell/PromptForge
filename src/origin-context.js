export function originProfile(persona, given, family) {
  const firstOrigin=given?.metadata?.origin_family||given?.metadata?.name_origin||null;
  const surnameOrigin=family?.metadata?.origin_family||family?.metadata?.name_origin||null;
  return { residence:persona.foundation.country?.id||null, birthplace:persona.origin.birthplace?.id||persona.origin.birthplace||null, upbringing:persona.origin.upbringing||null, name_origin:{given:firstOrigin,surname:surnameOrigin}, languages:persona.origin.languages||[] };
}
