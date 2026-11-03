# Evidencias y cierre de Fase 3

Fecha: 2026-11-03. Alcance: especificación y recursos esquemáticos de demostración; no inferencia real.

## Casos del manual

| Caso | Comprobación | Observado |
| --- | --- | --- |
| ES01 | Cuatro fichas con entrada, clases, tarea, regla y revisor | 4 escenarios versionados; Seguridad industrial es piloto. |
| ES02 | Una referencia ambigua por escenario | 4 casos indeterminate con motivo y evidencia, sin convertir incertidumbre en negativo. |
| ES03 | Semántica de frontera | Zona de almacén incluye frontera; el caso de centro no fiable permanece indeterminado. |

## Verificación ejecutada

Comando: `python3 -m unittest discover -s tests -v`.

Resultado del recorrido de este incremento: **36 pruebas aprobadas**: 22 fundamentos matemáticos y 14 comprobaciones del catálogo de escenarios. Los subcasos verifican las 12 imágenes y anotaciones.

Las pruebas de escenario comprueban unicidad, clases, coordenadas, referencias de evidencia, asociación de EPP, zonas y fronteras, ratio de defecto respecto al producto, intervalo de personas, integridad SHA-256 y dimensiones PNG. Los 12 archivos se decodificaron con Pillow y se revisaron visualmente en una galería de control.

## Datos y limitaciones

Los 12 PNG son diagramas creados por el proyecto. Cada archivo tiene su huella y no usa fotografías privadas ni recursos externos. No se entrenó ni evaluó un modelo. No se ejecutó un motor de reglas productivo: se verificaron resultados de referencia contra anotaciones y geometría especificadas.

El mecanismo de máscaras de persona se implementará en Fase 10; los contornos actuales son formas esquemáticas. Las fotografías y anotaciones para IA real requieren una selección y evaluación distintas en Fase 15. Los rótulos de los diagramas impiden usarlos como evaluación imparcial de un detector.

## Cierre

Fase 3 aprobada para especificación y recursos demo calibrados. Se conservan fichas, catálogo versionado, 12 imágenes y sus resultados esperados, generador y pruebas. No se presenta como aprobación de ningún escenario con IA real.

Avance administrativo: 3 / 16 × 100 = **18.75 %**. Próximo incremento: Fase 4, casos de uso, estados, permisos y alternativas de error.
