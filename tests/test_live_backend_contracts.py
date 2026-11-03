"""Tests puros: no descargan pesos ni requieren cámara/torch."""
import unittest
from backend.app.contracts import (
    FrameRequest, MAX_FRAME_BYTES, SCENARIOS, describe_coverage, normalize_box,
)


class SimulationContractsTest(unittest.TestCase):
    def test_scenarios_are_distinct(self):
        self.assertEqual(set(SCENARIOS), {"safety", "warehouse", "quality", "retail"})
        self.assertGreater(MAX_FRAME_BYTES, 100_000)

    def test_request_validation(self):
        FrameRequest("retail", "session_123", 1, 0, 120.4).validate()
        for scenario in ("", "invalid"):
            with self.assertRaises(ValueError):
                FrameRequest(scenario, "session_123", 1, 0, 10).validate()
        with self.assertRaises(ValueError):
            FrameRequest("retail", "session_123", -1, 0, 10).validate()
        with self.assertRaises(ValueError):
            FrameRequest("retail", "session_123", 0, 1, float("nan")).validate()

    def test_box_contract(self):
        value = normalize_box(20, 10, 60, 50, 100, 100)
        self.assertEqual(value, {"x": .2, "y": .1, "width": .4, "height": .4})
        self.assertIsNone(normalize_box(-40, 2, -1, 50, 100, 100))
        self.assertIsNone(normalize_box(4, 4, 0, 0, 100, 100))

    def test_coverage_does_not_invent_custom_classes(self):
        self.assertEqual(describe_coverage("retail", ["person"])["missingClasses"], [])
        self.assertEqual(set(describe_coverage("safety", ["person"])["missingClasses"]), {"helmet", "vest"})
        self.assertFalse(describe_coverage("warehouse", ["truck"])["complete"])
        self.assertFalse(describe_coverage("quality", ["bottle"])["complete"])


if __name__ == "__main__":
    unittest.main()
