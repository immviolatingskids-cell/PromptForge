"""PersonaForge Populator command-line entry point."""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Running ``python populator/main.py`` gives this file no package context and
# normally hides the project root from imports. Keep direct execution friendly
# while retaining package imports for ``python -m populator.main``.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from populator.cli import Populator, format_rows, interactive_menu
from populator.backup import create_backup, undo_last
from populator.coverage import coverage_report, library_statistics
from populator.importer import import_valid, parse_import, review_import
from populator.schemas import csv_list, make_entry
from populator.templates import load_templates
from populator.validator import discover_data_files, validate_data_tree
from populator.expansions import expand
from populator.coverage_priorities import load as load_priorities, set_priority
from populator.coverage import effective_pool_depth, set_target
from populator.health import scan_health
from populator.population import add_to_queue, apply_population, batch_metadata, enqueue_preset, load_queue, parse_pasted, population_plan, population_preview, remove_from_queue, reorder_queue, resolve_existing, populate_deep_pool, deep_workshop_preview
from populator.deep_pools import leaf_pools
from populator.deep_coverage import preset_pools, set_leaf_target, context_coverage
from populator.inspector import inspect_pool
from populator.migration import unclassified_entries, approve_classification, safe_migration_plan, apply_safe_migration
from populator.tree_view import render_tree
from populator.duplicate_detector import classify_duplicates
from populator.quality import quality_report
from populator.planner import plan_batch

PROJECT_ROOT = Path(__file__).resolve().parent.parent

