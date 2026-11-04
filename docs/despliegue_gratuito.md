# Publicación gratuita de VISION-AI

**Arquitectura de esta publicación:** Vercel Hobby aloja la interfaz React/Vite, Render Free aloja una API ligera FastAPI que responde en `/api/v1/health`. No hay PyTorch ni YOLO en el servidor Free.

## Límites explícitos

Render Free tiene memoria y CPU limitadas y puede suspender servicios por inactividad. La API se despliega con `VISION_INFERENCE_ENABLED=0` y dependencias reducidas; `/api/v1/infer` devuelve 503 sin descargar pesos ni consumir el video. El frontend consulta `/api/v1/health` y muestra «API conectada · YOLO no disponible»; el botón de inferencia queda desactivado. Es una publicación verificable de **interfaz, fuentes de video y estado de API**, no un detector de producción.

La aplicación Vercel se compila con `VITE_VISION_MODE=real` y `VITE_VISION_API_BASE_URL` como URL HTTPS pública de Render; son variables de build, no secretos. El backend permite CORS exclusivamente para orígenes autorizados en `VISION_ALLOWED_ORIGINS`. El servidor de Render no necesita base de datos ni almacenamiento.

## Comandos de Render Free

- Servicio Web · plan free · runtime python · rama main.
- Build: `pip install -r backend/requirements-render-free.txt`
- Start: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- Variables: `VISION_INFERENCE_ENABLED=0` y `VISION_ALLOWED_ORIGINS=https://<proyecto>.vercel.app` configurado con el dominio real observado.
- Health: `https://<servicio>.onrender.com/api/v1/health`.

No ejecutar `pip install -r backend/requirements-local.txt` en Render Free: incluye Ultralytics, OpenCV y PyTorch, inadecuados para los recursos elegidos. Al cambiar a motor web ONNX o a cómputo de inferencia con recursos suficientes, se habilitará la funcionalidad real tras pruebas.

## Seguridad y aceptación

El endpoint de inferencia está deshabilitado en Render Free para evitar exponer una API de procesamiento anónimo. No se envían fotogramas mientras el motor no esté disponible. No hay grabación de video ni autenticación de usuario productiva. La validación de UI en Vercel y salud de API no demuestra exactitud, latencia de modelo, segmentación, seguimiento ni alertas.

Antes de acreditar cuatro escenarios operativos: cargar pesos especializados legalmente utilizables para cascos/chalecos, montacargas y defectos; validar personas para retail; medir resultados reales y documentar métricas por dispositivo. Se preserva el 31.25 % hasta el cierre completo de Fase 6.
