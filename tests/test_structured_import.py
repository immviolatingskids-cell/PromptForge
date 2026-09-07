import csv
import tempfile
import unittest
from pathlib import Path
from populator.importer import parse_import


class StructuredImportTests(unittest.TestCase):
    def test_csv_structured_columns_become_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "entries.csv"
            with path.open("w", newline="", encoding="utf-8") as stream:
                writer = csv.DictWriter(stream, fieldnames=["name", "category", "specialisation", "variant"])
                writer.writeheader()
                writer.writerow({"name": "Archivist", "category": "knowledge", "specialisation": "oral history", "variant": "fieldwork"})
            entry = parse_import(path)[0]
            self.assertEqual(entry["metadata"], {"category": "knowledge", "specialisation": "oral history", "variant": "fieldwork"})


if __name__ == "__main__":
    unittest.main()
