"""Population workflows: paste parsing, batch metadata, queues, and sessions."""
from __future__ import annotations
from dataclasses import asdict,dataclass,field
import json
from pathlib import Path
from typing import Any
from populator.backup import create_backup,record_undo
from populator.coverage import PRIORITY_WEIGHT,library_health_score,pool_coverage,recommendations
from populator.coverage_targets import QUEUE_GOALS, CoverageThresholds, normalize_goal
from populator.importer import ImportReview,import_valid,review_import
from populator.schemas import COMPATIBILITY_FIELDS,make_entry
from populator.storage import all_entries,category_path,load_entries,save_entries

def parse_pasted(text:str,defaults:dict[str,Any]|None=None,subcategory:str|None=None)->list[dict[str,Any]]:
    defaults=defaults or {};compatibility=defaults.get("compatibility",{});metadata=dict(defaults.get("metadata",{}))
    if defaults.get("pool_id"):
        metadata.update({"pool_id": defaults["pool_id"], "pool_path": defaults.get("pool_path", defaults["pool_id"])})
    if subcategory:metadata["subcategory"]=subcategory.strip().casefold().replace("-","_").replace(" ","_")
    table_entries=[];lines=[]
    for raw in text.replace("\r","").split("\n"):
        if raw.strip().startswith("|"):
            cells=[cell.strip().strip("`") for cell in raw.strip().strip("|").split("|")]
            if len(cells)>=2 and not all(set(cell)<={"-",":"," "} for cell in cells) and cells[0].casefold() not in {"id","idcohortrough birth rangepurpose"}:
                entry_metadata=dict(metadata)
                if len(cells)>2 and cells[2]:entry_metadata["rough_range"]=cells[2]
                table_entries.append(make_entry(cells[1],cells[0] or None,cells[3] if len(cells)>3 else "",tags=defaults.get("tags"),compatibility={field:list(compatibility.get(field,[])) for field in COMPATIBILITY_FIELDS},metadata=entry_metadata))
            continue
        lines.extend(raw.split(",") if "," in raw and not raw.lstrip().startswith(("{","[")) else [raw])
    return [*table_entries,*[make_entry(name.strip(),description=defaults.get("description",""),tags=defaults.get("tags"),compatibility={field:list(compatibility.get(field,[])) for field in COMPATIBILITY_FIELDS},metadata=metadata) for name in lines if name.strip()]]

def review_pasted(data_root:Path,category:str,text:str,defaults:dict[str,Any]|None=None,subcategory:str|None=None)->ImportReview:
    return review_import(parse_pasted(text,defaults,subcategory),load_entries(category_path(data_root,category)))

def batch_metadata(data_root:Path,category:str,entry_ids:list[str],compatibility:dict[str,list[str]]|None=None,metadata:dict[str,Any]|None=None,replace:bool=False,backup_root:Path|None=None)->dict[str,Any]:
    target=category_path(data_root,category);entries=load_entries(target);selected=set(entry_ids);changed=[]
    if not selected:raise ValueError("batch metadata requires at least one entry id")
    for entry in entries:
        if entry.get("id") not in selected:continue
        for field,values in (compatibility or {}).items():
            if field not in COMPATIBILITY_FIELDS:raise ValueError(f"unknown compatibility field: {field}")
            entry["compatibility"][field]=list(dict.fromkeys(values if replace else [*entry["compatibility"].get(field,[]),*values]))
        if metadata:
            entry.setdefault("metadata",{}).update(metadata)
        changed.append(entry["id"])
    missing=sorted(selected-set(changed))
    if missing:raise KeyError(f"entry ids not found: {', '.join(missing)}")
    backup=create_backup(data_root,backup_root);record_undo(data_root,[target],f"batch metadata in {category}");save_entries(target,entries)
    return {"modified":len(changed),"entry_ids":changed,"backup":str(backup)}

