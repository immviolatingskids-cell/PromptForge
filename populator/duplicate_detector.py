"""Transparent duplicate and possible-variant heuristics."""
from __future__ import annotations
from difflib import SequenceMatcher
import re
from typing import Any
from populator.schemas import readable_id

STOP_WORDS={"a","an","the","hobby","activity","playing","practice","practising"}
RANK={"DUPLICATE":4,"LIKELY_DUPLICATE":3,"POSSIBLE_VARIANT":2,"DISTINCT":1}
LEGACY={"DUPLICATE":"exact_name","LIKELY_DUPLICATE":"normalized_name","POSSIBLE_VARIANT":"near_match"}

def _tokens(value:str)->set[str]:return {part for part in re.split(r"[_\W]+",readable_id(value)) if part and part not in STOP_WORDS}
def classify_pair(candidate:dict[str,Any],entry:dict[str,Any])->dict[str,Any]:
    cid,eid=candidate.get("id",""),entry.get("id","");cname,ename=candidate.get("name",""),entry.get("name","");cn,en=readable_id(cname),readable_id(ename)
    if cid and cid==eid:return {"classification":"DUPLICATE","reason":"exact id","entry_id":eid,"score":1.0}
    if cname==ename:return {"classification":"DUPLICATE","reason":"exact name","entry_id":eid,"score":1.0}
    if cname.casefold()==ename.casefold():return {"classification":"DUPLICATE","reason":"case-insensitive name","entry_id":eid,"score":1.0}
    if cn==en:return {"classification":"LIKELY_DUPLICATE","reason":"normalized name","entry_id":eid,"score":.99}
    candidate_cluster=candidate.get("metadata",{}).get("cluster"); entry_cluster=entry.get("metadata",{}).get("cluster")
    if candidate_cluster and candidate_cluster==entry_cluster:return {"classification":"LIKELY_DUPLICATE","reason":"shared conceptual cluster","entry_id":eid,"score":.95}
    left,right=_tokens(cname),_tokens(ename);ratio=SequenceMatcher(None,cn,en).ratio();overlap=len(left&right)/max(1,min(len(left),len(right)))
    if ratio>=.9:return {"classification":"LIKELY_DUPLICATE","reason":"very similar spelling","entry_id":eid,"score":round(ratio,2)}
    candidate_family=candidate.get("metadata",{}).get("family"); entry_family=entry.get("metadata",{}).get("family")
    if candidate_family and candidate_family==entry_family:return {"classification":"POSSIBLE_VARIANT","reason":"shared conceptual family","entry_id":eid,"score":.7}
    if ratio>=.72 or overlap>=.6:return {"classification":"POSSIBLE_VARIANT","reason":"shared wording","entry_id":eid,"score":round(max(ratio,overlap),2)}
    return {"classification":"DISTINCT","reason":"no strong similarity","entry_id":eid,"score":round(max(ratio,overlap),2)}
def classify_duplicates(candidate:dict[str,Any],entries:list[dict[str,Any]])->list[dict[str,Any]]:
    return sorted((match for entry in entries if (match:=classify_pair(candidate,entry))["classification"]!="DISTINCT"),key=lambda item:(-RANK[item["classification"]],-item["score"],item["entry_id"]))
def find_duplicates(candidate:dict[str,Any],entries:list[dict[str,Any]])->list[tuple[str,str]]:
    """Backward-compatible tuple API used by v0.1 callers."""
    matches=[]
    for match in classify_duplicates(candidate,entries):
        label="exact_id" if match["reason"]=="exact id" else LEGACY[match["classification"]]
        matches.append((label,match["entry_id"]))
    return matches
