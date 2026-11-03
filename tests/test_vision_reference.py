import json
import unittest
from pathlib import Path
from tools.vision_reference import (Box, Letterbox, box_iou, viewport_box, rotate_box,
    mask_area_ratio, mask_metrics, rle_encode, rle_decode, filter_detections)


class VisionReferenceTests(unittest.TestCase):
    def assertValues(self, actual, expected):
        for first, second in zip(actual, expected):
            self.assertAlmostEqual(first, second, places=8)

    def test_fixture_viewports(self):
        fixture = json.loads(Path('docs/fixtures/fase02.json').read_text())
        box = Box(**fixture['person_box'])
        for example in fixture['viewports']:
            with self.subTest(example=example['size']):
                self.assertValues(viewport_box(box, 1000, 800, *example['size']), example['expected'])

    def test_boxes_reject_invalid_values(self):
        for args in [(-.1, 0, .2, .2), (0, 0, 0, .2), (.9, 0, .2, .2),
                     (float('nan'), 0, .2, .2), (0, 0, float('inf'), .2), (True, 0, .2, .2)]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                Box(*args)

    def test_full_image_box(self):
        self.assertEqual(Box(0, 0, 1, 1).area, 1)

    def test_box_iou_identical(self):
        self.assertEqual(box_iou(Box(0, 0, .5, .5), Box(0, 0, .5, .5)), 1)

    def test_box_iou_disjoint_and_touching(self):
        self.assertEqual(box_iou(Box(0, 0, .25, .25), Box(.75, .75, .25, .25)), 0)
        self.assertEqual(box_iou(Box(0, 0, .5, .5), Box(.5, 0, .5, .5)), 0)

    def test_box_iou_partial(self):
        self.assertAlmostEqual(box_iou(Box(0, 0, .5, .5), Box(.25, .25, .5, .5)), 1 / 7)

    def test_letterbox_known_values_and_inverse(self):
        transform = Letterbox(1000, 800, 640, 640, 640, 512, 0, 64)
        box = Box(.2, .15, .3, .7)
        converted = transform.forward(box)
        self.assertValues(vars(converted).values(), [.2, .22, .3, .56])
        self.assertValues(vars(transform.inverse(converted)).values(), vars(box).values())

    def test_letterbox_preserves_actual_rounded_resize(self):
        transform = Letterbox(1001, 799, 640, 640, 640, 511, 0, 64)
        box = Box(.2, .15, .3, .7)
        self.assertValues(vars(transform.inverse(transform.forward(box))).values(), vars(box).values())

    def test_letterbox_rejects_padding_prediction(self):
        with self.assertRaises(ValueError):
            Letterbox(1000, 800, 640, 640, 640, 512, 0, 64).inverse(Box(0, 0, .1, .05))

    def test_invalid_transform_and_dimensions(self):
        for operation in [lambda: Letterbox(0, 800, 640, 640, 640, 512, 0, 64),
                          lambda: Letterbox(1000, 800, 640, 640, 640, 512, 0, 200),
                          lambda: viewport_box(Box(0, 0, 1, 1), 1000, 800, 0, 400)]:
            with self.assertRaises(ValueError): operation()

    def test_rotation_known_value(self):
        result = rotate_box(Box(.2, .15, .3, .7), 90)
        self.assertValues(vars(result).values(), [.15, .2, .7, .3])

    def test_rotations_round_trip(self):
        original = Box(.2, .15, .3, .7)
        for angle in (0, 90, 180, 270):
            restored = rotate_box(rotate_box(original, angle), (-angle) % 360)
            self.assertValues(vars(original).values(), vars(restored).values())
        with self.assertRaises(ValueError): rotate_box(original, 45)

    def test_rotation_handles_floating_point_border(self):
        for angle in (90, 180, 270):
            rotated = rotate_box(Box(.2, .2, .8, .8), angle)
            self.assertGreaterEqual(rotated.x, 0)
            self.assertGreaterEqual(rotated.y, 0)

    def test_mask_area(self):
        self.assertEqual(mask_area_ratio([[1, 0], [1, 1]]), .75)

    def test_mask_metrics(self):
        result = mask_metrics([[1, 0], [1, 1]], [[1, 0], [0, 1]])
        self.assertAlmostEqual(result['iou'], 2 / 3)
        self.assertAlmostEqual(result['dice'], .8)

    def test_empty_foreground_metric_convention(self):
        self.assertEqual(mask_metrics([[0]], [[0]]), {'iou': None, 'dice': None})
        self.assertEqual(mask_metrics([[1]], [[0]]), {'iou': 0, 'dice': 0})

    def test_masks_reject_invalid_dimensions_and_labels(self):
        for mask in [[], [[]], [[1], [1, 0]], [[2]], [[True]], [[.5]]]:
            with self.subTest(mask=mask), self.assertRaises(ValueError): mask_area_ratio(mask)
        with self.assertRaises(ValueError): mask_metrics([[1]], [[1, 0]])

    def test_rle_known_values(self):
        self.assertEqual(rle_encode([[1, 0], [1, 1]])['counts'], [0, 1, 1, 2])

    def test_rle_round_trip(self):
        for mask in [[[0, 0]], [[1, 1]], [[1, 0], [1, 1]], [[0, 1, 0], [1, 0, 1]]]:
            with self.subTest(mask=mask): self.assertEqual(rle_decode(rle_encode(mask)), mask)

    def test_rle_rejects_bad_lengths_and_budget(self):
        base = {'encoding': 'binary-rle-row-v1', 'width': 2, 'height': 2}
        for counts in [[], [3], [5], [-1, 5], [1, 0, 3], [True, 3]]:
            with self.subTest(counts=counts), self.assertRaises(ValueError): rle_decode(dict(base, counts=counts))
        with self.assertRaises(ValueError): rle_decode(dict(base, counts=[4]), max_pixels=3)
        with self.assertRaises(ValueError): rle_decode(dict(base, encoding='coco', counts=[4]))

    def test_threshold_inclusive_and_raw_preserved(self):
        data = [{'confidence': .9}, {'confidence': .8}, {'confidence': .85}]
        snapshot = json.dumps(data)
        self.assertEqual([d['confidence'] for d in filter_detections(data, .85)], [.9, .85])
        self.assertEqual(json.dumps(data), snapshot)
        self.assertEqual(len(data), 3)

    def test_threshold_endpoints_and_invalid(self):
        self.assertEqual(len(filter_detections([{'confidence': 0}, {'confidence': 1}], 0)), 2)
        self.assertEqual(len(filter_detections([{'confidence': 0}, {'confidence': 1}], 1)), 1)
        for value in [-1, 1.01, float('nan'), True]:
            with self.subTest(value=value), self.assertRaises(ValueError): filter_detections([], value)
        with self.assertRaises(ValueError): filter_detections([{'confidence': 2}], .5)


if __name__ == '__main__':
    unittest.main()
