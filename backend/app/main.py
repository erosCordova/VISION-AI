"""API pública ligera de VISION-AI.

El análisis YOLO/ONNX utiliza exclusivamente fotogramas renderizados
por las cuatro simulaciones 3D en el navegador. Render Free no recibe
imágenes, no carga pesos y no ejecuta inferencia, aun si se configura
accidentalmente VISION_INFERENCE_ENABLED=1.
"""
from __future__ import annotations

import os
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

SCENARIOS = ("safety", "quality", "retail", "warehouse")


def valid_origin(raw: str) -> bool:
    """Solo orígenes HTTPS completos, sin rutas, credenciales ni query."""
    if not raw or raw != raw.strip():
        return False
    try:
        parsed = urlsplit(raw)
        return (
            parsed.scheme == "https"
            and bool(parsed.hostname)
            and parsed.hostname != "localhost"
            and not parsed.username
            and not parsed.password
            and parsed.path == ""
            and parsed.query == ""
            and parsed.fragment == ""
            and parsed.port in (None, 443)
            and not raw.endswith("/")
        )
    except ValueError:
        return False


def public_origins() -> list[str]:
    raw = os.getenv("VISION_ALLOWED_ORIGINS", "")
    return sorted({value.strip() for value in raw.split(",")
                   if valid_origin(value.strip())})


app = FastAPI(
    title="VISION-AI · API pública de estado",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173",
                   "http://127.0.0.1:4173", "http://localhost:4173",
                   *public_origins()],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["content-type"],
)


@app.middleware("http")
async def response_security(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/v1/health")
def health(response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    return {
        "ok": True,
        "engine": "ONNX Runtime Web en navegador",
        "configuredScenarios": list(SCENARIOS),
        "mode": "render-free-status-only",
        "inferenceAvailable": False,
        "modelLoaded": False,
        "source": "four-3d-simulations-only",
        "note": ("Render Free mantiene solo la API de estado. "
                 "YOLO analiza los fotogramas 3D localmente en el navegador."),
    }


@app.post("/api/v1/infer")
def infer_disabled() -> None:
    """Compatibilidad explícita: el servidor público nunca procesa imágenes."""
    raise HTTPException(
        status_code=503,
        detail=("La inferencia remota está desactivada. "
                "Usa YOLO ONNX sobre las simulaciones 3D del navegador."),
    )