def add_entry_options(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("category"); parser.add_argument("--name", required=True); parser.add_argument("--id")
    parser.add_argument("--description", default=""); parser.add_argument("--tags", default="")
    for option in ("settings", "eras", "species", "life-stages", "countries"):
        parser.add_argument(f"--{option}", default="")
    parser.add_argument("--template")

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="PersonaForge Populator")
    parser.add_argument("--data", type=Path, default=PROJECT_ROOT / "data", help="data directory")
    commands = parser.add_subparsers(dest="command")
    commands.add_parser("menu"); commands.add_parser("validate"); commands.add_parser("categories")
    commands.add_parser("backup"); commands.add_parser("undo"); commands.add_parser("stats"); commands.add_parser("coverage"); commands.add_parser("health"); commands.add_parser("quality")
    next_plan=commands.add_parser("populate-plan"); next_plan.add_argument("--limit",type=int)
    populate=commands.add_parser("populate"); populate.add_argument("branch"); populate.add_argument("--goal",choices=("minimum","healthy","target"),default="healthy"); populate.add_argument("--text",required=True); populate.add_argument("--defaults",default="{}"); populate.add_argument("--apply",action="store_true")
    plan = commands.add_parser("plan"); plan.add_argument("category"); plan.add_argument("path", type=Path)
    deep = commands.add_parser("deep-pools"); deep.add_argument("category", nargs="?"); deep.add_argument("--preset")
    inspector = commands.add_parser("pool-inspect"); inspector.add_argument("pool_id")
    context = commands.add_parser("pool-context"); context.add_argument("pool_id"); context.add_argument("--contexts",required=True,help='JSON list, e.g. [{"settings":"modern"}]')
    deep_add = commands.add_parser("deep-add"); deep_add.add_argument("pool_id"); deep_add.add_argument("--text",required=True); deep_add.add_argument("--category"); deep_add.add_argument("--apply",action="store_true")
    workshop = commands.add_parser("deep-workshop"); workshop.add_argument("pool_id"); workshop.add_argument("--text",required=True)
    preset = commands.add_parser("deep-preset"); preset.add_argument("preset"); preset.add_argument("--goal",choices=("minimum-first","healthy-first","target"),default="minimum-first")
    deep_target = commands.add_parser("deep-target"); deep_target.add_argument("pool_id"); deep_target.add_argument("target",type=int); deep_target.add_argument("--minimum",type=int); deep_target.add_argument("--healthy",type=int)
    tree = commands.add_parser("deep-tree"); tree.add_argument("category",choices=("appearance","clothing")); tree.add_argument("--expand",action="append",default=[]); tree.add_argument("--ascii",action="store_true")
    inbox = commands.add_parser("unclassified"); inbox.add_argument("--apply-category"); inbox.add_argument("--entry-id"); inbox.add_argument("--pool-id"); inbox.add_argument("--apply",action="store_true")
    migrate = commands.add_parser("migrate-deep"); migrate.add_argument("--apply",action="store_true")
    pool = commands.add_parser("pool-depth"); pool.add_argument("category");
    for option in ("setting","era","life-stage","species","country","gender-relevance"): pool.add_argument(f"--{option}")
    target = commands.add_parser("coverage-target"); target.add_argument("branch"); target.add_argument("minimum",type=int); target.add_argument("--healthy",type=int); target.add_argument("--target",type=int)
    rapid = commands.add_parser("rapid-add"); rapid.add_argument("category"); rapid.add_argument("--subcategory"); rapid.add_argument("--text",required=True); rapid.add_argument("--apply",action="store_true")
    batch = commands.add_parser("batch-metadata"); batch.add_argument("category"); batch.add_argument("ids",nargs="?",default="all"); batch.add_argument("--query",default=""); batch.add_argument("--subcategory"); batch.add_argument("--settings",default=""); batch.add_argument("--eras",default=""); batch.add_argument("--species",default=""); batch.add_argument("--life-stages",default=""); batch.add_argument("--countries",default=""); batch.add_argument("--metadata",default="{}"); batch.add_argument("--replace",action="store_true"); batch.add_argument("--apply",action="store_true")
    queue = commands.add_parser("queue"); queue.add_argument("action",choices=("list","add","remove","up","down")); queue.add_argument("branch",nargs="?"); queue.add_argument("--target",type=int); queue.add_argument("--goal",choices=("minimum","healthy","target"),default="minimum")
    duplicate = commands.add_parser("duplicates"); duplicate.add_argument("category"); duplicate.add_argument("--name")
    resolve = commands.add_parser("resolve-duplicate"); resolve.add_argument("category"); resolve.add_argument("source_id"); resolve.add_argument("target_id"); resolve.add_argument("action",choices=("merge","variant","keep","skip"))
    expansion = commands.add_parser("expand"); expansion.add_argument("category"); expansion.add_argument("entry_id"); expansion.add_argument("--level", choices=("none","common","full"), default="common")
    priority = commands.add_parser("coverage-priority"); priority.add_argument("branch", nargs="?"); priority.add_argument("priority", nargs="?", choices=("high","normal","low","ignored"))
    add_entry_options(commands.add_parser("add"))
    edit = commands.add_parser("edit"); edit.add_argument("category"); edit.add_argument("entry_id"); edit.add_argument("--name"); edit.add_argument("--description")
    delete = commands.add_parser("delete"); delete.add_argument("category"); delete.add_argument("entry_id")
    clone = commands.add_parser("clone"); clone.add_argument("category"); clone.add_argument("entry_id"); clone.add_argument("--id", required=True); clone.add_argument("--name", required=True)
    browse = commands.add_parser("browse"); browse.add_argument("category", nargs="?")
    search = commands.add_parser("search"); search.add_argument("query",nargs="?",default=""); search.add_argument("--category"); search.add_argument("--subcategory"); search.add_argument("--setting",default=""); search.add_argument("--era",default=""); search.add_argument("--life-stage",default=""); search.add_argument("--species",default=""); search.add_argument("--country",default=""); search.add_argument("--gender-relevance",default="")
    template = commands.add_parser("template"); template.add_argument("action", choices=("list", "save", "delete")); template.add_argument("name", nargs="?"); template.add_argument("--json")
    bulk = commands.add_parser("bulk-import"); bulk.add_argument("category"); bulk.add_argument("path", type=Path); bulk.add_argument("--apply", action="store_true")
    return parser

def entry_from_args(args: argparse.Namespace, data_root: Path) -> dict[str, Any]:
    defaults = load_templates(data_root).get(args.template, {}) if args.template else {}
    compatibility = {field: csv_list(getattr(args, field)) or defaults.get("compatibility", {}).get(field, []) for field in ("settings", "eras", "species", "countries")}
    compatibility["life_stages"] = csv_list(args.life_stages) or defaults.get("compatibility", {}).get("life_stages", [])
    return make_entry(args.name, args.id, args.description or defaults.get("description", ""), tags=csv_list(args.tags) or defaults.get("tags"), compatibility=compatibility, metadata=defaults.get("metadata"))

