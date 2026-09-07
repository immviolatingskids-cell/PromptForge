"""Interactive and scriptable PersonaForge Populator commands."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

from populator.duplicate_detector import find_duplicates
from populator.schemas import COMPATIBILITY_FIELDS, csv_list, make_entry
from populator.storage import all_entries, category_path, list_categories, load_entries, save_entries
from populator.templates import load_templates, save_templates
from populator.backup import create_backup, record_undo
from populator.validator import validate_entry
from populator.coverage import coverage_report, library_health_score, library_statistics, pool_coverage, recommendations
from populator.health import scan_health
from populator.population import PopulationSession, batch_metadata, load_queue, populate_target, resolve_queue_target, review_pasted
from populator.deep_coverage import branch_coverage, category_coverage, leaf_coverage
from populator.theme import Theme
from populator.deep_coverage import recommendations as deep_recommendations
from populator.deep_pools import canonical_category
from populator.deep_pools import load_registry
from populator.tree_view import render_tree
from populator.inspector import inspect_pool


Input = Callable[[str], str]
Output = Callable[[str], None]


class Populator:
    def __init__(self, data_root: Path):
        self.data_root = data_root

    def add(self, category: str, entry: dict[str, Any]) -> None:
        issues = validate_entry(entry, 0)
        if issues:
            raise ValueError("; ".join(issues))
        path = category_path(self.data_root, category)
        entries = load_entries(path)
        strong = [match for match in find_duplicates(entry, entries) if match[0] != "near_match"]
        if strong:
            raise ValueError(f"duplicate entry: {strong[0][0]} matches {strong[0][1]}")
        entries.append(entry)
        save_entries(path, entries)

    def edit(self, category: str, entry_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        path = category_path(self.data_root, category)
        entries = load_entries(path)
        index = self._index(entries, entry_id)
        updated = {**entries[index], **changes}
        issues = validate_entry(updated, index)
        if issues:
            raise ValueError("; ".join(issues))
        if updated["id"] != entry_id and any(item.get("id") == updated["id"] for item in entries):
            raise ValueError(f"duplicate id: {updated['id']}")
        entries[index] = updated
        save_entries(path, entries)
        return updated

    def delete(self, category: str, entry_id: str) -> dict[str, Any]:
        path = category_path(self.data_root, category)
        entries = load_entries(path)
        index = self._index(entries, entry_id)
        removed = entries.pop(index)
        save_entries(path, entries)
        return removed

    def clone(self, category: str, entry_id: str, new_id: str, new_name: str) -> dict[str, Any]:
        entries = load_entries(category_path(self.data_root, category))
        clone = json.loads(json.dumps(entries[self._index(entries, entry_id)]))
        clone.update({"id": new_id, "name": new_name})
        self.add(category, clone)
        return clone

    def browse(self, category: str | None = None) -> list[tuple[str, dict[str, Any]]]:
        if category:
            return [(category, entry) for entry in load_entries(category_path(self.data_root, category))]
        return all_entries(self.data_root)

    def search(self, query: str, category: str | None = None) -> list[tuple[str, dict[str, Any]]]:
        needle = query.casefold()
        return [
            (name, entry)
            for name, entry in self.browse(category)
            if needle in " ".join([entry.get("id", ""), entry.get("name", ""), entry.get("description", ""), *entry.get("tags", []), *entry.get("aliases", [])]).casefold()
        ]

    def filter_entries(self, query: str = "", category: str | None = None, subcategory: str | None = None, **context: str) -> list[tuple[str, dict[str, Any]]]:
        rows = self.search(query, category) if query else self.browse(category)
        result = []
        field_names = {"setting":"settings", "era":"eras", "life_stage":"life_stages", "species":"species", "country":"countries"}
        for row_category, entry in rows:
            if subcategory and str(entry.get("metadata", {}).get("subcategory", "")).casefold().replace(" ", "_").replace("-", "_") != subcategory.casefold().replace(" ", "_").replace("-", "_"):
                continue
            compatible = entry.get("compatibility", {})
            if any(value and compatible.get(field_names[key]) and value not in compatible[field_names[key]] for key, value in context.items() if key in field_names):
                continue
            gender=context.get("gender_relevance","");allowed=entry.get("metadata",{}).get("gender_relevance",[]);allowed=[allowed] if isinstance(allowed,str) else allowed
            if gender and allowed and gender not in allowed:continue
            result.append((row_category, entry))
        return result

    def save_template(self, name: str, defaults: dict[str, Any]) -> None:
        path = self.data_root / "templates" / "entry_templates.json"
        create_backup(self.data_root); record_undo(self.data_root, [path], f"template change: {name}")
        templates = load_templates(self.data_root)
        templates[name] = defaults
        save_templates(self.data_root, templates)

    def delete_template(self, name: str) -> None:
        templates = load_templates(self.data_root)
        if name not in templates:
            raise KeyError(f"template not found: {name}")
        path = self.data_root / "templates" / "entry_templates.json"
        create_backup(self.data_root); record_undo(self.data_root, [path], f"template deletion: {name}")
        del templates[name]
        save_templates(self.data_root, templates)

    @staticmethod
    def _index(entries: list[dict[str, Any]], entry_id: str) -> int:
        for index, entry in enumerate(entries):
            if entry.get("id") == entry_id:
                return index
        raise KeyError(f"entry not found: {entry_id}")


def prompt_entry(input_fn: Input = input, output_fn: Output = print, defaults: dict[str, Any] | None = None) -> dict[str, Any]:
    defaults = defaults or {}

    def ask(label: str, default: str = "") -> str:
        suffix = f" [{default}]" if default else ""
        return input_fn(f"{label}{suffix}: ").strip() or default

    name = ask("Name", defaults.get("name", ""))
    entry_id = ask("ID (blank to generate)", defaults.get("id", "")) or None
    description = ask("Description", defaults.get("description", ""))
    tags = csv_list(ask("Tags (comma-separated)", ",".join(defaults.get("tags", []))))
    compatibility = {
        field: csv_list(ask(f"{field.replace('_', ' ').title()} (comma-separated)", ",".join(defaults.get("compatibility", {}).get(field, []))))
        for field in COMPATIBILITY_FIELDS
    }
    entry = make_entry(name, entry_id, description, tags=tags, compatibility=compatibility, metadata=defaults.get("metadata"))
    output_fn(f"Prepared {entry['id']} ({entry['name']})")
    return entry


def format_rows(rows: list[tuple[str, dict[str, Any]]], theme: Theme | None = None) -> str:
    theme = theme or Theme.detect()
    values = []
    for category, entry in rows:
        compatibility = entry.get("compatibility", {})
        context = ", ".join(value for field in ("settings", "eras", "life_stages", "species", "countries") for value in compatibility.get(field, [])) or "General"
        values.append([entry["id"], entry["name"], category, context])
    return theme.table(["ID", "NAME", "CATEGORY", "CONTEXT"], values)


def _status_symbol(theme: Theme, status: str) -> str:
    return theme.symbol[{"saturated":"healthy","target_met":"healthy","healthy":"good","minimum":"weak","deficient":"critical"}.get(status,"good")]


def format_dashboard(data_root: Path, theme: Theme | None = None) -> str:
    theme = theme or Theme.detect(); report = coverage_report(data_root); rows = []
    for index,pool in enumerate(report["recommendations"],1):rows.append([index,pool["branch"],pool["count"],pool["minimum"],pool["healthy"],pool["target"],f"{_status_symbol(theme,pool['status'])} {pool['status']}"])
    result = [theme.header(f"{theme.symbol['workshop']} LIBRARY NEEDS ATTENTION", "Minimum readiness first"), f"{theme.symbol['health']} Library Health  {report['health']}%   {theme.symbol['warning']} Below minimum  {len(report['recommendations'])}", "Thresholds: COUNT • MINIMUM • HEALTHY • TARGET", "", theme.table(["#","POOL","COUNT","MIN","HEALTHY","TARGET","STATUS"], rows)]
    deep_targets=deep_recommendations(data_root,1,"minimum")
    if deep_targets:
        target=deep_targets[0]; result.extend(["",f"{theme.symbol['target']} Recommended next minimum: {target['branch']}",f"Count {target['count']} • Minimum {target['minimum']} • Healthy {target['healthy']} • Target {target['target']} • Need {target['needed_to_minimum']}"])
    elif report["recommendations"]:
        target=report["recommendations"][0];result.extend(["",f"{theme.symbol['target']} Recommended next minimum: {target['branch']}",f"Count {target['count']} • Minimum {target['minimum']} • Healthy {target['healthy']} • Target {target['target']} • Need {target['needed_to_minimum']}"])
    for category, label in (("appearance", "🎨 Appearance"), ("clothing", "👗 Clothing")):
        branches=branch_coverage(data_root,category)
        if not branches: continue
        summary=category_coverage(data_root,category)
        result.extend(["", f"{label}                              {summary['coverage']}%"])
        for branch in [item for item in branches if len(item["path"])==2]:
            result.append(f"{branch['name']:<28} {branch['coverage']:>3}%")
            children=[item for item in leaf_coverage(data_root,category) if item["path"][:2]==branch["path"]]
            for child in children:
                status={"deficient":"!","minimum":"▲","healthy":"●","target_met":"✓","saturated":"✓"}[child["status"]]
                result.append(f"  ├─ {child['name']:<22} count {child['count']:<3} min {child['minimum']:<3} healthy {child['healthy']:<3} target {child['target']:<3} {status}")
    return "\n".join(result)

def deep_dashboard_navigation(data_root:Path,input_fn:Input,output_fn:Output,theme:Theme)->None:
    """Small optional navigator layered after the dashboard for registry roots."""
    if not load_registry(data_root).get("categories"): return
    choice=input_fn("[A] Appearance • [C] Clothing • [Enter] Back: ").strip().lower()
    if choice not in {"a","c"}: return
    category="appearance" if choice=="a" else "clothing"
    expanded=set()
    while True:
        output_fn(render_tree(data_root,category,expanded,theme.enhanced))
        action=input_fn("Expand branch name, [B] Back: ").strip().lower()
        if action=="b" or not action: return
        leaf=next((item for item in leaf_coverage(data_root,category) if item["id"]==action),None)
        if leaf:
            output_fn(json.dumps(inspect_pool(data_root,action),indent=2,ensure_ascii=False))
            if input_fn("[P] Populate this leaf • [Enter] Back: ").strip().lower()=="p":
                lines=[]
                while True:
                    value=input_fn("> ").strip()
                    if value=="/done": break
                    if value: lines.append(value)
                category=canonical_category(data_root,action); review=review_pasted(data_root,category,"\n".join(lines),{"pool_id":action})
                output_fn(f"Preview: {len(review.valid)} new • {len(review.duplicates)} duplicates • {len(review.errors)} errors")
                if input_fn("[I] Import valid • [C] Cancel: ").strip().lower()=="i":
                    from populator.population import populate_deep_pool
                    populate_deep_pool(data_root,category,action,"\n".join(lines))
                    output_fn("Imported; coverage refreshed.")
            continue
        expanded.add(action.replace(" ","_"))


def _populate_selected(data_root:Path,target:dict[str,Any],session:PopulationSession,input_fn:Input,output_fn:Output,theme:Theme)->bool:
    policy=target.get("goal_policy",target.get("goal","minimum")).replace("bring-to-",""); threshold=target.get("goal_threshold",target[policy]); needed=max(0,threshold-target["count"])
    output_fn(f"\n{theme.symbol['target']} {target['branch']}\n{theme.progress(target['count'],threshold)}\nGoal bring-to-{policy}: need {needed}. (min {target['minimum']} • healthy {target['healthy']} • target {target['target']})")
    output_fn("Paste one item per line or paste a Markdown table. Type /done to finish; /undo removes the previous line.");lines=[]
    while True:
        value=input_fn("> ").rstrip()
        if value.strip()=="/done":break
        if value.strip()=="/undo":
            if lines:output_fn(f"Removed: {lines.pop()}")
        elif value.strip():lines.append(value)
    from populator.population import review_pasted
    review=review_pasted(data_root,target["category"],"\n".join(lines),subcategory=target.get("subcategory"));output_fn(f"Preview: {len(review.valid)} new • {len(review.variants)} possible variants • {len(review.duplicates)} duplicates • {len(review.errors)} errors")
    if input_fn("[I] Import valid • [C] Cancel: ").strip().lower()!="i":output_fn("Cancelled; no files changed.");return False
    from populator.importer import import_valid
    before=target["count"];backup=import_valid(data_root,target["category"],review);session.record_import(target["category"],before,review);output_fn(f"{theme.symbol['healthy']} Added {len(review.valid)}: {before} → {before+len(review.valid)}"+(f" • Backup {backup.name}" if backup else ""));return bool(review.valid)


def interactive_menu(data_root: Path, input_fn: Input = input, output_fn: Output = print) -> None:
    app = Populator(data_root); theme = Theme.detect(); session = PopulationSession(data_root)
    raw_input, raw_output = input_fn, output_fn
    input_fn = lambda prompt="": raw_input(theme.safe(prompt))
    output_fn = lambda value="": raw_output(theme.safe(value))
    actions = {"1":"Coverage Dashboard","2":"Add Entry","3":"Bulk / Rapid Add","4":"Population Workshop","5":"Browse / Search","6":"Library Health","7":"Templates","8":"Maintenance","9":"Backup / Undo","10":"Pool Inspector","0":"Exit"}
    while True:
        stats=library_statistics(data_root);output_fn("\n"+theme.header(f"{theme.symbol['workshop']} PERSONAFORGE POPULATOR","Deep Pool Workshop • v0.2.6"))
        output_fn(f"{theme.symbol['library']} Library {stats['total_entries']} entries   {theme.symbol['health']} Health {stats['health']}%   {theme.symbol['warning']} Weak Pools {stats['weak_pools']}")
        output_fn(theme.rule());output_fn("\n".join(f"[{key}] {label}" for key,label in actions.items()));output_fn(theme.rule());choice=input_fn("Choose: ").strip().lower()
        try:
            if choice == "0":
                summary=session.summary();output_fn(f"\nToday's Population Summary: +{summary['added']} entries • {summary['pools_improved']} pools improved • health {summary['health_before']}% → {summary['health_now']}%")
                return
            if choice == "1":
                output_fn("\n"+format_dashboard(data_root,theme))
                if load_registry(data_root).get("categories"): deep_dashboard_navigation(data_root,input_fn,output_fn,theme)
                else: input_fn("\n[Enter] Back • Use Library Health to fix a target directly ")
            elif choice == "2":
                category = input_fn("Category (for example lifestyle/hobbies): ").strip()
                template_name = input_fn("Template (optional): ").strip()
                defaults = load_templates(data_root).get(template_name, {})
                app.add(category, prompt_entry(input_fn, output_fn, defaults))
                output_fn("Saved.")
            elif choice == "3":
                category=input_fn("Category: ").strip();subcategory=input_fn("Subcategory (optional): ").strip() or None;template_name=input_fn("Template (optional): ").strip();defaults=json.loads(json.dumps(load_templates(data_root).get(template_name,{})))
                for field in COMPATIBILITY_FIELDS:
                    override=csv_list(input_fn(f"Shared {field.replace('_',' ')} (blank inherits/Any): ").strip())
                    if override:defaults.setdefault("compatibility",{})[field]=override
                output_fn("Paste entries. Type /done on its own line to finish; /undo removes the previous line.");lines=[]
                while True:
                    value=input_fn("> ").strip()
                    if value=="/done":break
                    if value=="/undo":
                        if lines:output_fn(f"Removed: {lines.pop()}")
                    elif value and not value.startswith("/"):lines.append(value)
                from populator.population import review_pasted
                review=review_pasted(data_root,category,"\n".join(lines),defaults,subcategory);output_fn(f"Preview: {len(review.valid)} new • {len(review.variants)} possible variants • {len(review.duplicates)} duplicates • {len(review.errors)} errors")
                if input_fn("[I] Import valid • [C] Cancel: ").strip().lower()=="i":
                    from populator.importer import import_valid
                    before=len(app.browse(category));backup=import_valid(data_root,category,review);session.record_import(category,before,review);output_fn(f"{theme.symbol['healthy']} Added {len(review.valid)}"+(f" • Backup {backup.name}" if backup else ""))
                else:output_fn("Cancelled; no files changed.")
            elif choice == "4":
                queued=load_queue(data_root);queue_mode=bool(queued and input_fn(f"{len(queued)} queued target(s). [Q] Start queue • [Enter] Auto recommendation: ").strip().lower()=="q")
                while True:
                    if queue_mode:
                        queued=load_queue(data_root)
                        if not queued:break
                        queued_target=queued[0];target=resolve_queue_target(data_root,queued_target)
                        if not target:remove_from_queue(data_root,queued_target["branch"]);continue
                        if not target["needed"]:remove_from_queue(data_root,target["branch"]);continue
                    else:
                        deep=deep_recommendations(data_root,1,"minimum")
                        if deep:
                            leaf=deep[0]; targets=[{"branch":leaf["branch"],"category":canonical_category(data_root,leaf["id"]),"subcategory":leaf["id"],"pool_id":leaf["id"],**{key:leaf[key] for key in ("count","minimum","healthy","target","status","needed_to_minimum","needed_to_healthy","needed_to_target")},"goal_policy":"minimum","goal_threshold":leaf["minimum"],"needed":leaf["needed_to_minimum"]}]
                        else: targets=recommendations(data_root,1)
                        if not targets:break
                        target=targets[0]
                    policy=target.get("goal_policy",target.get("goal","minimum")).replace("bring-to-",""); threshold=target.get("goal_threshold",target[policy]); output_fn(f"\n{theme.symbol['target']} {target['branch']}\n{theme.progress(target['count'],threshold)}\nGoal bring-to-{policy}: need {target['needed']}. (min {target['minimum']} • healthy {target['healthy']} • target {target['target']})")
                    if input_fn("[Enter] Populate • [B] Back: ").strip().lower()=="b":break
                    output_fn("Paste entries; /done finishes.");lines=[]
                    while (value:=input_fn("> ").strip())!="/done":
                        if value:lines.append(value)
                    from populator.population import review_pasted
                    defaults={"pool_id":target.get("pool_id")} if target.get("pool_id") else None
                    review=review_pasted(data_root,target["category"],"\n".join(lines),defaults,target["subcategory"] if not target.get("pool_id") else None);output_fn(f"Preview: {len(review.valid)} new • {len(review.variants)} possible variants • {len(review.duplicates)} duplicates • {len(review.errors)} errors")
                    if input_fn("[I] Import valid • [C] Cancel: ").strip().lower()!="i":output_fn("Cancelled; no files changed.");break
                    from populator.importer import import_valid
                    before=target["count"];backup=import_valid(data_root,target["category"],review);session.record_import(target["category"],before,review);output_fn(f"{theme.symbol['healthy']} Added {len(review.valid)}: {before} → {before+len(review.valid)}")
                    if queue_mode and before+len(review.valid)>=target["goal_threshold"]:remove_from_queue(data_root,target["branch"])
                    if not review.valid:break
            elif choice == "5":
                query=input_fn("Search (blank for all): ").strip();category=input_fn("Category filter (blank for all): ").strip() or None;subcategory=input_fn("Subcategory filter (blank for all): ").strip() or None;setting=input_fn("Setting filter (blank for all): ").strip();rows=app.filter_entries(query,category,subcategory,setting=setting);output_fn(format_rows(rows,theme));input_fn("[Enter] Back ")
            elif choice == "6":
                while True:
                    health=scan_health(data_root);targets=recommendations(data_root);output_fn("\n"+theme.header(f"{theme.symbol['health']} LIBRARY HEALTH",f"{library_health_score(data_root)}% healthy"));output_fn(f"Errors {health['summary']['errors']} • Warnings {health['summary']['warnings']} • Info {health['summary']['info']}")
                    if targets:output_fn(theme.table(["#","POOL","COUNT","MIN","HEALTHY","TARGET","STATUS"],[[index,target["branch"],target["count"],target["minimum"],target["healthy"],target["target"],target["status"]] for index,target in enumerate(targets,1)]))
                    else:output_fn(f"{theme.symbol['healthy']} No pools below minimum.")
                    structural=[item for item in health["findings"] if item["severity"]=="ERROR"]
                    if structural:output_fn("\n"+"\n".join(f"ERROR: {item['message']}" for item in structural[:10]))
                    action=input_fn("Select # to populate • [R] Rescan • [B] Back: ").strip().lower()
                    if action in {"b",""}:break
                    if action=="r":continue
                    if action.isdigit() and 1<=int(action)<=len(targets):_populate_selected(data_root,targets[int(action)-1],session,input_fn,output_fn,theme)
                    else:output_fn("Choose a listed target number, R, or B.")
            elif choice == "7":
                output_fn(json.dumps(load_templates(data_root), indent=2) or "No templates.")
                if input_fn("Add/update template? [y/N]: ").strip().lower() == "y":
                    name = input_fn("Template name: ").strip()
                    app.save_template(name, prompt_entry(input_fn, output_fn))
                    output_fn("Template saved.")
            elif choice == "8":
                from populator.validator import validate_data_tree
                issues = validate_data_tree(data_root)
                output_fn("Validation passed." if not issues else "\n".join(map(str, issues)))
            elif choice == "9":
                from populator.backup import create_backup,undo_last
                action=input_fn("[B] Backup • [U] Undo: ").strip().lower()
                if action=="b":output_fn(f"Backup: {create_backup(data_root)}")
                elif action=="u":output_fn(f"Undid: {undo_last(data_root)}")
            elif choice == "10":
                pool_id=input_fn("Pool ID (for example hairstyle): ").strip()
                output_fn(json.dumps(inspect_pool(data_root,pool_id),indent=2,ensure_ascii=False))
                input_fn("[Enter] Back ")
            else:
                output_fn("Unknown choice.")
        except (ValueError, KeyError, OSError, json.JSONDecodeError, StopIteration) as error:
            output_fn(f"Error: {error}")
