# Fase 11 — Reglas y ciclo de revisión de alertas YOLO

**Estado:** incremento 1 desarrollado, pendiente de aprobación por CI integral.
Avance oficial vigente: 10/16 = 62,5 %.

## Límites del motor de reglas

La versión `vision-ai-rules-v1` evalúa únicamente predicciones ONNX
obtenidas de los fotogramas de cuatro simulaciones 3D. Una ausencia
de detecciones o una máscara cromática vacía **nunca** se interpreta
como conformidad ni como infracción.

| Escenario | Regla aplicable | Resultado |
| --- | --- | --- |
| Seguridad | Clases EPP explícitas y repetidas en 2 de las últimas 3 lecturas dentro de 30 s, confianza >=55 % | Indicio sujeto a revisión humana |
| Retail | 2 o más detecciones de persona por frame, repetidas 2 de las últimas 3 lecturas | Observación informativa; no es aforo |
| Logística | 1 o más detecciones de persona repetidas 2 de las últimas 3 lecturas | Observación informativa; no acredita proximidad ni peligro |
| Manufactura | COCO no reconoce defectos industriales | Sin regla de calidad verificable; no fabricar alertas |

Las reglas no usan posiciones, zonas, conteos ni eventos preprogramados del
simulador. No asocian detecciones de distintas capturas a una identidad.

## Salida verificable

Un resultado tiene: ID y versión de regla, escenario, detector, categoría,
estado, número de fotogramas recientes y número de lecturas que respaldan
la condición. Los estados distinguen «revisión», «observación informativa»,
«sin evidencia», «sin señal repetida» y «modelo no compatible».

La interfaz en Monitor YOLO presenta la evaluación y el razonamiento
de cada regla, sin generar puntuaciones sintéticas. La cola de Operaciones
continúa limitada a indicios EPP expresamente observados, y su tratamiento
humano no altera las detecciones guardadas.

## Criterios de aceptación

- RG01: reglas EPP exclusivamente positivas y repetidas.
- RG02: observaciones de Retail/Logística informativas y sin sanciones.
- RG03: no inferir defectos, invasión de zonas, aforo o identidad con COCO.
- RG04: evitar eventos sin inferencia, tras cambiar escenario o con
  fotogramas temporalmente incompatibles.
- RG05: persistencia de resoluciones humanas trazables e idempotentes.
- RG06: QA Chromium del monitor de reglas, Operaciones, recarga e historial.

**No aprobar sin check TypeScript, Vitest, Python y recorrido real en Chromium.**