def resolve_existing(data_root:Path,category:str,source_id:str,target_id:str,action:str,backup_root:Path|None=None)->dict[str,Any]:
    """Resolve reviewed similarity without making semantic assumptions."""
    if action not in {"merge","variant","keep","skip"}:raise ValueError("action must be merge, variant, keep, or skip")
    target=category_path(data_root,category);entries=load_entries(target);by_id={entry["id"]:entry for entry in entries}
    if source_id not in by_id or target_id not in by_id:raise KeyError("source or target entry not found")
    if action in {"keep","skip"}:return {"action":action,"changed":False}
    backup=create_backup(data_root,backup_root);record_undo(data_root,[target],f"{action} duplicate in {category}");source,target_entry=by_id[source_id],by_id[target_id]
    if action=="variant":source.setdefault("metadata",{})["variant_of"]=target_id
    else:
        for field in ("aliases","tags"):
            combined=[*target_entry.get(field,[]),*source.get(field,[])]
            if field=="aliases":combined.append(source["name"])
            if combined:target_entry[field]=list(dict.fromkeys(combined))
        for field in COMPATIBILITY_FIELDS:target_entry["compatibility"][field]=list(dict.fromkeys([*target_entry["compatibility"].get(field,[]),*source["compatibility"].get(field,[])]))
        target_entry.setdefault("metadata",{}).update({key:value for key,value in source.get("metadata",{}).items() if key not in target_entry.get("metadata",{})});entries.remove(source)
    save_entries(target,entries);return {"action":action,"changed":True,"source":source_id,"target":target_id,"backup":str(backup)}

def queue_path(data_root:Path)->Path:return data_root.parent/".personaforge"/"population_queue.json"
def load_queue(data_root:Path)->list[dict[str,Any]]:
    path=queue_path(data_root);return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
def save_queue(data_root:Path,queue:list[dict[str,Any]])->None:
    path=queue_path(data_root);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(queue,indent=2)+"\n",encoding="utf-8")
def add_to_queue(data_root:Path,branch:str,target:int|None=None,goal:str="minimum")->list[dict[str,Any]]:
    pools={pool.branch:pool for pool in pool_coverage(data_root)}
    if branch not in pools:raise KeyError(f"coverage branch not found: {branch}")
    pool=pools[branch]; policy=normalize_goal(goal); goal_threshold=target or int(getattr(pool,policy));queue=[item for item in load_queue(data_root) if item["branch"]!=branch];queue.append({"kind":"legacy","branch":branch,"category":pool.category,"subcategory":pool.subcategory,"current":pool.count,"minimum":pool.minimum,"healthy":pool.healthy,"target":pool.target,"goal":QUEUE_GOALS[policy],"goal_threshold":goal_threshold});save_queue(data_root,queue);return queue
def reorder_queue(data_root:Path,branch:str,direction:int)->list[dict[str,Any]]:
    queue=load_queue(data_root);index=next((i for i,item in enumerate(queue) if item["branch"]==branch),None)
    if index is None:raise KeyError(f"queue branch not found: {branch}")
    new=max(0,min(len(queue)-1,index+direction));queue.insert(new,queue.pop(index));save_queue(data_root,queue);return queue
def remove_from_queue(data_root:Path,branch:str)->list[dict[str,Any]]:
    queue=[item for item in load_queue(data_root) if item["branch"]!=branch];save_queue(data_root,queue);return queue

@dataclass
class PopulationSession:
    data_root:Path
    started_entries:int=0
    started_health:int=0
    duplicates_avoided:int=0
    imports:list[dict[str,Any]]=field(default_factory=list)
    def __post_init__(self)->None:
        stats=len(all_entries(self.data_root));self.started_entries=self.started_entries or stats;self.started_health=self.started_health or library_health_score(self.data_root)
    def record_import(self,category:str,before:int,review:ImportReview)->None:self.duplicates_avoided+=len(review.duplicates);self.imports.append({"category":category,"before":before,"added":len(review.valid)})
    def summary(self)->dict[str,Any]:
        current=len(all_entries(self.data_root));health=library_health_score(self.data_root)
        return {"started_with":self.started_entries,"current":current,"added":current-self.started_entries,"pools_improved":len({item["category"] for item in self.imports}),"duplicates_avoided":self.duplicates_avoided,"health_before":self.started_health,"health_now":health}

