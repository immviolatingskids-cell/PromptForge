import json
import unittest
from pathlib import Path

from populator.coverage import coverage_report, library_statistics, pool_coverage, recommendations


ROOT=Path(__file__).resolve().parent.parent


class CountryReferenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.countries=json.loads((ROOT/"data"/"core"/"countries.json").read_text(encoding="utf-8"))
        cls.regions=json.loads((ROOT/"data"/"core"/"regions.json").read_text(encoding="utf-8"))

    def test_exact_un_reference_scope(self):
        self.assertEqual(195,len(self.countries))
        by_iso3={entry["metadata"]["iso3"]:entry for entry in self.countries}
        self.assertIn("VAT",by_iso3)
        self.assertIn("PSE",by_iso3)
        self.assertNotIn("Eldoria",{entry["name"] for entry in self.countries})
        self.assertNotIn("Orbital Union",{entry["name"] for entry in self.countries})

    def test_ids_names_and_iso_codes_are_unique(self):
        for getter in (lambda entry:entry["id"],lambda entry:entry["name"].casefold(),lambda entry:entry["metadata"]["iso2"],lambda entry:entry["metadata"]["iso3"]):
            values=[getter(entry) for entry in self.countries]
            self.assertEqual(len(values),len(set(values)))
        self.assertTrue(all(entry["id"].startswith("country_") for entry in self.countries))

    def test_country_metadata_and_neutral_compatibility(self):
        for entry in self.countries:
            metadata=entry["metadata"]
            self.assertRegex(metadata["iso2"],r"^[A-Z]{2}$")
            self.assertRegex(metadata["iso3"],r"^[A-Z]{3}$")
            self.assertIs(metadata["enabled"],True)
            self.assertTrue(all(not values for values in entry["compatibility"].values()))

    def test_every_country_references_valid_hierarchy(self):
        region_ids={entry["id"] for entry in self.regions}
        continents={entry["id"] for entry in self.regions if entry.get("metadata",{}).get("kind") in {"continent","continent_region"}}
        for country in self.countries:
            self.assertIn(country["metadata"]["continent"],continents)
            self.assertIn(country["metadata"]["region"],region_ids)
            self.assertIn(country["id"],next(entry for entry in self.regions if entry["id"]==country["metadata"]["continent"])["compatibility"]["countries"])
            self.assertIn(country["id"],next(entry for entry in self.regions if entry["id"]==country["metadata"]["region"])["compatibility"]["countries"])

    def test_consistent_sort_and_complete_coverage(self):
        self.assertEqual(self.countries,sorted(self.countries,key=lambda entry:(entry["name"].casefold(),entry["id"])))
        pool=next(item for item in pool_coverage(ROOT/"data") if item.branch=="core/countries")
        self.assertEqual((195,"Complete",0),(pool.count,pool.status,pool.needed))
        self.assertNotIn("core/countries",{item["branch"] for item in recommendations(ROOT/"data")})
        self.assertEqual("Complete",library_statistics(ROOT/"data")["reference_coverage"]["core/countries"]["status"])
        self.assertNotIn("countries",coverage_report(ROOT/"data")["dimensions"])

    def test_all_country_compatibility_references_resolve(self):
        country_ids={entry["id"] for entry in self.countries}
        unresolved=[]
        for path in (ROOT/"data").rglob("*.json"):
            payload=json.loads(path.read_text(encoding="utf-8"))
            entries=payload if isinstance(payload,list) else []
            for entry in entries:
                for country_id in entry.get("compatibility",{}).get("countries",[]):
                    if country_id not in country_ids:
                        unresolved.append((str(path.relative_to(ROOT)),entry.get("id"),country_id))
        self.assertEqual([],unresolved)


if __name__=="__main__":unittest.main()
