"""Build PersonaForge's deterministic 195-country reference set from UN HTML exports.

The builder is intentionally offline: download the two authoritative pages once,
then pass their local paths. No network service is used by PersonaForge itself.
"""
from __future__ import annotations
import argparse
import html
import json
import re
from pathlib import Path
from typing import Any

M49_SOURCE="https://unstats.un.org/unsd/methodology/m49/overview"
MEMBERS_SOURCE="https://www.un.org/en/about-us/member-states"
OBSERVER_NAMES=("Holy See","State of Palestine")
REGION_IDS={
    "Northern Africa":"region_north_africa","Eastern Africa":"region_east_africa","Middle Africa":"region_middle_africa","Southern Africa":"region_southern_africa","Western Africa":"region_west_africa",
    "Caribbean":"region_caribbean","Central America":"region_central_america","Northern America":"region_north_america","South America":"south_america",
    "Central Asia":"region_central_asia","Eastern Asia":"east_asia","South-eastern Asia":"region_southeast_asia","Southern Asia":"region_south_asia","Western Asia":"region_west_asia",
    "Eastern Europe":"region_eastern_europe","Northern Europe":"region_northern_europe","Southern Europe":"region_southern_europe","Western Europe":"region_western_europe",
    "Australia and New Zealand":"region_australia_new_zealand","Melanesia":"region_melanesia","Micronesia":"region_micronesia","Polynesia":"region_polynesia",
}
CONTINENT_IDS={"Africa":"africa","Asia":"asia","Europe":"europe","Oceania":"region_oceania"}
DISPLAY_BY_ISO3={"CIV":"Côte d’Ivoire","GBR":"United Kingdom"}

def plain(value:str)->str:return " ".join(html.unescape(re.sub(r"<[^>]+>","",value)).split())
def readable_country_id(name:str)->str:
    import unicodedata
    normalized=unicodedata.normalize("NFKD",name).encode("ascii","ignore").decode().lower()
    return "country_"+re.sub(r"_+","_",re.sub(r"[^a-z0-9]+","_",normalized)).strip("_")
def parse_members(path:Path)->set[str]:
    source=path.read_text(encoding="utf-8");parsed=[plain(value) for value in re.findall(r'<h2(?![^>]*element-invisible)[^>]*>(.*?)</h2>',source,re.S)];names=set(parsed)
    if len(names)!=193:
        duplicates=sorted({name for name in parsed if parsed.count(name)>1});raise ValueError(f"expected 193 UN members, found {len(names)}; duplicates={duplicates}")
    return names|set(OBSERVER_NAMES)
def parse_m49(path:Path)->list[dict[str,str]]:
    source=path.read_text(encoding="utf-8");match=re.search(r'<table\s+id\s*=\s*"downloadTableEN".*?</table>',source,re.S)
    if not match:raise ValueError("English M49 download table not found")
    rows=[]
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>",match.group(),re.S):
        cells=[plain(value) for value in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>",row,re.S)]
        if len(cells)>=15 and cells[8]!="Country or Area":
            rows.append({"continent":cells[3],"subregion":cells[7] or cells[5],"name":cells[8],"iso2":cells[10],"iso3":cells[11]})
    if len(rows)<240:raise ValueError(f"M49 table unexpectedly contains only {len(rows)} rows")
    return rows
def continent_id(row:dict[str,str])->str:
    if row["continent"]=="Americas":return "south_america" if row["subregion"]=="South America" else "north_america"
    return CONTINENT_IDS[row["continent"]]
def build(m49_rows:list[dict[str,str]],members:set[str])->list[dict[str,Any]]:
    by_name={row["name"]:row for row in m49_rows};aliases={"Bahamas (The)":"Bahamas","China (the People's Republic of)":"China","C�te D'Ivoire":"Côte d’Ivoire","Czech Republic (Czechia)":"Czechia","Gambia (Republic of The)":"Gambia","Guinea Bissau":"Guinea-Bissau","Lao People�s Democratic Republic":"Lao People's Democratic Republic","Venezuela, Bolivarian Republic of":"Venezuela (Bolivarian Republic of)"}
    def source_name(name:str)->str:
        if "Ivoire" in name:return next(key for key in by_name if "Ivoire" in key)
        if name.startswith("Lao People"):return next(key for key in by_name if key.startswith("Lao People"))
        return aliases.get(name,name)
    missing=sorted(name for name in members if source_name(name) not in by_name)
    if missing:raise ValueError(f"UN member names missing from M49: {missing}")
    countries=[]
    for member_name in members:
        row=by_name[source_name(member_name)];display=DISPLAY_BY_ISO3.get(row["iso3"],row["name"])
        countries.append({"id":readable_country_id(display),"name":display,"compatibility":{"settings":[],"eras":[],"species":[],"life_stages":[],"countries":[]},"metadata":{"iso2":row["iso2"],"iso3":row["iso3"],"continent":continent_id(row),"region":REGION_IDS[row["subregion"]],"enabled":True}})
    return sorted(countries,key=lambda entry:(entry["name"].casefold(),entry["id"]))
def validate(countries:list[dict[str,Any]],regions:list[dict[str,Any]])->None:
    if len(countries)!=195:raise ValueError(f"expected 195 countries, found {len(countries)}")
    for field in ("id","name"):
        values=[entry[field].casefold() for entry in countries]
        if len(values)!=len(set(values)):raise ValueError(f"duplicate country {field}")
    for field in ("iso2","iso3"):
        values=[entry["metadata"][field] for entry in countries]
        if len(values)!=len(set(values)):raise ValueError(f"duplicate {field} code")
    region_ids={entry["id"] for entry in regions}
    for country in countries:
        for field in ("continent","region"):
            if country["metadata"][field] not in region_ids:raise ValueError(f"{country['id']} references missing {field} {country['metadata'][field]}")
def main()->int:
    parser=argparse.ArgumentParser();parser.add_argument("--m49",type=Path,required=True);parser.add_argument("--members",type=Path,required=True);parser.add_argument("--data",type=Path,default=Path(__file__).resolve().parent.parent/"data");args=parser.parse_args()
    countries=build(parse_m49(args.m49),parse_members(args.members));regions_path=args.data/"core"/"regions.json";regions=json.loads(regions_path.read_text(encoding="utf-8"));validate(countries,regions)
    for region in regions:region["compatibility"]["countries"]=[country["id"] for country in countries if region["id"] in {country["metadata"]["continent"],country["metadata"]["region"]}]
    (args.data/"core"/"countries.json").write_text(json.dumps(countries,indent=2,ensure_ascii=False)+"\n",encoding="utf-8");regions_path.write_text(json.dumps(regions,indent=2,ensure_ascii=False)+"\n",encoding="utf-8");print(f"Wrote {len(countries)} validated countries from UN reference data.");return 0
if __name__=="__main__":raise SystemExit(main())
