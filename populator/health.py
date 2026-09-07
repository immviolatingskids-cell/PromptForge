"""Non-destructive library health scan with ERROR/WARNING/INFO findings."""
from __future__ import annotations
from collections import Counter,defaultdict
from dataclasses import asdict,dataclass
from pathlib import Path
from typing import Any
from populator.coverage import diversity_analysis,pool_coverage
from populator.duplicate_detector import classify_pair
from populator.storage import all_entries,list_categories
from populator.validator import validate_data_tree
from populator.coverage import load_config
from populator.templates import load_templates

KNOWN_SECTIONS={"core","identity","personality","lifestyle","appearance","clothing","narrative"}

@dataclass(frozen=True)
class HealthFinding:
    severity:str;code:str;message:str;category:str|None=None;entry_ids:tuple[str,...]=()

def scan_health(data_root:Path)->dict[str,Any]:
    findings=[];rows=all_entries(data_root); coverage_rows=[]
    try:
        from populator.migration import unclassified_entries
        for item in unclassified_entries(data_root):
            entry=item["entry"]; classification=item["classification"]
            findings.append(HealthFinding("INFO","unclassified_deep_entry",f"Needs deep-pool classification: {entry['name']}",item["category"],(entry["id"],)))
    except (ImportError, OSError, ValueError):
        pass
    for issue in validate_data_tree(data_root):findings.append(HealthFinding("ERROR","structural",str(issue)))
    for category in list_categories(data_root):
        if category.split("/")[0] not in KNOWN_SECTIONS:findings.append(HealthFinding("WARNING","unknown_category",f"Unknown top-level category: {category}",category))
        entries=[entry for row_category,entry in rows if row_category==category]
        for index,left in enumerate(entries):
            for right in entries[index+1:]:
                match=classify_pair(left,right)
                if category!="core/regions" and match["classification"] in {"DUPLICATE","LIKELY_DUPLICATE"}:findings.append(HealthFinding("WARNING","similar_entry",f"{left['name']} / {right['name']}: {match['reason']}",category,(left["id"],right["id"])))
        diversity=diversity_analysis(data_root,category)
        if diversity["concentrated"]:findings.append(HealthFinding("WARNING","concentration",f"{diversity['largest']} represents {diversity['largest_share']:.0%} of {category}",category))
        raw_subcategories=[str(entry.get("metadata",{}).get("subcategory")) for entry in entries if entry.get("metadata",{}).get("subcategory")]
        normalized=defaultdict(set)
        for value in raw_subcategories:normalized[value.casefold().replace("-","_").replace(" ","_")].add(value)
        for values in normalized.values():
            if len(values)>1:findings.append(HealthFinding("WARNING","subcategory_naming",f"Inconsistent subcategory spellings in {category}: {', '.join(sorted(values))}",category))
    for pool in pool_coverage(data_root):
        if pool.priority!="ignored" and pool.subcategory is None:
            coverage_rows.append({"kind":"legacy","branch":pool.branch,"priority":pool.priority,"current":pool.current,"minimum":pool.minimum,"healthy":pool.healthy,"target":pool.target,"status":pool.status,"needed_to_minimum":pool.needed_to_minimum,"needed_to_healthy":pool.needed_to_healthy,"needed_to_target":pool.needed_to_target})
            if pool.status=="deficient":findings.append(HealthFinding("WARNING","tiny_pool",f"{pool.branch} is below minimum ({pool.count}/{pool.minimum})",pool.category))
    try:
        from populator.deep_coverage import leaf_coverage
        classified_sections={entry.get("metadata",{}).get("pool_id") for _,entry in rows if entry.get("metadata",{}).get("pool_id")}
        for pool in leaf_coverage(data_root):
            if pool["ignored"]:continue
            coverage_rows.append({"kind":"deep",**{key:pool[key] for key in ("branch","priority","current","minimum","healthy","target","status","needed_to_minimum","needed_to_healthy","needed_to_target")}})
            if pool["status"]=="deficient":
                severity="WARNING" if classified_sections else "INFO"
                findings.append(HealthFinding(severity,"deep_pool_below_minimum",f"{pool['branch']} is below minimum ({pool['count']}/{pool['minimum']})",pool["path"][0]))
    except (ImportError,OSError,ValueError):
        pass
    generic=sum(1 for _,entry in rows if all(not values for values in entry.get("compatibility",{}).values()))
    findings.append(HealthFinding("INFO","general_entries",f"{generic} entries intentionally use general compatibility metadata"))
    try:load_templates(data_root)
    except (ValueError,OSError) as error:findings.append(HealthFinding("ERROR","templates",f"Template storage is invalid: {error}"))
    known_branches={pool.branch for pool in pool_coverage(data_root)}
    try:
        from populator.deep_pools import leaf_pools
        known_branches.update(value for pool in leaf_pools(data_root) for value in (pool["id"],pool["branch"]))
    except (ImportError,OSError,ValueError):
        pass
    for branch in load_config(data_root).get("targets",{}):
        if branch not in known_branches and branch not in {"core/settings","core/eras","core/species","core/life_stages","identity/names/given_names","identity/names/family_names","clothing/signature_outfits"}:findings.append(HealthFinding("INFO","orphan_target",f"Configured target has no current branch: {branch}"))
    counts=Counter(item.severity for item in findings)
    readiness=Counter(item["status"] for item in coverage_rows)
    return {"summary":{"errors":counts["ERROR"],"warnings":counts["WARNING"],"info":counts["INFO"]},"coverage_readiness":{"deficient":readiness["deficient"],"below_healthy":readiness["minimum"],"healthy":readiness["healthy"],"at_or_above_target":readiness["target_met"]+readiness["saturated"]+readiness["Complete"],"pools":coverage_rows},"findings":[asdict(item) for item in findings]}
