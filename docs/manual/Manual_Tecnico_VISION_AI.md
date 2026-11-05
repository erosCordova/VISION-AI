# Manual técnico y de mantenimiento — VISION-AI

**Arquitectura vigente:** Vite + React + TypeScript + Three.js/WebGL,
ONNX Runtime Web/WASM y FastAPI mínimo de estado. Se trabaja sin
datasets, webcam, archivos subidos o inferencia pagada.

## Estructura de la solución

- `src/modules/live/`: simulación 3D, escena humana, captura del
  mismo fotograma renderizado, análisis ONNX, NMS y telemetría.
- `src/modules/live/YoloBrowserPanel.tsx`: selector de modelos,
  pausa/reintento/cadencia, evidencia PNG, resultados y perfil ONNX.
- `src/modules/live/yolo-browser.ts`: carga bajo demanda y
  SHA-256 de pesos, preprocesamiento letterbox, canal CHW y WASM.
- `src/modules/live/yolo-postprocess.ts`: decodificación
  [1,4+C,N] / [1,N,4+C] y NMS por clase.
- `src/infrastructure/persistence/simulation-session-store.ts`:
  sesiones y revisiones persistentes en IndexedDB.
- `src/modules/history/session-reports.ts`: CSV/JSON derivados de
  registros locales válidos.
- `backend/app/main.py`: API status-only, sin motores IA, almacenamiento
  ni endpoints para subir archivos.
- `tests/`, `tests/ts/`, `scripts/qa-responsive.mjs`:
  pruebas de dominio, backend, navegador, cuatro escenarios y
  métricas medidas, con capturas/artifacts del runner.

## Flujo de inferencia

El usuario pulsa Iniciar → el navegador descarga ONNX y verifica
hash → se crea la sesión WASM → el canvas WebGL entrega un
fotograma → letterbox preserva la relación de aspecto →
normalización RGB 0–1 y conversión CHW → ejecución ONNX →
decodificación/NMS → visualización de las cajas originales →
registro local opcional y gestión de indicios.

Solo hay **una inferencia en curso**; no existe cola descontrolada.
En pestañas ocultas o simulaciones pausadas no se capturan
fotogramas. Los errores permiten reintentar el mismo fotograma.
El filtro visual no cambia el resultado original. Los modelos
no requieren servicios de GPU del backend.

## Desarrollo y QA (Git Bash existente)

Desde la carpeta raíz del repositorio, usar un bloque:

```bash
git pull origin main
npm ci --no-audit --no-fund
npm run check
npm run build
python3 -m pip install -r backend/requirements-render-free.txt "httpx>=0.28,<1"
python3 -m unittest discover -s tests
```

No necesita crear bases de datos ni proyectos Supabase/Neon.
No se necesita un archivo `.env` para ejecutar YOLO en el
navegador; usar `npm run dev` en el **mismo Git Bash** si se
solicita una prueba local. El servidor de Render es independiente.

## Puesta en operación y rollback

Ver [guía gratuita](../despliegue_gratuito.md). El GitHub
workflow de `main` debe aprobar arquitectura, tipos, Vitest,
pruebas Python/HTTP de Render, build y 12 recorridos Chromium.
La rama de validación desactiva Vercel temporalmente mediante
`git.deploymentEnabled=false`; la versión de producción
**no** debe incluir esa propiedad.

Registre los SHAs de GitHub y del deployment Vercel y consulte
la salud de Render en el workspace **confirmado**. No prometa
rollback de datos: IndexedDB pertenece al dispositivo.

No ejecutar `vercel rollback`, `render deploy` ni reinicios
automáticos para comprobar el estado. Revisar primero
los artefactos vigentes y la política de Git Integration.

## Seguridad y licencias

- No hay autenticación ni autorización de servidor. Los perfiles
  visibles son demostrativos.
- Cada sesión se guarda en IndexedDB del navegador que la creó.
  No hay almacenamiento remoto ni cifrado propio de aplicación.
- Los endpoints públicos Render no aceptan imágenes y la
  inferencia remota está deshabilitada con 503.
- SHA-256 de pesos ONNX validado antes de crear la sesión.
- Verificar licencia de los modelos EPP antes de explotación
  comercial; el repositorio advierte AGPL-3.0.
- Un detector sin ground truth no acredita precisión, recall,
  mAP ni conformidad industrial.
- No existe detección de identidad, seguimiento persona a
  persona ni reporte regulatorio certificado.

## Soporte operativo

1. Fallo build: consultar la ejecución GitHub Actions/sha y
   revisar TypeScript, pruebas y salida Vite.
2. Fallo de descarga ONNX: comprobar CDN, versión/hash y
   políticas del navegador; nunca desactivar SHA para forzar carga.
3. Cajas vacías: confirmar que hubo ejecución real de ONNX y
   revisar el dominio visual del checkpoint.
4. Datos corruptos: inspeccionar Historial → Integridad;
   no depurar automáticamente.
5. Error Render: consultar /api/v1/health del servicio identificado
   y respetar tiempo de reactivación del plan Free.
6. Reversión: elegir último despliegue Vercel READY ya validado,
   confirmar SHA, recuperar código sin modificar IndexedDB.
