import json
import tempfile
import unittest
from pathlib import Path

from populator.validator import validate_data_tree, validate_file


class ValidatorTests(unittest.TestCase):
    def test_project_data_is_valid(self) -> None:
        data_root = Path(__file__).resolve().parent.parent / "data"
        self.assertEqual([], validate_data_tree(data_root))

    def test_invalid_structural_data_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid.json"
            path.write_text(json.dumps([{"id": "Not Readable", "name": ""}]), encoding="utf-8")
            issues = validate_file(path)

        self.assertTrue(issues)
        messages = " ".join(issue.message for issue in issues)
        self.assertIn("invalid readable id", messages)
        self.assertIn("compatibility", messages)

    def test_valid_special_documents_and_versions(self) -> None:
        data_root = Path(__file__).resolve().parent.parent / "data"
        self.assertEqual([], validate_data_tree(data_root))

    def test_malformed_registry_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "data"
            (root / "pools").mkdir(parents=True)
            (root / "pools" / "deep_pool_registry.json").write_text('{"version":"1"}', encoding="utf-8")
            issues = validate_file(root / "pools" / "deep_pool_registry.json")
        self.assertIn("missing required field 'categories'", " ".join(issue.message for issue in issues))

    def test_malformed_template_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "templates" / "entry_templates.json"
            path.parent.mkdir()
            path.write_text('{"broken": {"tags": "not-an-array"}}', encoding="utf-8")
            issues = validate_file(path)
        self.assertIn("tags", " ".join(issue.message for issue in issues))

    def test_malformed_expansion_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "expansions" / "hobbies.json"
            path.parent.mkdir()
            path.write_text('{"cooking": {"common": ["baking", "baking"]}}', encoding="utf-8")
            issues = validate_file(path)
        self.assertIn("must not contain duplicates", " ".join(issue.message for issue in issues))

    def test_mismatched_component_versions_are_detected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data_root = root / "data"
            (data_root / "pools").mkdir(parents=True)
            (data_root / "data_version.json").write_text('{"data_version":"0.2.6"}', encoding="utf-8")
            (data_root / "pools" / "deep_pool_registry.json").write_text('{"version":"0.2.5","categories":[],"pools":{}}', encoding="utf-8")
            (data_root / "schema_version.json").write_text('{"schema_version":"2.0","application_version":"0.2.6"}', encoding="utf-8")
            (root / "package.json").write_text('{"version":"0.2.5"}', encoding="utf-8")
            issues = validate_data_tree(data_root)
        messages = " ".join(issue.message for issue in issues)
        self.assertIn("registry version", messages)
        self.assertIn("package version", messages)

    def test_application_and_data_versions_are_independent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data_root = root / "data"
            (data_root / "pools").mkdir(parents=True)
            (data_root / "data_version.json").write_text('{"data_version":"0.4.0"}', encoding="utf-8")
            (data_root / "schema_version.json").write_text('{"schema_version":"2.0","application_version":"0.5.0"}', encoding="utf-8")
            (data_root / "pools" / "deep_pool_registry.json").write_text('{"version":"0.4.0","categories":[],"pools":{}}', encoding="utf-8")
            (root / "package.json").write_text('{"version":"0.5.0"}', encoding="utf-8")
            issues = validate_data_tree(data_root)
        self.assertNotIn("version", " ".join(issue.message for issue in issues))

    def test_value_tension_references_and_symmetry_are_validated(self) -> None:
        compatibility = {key: [] for key in ("settings", "eras", "species", "life_stages", "countries")}
        entries = [
            {"id": "freedom", "name": "Freedom", "compatibility": compatibility, "metadata": {"tension_with": ["safety", "missing"]}},
            {"id": "safety", "name": "Safety", "compatibility": compatibility, "metadata": {}},
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "values.json"
            path.write_text(json.dumps(entries), encoding="utf-8")
            messages = " ".join(issue.message for issue in validate_file(path))
        self.assertIn("unknown value 'missing'", messages)
        self.assertIn("asymmetric", messages)

    def test_value_tension_self_reference_is_rejected(self) -> None:
        entry = {"id": "freedom", "name": "Freedom", "compatibility": {key: [] for key in ("settings", "eras", "species", "life_stages", "countries")}, "metadata": {"tension_with": ["freedom"]}}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "values.json"
            path.write_text(json.dumps([entry]), encoding="utf-8")
            messages = " ".join(issue.message for issue in validate_file(path))
        self.assertIn("must not reference itself", messages)


if __name__ == "__main__":
    unittest.main()
