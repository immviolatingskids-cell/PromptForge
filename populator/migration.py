"""Conservative classification helpers for deep appearance/clothing pools."""
from pathlib import Path
from typing import Any
from populator.deep_pools import leaf_pools
from populator.storage import all_entries
from populator.backup import create_backup, record_undo
from populator.storage import category_path, load_entries, save_entries

def classify_entry(data_root: Path, category: str, entry: dict[str,Any]) -> dict[str,Any]:
    metadata=entry.get("metadata",{})
    if metadata.get("pool_id"): return {"status":"classified","pool_id":metadata["pool_id"],"confidence":"explicit"}
    text=(entry.get("name","")+" "+" ".join(entry.get("tags",[]))).casefold(); candidates=[]
    for pool in leaf_pools(data_root,category.split("/")[0]):
        score=sum(word in text for word in pool["name"].casefold().split() if len(word)>3)
        if score: candidates.append((score,pool["id"]))
    candidates.sort(reverse=True)
    if candidates and (len(candidates)==1 or candidates[0][0]>candidates[1][0]): return {"status":"suggested","pool_id":candidates[0][1],"confidence":"deterministic","candidates":[p for _,p in candidates]}
    return {"status":"unclassified","candidates":[p for _,p in candidates]}

def unclassified_entries(data_root: Path) -> list[dict[str,Any]]:
    result=[]
    for category,entry in all_entries(data_root):
        if category.split("/")[0] in {"appearance","clothing"} and not entry.get("metadata",{}).get("pool_id"):
            result.append({"category":category,"entry":entry,"classification":classify_entry(data_root,category,entry)})
    return result

def approve_classification(data_root:Path, category:str, entry_id:str, pool_id:str, backup_root:Path|None=None)->dict[str,Any]:
    """Apply one user-approved mapping; suggestions are never applied implicitly."""
    target=category_path(data_root,category); entries=load_entries(target)
    entry=next((item for item in entries if item.get("id")==entry_id),None)
    if entry is None: raise KeyError(f"entry not found: {entry_id}")
    from populator.deep_pools import canonical_category, find_pool
    pool=find_pool(data_root,pool_id)
    if pool is None: raise KeyError(f"deep pool not found: {pool_id}")
    expected_category=canonical_category(data_root,pool_id)
    if expected_category != category:
        raise ValueError(f"pool {pool_id} belongs to {expected_category}, not {category}")
    backup=create_backup(data_root,backup_root); record_undo(data_root,[target],f"classify {entry_id}")
    entry.setdefault("metadata",{}).update({"pool_id":pool["id"],"pool_path":"/".join(pool["path"]),"subcategory":pool["id"]})
    save_entries(target,entries)
    return {"entry_id":entry_id,"pool_id":pool["id"],"backup":str(backup)}

def safe_migration_plan(data_root:Path)->list[dict[str,Any]]:
    """Return only mappings justified by the canonical source category."""
    result=[]
    for category,entry in all_entries(data_root):
        if entry.get("metadata",{}).get("pool_id"): continue
        if category=="clothing/styles": result.append({"category":category,"entry_id":entry["id"],"pool_id":"clothing_styles","confidence":"canonical_category"})
    return result

def apply_safe_migration(data_root:Path, backup_root:Path|None=None)->dict[str,Any]:
    plan=safe_migration_plan(data_root)
    if not plan:return {"migrated":0,"backup":None}
    backup=create_backup(data_root,backup_root)
    paths=[]
    for category in sorted({item["category"] for item in plan}):
        target=category_path(data_root,category); entries=load_entries(target); paths.append(target)
        ids={item["entry_id"] for item in plan if item["category"]==category}
        for entry in entries:
            if entry.get("id") in ids: entry.setdefault("metadata",{}).update({"pool_id":"clothing_styles","pool_path":"clothing/style/clothing_styles","subcategory":"clothing_styles"})
        save_entries(target,entries)
    record_undo(data_root,paths,"safe deep-pool migration")
    return {"migrated":len(plan),"backup":str(backup)}
