"""Compact hierarchical terminal rendering for registry pools."""
from __future__ import annotations
from pathlib import Path
from populator.deep_coverage import leaf_coverage
from populator.deep_pools import load_registry

def render_tree(data_root:Path, category:str, expanded:set[str]|None=None, unicode:bool=True)->str:
    expanded=expanded or set(); leaves=leaf_coverage(data_root,category)
    groups={}
    for leaf in leaves:
        if len(leaf["path"])<2: continue
        groups.setdefault(tuple(leaf["path"][:2]),[]).append(leaf)
    lines=[]; branch_mark="├─" if unicode else "+-"; child_mark="└─" if unicode else "\\-"
    root_name=category.title(); lines.append(("🎨 " if category=="appearance" and unicode else "👗 " if category=="clothing" and unicode else "")+root_name)
    for path,children in sorted(groups.items()):
        key="/".join(path); name=path[-1].replace("_"," ").title(); lines.append(f"{branch_mark} {name}")
        if key not in expanded and path[-1] not in expanded: continue
        for index,leaf in enumerate(children):
            mark=child_mark if index==len(children)-1 else branch_mark
            status={"deficient":"!","minimum":"▲","healthy":"●","target_met":"✓","saturated":"✓"}[leaf["status"]]
            lines.append(f"   {mark} {leaf['name']:<22} {leaf['count']:>3}  min {leaf['minimum']:<3} healthy {leaf['healthy']:<3} target {leaf['target']:<3} {status}")
    return "\n".join(lines)
