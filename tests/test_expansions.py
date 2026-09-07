import tempfile
import unittest
from pathlib import Path
from populator.coverage_priorities import load,set_priority
from populator.expansions import expand

class ExpansionTests(unittest.TestCase):
    def test_checked_in_expansion_is_deterministic(self):
        root=Path(__file__).resolve().parent.parent/"data"
        self.assertEqual(expand(root,"hobbies","cooking","common"),expand(root,"hobbies","cooking","common"))
        self.assertIn("baking",expand(root,"hobbies","cooking","common"))
        self.assertGreater(len(expand(root,"hobbies","cooking","full")),len(expand(root,"hobbies","cooking","common")))
    def test_coverage_priority_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            data=Path(directory)/"data";data.mkdir();set_priority(data,"Modern/UK/Clothing","ignored")
            self.assertEqual("ignored",load(data)["Modern/UK/Clothing"])
    def test_invalid_priority_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            data=Path(directory)/"data";data.mkdir()
            with self.assertRaises(ValueError):set_priority(data,"branch","urgent")

if __name__=="__main__":unittest.main()
