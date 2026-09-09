import json
import tempfile
import unittest
from pathlib import Path

from populator.pool_editor import PoolEditor
from populator.schemas import make_entry


class PoolEditorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "data").mkdir()
        (self.root / "backups").mkdir()
        (self.root / "data" / "traits.json").write_text(json.dumps([make_entry("Calm")]), encoding="utf-8")
        self.editor = PoolEditor(self.root)

    def tearDown(self):
        self.tmp.cleanup()

    def test_preview_apply_creates_backup(self):
        result = self.editor.preview("traits", [make_entry("Bold")])
        self.assertTrue(result["can_apply"])
        applied = self.editor.apply(result["token"])
        self.assertEqual(1, applied["added"])
        self.assertTrue((self.root / "backups" / applied["backup"]).exists())
        self.assertEqual(2, len(json.loads((self.root / "data" / "traits.json").read_text())))

    def test_changed_destination_invalidates_preview(self):
        result = self.editor.preview("traits", [make_entry("Bold")])
        (self.root / "data" / "traits.json").write_text("[]", encoding="utf-8")
        with self.assertRaises(ValueError):
            self.editor.apply(result["token"])

    def test_restore_reports_conflict_before_replacing(self):
        result = self.editor.preview("traits", [make_entry("Bold")])
        applied = self.editor.apply(result["token"])
        (self.root / "data" / "traits.json").write_text("[]", encoding="utf-8")
        restored = self.editor.restore(applied["backup"])
        self.assertEqual("conflict", restored["status"])


if __name__ == "__main__":
    unittest.main()
