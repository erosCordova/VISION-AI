"""Pruebas del único perfil público seguro de Render Free."""
import unittest
from fastapi.testclient import TestClient

from backend.app.main import app, valid_origin, public_origins


class PublicApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_uses_only_local_browser_onnx(self):
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        value = response.json()
        self.assertEqual(value["mode"], "render-free-status-only")
        self.assertEqual(value["engine"], "ONNX Runtime Web en navegador")
        self.assertEqual(value["source"], "simulations-and-licensed-public-photos")
        self.assertEqual(set(value["configuredScenarios"]),
                         {"safety", "quality", "retail", "warehouse"})
        self.assertTrue(value["ok"])
        self.assertIs(value["inferenceAvailable"], False)
        self.assertIs(value["modelLoaded"], False)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")

    def test_infer_never_accepts_images_even_when_called_publicly(self):
        response = self.client.post("/api/v1/infer",
                                    content=b"not-a-photo",
                                    headers={"content-type": "image/jpeg"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("desactivada", response.json()["detail"])
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_origin_filter_rejects_paths_credentials_and_insecure_hosts(self):
        for candidate in (
            "http://ejemplo.com", "https://usuario:clave@ejemplo.com",
            "https://ejemplo.com/", "https://ejemplo.com/admin",
            "https://ejemplo.com?x=1", "https://ejemplo.com#fragmento",
            "https://ejemplo.com:444", "https://localhost",
            "https://ejemplo.com:mal", " ",
        ):
            with self.subTest(candidate=candidate):
                self.assertFalse(valid_origin(candidate))
        self.assertTrue(valid_origin("https://vision-ai-erosss.vercel.app"))
        self.assertTrue(valid_origin("https://vision-ai-erosss.vercel.app:443"))

    def test_health_does_not_expose_api_docs_or_openapi(self):
        self.assertEqual(self.client.get("/docs").status_code, 404)
        self.assertEqual(self.client.get("/openapi.json").status_code, 404)

    def test_cors_does_not_allow_arbitrary_remote_origins(self):
        response = self.client.get("/api/v1/health",
                                   headers={"Origin": "https://evil.example"})
        self.assertNotIn("access-control-allow-origin", response.headers)
        permitted = self.client.get("/api/v1/health",
                                    headers={"Origin": "http://localhost:5173"})
        self.assertEqual(permitted.headers.get("access-control-allow-origin"),
                         "http://localhost:5173")

    def test_no_production_model_dependencies_or_remote_uploads(self):
        from pathlib import Path
        backend = Path("backend/app/main.py").read_text(encoding="utf-8")
        for disallowed in ("ultralytics", "torch", "cv2", "request.stream()",
                           "model.predict(", "image/jpeg"):
            self.assertNotIn(disallowed, backend)


if __name__ == "__main__":
    unittest.main()
