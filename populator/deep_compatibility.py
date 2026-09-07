"""Deterministic soft compatibility scoring for shared deep-pool entries."""
from __future__ import annotations
from typing import Any

def compatibility_class(entry:dict[str,Any], context:dict[str,str])->str:
    compatibility=entry.get("compatibility",{}); considered=[field for field in context if context[field]]
    if not considered:return "General"
    matches=sum(1 for field in considered if context[field] in compatibility.get(field,[]))
    constrained=sum(1 for field in considered if compatibility.get(field))
    if any(compatibility.get(field) and context[field] not in compatibility[field] for field in considered):
        return "Invalid" if entry.get("metadata",{}).get("hard_invalid") else "Unusual"
    if matches==len(considered): return "Exact"
    if matches: return "Contextual"
    return "General"

def compatibility_score(entry:dict[str,Any],context:dict[str,str])->float:
    return {"Exact":1.0,"Contextual":0.75,"General":0.5,"Unusual":0.2,"Invalid":0.0}[compatibility_class(entry,context)]
