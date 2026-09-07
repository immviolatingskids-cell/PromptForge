"""Generation-pool coverage, effective depth, diversity, and recommendations."""
from __future__ import annotations
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Any, Iterable
from populator.coverage_priorities import load as load_priorities
from populator.coverage_targets import CoverageThresholds, legacy_thresholds
from populator.storage import all_entries, category_path, list_categories, load_entries

LEVELS=((0,"Missing"),(1,"Critical"),(5,"Weak"),(10,"Usable"),(20,"Healthy"),(40,"Strong"))
DEFAULT_TARGETS={"minimum":10,"healthy":20,"target":40}
TARGET_OVERRIDES={"core/settings":{"minimum":3,"healthy":6,"target":12},"core/eras":{"minimum":3,"healthy":6,"target":12},"core/species":{"minimum":2,"healthy":5,"target":10},"core/life_stages":{"minimum":6,"healthy":6,"target":12},"core/countries":{"minimum":195,"healthy":195,"target":195},"identity/names/given_names":{"minimum":20,"healthy":40,"target":80},"identity/names/family_names":{"minimum":15,"healthy":30,"target":60},"clothing/signature_outfits":{"minimum":15,"healthy":30,"target":60}}
PRIORITY_WEIGHT={"high":3,"normal":2,"low":1,"ignored":0}
CONTEXT_FIELDS=("settings","eras","life_stages","species","countries","gender_relevance")
CREATIVE_DIMENSION_FIELDS=tuple(field for field in CONTEXT_FIELDS if field!="countries")

@dataclass(frozen=True)
class PoolCoverage:
    branch:str; category:str; subcategory:str|None; count:int; current:int; status:str; minimum:int; healthy:int; target:int; priority:str; needed_to_minimum:int; needed_to_healthy:int; needed_to_target:int

    @property
    def needed(self)->int:
        """v0.2.5 compatibility alias for minimum-first callers."""
        return self.needed_to_minimum

def config_path(data_root:Path)->Path:return data_root.parent/".personaforge"/"coverage_config.json"
def load_config(data_root:Path)->dict[str,Any]:
    config={"thresholds":{str(start):label for start,label in LEVELS},"defaults":dict(DEFAULT_TARGETS),"targets":dict(TARGET_OVERRIDES)}
    path=config_path(data_root)
    if path.exists():
        custom=json.loads(path.read_text(encoding="utf-8")); custom_defaults=dict(custom.get("defaults",{}))
        if custom_defaults and "target" not in custom_defaults:
            custom_defaults["target"]=max(custom_defaults.get("healthy",config["defaults"]["healthy"])*2,custom_defaults.get("healthy",config["defaults"]["healthy"]))
        config["defaults"].update(custom_defaults)
        for branch,definition in custom.get("targets",{}).items():
            normalized=dict(definition) if isinstance(definition,dict) else definition
            if isinstance(normalized,dict) and "target" not in normalized:
                healthy=normalized.get("healthy",normalized.get("minimum",config["defaults"]["healthy"]));normalized["target"]=max(healthy,healthy*2)
            config["targets"][branch]=normalized
    return config
def set_target(data_root:Path,branch:str,minimum:int,healthy:int|None=None,target:int|None=None)->None:
    thresholds=CoverageThresholds(minimum,healthy or max(minimum,minimum*2),target or max(healthy or max(minimum,minimum*2),(healthy or max(minimum,minimum*2))*2))
    path=config_path(data_root);custom=json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    custom.setdefault("targets",{})[branch]={"minimum":thresholds.minimum,"healthy":thresholds.healthy,"target":thresholds.target}
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(custom,indent=2)+"\n",encoding="utf-8")
def strength(count:int)->str:
    result="Missing"
    for start,label in LEVELS:
        if count>=start:result=label
    return result
