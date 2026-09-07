import tempfile
import unittest
from pathlib import Path

from populator.cli import Populator
from populator.schemas import make_entry, readable_id
from populator.storage import category_path, load_entries
from populator.templates import load_templates


class PopulatorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.data_root = Path(self.temporary.name)
        self.app = Populator(self.data_root)
        self.entry = make_entry("Street Photography", compatibility={"settings": ["modern"]})

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_readable_id(self) -> None:
        self.assertEqual("creme_brulee", readable_id("Crème brûlée"))

    def test_add_browse_search_edit_clone_delete(self) -> None:
        self.app.add("lifestyle/hobbies", self.entry)
        self.assertEqual(1, len(self.app.browse("lifestyle/hobbies")))
        self.assertEqual("street_photography", self.app.search("photo")[0][1]["id"])
        updated = self.app.edit("lifestyle/hobbies", "street_photography", {"description": "Urban image-making."})
        self.assertEqual("Urban image-making.", updated["description"])
        clone = self.app.clone("lifestyle/hobbies", "street_photography", "film_photography", "Film Photography")
        self.assertEqual("film_photography", clone["id"])
        self.app.delete("lifestyle/hobbies", "street_photography")
        self.assertEqual(["film_photography"], [row[1]["id"] for row in self.app.browse()])

    def test_duplicate_is_rejected(self) -> None:
        self.app.add("lifestyle/hobbies", self.entry)
        with self.assertRaisesRegex(ValueError, "duplicate"):
            self.app.add("lifestyle/hobbies", self.entry)

    def test_template_management(self) -> None:
        defaults = {"compatibility": {"settings": ["modern"]}, "tags": ["creative"]}
        self.app.save_template("Modern Creative", defaults)
        self.assertEqual(defaults, load_templates(self.data_root)["Modern Creative"])
        self.app.delete_template("Modern Creative")
        self.assertEqual({}, load_templates(self.data_root))

    def test_category_cannot_escape_data_root(self) -> None:
        with self.assertRaises(ValueError):
            category_path(self.data_root, "../outside")

    def test_persistence_is_valid_json(self) -> None:
        self.app.add("lifestyle/hobbies", self.entry)
        self.assertEqual(self.entry, load_entries(category_path(self.data_root, "lifestyle/hobbies"))[0])


if __name__ == "__main__":
    unittest.main()
