# Evidencias en construcción — Fase 7

- Cuatro escenarios reproducibles sin carga de datos externos.
- Persistencia IndexedDB versión 1, registros de simulación y detecciones reales separadas.
- Interfaz de guardado manual y página Historial con filtros y eliminación confirmada.
- Pruebas de identidad reproducible, validación de esquema, versiones y etiquetas guardadas.
- Prueba browser de guardado/recarga añadida a `scripts/qa-responsive.mjs`.
- **Pendientes:** obtener los resultados CI del incremento, prueba explícita de agotamiento
  de cuota, migración futura y aceptación formal DA01–DA04.


## Evidencia DA01 aprobada en navegador

Ejecución: https://github.com/erosCordova/VISION-AI/actions/runs/41869875516

`DA01 OK: simulación guardada, consultada y recuperada tras recarga del navegador`.

IndexedDB v1 guardó un registro de Seguridad Industrial, Historial permitió
consultarlo y el dato sobrevivió a una recarga de Chromium. Las pruebas unitarias
verificaron huellas reproducibles e identificadores distintos (DA02) y etiquetas
históricas que no cambian al modificar el objeto fuente (DA03). DA04 pendiente;
**Fase 7 no aprobada todavía.** No se guardaron fotogramas, videos ni datasets.


## Casos de robustez para aceptación DA04

`scripts/qa-responsive.mjs` contiene un caso de capacidad de 100 sesiones
y aislamiento de registros corruptos en IndexedDB v2 (índice por escenario).
Comprueba error de guardado ante capacidad completa, conservación de los
100 registros, dos formas de corrupción deliberada, recuperación tras recarga
y restauración de capacidad de escritura únicamente después de la eliminación
individual confirmada. La prueba no simula una cuota física del sistema
operativo; verifica el límite de producto y la ausencia de éxito falso.

**El cierre definitivo de Fase 7 queda condicionado al resultado de CI
sobre este commit.**