def populate_target(data_root:Path,category:str,text:str,defaults:dict[str,Any]|None=None,subcategory:str|None=None,backup_root:Path|None=None)->tuple[ImportReview,Path|None]:
    review=review_pasted(data_root,category,text,defaults,subcategory);return review,import_valid(data_root,category,review,backup_root)

def populate_deep_pool(data_root:Path, category:str, pool_id:str, text:str, defaults:dict[str,Any]|None=None, backup_root:Path|None=None)->tuple[ImportReview,Path|None]:
    """Populate a registry leaf while retaining the caller's canonical JSON file."""
    from populator.deep_pools import inherited_defaults
    inherited=inherited_defaults(data_root,pool_id)
    merged={**(defaults or {}),"pool_id":pool_id,"pool_path":inherited.get("metadata",{}).get("pool_path",pool_id)}
    if inherited.get("metadata"):
        merged["metadata"]={**inherited["metadata"],**(defaults or {}).get("metadata",{})}
    return populate_target(data_root,category,text,merged,backup_root=backup_root)

def deep_workshop_preview(data_root:Path, pool_id:str, text:str)->dict[str,Any]:
    """Prepare a leaf import preview with coverage before/after, without writing."""
    from populator.deep_coverage import leaf_coverage
    from populator.deep_pools import canonical_category
    category=canonical_category(data_root,pool_id); review=review_pasted(data_root,category,text,{"pool_id":pool_id})
    current=next(row for row in leaf_coverage(data_root) if row["id"]==pool_id)
    after_count=current["count"]+len(review.valid)
    return {"pool_id":pool_id,"category":category,**{key:current[key] for key in ("current","minimum","healthy","target","status","needed_to_minimum","needed_to_healthy","needed_to_target")},"after":after_count,"coverage_before":current["coverage"],"coverage_after":min(100,round(after_count/max(1,current["target"])*100)),"review":review}

def enqueue_preset(data_root:Path,preset:str,goal_policy:str="minimum-first")->list[dict[str,Any]]:
    from populator.deep_coverage import leaf_coverage, preset_pools
    policy=normalize_goal(goal_policy.replace("-first","")); coverage={row["id"]:row for row in leaf_coverage(data_root)}
    queue=load_queue(data_root); existing={item["branch"] for item in queue}
    for pool in preset_pools(data_root,preset):
        row=coverage[pool["id"]]; goal_threshold=row[policy]
        if pool["branch"] not in existing and row["count"]<goal_threshold: queue.append({"kind":"deep","branch":pool["branch"],"category":pool["path"][0],"pool_id":pool["id"],"current":row["count"],"minimum":row["minimum"],"healthy":row["healthy"],"target":row["target"],"goal":QUEUE_GOALS[policy],"goal_threshold":goal_threshold})
    save_queue(data_root,queue); return queue

def resolve_queue_target(data_root:Path, queued_target:dict[str,Any])->dict[str,Any]|None:
    """Resolve both legacy and registry-driven queue records for the workshop."""
    if queued_target.get("kind")=="deep" or queued_target.get("pool_id"):
        from populator.deep_coverage import leaf_coverage
        from populator.deep_pools import canonical_category
        pool_id=queued_target.get("pool_id")
        row=next((item for item in leaf_coverage(data_root) if item["id"]==pool_id and item["branch"]==queued_target.get("branch")),None)
        if row is None: return None
        stored_goal=queued_target.get("goal"); policy=normalize_goal(stored_goal,"target")
        goal_threshold=queued_target.get("goal_threshold",queued_target.get("target",row[policy]))
        return {"branch":row["branch"],"category":canonical_category(data_root,pool_id),"subcategory":None,"pool_id":pool_id,**{key:row[key] for key in ("count","current","minimum","healthy","target","status","needed_to_minimum","needed_to_healthy","needed_to_target")},"goal":QUEUE_GOALS[policy],"goal_policy":policy,"goal_threshold":goal_threshold,"needed":max(0,goal_threshold-row["count"])}
    pools={pool.branch:pool for pool in pool_coverage(data_root)}
    pool=pools.get(queued_target.get("branch"))
    if pool is None: return None
    stored_goal=queued_target.get("goal"); policy=normalize_goal(stored_goal,"minimum")
    goal_threshold=queued_target.get("goal_threshold",queued_target.get("target",getattr(pool,policy)))
    return {"branch":pool.branch,"category":pool.category,"subcategory":pool.subcategory,"count":pool.count,"current":pool.current,"minimum":pool.minimum,"healthy":pool.healthy,"target":pool.target,"status":pool.status,"needed_to_minimum":pool.needed_to_minimum,"needed_to_healthy":pool.needed_to_healthy,"needed_to_target":pool.needed_to_target,"goal":QUEUE_GOALS[policy],"goal_policy":policy,"goal_threshold":goal_threshold,"needed":max(0,goal_threshold-pool.count)}

