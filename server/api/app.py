"""Entrada ASGI compatible con la estructura 5.2.
Reutiliza la misma aplicación FastAPI que ya está desplegada en Render.
No añade inferencia, bases de datos ni rutas alternativas.
"""
from backend.app.main import app

__all__ = ("app",)
