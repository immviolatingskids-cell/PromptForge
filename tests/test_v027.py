import json
import tempfile
import unittest
from pathlib import Path

from populator.cli import format_dashboard
from populator.coverage import library_health_score, pool_coverage, set_target
from populator.coverage_targets import CoverageThresholds, deep_thresholds, resolve_thresholds
from populator.deep_coverage import leaf_coverage
from populator.health import scan_health
from populator.population import add_to_queue, enqueue_preset, load_queue, resolve_queue_target
from populator.schemas import make_entry
from populator.storage import category_path, save_entries


ROOT = Path(__file__).resolve().parents[1] / "data"


class UnifiedCoverageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.data = Path(self.tmp.name) / "data"
        (self.data / "pools").mkdir(parents=True)

    def tearDown(self):
        self.tmp.cleanup()

    def copy_registry(self):
        source = ROOT / "pools" / "deep_pool_registry.json"
        (self.data / "pools" / source.name).write_text(source.read_text(encoding="utf-8"), encoding="utf-8")

    def save_count(self, category, count, pool_id=None):
        metadata = {"pool_id": pool_id} if pool_id else None
        save_entries(category_path(self.data, category), [make_entry(f"Entry {index}", metadata=metadata) for index in range(count)])

    def test_missing_thresholds_receive_ordered_defaults(self):
        self.assertEqual((10, 20, 40), tuple(resolve_thresholds().__dict__.values())[:3])
        self.assertEqual((25, 40, 50), tuple(deep_thresholds({"target": 50}).__dict__.values())[:3])

    def test_threshold_ordering_is_validated(self):
        with self.assertRaisesRegex(ValueError, "target >= healthy >= minimum"):
            CoverageThresholds(10, 9, 20)
        with self.assertRaisesRegex(ValueError, "target >= healthy >= minimum"):
            resolve_thresholds({"minimum": 10, "healthy": 20, "target": 19})

    def test_legacy_pool_exposes_unified_status_and_gaps(self):
        self.save_count("personality/values", 15)
        row = next(pool for pool in pool_coverage(self.data) if pool.branch == "personality/values")
        self.assertEqual((15, 10, 20, 40, "minimum"), (row.current, row.minimum, row.healthy, row.target, row.status))
        self.assertEqual((0, 5, 25), (row.needed_to_minimum, row.needed_to_healthy, row.needed_to_target))

    def test_deep_leaf_keeps_healthy_distinct_from_target(self):
        self.copy_registry()
        row = next(item for item in leaf_coverage(self.data, "appearance") if item["id"] == "hairstyle")
        self.assertEqual((25, 40, 50), (row["minimum"], row["healthy"], row["target"]))
        self.assertEqual(("deficient", 25, 40, 50), (row["status"], row["needed_to_minimum"], row["needed_to_healthy"], row["needed_to_target"]))

    def test_old_deep_override_is_normalized_as_its_historic_target(self):
        self.copy_registry()
        config = self.data.parent / ".personaforge" / "coverage_config.json"
        config.parent.mkdir()
        config.write_text(json.dumps({"targets": {"hairstyle": {"minimum": 12, "healthy": 12}}}), encoding="utf-8")
        row = next(item for item in leaf_coverage(self.data) if item["id"] == "hairstyle")
        self.assertEqual((6, 10, 12), (row["minimum"], row["healthy"], row["target"]))

    def test_queue_goals_preserve_minimum_healthy_and_target_intent(self):
        self.save_count("narrative/goals", 1)
        expected = {"minimum": 10, "healthy": 20, "target": 40}
        for goal, threshold in expected.items():
            queue = add_to_queue(self.data, "narrative/goals", goal=goal)
            self.assertEqual((f"bring-to-{goal}", threshold), (queue[0]["goal"], queue[0]["goal_threshold"]))
            resolved = resolve_queue_target(self.data, queue[0])
            self.assertEqual((goal, threshold, threshold - 1), (resolved["goal_policy"], resolved["goal_threshold"], resolved["needed"]))

    def test_presets_default_to_minimum_first_and_support_other_policies(self):
        self.copy_registry()
        for policy, goal in (("minimum-first", "minimum"), ("healthy-first", "healthy"), ("target", "target")):
            queue_file = self.data.parent / ".personaforge" / "population_queue.json"
            if queue_file.exists():
                queue_file.unlink()
            queue = enqueue_preset(self.data, "hair_expansion", policy)
            self.assertTrue(queue)
            self.assertTrue(all(item["goal"] == f"bring-to-{goal}" and item["goal_threshold"] == item[goal] for item in queue))

    def test_dashboard_shows_each_threshold_without_ambiguous_depth(self):
        self.copy_registry()
        rendered = format_dashboard(self.data)
        self.assertIn("COUNT", rendered)
        self.assertIn("HEALTHY", rendered)
        self.assertIn("TARGET", rendered)
        self.assertIn("min", rendered)

    def test_health_is_not_reduced_by_unfinished_expansion_target(self):
        self.save_count("personality/values", 20)
        set_target(self.data, "personality/values", 10, 20, 100)
        row = next(pool for pool in pool_coverage(self.data) if pool.branch == "personality/values")
        self.assertEqual("healthy", row.status)
        self.assertEqual(100, library_health_score(self.data))
        report = scan_health(self.data)
        self.assertEqual(1, report["coverage_readiness"]["healthy"])
        self.assertEqual(80, report["coverage_readiness"]["pools"][0]["needed_to_target"])

    def test_old_queue_records_still_resolve_with_original_defaults(self):
        self.copy_registry()
        old_deep = {"kind": "deep", "branch": "appearance/hair/hairstyle", "pool_id": "hairstyle", "target": 50}
        resolved = resolve_queue_target(self.data, old_deep)
        self.assertEqual(("target", 50, 50), (resolved["goal_policy"], resolved["goal_threshold"], resolved["needed"]))


if __name__ == "__main__":
    unittest.main()
