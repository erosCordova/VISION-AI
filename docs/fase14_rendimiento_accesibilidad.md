# Fase 14 — Integración, rendimiento y accesibilidad

**Estado: APROBADA.** Avance administrativo **14/16 = 87,5 %**.
Evidencia: https://github.com/erosCordova/VISION-AI/actions/runs/41935480618

## Optimización real del simulador

La escena WebGL de personajes humanos reutiliza un único material
para mallas dinámicas y solo reconstruye geometría cuando cambia
el snapshot, el tiempo simulado o las zonas activas. Antes generaba
un material y una geometría cada ~33 ms incluso sin movimiento.

`ResizeObserver` se usa para detectar cambios de tamaño y se reduce
la consulta de `getBoundingClientRect()` repetida por frame;
una comprobación de respaldo cada segundo cubre cambios de DPR.
Durante pausa, el renderizado solicitado baja a 10 FPS (intervalo
objetivo de 100 ms) para mantener los controles de cámara accesibles.
En segundo plano no se actualiza el reloj React de simulación,
no se hace captura YOLO y no se intenta compensar todo el tiempo
oculto al regresar. Se detiene la simulación automáticamente si
el sistema solicita movimiento reducido; un usuario puede
reanudarla manualmente.

## Telemetría medida en Chromium, no cifras inventadas

Se registran para cada una de 12 vistas (4 páginas × 3 resoluciones)
el tiempo observado desde la navegación CDP hasta que aparece el
contenido funcional, el heap JavaScript informado por Chromium,
estado WebGL y, en la página del simulador, FPS realmente publicados
por su medidor de frames. El reporte JSON
`qa-artifacts/fase14-rendimiento-accesibilidad.json`
se adjunta al run GitHub Actions como evidencia.
Los valores se miden en el runner Linux headless y **no equivalen**
a Core Web Vitals, memoria WebAssembly/VRAM ni rendimiento en
equipos finales. No deben presentarse como FPS garantizados.

Presupuestos funcionales de CI: ruta visible en menos de 30 s
(incluyendo el control automatizado de presencia); FPS de WebGL
positivos y finitos después de dos segundos de ejecución.
Los límites dejan margen para el entorno sin GPU dedicada; la
optimización se constata por política de reconstrucción y
métricas, no por porcentajes de velocidad inventados.

## Accesibilidad comprobada

- A11Y01: canvas 3D navegable con flechas, +/- y R, foco real,
  `tabIndex=0`, nombre accesible y evento teclado manejado.
- A11Y02: preferencia `prefers-reduced-motion` pausa la
  simulación al entrar, conservando 4 vistas de cámara y controles.
- A11Y03: ruta Privacidad conserva navegación etiquetada,
  enlace de salto al contenido, formulario con etiquetas y
  acceso al historial.
- UI02/UI04: navegación con Enter y CSS sin transición en
  movimiento reducido; responsive sin scroll horizontal.

Estos ensayos **no constituyen certificación WCAG** completa
ni reemplazan una auditoría con lector de pantalla real.

## Regresión de extremo a extremo

Se reutiliza el conjunto completo de pruebas aprobado hasta
la fase 13: procesamiento ONNX COCO en Manufactura/Retail/Logística,
YOLO EPP real en Seguridad, 3D animado, recuperación del fotograma
fallido, visores/cromatización, CSV/JSON y decisiones humanas
en IndexedDB, borrado atómico de privacidad, teclado y UX.

Para aprobar la fase: `npm run check`, 66 casos Python,
`npm run build`, Chromium 360/768/1440 y artifact JSON de
mediciones publicado en CI; cero regresiones.

**No se añaden fuentes de imagen, webcam, videos ni datasets externos.**

## Acta de aceptación

La CI de la fase 14 debe finalizar en `success` tras ejecutar
Vitest/TypeScript, las 66 pruebas Python, compilación y 12 recorridos
Chromium con modelos reales ONNX, rendimiento WebGL medido y
accesibilidad A11Y01–03. El artefacto
`fase14-rendimiento-accesibilidad.json` documenta los resultados,
sin generar FPS ficticios ni certificar una meta de rendimiento en GPU.
La publicación en main solo procede después de comprobar el run.