def main() -> int:
    parser = build_parser(); args = parser.parse_args()
    if args.command in (None, "menu"):
        interactive_menu(args.data); return 0
    app = Populator(args.data)
    try:
        if args.command == "validate":
            issues = validate_data_tree(args.data)
            if issues:
                print(f"Validation failed with {len(issues)} issue(s):"); print("\n".join(f"- {issue}" for issue in issues)); return 1
            print(f"Validation passed: {sum(1 for _ in discover_data_files(args.data))} canonical JSON file(s) checked.")
        elif args.command == "categories":
            from populator.storage import list_categories
            print("\n".join(list_categories(args.data)))
        elif args.command == "backup": print(create_backup(args.data))
        elif args.command == "undo": print(f"Undid {undo_last(args.data)}.")
        elif args.command == "stats": print(json.dumps(library_statistics(args.data), indent=2))
        elif args.command == "coverage": print(json.dumps(coverage_report(args.data), indent=2))
        elif args.command == "health": print(json.dumps(scan_health(args.data),indent=2))
        elif args.command == "quality":
            result = quality_report(args.data); print(json.dumps(result, indent=2)); return 0 if result["passed"] else 1
        elif args.command == "populate-plan": print(json.dumps(population_plan(args.data,args.limit),indent=2))
        elif args.command == "populate":
            defaults=json.loads(args.defaults)
            result=apply_population(args.data,args.branch,args.goal,args.text,defaults) if args.apply else population_preview(args.data,args.branch,args.goal,args.text,defaults)
            review=result.pop("preview",None)
            if review: result.update({"entries":review.valid,"duplicates":review.duplicates,"variants":review.variants,"errors":review.errors})
            print(json.dumps(result,indent=2,ensure_ascii=False))
        elif args.command == "plan":
            print(json.dumps(plan_batch(args.data, args.category, parse_import(args.path)), indent=2))
        elif args.command == "deep-pools": print(json.dumps(preset_pools(args.data,args.preset) if args.preset else leaf_pools(args.data,args.category),indent=2,ensure_ascii=False))
        elif args.command == "pool-inspect": print(json.dumps(inspect_pool(args.data,args.pool_id),indent=2,ensure_ascii=False))
        elif args.command == "pool-context": print(json.dumps(context_coverage(args.data,args.pool_id,json.loads(args.contexts)),indent=2,ensure_ascii=False))
        elif args.command == "deep-add":
            from populator.deep_pools import canonical_category
            category=args.category or canonical_category(args.data,args.pool_id)
            if args.apply:
                review,backup=populate_deep_pool(args.data,category,args.pool_id,args.text)
                print(json.dumps({"valid":len(review.valid),"variants":len(review.variants),"duplicates":len(review.duplicates),"errors":len(review.errors),"backup":str(backup) if backup else None},indent=2))
            else:
                review=parse_pasted(args.text,{"pool_id":args.pool_id}); print(json.dumps({"category":category,"pool_id":args.pool_id,"valid":len(review),"preview":[entry["name"] for entry in review]},indent=2))
        elif args.command == "deep-workshop":
            result=deep_workshop_preview(args.data,args.pool_id,args.text)
            review=result.pop("review"); print(json.dumps({**result,"valid":len(review.valid),"variants":len(review.variants),"duplicates":len(review.duplicates),"errors":len(review.errors)},indent=2))
        elif args.command == "deep-preset": print(json.dumps(enqueue_preset(args.data,args.preset,args.goal),indent=2,ensure_ascii=False))
        elif args.command == "deep-target": set_leaf_target(args.data,args.pool_id,args.target,args.minimum,args.healthy); print(f"Set deep thresholds for {args.pool_id}.")
        elif args.command == "deep-tree": print(render_tree(args.data,args.category,set(args.expand),not args.ascii))
        elif args.command == "unclassified":
            if args.apply:
                if not all((args.apply_category,args.entry_id,args.pool_id)): parser.error("--apply requires --apply-category, --entry-id, and --pool-id")
                print(json.dumps(approve_classification(args.data,args.apply_category,args.entry_id,args.pool_id),indent=2))
            else: print(json.dumps(unclassified_entries(args.data),indent=2,ensure_ascii=False))
        elif args.command == "migrate-deep": print(json.dumps(apply_safe_migration(args.data) if args.apply else safe_migration_plan(args.data),indent=2,ensure_ascii=False))
        elif args.command == "pool-depth":
            context={"settings":args.setting,"eras":args.era,"life_stages":args.life_stage,"species":args.species,"countries":args.country,"gender_relevance":args.gender_relevance};print(json.dumps(effective_pool_depth(args.data,args.category,context),indent=2))
        elif args.command == "coverage-target": set_target(args.data,args.branch,args.minimum,args.healthy,args.target);print(f"Set thresholds for {args.branch}.")
        elif args.command == "rapid-add":
            candidates=parse_pasted(args.text,subcategory=args.subcategory);review=review_import(candidates,[entry for _,entry in app.browse(args.category)]);print(json.dumps({"valid":len(review.valid),"variants":len(review.variants),"duplicates":len(review.duplicates),"errors":len(review.errors)},indent=2))
            if args.apply:backup=import_valid(args.data,args.category,review);print(f"Imported {len(review.valid)} entries. Backup: {backup}")
        elif args.command == "batch-metadata":
            compatibility={field:csv_list(getattr(args,field)) for field in ("settings","eras","species","countries")};compatibility["life_stages"]=csv_list(args.life_stages);compatibility={key:value for key,value in compatibility.items() if value};selected=app.filter_entries(args.query,args.category,args.subcategory);ids=[entry["id"] for _,entry in selected] if args.ids=="all" else csv_list(args.ids);preview={"selected":len(ids),"entry_ids":ids,"compatibility":compatibility,"metadata":json.loads(args.metadata),"replace":args.replace};print(json.dumps(batch_metadata(args.data,args.category,ids,compatibility,json.loads(args.metadata),args.replace) if args.apply else {**preview,"status":"preview; rerun with --apply"},indent=2))
        elif args.command == "queue":
            if args.action=="list":value=load_queue(args.data)
            elif not args.branch:parser.error("queue action requires branch")
            elif args.action=="add":value=add_to_queue(args.data,args.branch,args.target,args.goal)
            elif args.action=="remove":value=remove_from_queue(args.data,args.branch)
            else:value=reorder_queue(args.data,args.branch,-1 if args.action=="up" else 1)
            print(json.dumps(value,indent=2))
        elif args.command == "duplicates":
            entries=[entry for _,entry in app.browse(args.category)]
            if args.name:print(json.dumps(classify_duplicates(make_entry(args.name),entries),indent=2))
            else:
                pairs=[]
                for index,entry in enumerate(entries):
                    for match in classify_duplicates(entry,entries[index+1:]):pairs.append({"source":entry["id"],**match})
                print(json.dumps(pairs,indent=2))
        elif args.command == "resolve-duplicate":print(json.dumps(resolve_existing(args.data,args.category,args.source_id,args.target_id,args.action),indent=2))
        elif args.command == "expand": print("\n".join(expand(args.data,args.category,args.entry_id,args.level)))
        elif args.command == "coverage-priority":
            if args.branch and args.priority: set_priority(args.data,args.branch,args.priority); print(f"Set {args.branch} to {args.priority}.")
            else: print(json.dumps(load_priorities(args.data),indent=2))
        elif args.command == "bulk-import":
            existing = app.browse(args.category)
            review = review_import(parse_import(args.path), [entry for _, entry in existing])
            print(json.dumps({"valid": len(review.valid), "variants":len(review.variants), "duplicates": len(review.duplicates), "errors": len(review.errors)}, indent=2))
            if args.apply:
                backup = import_valid(args.data, args.category, review)
                print(f"Imported {len(review.valid)} entries. Backup: {backup}")
        elif args.command == "add":
            entry = entry_from_args(args, args.data); app.add(args.category, entry); print(f"Added {entry['id']}.")
        elif args.command == "edit":
            changes = {key: value for key, value in {"name": args.name, "description": args.description}.items() if value is not None}; print(json.dumps(app.edit(args.category, args.entry_id, changes), indent=2))
        elif args.command == "delete": print(f"Deleted {app.delete(args.category, args.entry_id)['id']}.")
        elif args.command == "clone": print(json.dumps(app.clone(args.category, args.entry_id, args.id, args.name), indent=2))
        elif args.command == "browse": print(format_rows(app.browse(args.category)))
        elif args.command == "search": print(format_rows(app.filter_entries(args.query,args.category,args.subcategory,setting=args.setting,era=args.era,life_stage=args.life_stage,species=args.species,country=args.country,gender_relevance=args.gender_relevance)))
        elif args.command == "template":
            if args.action == "list": print(json.dumps(load_templates(args.data), indent=2))
            elif not args.name: parser.error("template save/delete requires a name")
            elif args.action == "save":
                if not args.json: parser.error("template save requires --json")
                app.save_template(args.name, json.loads(args.json)); print(f"Saved template {args.name}.")
            else: app.delete_template(args.name); print(f"Deleted template {args.name}.")
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as error: parser.error(str(error))
    return 0

if __name__ == "__main__": raise SystemExit(main())
