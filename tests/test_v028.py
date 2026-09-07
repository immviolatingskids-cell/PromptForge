import tempfile
import unittest
from pathlib import Path

from populator.backup import undo_last
from populator.duplicate_detector import classify_pair
from populator.population import apply_population, population_plan, population_preview
from populator.schemas import make_entry
from populator.storage import category_path, load_entries, save_entries
from populator.validator import validate_entry


class ValuePopulationWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.data = self.root / "data"
        save_entries(category_path(self.data, "personality/values"), [make_entry("Loyalty", metadata={"family":"connection","cluster":"loyalty"})])

    def tearDown(self): self.tmp.cleanup()

    def test_value_metadata_and_legacy_entries_validate(self):
        self.assertEqual([], validate_entry(make_entry("Curiosity"), 0))
        entry = make_entry("Privacy", metadata={"family":"self_direction","cluster":"privacy","context_affinities":{"settings":["modern"]}})
        self.assertEqual([], validate_entry(entry, 0))
        self.assertTrue(validate_entry(make_entry("Bad", metadata={"family":"Not Readable"}), 0))

    def test_cluster_duplicate_is_identified(self):
        left=make_entry("Autonomy",metadata={"family":"self_direction","cluster":"autonomy"})
        right=make_entry("Independence",metadata={"family":"self_direction","cluster":"autonomy"})
        self.assertEqual("LIKELY_DUPLICATE",classify_pair(left,right)["classification"])

    def test_preview_is_dry_run_and_reports_threshold_transition(self):
        preview=population_preview(self.data,"personality/values","minimum","Curiosity\nFairness")
        self.assertFalse(preview["mutates"]); self.assertEqual((1,3),(preview["before"]["current"],preview["after"]["current"]))
        self.assertEqual(1,len(load_entries(category_path(self.data,"personality/values"))))

    def test_apply_is_backed_up_reported_and_undoable(self):
        result=apply_population(self.data,"personality/values","minimum","Curiosity\nFairness",backup_root=self.root/"backups")
        self.assertEqual((1,3),(result["before"]["current"],result["after"]["current"])); self.assertTrue(Path(result["backup"]).exists())
        undo_last(self.data); self.assertEqual(1,len(load_entries(category_path(self.data,"personality/values"))))

    def test_malformed_batch_does_not_mutate(self):
        with self.assertRaisesRegex(ValueError,"malformed"):
            apply_population(self.data,"personality/values","minimum","| invalid | |")
        self.assertEqual(1,len(load_entries(category_path(self.data,"personality/values"))))

    def test_plan_prioritizes_deficient_creative_pools_and_omits_countries(self):
        save_entries(category_path(self.data,"core/countries"),[make_entry("Example")])
        plan=population_plan(self.data)
        self.assertEqual("personality/values",plan[0]["branch"])
        self.assertNotIn("core/countries",{row["branch"] for row in plan})


if __name__ == "__main__": unittest.main()
