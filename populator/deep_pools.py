"""Registry-driven hierarchical pools for scalable appearance and clothing data."""
from __future__ import annotations
import json
from pathlib import Path
from typing import Any
from populator.coverage_targets import deep_thresholds

CLOTHING_TARGETS={"clothing_styles":30,"tops":40,"shirts_blouses":30,"knitwear":25,"bottoms":30,"trousers":30,"shorts":20,"skirts":25,"dresses":30,"jumpsuits_one_pieces":15,"jackets":35,"coats":30,"hoodies":20,"formalwear":30,"activewear":25,"loungewear":20,"footwear":40,"materials":25,"patterns":25,"fits":20,"silhouettes":25,"necklines":25,"sleeve_styles":25,"lengths":15,"layering":20,"jewellery":40,"bags":30,"headwear":30,"eyewear":20,"belts":15,"gloves":15,"scarves":15,"other_accessories":20}
BRANCH_FILES={"body":"appearance/body","eyes":"appearance/eyes","hair":"appearance/hair","distinguishing_features":"appearance/features","style":"clothing/styles","garments":"clothing/garments","construction_visual_details":"clothing/details","accessories":"clothing/accessories"}

def registry_path(data_root: Path) -> Path: return data_root / "pools" / "deep_pool_registry.json"
def load_registry(data_root: Path) -> dict[str, Any]:
    path=registry_path(data_root)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"categories":[],"pools":{}}
def _walk(node: Any, path: list[str], out: list[dict[str,Any]], registry: dict[str,Any]) -> None:
    if isinstance(node,str):
        definition=registry.get("pools",{}).get(node,{"name":node.replace("_"," ").title()})
        full_path=path+[node]; merged={"id":node,"path":full_path,"branch":"/".join(full_path),"parent":path[-1] if path else None,"target":CLOTHING_TARGETS.get(node,20),"population_target":True,"priority":"normal","ignored":False,**definition}; thresholds=deep_thresholds(merged); merged.update({"minimum":thresholds.minimum,"healthy":thresholds.healthy,"target":thresholds.target})
        out.append(merged)
    elif isinstance(node,dict):
        children=node.get("children",[])
        for child in children: _walk(child,path+[node["id"]],out,registry)
def leaf_pools(data_root:Path, category: str|None=None) -> list[dict[str,Any]]:
    reg=load_registry(data_root); result=[]
    for root in reg.get("categories",[]):
        if category and root["id"]!=category: continue
        _walk(root,[],result,reg)
    return result
def find_pool(data_root:Path, value:str) -> dict[str,Any]|None:
    key=value.strip().casefold().replace(" ","_").replace("-","_")
    return next((p for p in leaf_pools(data_root) if p["id"]==key or p["branch"]==value),None)
def inherited_defaults(data_root:Path, pool_id:str) -> dict[str,Any]:
    pool=find_pool(data_root,pool_id)
    if not pool:return {}
    return {"metadata":{"pool_id":pool["id"],"pool_path":"/".join(pool["path"]),"subcategory":pool["id"]},"pool":pool}
def selection_config(data_root:Path,pool_id:str)->dict[str,Any]:
    p=find_pool(data_root,pool_id) or {};return {"selection_mode":p.get("selection_mode","single"),"none_allowed":p.get("none_allowed",False),"max_selections":p.get("max_selections",1 if p.get("selection_mode","single")=="single" else 3)}
def validate_selection(data_root:Path,pool_id:str,values:list[str]|None)->list[str]:
    config=selection_config(data_root,pool_id); chosen=[value for value in (values or []) if value.strip()]
    if not chosen and not config["none_allowed"]: return ["at least one value is required"]
    if config["selection_mode"]=="single" and len(chosen)>1: return ["single-selection pool accepts one value"]
    if len(chosen)>config["max_selections"]: return [f"selection limit is {config['max_selections']}"]
    return []
def canonical_category(data_root:Path,pool_id:str)->str:
    pool=find_pool(data_root,pool_id)
    if not pool: raise KeyError(f"deep pool not found: {pool_id}")
    for branch in pool["path"][1:-1]:
        if branch in BRANCH_FILES: return BRANCH_FILES[branch]
    return BRANCH_FILES.get(pool["path"][0],pool["path"][0])

def validate_registry(data_root:Path)->list[str]:
    reg=load_registry(data_root); errors=[]; seen=set(); definitions=reg.get("pools",{})
    if not isinstance(reg.get("categories"),list): return ["categories must be a list"]
    if not isinstance(definitions,dict): return ["pools must be an object"]
    def walk(node):
        if isinstance(node,str):
            if node in seen: errors.append(f"duplicate leaf id: {node}")
            seen.add(node); definition=definitions.get(node,{})
            try: deep_thresholds({"target":definition.get("target",CLOTHING_TARGETS.get(node,20)),**definition})
            except ValueError as error: errors.append(f"invalid thresholds: {node}: {error}")
            if definition.get("selection_mode","single") not in {"single","multiple"}: errors.append(f"invalid selection mode: {node}")
            if "max_selections" in definition and (not isinstance(definition["max_selections"],int) or definition["max_selections"]<1): errors.append(f"invalid max selections: {node}")
        elif isinstance(node,dict):
            if not node.get("id"): errors.append("branch missing id")
            for child in node.get("children",[]): walk(child)
        else: errors.append("invalid registry child")
    for root in reg.get("categories",[]): walk(root)
    return errors
