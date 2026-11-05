# Arquitectura funcional de VISION-AI — adecuación a la sección 5.2

**Base:** «Especificación funcional y arquitectura | Visión Computacional IA»,
sección 5.2 «Estructura de carpetas sugerida» (noviembre de 2026).

Esta estructura refleja el **código efectivamente ejecutado**, no
carpetas vacías ni funcionalidades simuladas como operativas.
La migración conserva las rutas públicas, las sesiones locales y los
cuatro escenarios 3D, así como las cámaras públicas de tránsito.

## Estructura vigente

```text
src/
  app/
    router/                 navegación y control de vistas
    providers/              contexto de persistencia local
    layout/                 sidebar, barra superior
    App.tsx                 coordinación de páginas
    bootstrap.ts            composición de adaptadores
  modules/
    dashboard/              pages/ components/ services/
    analysis/               pages/ components/ hooks/ services/ validators/
    detections/             components/ services/
    segmentation/           services/
    patterns/               services/
    alerts/                 pages/ components/ services/
    history/                pages/ components/ export/
    scenarios/              pages/ components/ data/ services/
    settings/               pages/ services/
    experience/             portada y componentes inmersivos
  core/
    domain/                 entidades y reglas de negocio
    application/            caso de uso
    ports/                  contratos abstractos
    contracts/              validación de observaciones
  infrastructure/
    vision/                 motor no disponible explícitamente
    persistence/            repositorios y almacenamiento local
  shared/
    ui/ hooks/ utils/ types/
  styles/                   estilos de la aplicación
tests/
  unit/                     validadores y algoritmos
  integration/              persistencia, contratos y arquitectura
  e2e/                      navegación y pruebas reales en Chromium
server/
  api/                      entrada ASGI hacia FastAPI de backend/app
backend/
  app/                      API Python existente en Render Free
```

## Responsabilidades y dependencias

1. **Interfaz:** `app/layout` y páginas de `modules` consumen servicios
   y contratos del dominio; no importan repositorios concretos.
2. **Detecciones:** descarga y ejecución del reconocimiento en el
   navegador, sin usar CPU de Render ni inventar resultados.
3. **Análisis:** orígenes de video público, recuperación de transmisiones,
   captura y correlación con resultados; **Segmentation** proporciona
   máscaras locales y **Patterns** clasifica observaciones repetidas.
4. **Alerts** reúne las observaciones que requieren revisión humana.
   No es un sistema certificado ni emite infracciones automáticas.
5. **Scenarios** mantiene las escenas 3D, movimiento y parámetros.
6. **Core** no usa `window`, `fetch`, `indexedDB` ni React; los
   datos persistentes se validan mediante contratos.
7. **Infraestructura** implementa los repositorios usados por `bootstrap`.
   Los registros existentes permanecen en el mismo IndexedDB;
   **no se cambia esquema ni se borran datos**.
8. **Server/API:** `server/api/app.py` reexporta la aplicación FastAPI
   real, utilizada por Docker. Render sigue usando
   `backend.app.main:app`, conservando su configuración gratuita.

## Adaptaciones justificadas frente al árbol sugerido

- El documento incluye nombres como `DemoVisionAdapter.ts`,
  `ApiVisionAdapter.ts` y módulos de visión Python en
  `server/vision`. **No se crean adaptadores o algoritmos falsos**:
  la inferencia real está en `modules/detections/services` y el
  endpoint remoto `/infer` sigue deshabilitado (HTTP 503).
- `modules/experience` permanece como módulo adicional: la portada
  inmersiva ya está implementada y no corresponde a escenarios ni
  a los controles de reconocimiento.
- La segmentación cuenta con servicios matemáticos reales, pero
  **no tiene una página independiente** porque no existe un flujo de
  trabajo de segmentación autónomo en el producto actual.
- `backend/app` conserva la implementación de FastAPI para no
  alterar el despliegue Render Free. `server/api` es una entrada
  equivalente utilizada por Docker; no duplica la lógica de la API.
- La separación por módulos de interfaz es funcional; cualquier
  separación posterior del motor de navegador en un adaptador adicional
  debe mantener compatibilidad de datos y pruebas.

## Aseguramiento de la estructura

El registro verificable de los movimientos está en
`scripts/architecture-layout.json`. La comprobación automática
`npm run check:architecture` examina importaciones y evita volver
a crear directorios heredados. Las pruebas `tests/integration`
comprueban rutas existentes y ausencia de rutas antiguas.

Para probar de extremo a extremo: `npm run check`,
`npm run build`, pruebas Python y
`node tests/e2e/qa-responsive.mjs`. GitHub Actions ejecuta
la suite antes de publicar en `main`.

**Nota de alcance:** renombrar carpetas no modifica los modelos,
no requiere desplegar nuevamente el backend y no convierte la
interfaz en un sistema de videovigilancia.
