"""Contrato de cámaras con permisos: nunca accedemos a IPs o URLs arbitrarias."""
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app import public_cameras


class TfLPublicCamerasTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        public_cameras._cache.clear()

    def test_catalog_is_attributed_and_not_a_public_url_proxy(self):
        response = self.client.get("/api/v1/public-cameras")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["type"], "periodic-jpeg")
        self.assertEqual(data["attribution"], "Powered by TfL Open Data")
        self.assertGreaterEqual(data["minimumRefreshSeconds"], 180)
        self.assertEqual(len(data["cameras"]), 4)
        self.assertNotIn("asset", data["cameras"][0])
        self.assertIn("tfl.gov.uk", data["licence"])

    def test_reject_unknown_cameras_and_web_urls(self):
        for name in ("https://localhost", "evil.example", "another", "0", "cam.png"):
            with self.subTest(name=name):
                value = self.client.get("/api/v1/public-cameras/" + name + "/frame")
                self.assertIn(value.status_code, (404, 422))

    def test_real_remote_jpeg_is_not_required_for_unit_tests(self):
        fake = bytes((255,216,255)) + b"X" * 200
        async def mocked_reader(url):
            self.assertTrue(url.startswith(public_cameras.ROOT))
            return fake
        with patch.object(public_cameras, "_read_verified_jpeg", mocked_reader):
            first = self.client.get("/api/v1/public-cameras/a13-logistica/frame")
            second = self.client.get("/api/v1/public-cameras/a13-logistica/frame")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.content, fake)
        self.assertEqual(second.content, fake)
        self.assertEqual(first.headers["content-type"], "image/jpeg")
        self.assertTrue(first.headers["x-frame-fetched-at"])
        self.assertEqual(first.headers["x-frame-fetched-at"],
                         second.headers["x-frame-fetched-at"])

    def test_unavailable_provider_is_not_faked(self):
        async def failed(url):
            from fastapi import HTTPException
            raise HTTPException(status_code=503, detail="No disponible")
        with patch.object(public_cameras, "_read_verified_jpeg", failed):
            result = self.client.get("/api/v1/public-cameras/a102-tunel/frame")
        self.assertEqual(result.status_code, 503)
        self.assertIn("No disponible", result.json()["detail"])


if __name__ == "__main__":
    unittest.main()
