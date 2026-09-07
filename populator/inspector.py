"""Read-only deep pool inspection."""
from pathlib import Path
from typing import Any
from populator.deep_pools import find_pool, selection_config
from populator.deep_coverage import leaf_coverage
from populator.storage import all_entries

def inspect_pool(data_root: Path, pool_id: str) -> dict[str,Any]:
    pool=find_pool(data_root,pool_id)
    if not pool: raise KeyError(f"deep pool not found: {pool_id}")
    entries=[e for _,e in all_entries(data_root) if e.get("metadata",{}).get("pool_id")==pool["id"]]
    coverage=next(row for row in leaf_coverage(data_root) if row["id"]==pool["id"])
    contexts={field:{} for field in ("settings","eras","species","life_stages","countries")}
    for entry in entries:
        for field in contexts:
            values=entry.get("compatibility",{}).get(field,[]) or ["General"]
            values=[values] if isinstance(values,str) else values
            for value in values: contexts[field][value]=contexts[field].get(value,0)+1
    return {"pool":pool,"entries":len(entries),**{key:coverage[key] for key in ("minimum","healthy","target","status","needed_to_minimum","needed_to_healthy","needed_to_target","coverage")},"selection":selection_config(data_root,pool["id"]),"context_distribution":contexts,"ids":[e.get("id") for e in entries]}
