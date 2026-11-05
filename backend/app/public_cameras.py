"""Fuentes de imágenes TfL JamCam publicadas bajo su licencia Open Data.

No accede a cámaras privadas, no acepta URLs del cliente y no almacena
fotogramas en disco. Son fotografías periódicas, no video continuo.
Licencia: https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service
"""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Response

router = APIRouter(prefix="/api/v1/public-cameras", tags=["Fuentes públicas"])
ROOT = "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/"
MAX_IMAGE = 2_000_000
CACHE_SECONDS = 120
# Lista cerrada: no existe entrada de URL libre que permita SSRF.
CAMERAS = {
    "a13-logistica": {
        "id": "a13-logistica",
        "name": "A13 Cotton St — acceso logístico",
        "context": "Circulación de vehículos y transporte",
        "asset": "00002.00329.jpg",
        "scenario": "Transporte y logística",
    },
    "piccadilly-retail": {
        "id": "piccadilly-retail",
        "name": "Piccadilly Circus — actividad comercial",
        "context": "Peatones y vehículos en espacio comercial",
        "asset": "00001.07450.jpg",
        "scenario": "Retail y ocupación",
    },
    "grays-inn": {
        "id": "grays-inn",
        "name": "Grays Inn Rd — tránsito urbano",
        "context": "Conteo visual de vehículos y personas visibles",
        "asset": "00001.09640.jpg",
        "scenario": "Transporte y logística",
    },
    "a102-tunel": {
        "id": "a102-tunel",
        "name": "A102 Tunnel House — vehículos",
        "context": "Tránsito vial en zona controlada",
        "asset": "00002.00349.jpg",
        "scenario": "Transporte y logística",
    },
}
# En memoria, compartida por visitantes del mismo proceso Render Free.
_cache: dict[str, tuple[float, bytes, str]] = {}
_locks: dict[str, asyncio.Lock] = {key: asyncio.Lock() for key in CAMERAS}


@router.get("")
def list_public_cameras() -> dict:
    return {
        "provider": "Transport for London (TfL)",
        "attribution": "Powered by TfL Open Data",
        "licence": "https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service",
        "type": "periodic-jpeg",
        "minimumRefreshSeconds": 180,
        "cameras": [
            {k: v for k, v in item.items() if k != "asset"}
            for item in CAMERAS.values()
        ],
        "note": ("Son fotos públicas de tráfico, no cámaras de fábricas, "
                 "y no garantizan video en tiempo real ni disponibilidad."),
    }


async def _read_verified_jpeg(url: str) -> bytes:
    """Descarga únicamente del bucket TfL fijado por el servidor."""
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(12.0, connect=6.0),
        follow_redirects=False,
        trust_env=True,
    ) as client:
        async with client.stream("GET", url, headers={"Accept": "image/jpeg"}) as upstream:
            if upstream.status_code != 200:
                raise HTTPException(status_code=503,
                                    detail="Esta cámara pública no responde ahora.")
            if "image/jpeg" not in upstream.headers.get("content-type", "").lower():
                raise HTTPException(status_code=503,
                                    detail="La fuente no devolvió una fotografía JPEG.")
            data = bytearray()
            async for chunk in upstream.aiter_bytes():
                if len(data) + len(chunk) > MAX_IMAGE:
                    raise HTTPException(status_code=503,
                                        detail="Fotograma remoto demasiado grande.")
                data.extend(chunk)
    if len(data) < 128 or data[:3] != bytes((255,216,255)):
        raise HTTPException(status_code=503,
                            detail="La cámara no entregó una imagen JPEG válida.")
    return bytes(data)


@router.get("/{camera_id}/frame")
async def public_camera_frame(camera_id: str, response: Response) -> Response:
    camera = CAMERAS.get(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Cámara pública no registrada.")
    async with _locks[camera_id]:
        now = time.monotonic()
        cached = _cache.get(camera_id)
        if cached and now - cached[0] < CACHE_SECONDS:
            data, fetched = cached[1], cached[2]
        else:
            try:
                data = await _read_verified_jpeg(ROOT + camera["asset"])
            except HTTPException:
                raise
            except (httpx.HTTPError, TimeoutError, OSError):
                raise HTTPException(status_code=503,
                                    detail="No se pudo acceder al proveedor de cámara.")
            fetched = datetime.now(timezone.utc).isoformat()
            _cache[camera_id] = (time.monotonic(), data, fetched)
    return Response(
        content=data,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "private, max-age=0, no-store",
            "X-Frame-Fetched-At": fetched,
            "Access-Control-Expose-Headers": "X-Frame-Fetched-At",
        },
    )
