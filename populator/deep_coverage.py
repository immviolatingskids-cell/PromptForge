"""Coverage calculations for registry-defined leaf pools and parent branches."""
from __future__ import annotations
from collections import defaultdict
from pathlib import Path
from typing import Any
from populator.deep_pools import leaf_pools
from populator.storage import all_entries
from populator.coverage import config_path
from populator.coverage_targets import CoverageThresholds, deep_thresholds
from populator.coverage_priorities import load as load_priorities

def _entries_by_pool(data_root:Path)->dict[str,list[dict[str,Any]]]:
    result=defaultdict(list)
    for _,entry in all_entries(data_root):
        pool=entry.get("metadata",{}).get("pool_id")
        if pool: result[pool].append(entry)
    return result

def leaf_coverage(data_root:Path,category:str|None=None)->list[dict[str,Any]]:
    grouped=_entries_by_pool(data_root); result=[]
    custom={}; priorities=load_priorities(data_root)
    path=config_path(data_root)
    if path.exists():
        import json
        custom=json.loads(path.read_text(encoding="utf-8")).get("targets",{})
    for pool in leaf_pools(data_root,category):
        target_config=custom.get(pool["branch"],custom.get(pool["id"],custom.get(pool["path"][0],{}))); target_config=target_config if isinstance(target_config,dict) else {}; thresholds=deep_thresholds(pool,target_config); count=len(grouped.get(pool["id"],[])); priority=priorities.get(pool["branch"],priorities.get(pool["id"],pool.get("priority","normal"))); details=thresholds.describe(count)
        result.append({"id":pool["id"],"name":pool["name"],"path":pool["path"],"branch":pool["branch"],**details,"coverage":min(100,round(count/max(1,thresholds.target)*100)),"healthy_coverage":min(100,round(count/max(1,thresholds.healthy)*100)),"needed":details["needed_to_target"],"priority":priority,"ignored":pool.get("ignored",False) or priority=="ignored"})
    return result

def set_leaf_target(data_root:Path,pool_id:str,target:int,minimum:int|None=None,healthy:int|None=None)->None:
    inferred=deep_thresholds({"target":target})
    thresholds=CoverageThresholds(minimum or inferred.minimum,healthy or inferred.healthy,target)
    path=config_path(data_root); import json
    custom=json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    custom.setdefault("targets",{})[pool_id]={"minimum":thresholds.minimum,"healthy":thresholds.healthy,"target":thresholds.target}
    path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(custom,indent=2)+"\n",encoding="utf-8")

def branch_coverage(data_root:Path,category:str)->list[dict[str,Any]]:
    leaves=leaf_coverage(data_root,category); result=[]
    for branch in sorted({tuple(item["path"][:i]) for item in leaves for i in range(2,len(item["path"]))}):
        children=[item for item in leaves if tuple(item["path"][:len(branch)])==branch]
        if not children: continue
        sums={key:sum(i[key] for i in children) for key in ("count","minimum","healthy","target")}; thresholds=CoverageThresholds(sums["minimum"],sums["healthy"],sums["target"]); details=thresholds.describe(sums["count"])
        result.append({"id":branch[-1],"path":list(branch),"name":branch[-1].replace("_"," ").title(),**details,"coverage":round(sum(i["coverage"] for i in children)/len(children)),"leaves":len(children)})
    return result

def category_coverage(data_root:Path,category:str)->dict[str,Any]:
    leaves=[item for item in leaf_coverage(data_root,category) if not item["ignored"]]
    sums={key:sum(item[key] for item in leaves) for key in ("count","minimum","healthy","target")}; completed=sum(min(item["count"],item["target"]) for item in leaves); coverage=round(100*completed/sums["target"]) if sums["target"] else 100
    details=CoverageThresholds(sums["minimum"],sums["healthy"],sums["target"]).describe(sums["count"]) if leaves else {"count":0,"current":0,"minimum":0,"healthy":0,"target":0,"status":"target_met","needed_to_minimum":0,"needed_to_healthy":0,"needed_to_target":0}
    unified_status=details["status"]; legacy_status="Missing" if not completed else "Critical" if coverage<50 else "Weak" if coverage<80 else "Healthy" if coverage<100 else "Strong"
    return {"category":category,**details,"status":legacy_status,"coverage_status":unified_status,"coverage":coverage,"leaves":len(leaves)}

PRESETS={"appearance_foundation":["body","skin","face","eyes","hair","distinguishing_features"],"face_expansion":["face"],"hair_expansion":["hair_colour","hair_length","hair_texture","hairstyle","fringe_bangs","hair_details"],"clothing_foundation":["style","garments","construction_visual_details","accessories"],"garment_expansion":["garments"],"footwear_expansion":["footwear"],"accessories_expansion":["accessories"]}
def preset_pools(data_root:Path,preset:str)->list[dict[str,Any]]:
    wanted=set(PRESETS.get(preset.strip().casefold().replace(" ","_"),[])); leaves=leaf_pools(data_root)
    return [p for p in leaves if p["id"] in wanted or any(parent in wanted for parent in p["path"])]

def recommendations(data_root:Path, limit:int|None=None, goal:str="target")->list[dict[str,Any]]:
    """Rank incomplete deep leaves by priority, severity, and completion."""
    field={"minimum":"needed_to_minimum","healthy":"needed_to_healthy","target":"needed_to_target"}.get(goal)
    if field is None:raise ValueError("recommendation goal must be minimum, healthy, or target")
    rows=[{**row,"needed":row[field],"goal":goal} for row in leaf_coverage(data_root) if not row["ignored"] and row[field]]
    weight={"high":3,"normal":2,"low":1}
    rows.sort(key=lambda row:(-weight.get(row["priority"],2),row["count"]/row[goal],-row["needed"],row["branch"]))
    return rows if limit is None else rows[:limit]

def context_coverage(data_root:Path, pool_id:str, contexts:list[dict[str,str]])->list[dict[str,Any]]:
    """Measure one shared leaf against contexts without copying its entries."""
    from populator.coverage import effective_pool
    pool_rows=[row for row in leaf_coverage(data_root) if row["id"]==pool_id]
    if not pool_rows: raise KeyError(f"deep pool not found: {pool_id}")
    category=pool_rows[0]["path"][0]
    entries=[entry for _,entry in all_entries(data_root) if entry.get("metadata",{}).get("pool_id")==pool_id]
    return [{"context":context,"raw":len(entries),"effective":len(effective_pool(entries,context)),"target":pool_rows[0]["target"]} for context in contexts]
