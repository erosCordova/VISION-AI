# Fase 8 — Indicadores verificables de VISION-AI

Estado: **en curso**. El panel `SessionsDashboard` se alimenta de
las sesiones que el usuario guardó en IndexedDB, procedentes exclusivamente
de los cuatro escenarios 3D. No se importa ningún dataset ni se usa una API
de pago para calcular los indicadores.

## Definiciones de indicadores

| Indicador | Fórmula / alcance |
| --- | --- |
| Sesiones guardadas | Cantidad de sesiones válidas en el filtro |
| Sesiones YOLO | Sesiones cuyo modo era `yolo` y tienen resultado guardado |
| Detecciones conservadas | Suma de detecciones del último fotograma guardado en cada sesión YOLO |
| Confianza media | Suma de puntuaciones válidas / cantidad de detecciones válidas (no es exactitud medida) |
| Latencia media | Suma de `inferenceMs` válidos / sesiones YOLO con duración registrada |
| Señales EPP | Conteo de indicios de revisión guardados; no infracciones confirmadas |
| Por escenario | Conteo de sesiones por cada uno de los cuatro escenarios |
| Por clase | Conteo de predicciones conservadas agrupadas por identificador de clase |

Sin denominador, las medias son **«—»** y no 0 % o 100 %. El número de
sesiones sin detecciones es distinto del número de sesiones sin inferencia.
Las cajas geométricas y los eventos simulados no se suman a las detecciones YOLO.

## Filtros y procedencia

- Filtro de escenario: Todos / Seguridad / Manufactura / Retail / Logística.
- Filtro de modo: Todos / Simulación visual / YOLO.
- Filtro temporal: Todo / 24 horas / 7 días, con corte final en el instante de consulta.
- Las series por fecha utilizan la fecha de guardado en formato ISO UTC.
- La fecha de última actualización del cuadro se deriva del registro más reciente.
- Se consulta el repositorio IndexedDB desde un puerto de aplicación; la
  vista no conoce sus transacciones.

Los cuatro paneles y barras de escenario son una **primera entrega** de Fase 8.
Faltan revisión/cierre de alertas desde operaciones, invalidación dirigida de
consultas y pruebas de rendimiento con el volumen objetivo para cerrar KP02 y
la fase completa.

## Validación

Se añadieron pruebas TypeScript para KP01 y KP03 (cálculo manual, vacío,
filtros y límites de fecha). Chromium comprueba la primera sesión guardada,
KPIs coherentes sin detecciones y filtros que devuelven cero. KP02 y
pruebas con volúmenes mayores permanecen pendientes.
