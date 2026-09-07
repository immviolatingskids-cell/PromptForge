"""Persist user coverage priorities outside canonical entry data."""
from __future__ import annotations
import json
from pathlib import Path
VALID={"high","normal","low","ignored"}
def path_for(data_root:Path)->Path:return data_root.parent/".personaforge"/"coverage_priorities.json"
def load(data_root:Path)->dict[str,str]:
    path=path_for(data_root);return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
def set_priority(data_root:Path,branch:str,priority:str)->None:
    if priority not in VALID:raise ValueError(f"priority must be one of: {', '.join(sorted(VALID))}")
    values=load(data_root);values[branch]=priority;path=path_for(data_root);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(values,indent=2)+"\n",encoding="utf-8")
