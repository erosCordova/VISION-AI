# Despliegue gratuito y verificación de VISION-AI — Fase 16

**Versión vigente:** dos fuentes en Análisis en vivo: cámaras públicas
TfL (fotografías JPEG periódicas) y cuatro simulaciones 3D; ambas con
YOLO ONNX/WASM en navegador. Sin cámara personal ni datasets.
El frontend React/Vite está en Vercel; Render sirve una API de
estado sin ejecutar ningún modelo.

## Separación real de responsabilidades

| Pieza | Proveedor | Tarea | Persistencia |
| --- | --- | --- | --- |
| Frontend | Vercel Hobby | Interfaz, simulación 3D, inferencia ONNX local, informes | No guarda sesiones en servidor |
| API FastAPI | Render Free | `GET /api/v1/health`, catálogo/fotograma TfL; `POST /api/v1/infer` → 503 | Ninguna |
| Sesiones | IndexedDB del usuario | Resultados y decisiones guardados explícitamente | Solo navegador y perfil actuales |
| Pesos de IA | CDN/modelos externos, bajo demanda | ONNX verificados con SHA-256 | Caché del dispositivo |
| Evidencias | Descarga local del usuario | PNG/CSV/JSON solicitados | Fuera de la aplicación |

La API no procesa imágenes ni contiene dependencias PyTorch/OpenCV.
Para **cámaras públicas**, configurar `VITE_VISION_API_BASE_URL`
en Vercel apuntando a la URL Render real, y `VISION_ALLOWED_ORIGINS`
en Render con los dominios frontend verificados. El servidor solo hace
proxy de cuatro rutas JPEG TfL predefinidas, con caché en memoria de
120 segundos; no acepta URLs arbitrarias. Se recomienda registrar el
uso de los datos en TfL y cumplir su licencia y atribución.
El backend Render no es imprescindible para ejecutar el **simulador** o
YOLO sobre 3D, porque ese análisis se hace dentro del navegador. No confundir el
estado `ok` del backend con disponibilidad del detector ni precisión.

## Frontend Vercel Hobby

- Proyecto GitHub: https://github.com/erosCordova/VISION-AI
- Proyecto Vercel: `vision-ai`, framework `Vite`.
- Dominio de acceso comprobado en versiones previas:
  https://vision-ai-erosss.vercel.app
- Dominio registrado adicional (puede variar por asignación):
  `vision-ai-one-sigma.vercel.app`.
- Rama de publicación: **main**.
- Comando de compilación: `npm run build`; salida `dist/`.
- Sin variables secretas necesarias para YOLO en navegador.
  Las variables Vite (prefijo `VITE_`) son públicas después del build.
- Las políticas HTTP vigentes figuran en `vercel.json`: `nosniff`,
  `DENY` en iframe, política Referrer y denegación de permisos de
  cámara/micrófono/geolocalización.

**Hobby es gratuito para proyectos personales o no comerciales**.
Verificar el uso y los límites actuales antes de publicar con fines
comerciales: https://vercel.com/docs/plans/hobby .

## Backend Render Free

El único servicio necesario es **Web Service · Python · Free**, enlazado
al mismo repositorio y rama `main`. Configuración prevista:

- Build: `pip install -r backend/requirements-render-free.txt`
- Start: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- `VISION_ALLOWED_ORIGINS`: lista de orígenes HTTPS públicos aprobados,
  separados por coma, **sin ruta ni barra final**.
- `VISION_INFERENCE_ENABLED=0` puede mantenerse por compatibilidad,
  pero en Fase 16 el código **nunca habilita inferencia remota**.
- Health: `https://<servicio-confirmado>.onrender.com/api/v1/health`.
  Reemplazar el marcador por la URL **real confirmada desde Render**,
  nunca inventar un servicio.
- Probar JSON: `ok:true`, `mode:render-free-status-only`,
  `inferenceAvailable:false`, cuatro `configuredScenarios`.
- `POST /api/v1/infer` debe devolver **503**, sin cargar archivos.

