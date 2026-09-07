import tempfile
import unittest
import json
from pathlib import Path

from populator.backup import undo_last
from populator.deep_coverage import branch_coverage, category_coverage, context_coverage, leaf_coverage, preset_pools, set_leaf_target
from populator.coverage_priorities import set_priority
from populator.deep_pools import canonical_category, find_pool, leaf_pools, selection_config, validate_registry, validate_selection
from populator.inspector import inspect_pool
from populator.migration import approve_classification, classify_entry
from populator.population import enqueue_preset, load_queue, populate_deep_pool, resolve_queue_target
from populator.cli import interactive_menu
from populator.health import scan_health
from populator.deep_compatibility import compatibility_class, compatibility_score
from populator.schemas import make_entry
from populator.storage import category_path, load_entries, save_entries

ROOT=Path(__file__).resolve().parents[1]/"data"

class DeepPoolTests(unittest.TestCase):
    def setUp(self): self.tmp=tempfile.TemporaryDirectory(); self.data=Path(self.tmp.name)/"data"; (self.data/"pools").mkdir(parents=True); (self.data/"appearance").mkdir()
    def tearDown(self): self.tmp.cleanup()
    def copy_registry(self): (self.data/"pools"/"deep_pool_registry.json").write_text((ROOT/"pools"/"deep_pool_registry.json").read_text(encoding="utf-8"),encoding="utf-8")
    def test_registry_leaf_paths_and_targets(self):
        self.copy_registry(); pool=find_pool(self.data,"appearance/hair/hairstyle")
        self.assertEqual(["appearance","hair","hairstyle"],pool["path"]); self.assertEqual(50,pool["target"]); self.assertGreater(len(leaf_pools(self.data,"appearance")),20)
        self.assertEqual(("hair",True,False),(pool["parent"],pool["population_target"],pool["ignored"]))
        self.assertEqual("appearance/eyes",canonical_category(self.data,"eye_shape")); self.assertEqual("clothing/styles",canonical_category(self.data,"clothing_styles")); self.assertEqual("clothing/garments",canonical_category(self.data,"tops")); self.assertEqual("clothing/details",canonical_category(self.data,"materials"))
        self.assertEqual([],validate_registry(self.data))
    def test_selection_configuration_is_registry_driven(self):
        self.copy_registry(); config=selection_config(self.data,"tattoos")
        self.assertEqual(("multiple",True),(config["selection_mode"],config["none_allowed"]))
        self.assertEqual([],validate_selection(self.data,"tattoos",[])); self.assertTrue(validate_selection(self.data,"eye_shape",[])); self.assertTrue(validate_selection(self.data,"tattoos",["a","b","c","d"]))
    def test_registry_rejects_invalid_selection_mode(self):
        self.copy_registry(); path=self.data/"pools"/"deep_pool_registry.json"; document=json.loads(path.read_text(encoding="utf-8")); document["pools"]["hairstyle"]["selection_mode"]="many"; path.write_text(json.dumps(document),encoding="utf-8")
        self.assertTrue(any("selection mode" in error for error in validate_registry(self.data)))
    def test_leaf_and_parent_coverage_is_capped(self):
        self.copy_registry(); entries=[make_entry(f"Style {i}",metadata={"pool_id":"hairstyle"}) for i in range(60)]
        save_entries(category_path(self.data,"appearance/hair"),entries)
        self.assertEqual(100,next(row["coverage"] for row in leaf_coverage(self.data,"appearance") if row["id"]=="hairstyle"))
        self.assertTrue(any(row["id"]=="hair" for row in branch_coverage(self.data,"appearance")))
        summary=category_coverage(self.data,"appearance"); self.assertLessEqual(summary["coverage"],100); self.assertIn(summary["status"],{"Missing","Critical","Weak","Healthy","Strong"})
    def test_presets_are_leaf_queues(self):
        self.copy_registry(); pools=preset_pools(self.data,"hair_expansion")
        self.assertEqual({"hair_colour","hair_length","hair_texture","hairstyle","fringe_bangs","hair_details"},{p["id"] for p in pools})
    def test_approval_is_explicit_and_undoable(self):
        self.copy_registry(); entry=make_entry("Blunt Bob"); save_entries(category_path(self.data,"appearance/hair"),[entry])
        self.assertEqual("unclassified",classify_entry(self.data,"appearance/hair",entry)["status"])
        result=approve_classification(self.data,"appearance/hair","blunt_bob","hairstyle",self.data/"backups")
        self.assertEqual("hairstyle",load_entries(category_path(self.data,"appearance/hair"))[0]["metadata"]["pool_id"]); self.assertTrue(Path(result["backup"]).exists())
        undo_last(self.data); self.assertNotIn("pool_id",load_entries(category_path(self.data,"appearance/hair"))[0].get("metadata",{}))
    def test_inspector_reports_context(self):
        self.copy_registry(); save_entries(category_path(self.data,"appearance/hair"),[make_entry("Bob",metadata={"pool_id":"hairstyle"},compatibility={"settings":["modern"]})])
        report=inspect_pool(self.data,"hairstyle")
        self.assertEqual(1,report["entries"]); self.assertEqual(1,report["context_distribution"]["settings"]["modern"])
    def test_shared_entry_context_depth_does_not_duplicate(self):
        self.copy_registry(); save_entries(category_path(self.data,"appearance/eyes"),[make_entry("Almond",metadata={"pool_id":"eye_shape"},compatibility={"settings":["modern"]})])
        rows=context_coverage(self.data,"eye_shape",[{"settings":"modern"},{"settings":"fantasy"}])
        self.assertEqual([1,0],[row["effective"] for row in rows]); self.assertEqual(1,rows[0]["raw"])
    def test_deep_priority_ignore_is_respected(self):
        self.copy_registry(); set_priority(self.data,"appearance/hair/hairstyle","ignored")
        row=next(item for item in leaf_coverage(self.data,"appearance") if item["id"]=="hairstyle")
        self.assertTrue(row["ignored"])
    def test_leaf_target_override_is_persisted(self):
        self.copy_registry(); set_leaf_target(self.data,"hairstyle",3)
        row=next(item for item in leaf_coverage(self.data,"appearance") if item["id"]=="hairstyle")
        self.assertEqual((3,3), (row["target"],row["needed"]))
    def test_deep_population_updates_leaf_coverage(self):
        self.copy_registry(); save_entries(category_path(self.data,"appearance/hair"),[])
        review,backup=populate_deep_pool(self.data,"appearance/hair","hairstyle","Blunt Bob\nFrench Braid")
        self.assertEqual(2,len(review.valid)); self.assertTrue(backup and backup.exists())
        row=next(item for item in leaf_coverage(self.data,"appearance") if item["id"]=="hairstyle")
        self.assertEqual((2,48), (row["count"],row["needed"]))
        self.assertTrue(all(item.get("metadata",{}).get("pool_id")=="hairstyle" for item in load_entries(category_path(self.data,"appearance/hair"))))
    def test_interactive_dashboard_opens_deep_navigator(self):
        self.copy_registry(); answers=iter(["1","a","","0"]); output=[]
        interactive_menu(self.data,lambda prompt:next(answers),output.append)
        rendered="\n".join(output)
        self.assertIn("Appearance",rendered); self.assertIn("Hair",rendered)
    def test_dashboard_shows_weighted_deep_summary(self):
        self.copy_registry(); from populator.cli import format_dashboard
        output=format_dashboard(self.data)
        self.assertIn("Appearance",output); self.assertIn("Clothing",output); self.assertIn("0%",output)
    def test_health_reports_unclassified_deep_entries(self):
        self.copy_registry(); save_entries(category_path(self.data,"appearance/hair"),[make_entry("Mystery Feature")])
        self.assertTrue(any(item["code"]=="unclassified_deep_entry" for item in scan_health(self.data)["findings"]))

    def test_health_treats_unstarted_deep_backlog_as_information(self):
        self.copy_registry(); report=scan_health(self.data)
        self.assertFalse(any(item["severity"]=="WARNING" and item["code"]=="deep_pool_below_minimum" for item in report["findings"]))
        self.assertTrue(any(item["severity"]=="INFO" and item["code"]=="deep_pool_below_minimum" for item in report["findings"]))

    def test_health_ignores_known_distinct_region_names(self):
        self.copy_registry(); report=scan_health(ROOT)
        self.assertFalse(any(item["category"]=="core/regions" and item["code"]=="similar_entry" for item in report["findings"]))
    def test_shared_compatibility_is_soft_and_deterministic(self):
        entry=make_entry("Jacket",compatibility={"settings":["modern","cyberpunk"]})
        self.assertEqual("Exact",compatibility_class(entry,{"settings":"modern"})); self.assertEqual("Unusual",compatibility_class(entry,{"settings":"victorian"})); self.assertEqual(0.2,compatibility_score({**entry,"compatibility":{"settings":["modern"]}},{"settings":"fantasy"}))
    def test_interactive_pool_inspector_menu(self):
        self.copy_registry(); answers=iter(["10","hairstyle","","0"]); output=[]
        interactive_menu(self.data,lambda prompt:next(answers),output.append)
        self.assertIn('"id": "hairstyle"',"\n".join(output))
    def test_full_interactive_deep_leaf_acceptance_flow(self):
        self.copy_registry(); save_entries(category_path(self.data,"appearance/hair"),[])
        answers=iter(["1","a","hair","hairstyle","p","Wolf Cut","French Braid","/done","i","","0"]); output=[]
        interactive_menu(self.data,lambda prompt:next(answers),output.append)
        row=next(item for item in leaf_coverage(self.data,"appearance") if item["id"]=="hairstyle")
        self.assertEqual(2,row["count"]); self.assertIn("Imported; coverage refreshed.","\n".join(output))
    def test_clothing_deep_population_routes_to_garments(self):
        self.copy_registry(); review,backup=populate_deep_pool(self.data,"clothing/garments","tops","Oxford Shirt\nLinen Tee")
        self.assertEqual(2,len(review.valid)); self.assertTrue(backup and backup.exists())
        row=next(item for item in leaf_coverage(self.data,"clothing") if item["id"]=="tops")
        self.assertEqual((2,"clothing/garments"),(row["count"],"clothing/garments"))
        self.assertTrue(all(item["metadata"]["pool_id"]=="tops" for item in load_entries(category_path(self.data,"clothing/garments"))))

    def test_deep_preset_queue_resolves_and_remains_until_target(self):
        self.copy_registry(); queue=enqueue_preset(self.data,"hair_expansion")
        target=queue[0]; resolved=resolve_queue_target(self.data,target)
        self.assertEqual(("deep","hair_colour","appearance/hair"),(target["kind"],resolved["pool_id"],resolved["category"]))
        self.assertGreater(resolved["needed"],0)
        save_entries(category_path(self.data,"appearance/hair"),[make_entry("Colour",metadata={"pool_id":"hair_colour"}) for _ in range(target["target"])])
        resolved_after=resolve_queue_target(self.data,target)
        self.assertEqual(0,resolved_after["needed"])

    def test_interactive_deep_queue_stays_queued_below_target(self):
        self.copy_registry(); enqueue_preset(self.data,"hair_expansion")
        answers=iter(["4","q","","One Colour","/done","i","b","0"]); output=[]
        interactive_menu(self.data,lambda prompt:next(answers),output.append)
        self.assertTrue(load_queue(self.data))
        self.assertIn("One Colour",load_entries(category_path(self.data,"appearance/hair"))[0]["name"])

    def test_dashboard_leaf_population_uses_canonical_metadata(self):
        self.copy_registry(); save_entries(category_path(self.data,"appearance/hair"),[])
        answers=iter(["1","a","hair","hairstyle","p","Textured Bob","/done","i","","0"]); output=[]
        interactive_menu(self.data,lambda prompt:next(answers),output.append)
        entry=load_entries(category_path(self.data,"appearance/hair"))[0]
        self.assertEqual({"pool_id":"hairstyle","pool_path":"appearance/hair/hairstyle","subcategory":"hairstyle"},{key:entry["metadata"][key] for key in ("pool_id","pool_path","subcategory")})
        self.assertEqual(1,next(row for row in leaf_coverage(self.data,"appearance") if row["id"]=="hairstyle")["count"])

    def test_migration_rejects_cross_category_assignments(self):
        self.copy_registry(); save_entries(category_path(self.data,"appearance/hair"),[make_entry("Bob")]); save_entries(category_path(self.data,"clothing/garments"),[make_entry("Shirt")])
        with self.assertRaises(ValueError): approve_classification(self.data,"appearance/hair","bob","tops")
        with self.assertRaises(ValueError): approve_classification(self.data,"clothing/garments","shirt","hairstyle")

if __name__=="__main__": unittest.main()
