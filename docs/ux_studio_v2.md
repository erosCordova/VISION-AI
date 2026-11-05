# VISION-AI — Studio V2

## Objetivo

La interfaz usa [Active Theory](https://activetheory.net/) como
referencia de ambición cinematográfica, composición, interacción y
calidad de producción, **sin copiar sus escenas, marca o motor Hydra**.

La versión anterior tenía un círculo de órbitas decorativo.
Studio V2 lo sustituye por una maqueta industrial 3D real
con cuatro mundos seleccionables y cámara en perspectiva,
iluminación física, sombras, entorno de reflexión y bloom.

## Herramientas integradas (sin servicios de pago)

| Herramienta | Versión fijada | Función | Condiciones |
| --- | --- | --- | --- |
| Three.js | 0.180.0 | Escenario 3D, geometría, cámara, materiales PBR, postprocesado Bloom y RoomEnvironment | MIT |
| GSAP + ScrollTrigger | 3.15.0 | Secuencias, transiciones y revelados por desplazamiento | Gratis: licencia estándar «no charge» |
| Lenis | 1.3.26 | Desplazamiento fluido del resumen en escritorio | MIT |
| Lucide React | 1.60.0 | Iconos SVG coherentes en navegación, controles y buscador | ISC |
| CSS, SVG y Web APIs | Nativas | Composición responsive, brillo, sombras, observers | Sin licencias |

GSAP usa una licencia gratuita que **no es MIT**; revisar sus
términos oficiales antes de redistribuir fuera de este contexto:
https://gsap.com/standard-license/ .

## UX funcional

- Portada con cuatro escenarios: Seguridad Industrial, Manufactura,
  Logística y Retail. Cada selección cambia **el entorno 3D**,
  la iluminación y el texto. No es una predicción del modelo.
- CTA «Iniciar análisis»: abre directamente el escenario seleccionado
  en el módulo operativo de YOLO, no un video de ejemplo.
- Búsqueda global accesible `Ctrl+K`: páginas y escenarios, filtro
  por texto, teclado, Escape y restauración de foco.
- Iconos profesionales Lucide en todas las rutas.
- Dashboard real IndexedDB y pruebas de regresión del historial.
- Paneles de análisis, historial, privacidad y operaciones
  conservan funciones y estructura sin datos de demostración nuevos.

## Rendimiento y accesibilidad

Un único WebGLRenderer con DPR limitado a 1,35, geometrías y
materiales compartidos, sombra direccional moderada,
postprocesamiento Bloom solo en pantallas de más de 700 px,
pausa por visibilidad del documento/IntersectionObserver y
limpieza GPU en desmontaje. Si WebGL falla, se conserva una
superficie visual estática accesible.

En preferencia de movimiento reducido, el resumen se pausa de
inicio y GSAP/Lenis no animan. Los usuarios pueden cambiar
de escenario y navegar con teclado. Las cifras en el dashboard
provienen exclusivamente de sesiones reales guardadas localmente.

Las pruebas Chromium comprueban el escenario WebGL real,
cuatro selecciones, paleta de comandos, responsive 360/768/1440
y cuatro recorridos de inferencia ONNX (sin datasets).

## Límites responsables

**No confundir la representación 3D de portada con evidencias YOLO**.
La inferencia real sigue en Análisis en vivo y analiza los píxeles
del canvas de la simulación, sin camuflar las cajas vacías
ni inventar precisión o predicciones. Render Free continúa siendo
una API de salud: no procesa imágenes.

## Publicación

El desarrollo ocurre en una rama con despliegues Vercel desactivados.
Tras obtener `success` en GitHub Actions y verificar capturas
reales, se crea un único commit sobre `main` conservando
las cabeceras HTTP y quitando `git.deploymentEnabled=false`
temporal. Una sola publicación de Vercel Hobby, sin tocar Render.