def population_plan(data_root:Path,limit:int|None=None)->list[dict[str,Any]]:
    """Rank actionable creative pools: minimum, healthy, context, then target."""
    rows=[]
    for pool in pool_coverage(data_root):
        if pool.priority=="ignored" or pool.category=="core/countries" or pool.subcategory is not None: continue
        goal="minimum" if pool.needed_to_minimum else "healthy" if pool.needed_to_healthy else "target" if pool.needed_to_target else None
        if goal: rows.append({"kind":"legacy","branch":pool.branch,"category":pool.category,"current":pool.current,"minimum":pool.minimum,"healthy":pool.healthy,"target":pool.target,"status":pool.status,"goal":f"bring-to-{goal}","needed":getattr(pool,f"needed_to_{goal}"),"priority":pool.priority,"context_issue":False})
    try:
        from populator.deep_coverage import leaf_coverage
        for pool in leaf_coverage(data_root):
            if pool["ignored"]: continue
            goal="minimum" if pool["needed_to_minimum"] else "healthy" if pool["needed_to_healthy"] else "target" if pool["needed_to_target"] else None
            if goal: rows.append({"kind":"deep","branch":pool["branch"],"category":pool["path"][0],"pool_id":pool["id"],**{key:pool[key] for key in ("current","minimum","healthy","target","status","priority")},"goal":f"bring-to-{goal}","needed":pool[f"needed_to_{goal}"],"context_issue":False})
    except (ImportError,OSError,ValueError): pass
    phase={"deficient":0,"minimum":1,"healthy":3,"target_met":4,"saturated":4}
    rows.sort(key=lambda row:(phase.get(row["status"],2),-PRIORITY_WEIGHT.get(row["priority"],2),row["current"]/max(1,row["minimum"] if row["status"]=="deficient" else row["healthy"]),row["branch"]))
    return rows[:limit] if limit is not None else rows

def population_preview(data_root:Path,branch:str,goal:str,text:str,defaults:dict[str,Any]|None=None)->dict[str,Any]:
    """Review a coverage-driven batch without mutating catalogue or queue state."""
    policy=normalize_goal(goal); pool=next((row for row in pool_coverage(data_root) if row.branch==branch),None)
    if pool is None: raise KeyError(f"coverage branch not found: {branch}")
    review=review_pasted(data_root,pool.category,text,defaults,pool.subcategory)
    thresholds=CoverageThresholds(pool.minimum,pool.healthy,pool.target); after=pool.current+len(review.valid)
    return {"branch":branch,"category":pool.category,"goal":QUEUE_GOALS[policy],"goal_threshold":getattr(pool,policy),"needed":max(0,getattr(pool,policy)-pool.current),"before":thresholds.describe(pool.current),"after":thresholds.describe(after),"preview":review,"mutates":False}

def apply_population(data_root:Path,branch:str,goal:str,text:str,defaults:dict[str,Any]|None=None,backup_root:Path|None=None)->dict[str,Any]:
    preview=population_preview(data_root,branch,goal,text,defaults); review=preview["preview"]
    if review.errors: raise ValueError("population review contains malformed entries")
    backup=import_valid(data_root,preview["category"],review,backup_root)
    pool=next(row for row in pool_coverage(data_root) if row.branch==branch)
    return {key:value for key,value in preview.items() if key!="preview"}|{"accepted":len(review.valid),"duplicates":len(review.duplicates),"variants":len(review.variants),"backup":str(backup) if backup else None,"after":CoverageThresholds(pool.minimum,pool.healthy,pool.target).describe(pool.current),"mutates":bool(backup)}
