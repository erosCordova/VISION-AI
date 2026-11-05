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

El endpoint de salud devuelve `mode=render-free-status-only` e
`inferenceAvailable=false`. La API puede exponer fotografías periódicas
TfL por compatibilidad, pero **no transporta las transmisiones HLS**
de la página ni ejecuta reconocimiento visual. El viejo endpoint
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

## Docker local (opcional, sin migrar Render)

La imagen de `backend/Dockerfile` se construye con Python 3.12 Slim y
**únicamente las dependencias mínimas de Render**. La etapa `test`
ejecuta las pruebas Python; la etapa final `runtime` contiene solo el backend.

```bash
docker compose -f compose.yaml up --build -d api
docker compose -f compose.yaml ps
curl -fsS http://127.0.0.1:8010/api/v1/health
```

Para correr las pruebas aisladas: `docker build --target test
-f backend/Dockerfile .`. Para detener: `docker compose -f compose.yaml
down`. Se limita la exposición de puertos a la máquina local, se usa
un usuario no privilegiado y el contenedor tiene sistema de archivos
de solo lectura. El despliegue remoto de Render **sigue usando Python,
sin Docker**.

Manual completo: [Docker local](../docs/docker_local.md).
