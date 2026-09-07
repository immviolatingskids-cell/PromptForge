import io
import tempfile
import unittest
from pathlib import Path

from populator.backup import undo_last
from populator.coverage import diversity_analysis, effective_pool_depth, library_health_score, pool_coverage, recommendations, set_target
from populator.coverage_priorities import set_priority
from populator.duplicate_detector import classify_pair
from populator.health import scan_health
from populator.importer import review_import
from populator.population import PopulationSession, add_to_queue, batch_metadata, load_queue, parse_pasted, remove_from_queue, reorder_queue, resolve_existing
from populator.schemas import make_entry
from populator.storage import category_path, load_entries, save_entries
from populator.theme import Theme, supports_unicode
from populator.cli import Populator, interactive_menu


class V025Tests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.data = self.root / "data"
        self.data.mkdir()

    def tearDown(self):
        self.temporary.cleanup()

    def save(self, category, entries):
        save_entries(category_path(self.data, category), entries)

    def test_effective_pool_depth_combines_context(self):
        self.save("lifestyle/housing", [
            make_entry("General"),
            make_entry("Modern UK", compatibility={"settings": ["modern"], "countries": ["united_kingdom"]}),
            make_entry("Fantasy", compatibility={"settings": ["fantasy"]}),
        ])
        result = effective_pool_depth(self.data, "lifestyle/housing", {"settings": "modern", "countries": "united_kingdom"})
        self.assertEqual((3, 2), (result["raw"], result["effective"]))

    def test_subcategory_analysis_and_concentration(self):
        entries = [make_entry(f"Game {i}", metadata={"subcategory": "Gaming"}) for i in range(8)]
        entries += [make_entry(f"Walk {i}", metadata={"subcategory": "Outdoors"}) for i in range(2)]
        self.save("lifestyle/hobbies", entries)
        result = diversity_analysis(self.data, "lifestyle/hobbies")
        self.assertTrue(result["concentrated"])
        self.assertEqual(8, result["subcategories"]["gaming"])

    def test_ignored_branches_do_not_reduce_health_or_recommend(self):
        self.save("narrative/secrets", [make_entry("None")])
        before = library_health_score(self.data)
        set_priority(self.data, "narrative/secrets", "ignored")
        self.assertEqual(100, library_health_score(self.data))
        self.assertGreaterEqual(100, before)
        self.assertFalse(recommendations(self.data))

    def test_category_target_override(self):
        self.save("personality/values", [make_entry(f"Value {i}") for i in range(6)])
        set_target(self.data, "personality/values", 5, 12)
        pool = next(item for item in pool_coverage(self.data) if item.branch == "personality/values")
        self.assertEqual((5, 12, 0), (pool.minimum, pool.healthy, pool.needed))

    def test_duplicate_classifications_are_transparent(self):
        self.assertEqual("DUPLICATE", classify_pair(make_entry("Photography"), make_entry("photography", "other"))["classification"])
        self.assertEqual("LIKELY_DUPLICATE", classify_pair(make_entry("Street-photography"), make_entry("Street Photography", "other"))["classification"])
        self.assertEqual("POSSIBLE_VARIANT", classify_pair(make_entry("Photography"), make_entry("Street Photography"))["classification"])
        self.assertEqual("DISTINCT", classify_pair(make_entry("Photography"), make_entry("Boxing"))["classification"])

    def test_possible_variant_remains_importable(self):
        review = review_import([make_entry("Street Photography")], [make_entry("Photography")])
        self.assertEqual((1, 1, 0), (len(review.valid), len(review.variants), len(review.duplicates)))

    def test_pasted_input_inherits_metadata_and_normalizes_subcategory(self):
        entries = parse_pasted("Dinner Parties\nEscape Rooms, Trivia Nights", {"compatibility": {"settings": ["modern"]}}, "Social Activities")
        self.assertEqual(3, len(entries))
        self.assertEqual(["modern"], entries[0]["compatibility"]["settings"])
        self.assertEqual("social_activities", entries[0]["metadata"]["subcategory"])

    def test_markdown_table_population_preserves_id_range_and_purpose(self):
        text = "| ID | Cohort | Rough birth range | Purpose |\n| --- | --- | --- | --- |\n| `cohort_generation_x` | Generation X | 1965–1980 | Analog childhood |"
        entries = parse_pasted(text)
        self.assertEqual(1, len(entries))
        self.assertEqual("cohort_generation_x", entries[0]["id"])
        self.assertEqual("1965–1980", entries[0]["metadata"]["rough_range"])
        self.assertEqual("Analog childhood", entries[0]["description"])

    def test_batch_metadata_is_backed_up_and_undoable(self):
        self.save("lifestyle/hobbies", [make_entry("Cooking"), make_entry("Boxing")])
        result = batch_metadata(self.data, "lifestyle/hobbies", ["cooking", "boxing"], {"settings": ["modern"]}, {"subcategory": "general"}, backup_root=self.root / "backups")
        self.assertEqual(2, result["modified"])
        self.assertTrue(Path(result["backup"]).exists())
        self.assertEqual(["modern"], load_entries(category_path(self.data, "lifestyle/hobbies"))[0]["compatibility"]["settings"])
        undo_last(self.data)
        self.assertEqual([], load_entries(category_path(self.data, "lifestyle/hobbies"))[0]["compatibility"]["settings"])

    def test_population_queue_add_reorder_remove(self):
        self.save("narrative/goals", [make_entry("Goal")])
        self.save("narrative/secrets", [make_entry("Secret")])
        add_to_queue(self.data, "narrative/goals")
        add_to_queue(self.data, "narrative/secrets")
        reorder_queue(self.data, "narrative/secrets", -1)
        self.assertEqual("narrative/secrets", load_queue(self.data)[0]["branch"])
        remove_from_queue(self.data, "narrative/secrets")
        self.assertEqual(["narrative/goals"], [item["branch"] for item in load_queue(self.data)])

    def test_population_session_tracks_progress(self):
        self.save("personality/values", [make_entry("Loyalty")])
        session = PopulationSession(self.data)
        self.save("personality/values", [make_entry("Loyalty"), make_entry("Freedom")])
        review = review_import([make_entry("Loyalty")], load_entries(category_path(self.data, "personality/values")))
        session.record_import("personality/values", 1, review)
        self.assertEqual(1, session.summary()["added"])
        self.assertEqual(1, session.summary()["duplicates_avoided"])

    def test_health_scan_separates_severity(self):
        self.save("personality/values", [make_entry("Loyalty"), make_entry("loyalty", "other")])
        report = scan_health(self.data)
        self.assertGreaterEqual(report["summary"]["warnings"], 1)
        self.assertIn("INFO", {item["severity"] for item in report["findings"]})

    def test_ascii_fallback_and_terminal_width(self):
        stream = io.TextIOWrapper(io.BytesIO(), encoding="ascii")
        self.assertFalse(supports_unicode(stream))
        theme = Theme(False, 44)
        self.assertNotIn("⚒", theme.header("PERSONAFORGE", "Library Workshop"))
        self.assertEqual(44, len(theme.rule()))
        self.assertLessEqual(max(map(len, theme.table(["ONE", "TWO"], [["x" * 100, "y"]]).splitlines())), 50)

    def test_browse_filters_context_and_subcategory(self):
        self.save("lifestyle/hobbies", [make_entry("Trivia", compatibility={"settings": ["modern"]}, metadata={"subcategory": "social"}), make_entry("Archery", compatibility={"settings": ["fantasy"]}, metadata={"subcategory": "physical"})])
        rows = Populator(self.data).filter_entries(category="lifestyle/hobbies", subcategory="Social", setting="modern")
        self.assertEqual(["trivia"], [entry["id"] for _, entry in rows])

    def test_gender_relevance_filters_effective_pool(self):
        self.save("clothing/styles", [make_entry("Any"), make_entry("Feminine", metadata={"gender_relevance": "feminine_coded"})])
        result = effective_pool_depth(self.data, "clothing/styles", {"gender_relevance": "masculine_coded"})
        self.assertEqual(1, result["effective"])

    def test_duplicate_merge_is_backed_up_and_undoable(self):
        self.save("lifestyle/hobbies", [make_entry("Photography", aliases=["Photo"]), make_entry("Taking Photographs", tags=["creative"])])
        result = resolve_existing(self.data, "lifestyle/hobbies", "taking_photographs", "photography", "merge", self.root / "backups")
        self.assertTrue(Path(result["backup"]).exists())
        entries = load_entries(category_path(self.data, "lifestyle/hobbies"))
        self.assertEqual(1, len(entries))
        self.assertIn("Taking Photographs", entries[0]["aliases"])
        undo_last(self.data)
        self.assertEqual(2, len(load_entries(category_path(self.data, "lifestyle/hobbies"))))

    def test_interactive_menu_smoke_in_basic_mode(self):
        self.save("personality/values", [make_entry("Loyalty")])
        answers = iter(["1", "", "0"])
        output = []
        interactive_menu(self.data, lambda prompt: next(answers), output.append)
        rendered = "\n".join(output)
        self.assertIn("PERSONAFORGE POPULATOR", rendered)
        self.assertIn("LIBRARY NEEDS ATTENTION", rendered)
        self.assertIn("Today's Population Summary", rendered)

    def test_population_workshop_acceptance_flow(self):
        self.save("personality/values", [make_entry("Loyalty")])
        additions = ["Curiosity", "Fairness", "Freedom", "Community", "Craftsmanship", "Knowledge", "Stability", "Tradition", "Discovery"]
        answers = iter(["4", "", *additions, "/done", "i", "0"])
        output = []
        interactive_menu(self.data, lambda prompt: next(answers), output.append)
        self.assertEqual(10, len(load_entries(category_path(self.data, "personality/values"))))
        rendered = "\n".join(output)
        self.assertIn("Preview: 9 new", rendered)
        self.assertIn("Added 9: 1", rendered)

    def test_health_menu_populates_without_returning_to_main_menu(self):
        self.save("personality/values", [make_entry("Loyalty")])
        additions = ["Curiosity", "Fairness", "Freedom", "Community", "Craftsmanship", "Knowledge", "Stability", "Tradition", "Discovery"]
        answers = iter(["6", "1", *additions, "/done", "i", "b", "0"])
        output = []
        interactive_menu(self.data, lambda prompt: next(answers), output.append)
        self.assertEqual(10, len(load_entries(category_path(self.data, "personality/values"))))
        rendered = "\n".join(output)
        self.assertIn("LIBRARY HEALTH", rendered)
        self.assertIn("Added 9: 1", rendered)


if __name__ == "__main__":
    unittest.main()
