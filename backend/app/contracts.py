"""Contratos puros de la simulación. No requieren PyTorch para sus pruebas."""
from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
import re

SCENARIOS = {
    "safety": {
        "name": "Seguridad industrial",
        "required": ("person", "helmet", "vest"),
        "detail": "La inspección de EPP exige pesos específicos y asociación por persona.",
    },
    "warehouse": {
        "name": "Almacén inteligente",
        "required": ("forklift",),
        "detail": "Montacargas requiere pesos específicos y una zona calibrada.",
    },
    "quality": {
        "name": "Control de calidad",
        "required": ("defect",),
        "detail": "La detección de defectos requiere pesos entrenados para el producto.",
    },
    "retail": {
        "name": "Retail",
        "required": ("person",),
        "detail": "Se muestra cantidad de personas visibles por fotograma; no identidad ni aforo certificado.",
    },
}
SESSION_RE = re.compile(r"^[a-zA-Z0-9_-]{8,100}$")
MAX_FRAME_BYTES = 1_500_000


@dataclass(frozen=True)
class FrameRequest:
    scenario: str
    session: str
    generation: int
    frame_id: int
    captured_at: float

    def validate(self) -> None:
        if self.scenario not in SCENARIOS:
            raise ValueError("Escenario desconocido.")
        if not SESSION_RE.fullmatch(self.session):
            raise ValueError("Identificador de sesión no válido.")
        if self.generation < 0 or self.frame_id < 0:
            raise ValueError("Secuencia de fotogramas no válida.")
        if not isfinite(self.captured_at) or self.captured_at < 0:
            raise ValueError("Instante de captura no válido.")


def normalize_box(x1: float, y1: float, x2: float, y2: float,
                  width: int, height: int) -> dict | None:
    """Convierte las cajas reales del detector a coordenadas de la imagen original."""
    if width <= 0 or height <= 0 or not all(map(isfinite, (x1, y1, x2, y2))):
        return None
    left, top = max(0.0, x1), max(0.0, y1)
    right, bottom = min(float(width), x2), min(float(height), y2)
    if right <= left or bottom <= top:
        return None
    return {
        "x": left / width, "y": top / height,
        "width": (right - left) / width,
        "height": (bottom - top) / height,
    }


def describe_coverage(scenario: str, classes: list[str]) -> dict:
    available = {name.lower().replace(" ", "_").replace("-", "_") for name in classes}
    missing = [name for name in SCENARIOS[scenario]["required"] if name not in available]
    return {
        "complete": len(missing) == 0,
        "missingClasses": missing,
        "detail": SCENARIOS[scenario]["detail"],
    }
