# Fase 12 — Historial, informes y exportación local

**Estado: implementación en validación.** Avance oficial 11/16 = 68,75 %.

El historial existente de IndexedDB conserva sesiones de los cuatro
escenarios 3D, observaciones del último fotograma YOLO y decisiones
humanas. Esta fase agrega una capa de informes **derivados exclusivamente
de registros válidos y reproducibles**, sin imágenes, cámaras, videos,
datasets ni resultados fabricados.

## Entregables

1. Filtros de búsqueda, escenario, origen, periodo y estado de revisión.
2. Tarjetas de resumen: sesiones, sesiones con YOLO, detecciones
   conservadas, revisiones abiertas/cerradas, latencia media observada.
3. CSV de sesiones con huella 3D y referencia de fotograma YOLO.
4. CSV de detecciones originales conservadas, con coordenadas normalizadas
   de caja, ID, clase y confianza por predicción.
5. CSV de indicios y decisiones humanas, con nota local opcional.
6. JSON de auditoría con versión, fecha de exportación, métricas, sesiones
   y solo cierres asociados a indicios del subconjunto exportado.
7. Informe visual imprimible desde el navegador, sin servidor y sin
   dependencias externas.

## Propiedades importantes

- Las exportaciones respetan todos los filtros **antes de construir datos**.
- El usuario confirma las descargas de manera explícita; no existen
  servicios remotos de exportación ni almacenamiento en Render.
- Los CSV usan UTF-8 con BOM, separador `;`, escape de comillas y
  sanitización de fórmulas para proteger hojas de cálculo.
- La salida de detecciones no crea filas ficticias si una sesión no
  tiene detecciones YOLO.
- Cada revisión se vincula por sesión y evento. No se mezclan
  cierres de otros registros.
- El JSON permite auditar sesiones con huella reproducible. La huella
  no certifica los píxeles exactos del modelo ONNX ni constituye prueba
  criptográfica.
- La confianza YOLO no mide exactitud; ausencia de señales no equivale
  a cumplimiento. Las notas humanas no deben contener datos personales.

**Para aprobar:** TypeScript, Vitest, Python, Vite y Chromium 360/768/1440
con verificación de filtros, datos exportados, integridad e inexistencia
de archivos externos.

## Interfaz terminada para validación

Historial ofrece tarjetas con métricas calculadas exclusivamente de las
sesiones válidas, filtros combinables de búsqueda, escenario, origen,
periodo y revisión humana, tres CSV específicos, JSON auditable y
una vista A4 imprimible. Los detalles individuales incorporan
CSV, JSON y estado de revisión. Las sesiones dañadas se aíslan antes
de cualquier exportación; nunca se exportan de manera implícita.