def target_strength(count:int,minimum:int,healthy:int)->str:
    if count==0:return "Missing"
    if count<max(1,minimum//2):return "Critical"
    if count<minimum:return "Weak"
    if count<healthy:return "Usable"
    if count<healthy*2:return "Healthy"
    return "Strong"
def _subcategory(entry:dict[str,Any])->str|None:
    value=entry.get("metadata",{}).get("subcategory")
    return str(value).strip().casefold().replace("-","_").replace(" ","_") if value else None
def pool_coverage(data_root:Path)->list[PoolCoverage]:
    config,priorities=load_config(data_root),load_priorities(data_root);result=[]
    for category in list_categories(data_root):
        entries=load_entries(category_path(data_root,category));groups:dict[str|None,list[dict[str,Any]]]=defaultdict(list);groups[None]=entries
        for entry in entries:
            subcategory=_subcategory(entry)
            if subcategory:groups[subcategory].append(entry)
        for subcategory,values in groups.items():
            branch=category if subcategory is None else f"{category}/{subcategory}";thresholds=legacy_thresholds(config,branch,category);priority=priorities.get(branch,priorities.get(category,"normal")); details=thresholds.describe(len(values))
            if branch=="core/countries" and len(values)==195:details["status"]="Complete"
            result.append(PoolCoverage(branch,category,subcategory,len(values),len(values),details["status"],thresholds.minimum,thresholds.healthy,thresholds.target,priority,details["needed_to_minimum"],details["needed_to_healthy"],details["needed_to_target"]))
    return result
def effective_pool(entries:Iterable[dict[str,Any]],context:dict[str,str|list[str]|None])->list[dict[str,Any]]:
    active={field:({value} if isinstance(value,str) else set(value or [])) for field,value in context.items() if field in CONTEXT_FIELDS}
    def compatible(entry:dict[str,Any],field:str,values:set[str])->bool:
        allowed=entry.get("metadata",{}).get("gender_relevance",[]) if field=="gender_relevance" else entry.get("compatibility",{}).get(field,[])
        allowed=[allowed] if isinstance(allowed,str) else allowed
        return not allowed or not values or bool(values.intersection(allowed))
    return [entry for entry in entries if all(compatible(entry,field,values) for field,values in active.items())]
def effective_pool_depth(data_root:Path,category:str,context:dict[str,str|list[str]|None])->dict[str,Any]:
    entries=load_entries(category_path(data_root,category));matches=effective_pool(entries,context)
    return {"category":category,"raw":len(entries),"effective":len(matches),"status":strength(len(matches)),"context":{key:value for key,value in context.items() if value},"ids":[entry["id"] for entry in matches]}
def context_pool_analysis(data_root:Path,contexts:Iterable[dict[str,str]])->list[dict[str,Any]]:
    categories=[category for category in list_categories(data_root) if category.split("/")[0]!="core"]
    return [effective_pool_depth(data_root,category,context) for context in contexts for category in categories]
def diversity_analysis(data_root:Path,category:str)->dict[str,Any]:
    entries=load_entries(category_path(data_root,category));counts=Counter(_subcategory(entry) or "uncategorized" for entry in entries);named={key:value for key,value in counts.items() if key!="uncategorized"};largest_name,largest_count=Counter(named).most_common(1)[0] if named else ("uncategorized",0);classified=sum(named.values());share=largest_count/classified if classified else 0
    return {"category":category,"total":len(entries),"classified":classified,"subcategories":dict(sorted(counts.items())),"largest":largest_name,"largest_share":round(share,3),"concentrated":classified>=10 and len(named)>=2 and share>.5}
def recommendations(data_root:Path,limit:int|None=None,goal:str="minimum")->list[dict[str,Any]]:
    field={"minimum":"needed_to_minimum","healthy":"needed_to_healthy","target":"needed_to_target"}.get(goal)
    if field is None:raise ValueError("recommendation goal must be minimum, healthy, or target")
    candidates=[pool for pool in pool_coverage(data_root) if pool.priority!="ignored" and getattr(pool,field)];candidates.sort(key=lambda pool:(-PRIORITY_WEIGHT[pool.priority],pool.count/getattr(pool,goal),-getattr(pool,field),pool.branch));values=[]
    for pool in candidates:
        value=asdict(pool);value["needed"]=getattr(pool,field);value["goal"]=goal;values.append(value)
    return values[:limit] if limit is not None else values
def library_health_score(data_root:Path)->int:
    pools=[pool for pool in pool_coverage(data_root) if pool.priority!="ignored" and pool.subcategory is None]
    if not pools:return 100
    weighted=[((.6*min(1.0,pool.count/pool.minimum)+.4*min(1.0,pool.count/pool.healthy)),PRIORITY_WEIGHT[pool.priority]) for pool in pools];return round(100*sum(score*weight for score,weight in weighted)/sum(weight for _,weight in weighted))
def library_statistics(data_root:Path)->dict[str,Any]:
    rows=all_entries(data_root);sections=Counter(category.split("/")[0] for category,_ in rows);categories=Counter(category for category,_ in rows);subcategories=Counter(f"{category}/{_subcategory(entry)}" for category,entry in rows if _subcategory(entry))
    country_count=categories.get("core/countries",0)
    return {"total_entries":len(rows),"health":library_health_score(data_root),"weak_pools":len(recommendations(data_root)),"reference_coverage":{"core/countries":{"count":country_count,"expected":195,"status":"Complete" if country_count==195 else "Incomplete"}},"by_section":dict(sorted(sections.items())),"by_category":dict(sorted(categories.items())),"by_subcategory":dict(sorted(subcategories.items()))}
def coverage_report(data_root:Path)->dict[str,Any]:
    # Countries are a finite reference catalogue, not creative dimensions that
    # should each accumulate a minimum number of authored variants.
    rows=all_entries(data_root);dimensions={field:Counter() for field in CREATIVE_DIMENSION_FIELDS}
    for _,entry in rows:
        for field in dimensions:
            value=entry.get("metadata",{}).get("gender_relevance",[]) if field=="gender_relevance" else entry.get("compatibility",{}).get(field,[]);dimensions[field].update([value] if isinstance(value,str) else value)
    dimension_report={field:{value:{"count":count,"status":strength(count),"strength":strength(count)} for value,count in sorted(values.items())} for field,values in dimensions.items()}
    report={"health":library_health_score(data_root),"pools":[asdict(pool) for pool in pool_coverage(data_root)],"dimensions":dimension_report,"recommendations":recommendations(data_root,10),"priorities":load_priorities(data_root),**dimension_report}
    # Deep pools are additive: old flat categories remain valid, while new
    # registry-aware callers receive leaf and derived branch coverage.
    try:
        from populator.deep_coverage import leaf_coverage,branch_coverage
        from populator.deep_coverage import category_coverage
        report["deep_pools"]={category:{"summary":category_coverage(data_root,category),"leaves":leaf_coverage(data_root,category),"branches":branch_coverage(data_root,category)} for category in ("appearance","clothing")}
    except (ImportError, OSError, ValueError):
        report["deep_pools"]={}
    return report
