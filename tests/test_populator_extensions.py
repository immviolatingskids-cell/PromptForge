import json
import tempfile
import unittest
from pathlib import Path

from populator.backup import list_history, record_undo
from populator.fixtures import generate_entries
from populator.planner import plan_batch
from populator.quality import quality_report
from populator.schemas import make_entry
from populator.storage import category_path, save_entries
from populator.validator import validate_data_tree

class PopulatorExtensionTests(unittest.TestCase):
    def test_public_validation_includes_special_documents(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "data"; (root / "templates").mkdir(parents=True)
            (root / "templates" / "entry_templates.json").write_text('{"x":{"tags":"bad"}}', encoding="utf-8")
            self.assertTrue(any("tags" in str(x) for x in validate_data_tree(root)))

    def test_history_and_fixture_are_deterministic(self):
        self.assertEqual(generate_entries(2), generate_entries(2))
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "data"; root.mkdir(); record_undo(root, [], "test")
            self.assertEqual("test", list_history(root)[-1]["action"])

    def test_plan_is_dry_run_and_quality_reports_validation(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "data"; root.mkdir()
            (root / "data_version.json").write_text('{"data_version":"0.2.7"}', encoding="utf-8")
            (root / "schema_version.json").write_text('{"schema_version":"1.0"}', encoding="utf-8")
            save_entries(category_path(root, "x"), [make_entry("One")])
            result = plan_batch(root, "x", [make_entry("Two")])
            self.assertEqual((1, 1, 2), (result["before"], result["proposed"], result["after"]))
            self.assertFalse(result["mutates"])
            self.assertTrue(quality_report(root)["passed"])

if __name__ == "__main__": unittest.main()
