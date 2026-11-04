"""Servidor de inferencia real, solo local: no guarda videos ni captura audio.

Ejecutar mediante: python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8015
Los pesos YOLO se cargan bajo demanda y se pueden sustituir por escenario.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
from threading import Lock
from time import perf_counter

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from .contracts import (
    MAX_FRAME_BYTES, SCENARIOS, FrameRequest, describe_coverage, normalize_box,
)

# En Render Free se publica solamente la API de estado: no iniciar PyTorch ni descargar pesos.
# La inferencia se habilita únicamente con instalación y capacidad adecuadas.
INFERENCE_ENABLED = os.getenv("VISION_INFERENCE_ENABLED", "1") == "1"
extra_origins = [
    item.strip() for item in os.getenv("VISION_ALLOWED_ORIGINS", "").split(",")
    if item.strip().startswith("https://") and item.strip().count("/") == 2
]
app = FastAPI(title="VISION-AI · API de visión", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173",
                   "http://127.0.0.1:4173", "http://localhost:4173", *extra_origins],
    allow_methods=["GET", "POST"],
    allow_headers=["content-type"],
)

MODEL_ENV = {
    "safety": "VISION_MODEL_SAFETY",
    "warehouse": "VISION_MODEL_WAREHOUSE",
    "quality": "VISION_MODEL_QUALITY",
    "retail": "VISION_MODEL_RETAIL",
}
DEFAULT_MODEL = "yolo26n.pt"
_loaded: dict[str, object] = {}
_model_lock = Lock()


def model_ref(scenario: str) -> str:
    reference = os.getenv(MODEL_ENV[scenario], DEFAULT_MODEL).strip()
    if not reference:
        raise HTTPException(status_code=503, detail="No se configuraron pesos para el escenario.")
    # Solo se aceptan archivos locales o el nombre del checkpoint oficial predeterminado.
    if reference != DEFAULT_MODEL and (
        not Path(reference).is_file() or Path(reference).suffix != ".pt"
    ):
        raise HTTPException(status_code=503, detail="El archivo de pesos local no existe o no es .pt.")
    return reference


def get_model(reference: str):
    with _model_lock:
        if reference not in _loaded:
            from ultralytics import YOLO  # carga diferida; sin importación de red en /health
            try:
                _loaded[reference] = YOLO(reference)
            except Exception as exc:
                raise HTTPException(
                    status_code=503,
                    detail="No se pudieron cargar los pesos YOLO. Comprueba la conexión inicial o el archivo local.",
                ) from exc
        return _loaded[reference]


@app.get("/api/v1/health")
def health() -> dict:
    return {
        "ok": True, "engine": "YOLO26 / Ultralytics",
        "configuredScenarios": list(SCENARIOS),
        "mode": "inference" if INFERENCE_ENABLED else "render-free-status-only",
        "inferenceAvailable": INFERENCE_ENABLED,
        "modelLoaded": bool(_loaded),
        "note": ("Backend de inferencia habilitado: los pesos se cargan bajo demanda."
                 if INFERENCE_ENABLED else
                 "Render Free: API conectada, pero la inferencia YOLO está desactivada por sus límites de memoria."),
    }


@app.post("/api/v1/infer")
async def infer(
    request: Request,
    scenario: str,
    session: str,
    generation: int = Query(ge=0),
    frameId: int = Query(ge=0),
    capturedAtMonotonicMs: float = Query(ge=0),
    confidence: float = Query(default=0.35, ge=0.01, le=1),
) -> dict:
    if not INFERENCE_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Render Free no ejecuta YOLO en tiempo real. Usa un motor de inferencia compatible o local.",
        )
    # Evitar cargar OpenCV y NumPy en la API gratuita de estado.
    import cv2
    import numpy as np
    meta = FrameRequest(scenario, session, generation, frameId, capturedAtMonotonicMs)
    try:
        meta.validate()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if request.headers.get("content-type", "").split(";")[0] != "image/jpeg":
        raise HTTPException(status_code=415, detail="Se necesita un fotograma JPEG.")
    if request.headers.get("content-length", "0").isdigit() and int(request.headers.get("content-length", "0")) > MAX_FRAME_BYTES:
        raise HTTPException(status_code=413, detail="Fotograma demasiado grande.")
    # Se limita la lectura incluso si no se envía Content-Length.
    chunks, total = [], 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > MAX_FRAME_BYTES:
            raise HTTPException(status_code=413, detail="Fotograma demasiado grande.")
        chunks.append(chunk)
    jpeg = b"".join(chunks)
    if len(jpeg) < 16 or not jpeg.startswith(b"\xff\xd8"):
        raise HTTPException(status_code=422, detail="JPEG inválido.")
    image = cv2.imdecode(np.frombuffer(jpeg, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=422, detail="No se puede decodificar el fotograma.")
    height, width = image.shape[:2]
    if max(width, height) > 1280 or width * height > 1_500_000:
        raise HTTPException(status_code=413, detail="Resolución demasiado grande.")
    reference = model_ref(scenario)
    model = get_model(reference)
    # El bloqueo limita la inferencia en un equipo piloto y evita solapamientos.
    start = perf_counter()
    with _model_lock:
        prediction = model.predict(image, imgsz=640, conf=confidence, max_det=50,
                                   verbose=False, device="cpu")[0]
    inference_ms = (perf_counter() - start) * 1000
    names = model.names
    model_classes = list(names.values()) if isinstance(names, dict) else list(names)
    detected = []
    if prediction.boxes is not None:
        for index, bbox in enumerate(prediction.boxes):
            x1, y1, x2, y2 = map(float, bbox.xyxy[0].tolist())
            box = normalize_box(x1, y1, x2, y2, width, height)
            if box is None:
                continue
            class_index = int(bbox.cls[0])
            label = str(names[class_index])
            detected.append({
                "id": f"det-{index}", "classId": label.lower().replace(" ", "_"),
                "label": label, "confidence": float(bbox.conf[0]), "box": box,
            })
    source_hash = hashlib.sha256(jpeg).hexdigest()
    asset_id = f"{session}-{generation}-{frameId}"
    version = Path(reference).name
    return {
        "sessionId": session, "generation": generation, "frameId": frameId,
        "capturedAtMonotonicMs": capturedAtMonotonicMs,
        "configurationVersion": f"{scenario}:{version}:{confidence:.2f}",
        "inferenceDurationMs": round(inference_ms, 2),
        "image": {"width": width, "height": height,
                  "assetId": asset_id, "contentHash": source_hash},
        "coverage": describe_coverage(scenario, model_classes),
        "modelClasses": model_classes,
        "result": {
            "schemaVersion": "vision-result-v1",
            "analysisId": asset_id, "origin": "real",
            "assetId": asset_id, "sourceHash": source_hash,
            "scenarioVersion": "pilot-0.1", "durationMs": round(inference_ms, 2),
            "modelVersion": version, "detections": detected, "masks": [], "patterns": [],
        },
    }
