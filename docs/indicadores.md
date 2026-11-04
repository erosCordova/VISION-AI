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


## Primera comprobación automática — completada

El commit `5cb73e4e04d37646f3e371c39b4f95ebcf2745c4` aprobó
las pruebas iniciales KP01 y KP03, los filtros y la recuperación de KPI
desde IndexedDB en Chromium. La Fase 8 **permanece abierta** por KP02
(revisión/cierre de señales) y la validación integral de los indicadores.


## Incremento de Fase 8 — KP02 y estadísticas de inferencia

Las señales almacenadas por YOLO EPP se revisan en **Operaciones**. Se
derivan exclusivamente de `SimulationSession.inference.reviewLog`:
cada clave compuesta `(sessionId,eventId)` representa un episodio
único, no una persona. La evidencia original conserva su etiqueta,
fotograma, confianza e instante de inferencia.

Los cierres humanos se almacenan separadamente en `reviewClosures`,
mediante IndexedDB v3. `closeReview()` es atómico e idempotente:
comprueba la existencia de la sesión y del episodio, consulta su estado
y, si ya estaba cerrado, devuelve `false` sin generar un segundo cierre.
Eliminar una sesión elimina únicamente los estados de revisión
asociados, dentro de la misma transacción de borrado.

| Indicador de revisión | Definición |
| --- | --- |
| Indicios totales | Episodios YOLO únicos de las sesiones filtradas |
| Sin revisar | Indicios sin cierre persistido para esa sesión y episodio |
| Revisados | Indicios con un cierre persistido asociado |
| Regla KP02 | Cerrar una vez: pendientes -1, revisados +1, total constante; repetición: cambio 0 |

El cambio notifica a la vista Resumen mediante
`vision-ai-reviews-updated`, actualizando solamente los cierres y
recalculando el dashboard. Un guardado o borrado de sesión emite
`vision-ai-sessions-updated`, que actualiza ambos conjuntos.
No hay sincronización con Render ni identidad verificada de supervisor.

En el monitor de la simulación se añaden **FPS de capturas entregadas a
YOLO**, **FPS de inferencias terminadas**, **antigüedad del último
resultado**, **capturas omitidas por falta de canvas** y el indicador
**sesión activa local**. Ninguna cifra representa la tasa del renderizador
WebGL ni cuenta fotogramas intermedios que nunca se intentaron capturar.
Los FPS de captura y de inferencia pueden ser parecidos porque las
peticiones ONNX son secuenciales; se miden por separado, nunca se asumen
idénticos.

## Rendimiento y recuperación

Volumen local objetivo: 100 sesiones, límite del repositorio IndexedDB,
con hasta 12 episodios por sesión. La batería de pruebas comprueba
100 cálculos completos sobre **100 sesiones y 1200 episodios** y exige
finalizar en menos de 2000 ms en el runner CI. Este límite mide consultas
derivadas en memoria, **no** entrenamiento, detección ni latencia de red.

El dashboard presenta «—» para promedios sin denominador, conserva
conteos cero sin falsos positivos y muestra errores si no se puede leer
IndexedDB. Los registros corruptos se aíslan y no se incluyen en los
indicadores; no se sustituyen por cifras de ejemplo.

**Estado:** implementación y pruebas añadidas; el cierre de Fase 8
se determinará al concluir satisfactoriamente la nueva ejecución CI
de KP01–KP03, Chromium y el benchmark.


## Series y revisión visible en el dashboard

El dashboard muestra la distribución de sesiones por día UTC usando
`byDay` derivado del repositorio y limita el gráfico visual a las
10 fechas recientes con actividad del filtro. No rellena fechas sin
datos con cifras inventadas ni afirma que se procesaron todos los
fotogramas. Los cuatro indicios YOLO recientes se obtienen de los
episodios de revisión de las sesiones filtradas, mostrando estado
pendiente/revisado y acceso a Operaciones.

La actualización por el evento de cierre se refleja en la lista reciente,
los contadores abiertos/cerrados y en la vista Operaciones. La prueba
de Chromium valida la serie con una sesión guardada y la evolución
de un episodio desde pendiente a revisado, sin afectar la fuente.

## Cierre aprobado de Fase 8 — 4 de noviembre de 2026

**KP01, KP02 y KP03 aprobados.** La última ejecución de GitHub Actions
[41882458652](https://github.com/erosCordova/VISION-AI/actions/runs/41882458652)
finalizó correctamente: contratos y pruebas TypeScript, referencias Python,
compilación y recorrido de Chromium a tres anchuras. El conjunto incluye
pruebas del tablero con 100 sesiones y 1 200 indicios y revisión EPP
idempotente con persistencia IndexedDB.

La aprobación acredita el comportamiento probado, no datos productivos,
precisión YOLO, capacidad remota ni disponibilidad universal del navegador.
**Avance oficial: 8/16 = 50 %. Siguiente: Fase 9.**
