import json
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile
from populator.backup import create_backup, undo_last
from populator.coverage import coverage_report, library_statistics
from populator.importer import import_valid, parse_import, review_import
from populator.schemas import make_entry
from populator.storage import category_path, load_entries, save_entries

class BulkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = Path(self.temp.name); self.data = self.root / "data"; self.data.mkdir()
    def tearDown(self): self.temp.cleanup()

    def test_txt_csv_json_parsing(self):
        txt = self.root / "items.txt"; txt.write_text("Boxing\nCooking\n", encoding="utf-8")
        csv = self.root / "items.csv"; csv.write_text("name,tags,settings\nCycling,fitness,modern\n", encoding="utf-8")
        js = self.root / "items.json"; js.write_text(json.dumps([make_entry("Gardening")]), encoding="utf-8")
        self.assertEqual(2, len(parse_import(txt))); self.assertEqual(["modern"], parse_import(csv)[0]["compatibility"]["settings"]); self.assertEqual("gardening", parse_import(js)[0]["id"])

    def test_review_import_separates_duplicates_and_errors(self):
        existing = [make_entry("Cooking")]
        review = review_import([make_entry("Cooking"), make_entry("Cycling"), {"id": "bad"}], existing)
        self.assertEqual((1, 1, 1), (len(review.valid), len(review.duplicates), len(review.errors)))

    def test_import_backup_and_undo(self):
        target = category_path(self.data, "lifestyle/hobbies"); save_entries(target, [make_entry("Cooking")])
        review = review_import([make_entry("Cycling")], load_entries(target)); backup = import_valid(self.data, "lifestyle/hobbies", review, self.root / "backups")
        self.assertEqual(2, len(load_entries(target))); self.assertTrue(backup and backup.exists())
        with ZipFile(backup) as archive: self.assertIn("data/lifestyle/hobbies.json", archive.namelist())
        self.assertIn("bulk import", undo_last(self.data)); self.assertEqual(1, len(load_entries(target)))

    def test_statistics_and_coverage(self):
        save_entries(category_path(self.data, "lifestyle/hobbies"), [make_entry("Cycling", compatibility={"settings": ["modern"]})])
        self.assertEqual(1, library_statistics(self.data)["total_entries"])
        self.assertEqual("Critical", coverage_report(self.data)["settings"]["modern"]["strength"])

    def test_manual_backup(self):
        (self.data / "schema_version.json").write_text('{"schema_version":"1.0"}', encoding="utf-8")
        self.assertTrue(create_backup(self.data, self.root / "backups").exists())

if __name__ == "__main__": unittest.main()
