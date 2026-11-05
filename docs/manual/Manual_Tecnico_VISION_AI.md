# Manual técnico y de mantenimiento — VISION-AI

**Arquitectura vigente:** React, TypeScript, Vite, escenas 3D,
reconocimiento local en navegador y FastAPI de estado.
Admite video público de tráfico en directo y simulaciones 3D, sin
cámara personal ni servicios de inferencia pagados.

## Estructura de la solución — sección 5.2

La implementación vigente se encuentra documentada en
[Arquitectura funcional](../arquitectura.md).

- `src/app/router`: rutas, navegación y estado de vista.
- `src/app/layout`: sidebar y barra superior.
- `src/app/providers` y `bootstrap.ts`: provisión de repositorios
  y composición de dependencias.
- `src/modules/analysis`: origen de video, recuperación, análisis y validación.
- `src/modules/detections`: ejecución del modelo en navegador y postprocesamiento.
- `src/modules/segmentation`: máscaras reales por contraste.
- `src/modules/patterns` y `src/modules/alerts`: análisis de observaciones
  repetidas y revisión humana.
- `src/modules/scenarios`: simulaciones 3D, geometría y movimiento.
- `src/modules/dashboard`, `history`, `settings`:
  indicadores, informes, configuración y privacidad.
- `src/core/domain|application|ports|contracts`:
  núcleo, casos de uso, abstracciones y validadores.
- `src/infrastructure/persistence`: almacenamiento local versionado.
- `src/shared/ui|hooks|utils|types` y `src/styles`: recursos comunes.
- `tests/unit|integration|e2e`: validación automatizada.
- `server/api/app.py`: entrada Docker hacia el backend FastAPI real.
  Render Free conserva su ruta Python actual.

Se mantiene `src/modules/experience` por la portada inmersiva.
No se crean módulos vacíos de visión remota que hoy no se ejecutan.

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