Los servicios gratuitos de Render se suspenden tras 15 minutos sin
tráfico entrante y pueden tardar aproximadamente un minuto en
reactivarse. El sistema de archivos es efímero. El plan Free tiene
cuotas mensuales, incluidas 750 horas de instancia por espacio de
trabajo; revisar consumos y posibles cargos asociados a recursos
adicionales. Documento oficial: https://render.com/docs/free .

**Importante:** el estado del backend real solo puede declararse
verificado después de consultar el servicio y contrastar la respuesta
con la compilación/commit desplegado. Un build Vercel exitoso no
demuestra que Render esté operativo.

## Validación de publicación

1. Ejecutar CI en rama de validación y exigir `success`.
2. Crear un único commit candidato descendiente de `main` que no
   contenga `git.deploymentEnabled=false` (usado solo en rama CI).
3. Actualizar `main` una sola vez; Vercel crea el despliegue automático.
4. Confirmar `READY` y SHA GitHub exacto en Vercel, HTTPS y cabeceras.
5. Abrir **Análisis en vivo**, recorrer Seguridad, Manufactura,
   Retail y Logística, y completar al menos un frame ONNX en cada uno.
   No exigir detección positiva en un entorno que no la produjo.
6. Guardar sesión, verificar Historial/Operaciones, generar CSV y JSON,
   y validar borrado solo en **perfil de prueba sin datos importantes**.
7. Comprobar Render `/api/v1/health` en el workspace confirmado.
8. Registrar resultados, tiempos y límites en el acta de Fase 16.

No recrear proyectos, no instalar servicios de pago, no realizar
despliegues repetitivos para inspeccionar cambios de interfaz.

## Recuperación / rollback sin pérdida de datos

**Rollback de código (Vercel):** consultar despliegues de producción
anteriores `READY`, verificar SHA y destino de dominio, y promover
un despliegue aprobado o revertir `main` mediante PR validado.
No hacer rollback a ciegas: Vercel puede desactivar autoasignación
del dominio tras rollback. Ver:
https://vercel.com/docs/deployments .

**Rollback de Render:** revisar los últimos despliegues del servicio
correcto y elegir el artefacto estable por SHA en el panel Render;
los Free admiten límites de historial y tiempo de activación.
No reiniciar servicios ajenos ni cambiar de plan automáticamente.

**Datos personales/locales:** el rollback del frontend no recupera
sesiones IndexedDB borradas. Antes de borrar, exportar CSV/JSON desde
Historial. Esos archivos son evidencia descargada, **no** un mecanismo
de restauración automática a IndexedDB. No hay backup automático
en Render ni Vercel, ni recuperación de datos entre navegadores.

## Errores y diagnósticos

| Síntoma | Interpretación | Acción |
| --- | --- | --- |
| Vercel ERROR | Error de compilación/dependencias | Consultar build log del SHA; no promover |
| Render tarda al responder | Posible suspensión Free | Probar salud tras reactivación; no crear segundo servicio |
| Render 503 en /infer | Correcto: inferencia remota deshabilitada | Usar YOLO ONNX en Análisis en vivo |
| Modelo ONNX no descarga | CDN, red, extensión o integridad | Revisar conexión y mensaje; no omitir SHA-256 |
| YOLO devuelve cero cajas | Modelo puede no reconocer avatares | Cambiar vista/escena; no inventar resultados |
| No hay sesiones tras cambiar equipo | IndexedDB es local al navegador | Buscar exportaciones previas; no prometer recuperación |
| Despliegue nuevo no visible | SHA/dominio incorrecto o cache | Confirmar alias y despliegue READY, luego recargar |

## Límites del alcance gratuito

No hay reconocimiento de personas reales, identificación individual,
seguridad certificada, inferencia remota, sincronización entre
dispositivos, segmentación YOLO-seg, mAP calculado con etiquetas,
SLA de disponibilidad ni garantía de cero cargos si se activan
servicios o recursos ajenos al Free/Hobby.
