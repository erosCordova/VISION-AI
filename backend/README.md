# Backend Render Free — VISION-AI

**Alcance vigente, Fase 16:** API pública **solo de estado**
para el laboratorio de cuatro simulaciones 3D. La inferencia real
YOLOv8n COCO y YOLOv8s EPP se realiza con ONNX Runtime Web/WASM
**directamente en el navegador**. Render no recibe fotogramas,
no importa datasets ni ejecuta PyTorch.

## Despliegue (sin plan de pago)

| Configuración | Valor |
| --- | --- |
| Tipo de servicio | Web Service |
| Plan | Free (confirmar en consola Render) |
| Rama | main |
| Runtime | Python |
| Build | `pip install -r backend/requirements-render-free.txt` |
| Start | `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT` |
| CORS | `VISION_ALLOWED_ORIGINS=https://vision-ai-erosss.vercel.app` (agregar otros dominios solo si existen) |
| Health | `GET /api/v1/health` |

El código de producción devuelve siempre:
`mode=render-free-status-only`, `inferenceAvailable=false`,
`source=four-3d-simulations-only`. El viejo endpoint
`POST /api/v1/infer` devuelve **HTTP 503** y no recibe ni procesa
imágenes. Ni siquiera `VISION_INFERENCE_ENABLED=1` activa
inferencia en este perfil.

## Pruebas del servidor

Los tests `tests/test_render_free_api.py` comprueban mediante
TestClient el endpoint de salud, las cuatro claves de escenario,
CORS, caché no persistente, encabezados y el rechazo de inferencia.
Se ejecutan en GitHub Actions tras instalar dependencias mínimas
de Render y `httpx`.

## Seguridad y funcionamiento

No hay base de datos, almacenamiento de archivos, cuentas ni
proceso de visión remota en Render. La API está diseñada como servicio
de estado efímero y debe limitar orígenes CORS con HTTPS. Render Free
puede suspenderse al quedarse inactivo y no garantiza disponibilidad
continua. La operación YOLO en el frontend es independiente del estado
de Render.

Para poner en servicio y recuperar código siga
[la guía de despliegue](../docs/despliegue_gratuito.md) y
[el manual técnico](../docs/manual/Manual_Tecnico_VISION_AI.md).

**Nota histórica:** los ejemplos antiguos de YOLO26n, cámara y envío
de JPEG correspondían a un prototipo ya descartado. No son parte
de la arquitectura actual ni deben instalarse en Render Free.
