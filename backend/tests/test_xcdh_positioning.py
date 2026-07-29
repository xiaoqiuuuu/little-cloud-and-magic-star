import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from database.xcdh import select_balanced_xcdh_position  # noqa: E402


class SequenceRandom:
    def __init__(self, values):
        self.values = iter(values)

    def uniform(self, lower, upper):
        value = next(self.values)
        if not lower <= value <= upper:
            raise AssertionError(f"{value} 不在范围 {lower}..{upper} 内")
        return value


class XcdhPositioningTests(unittest.TestCase):
    def test_empty_sky_uses_a_safe_full_canvas_position(self):
        position = select_balanced_xcdh_position(
            [],
            random_source=SequenceRandom([95, 92]),
            candidate_count=1,
        )
        self.assertEqual(position, (95, 92))

    def test_prefers_the_candidate_farthest_from_existing_wishes(self):
        position = select_balanced_xcdh_position(
            [(10, 10), (50, 50)],
            random_source=SequenceRandom([
                11, 11,
                51, 51,
                91, 90,
            ]),
            candidate_count=3,
        )
        self.assertEqual(position, (91, 90))

    def test_fills_the_previous_empty_lower_canvas_area(self):
        position = select_balanced_xcdh_position(
            [(10, 12), (50, 12), (90, 12)],
            random_source=SequenceRandom([
                24, 16,
                52, 88,
                82, 17,
            ]),
            candidate_count=3,
        )
        self.assertEqual(position, (52, 88))


if __name__ == "__main__":
    unittest.main()
