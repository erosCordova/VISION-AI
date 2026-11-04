# Fase 10 — Segmentación cromática y capas de máscara sobre escenarios 3D

Estado: **INICIADA — primer incremento de programación**, pendiente de pruebas integrales.
Las primeras 8 fases siguen aprobadas; fase 9 está pendiente del cierre de CI.

## Alcance técnico

Solo se analizan imágenes generadas por Seguridad Industrial, Manufactura,
Retail y Logística. No se cargan datasets, videos, archivos ni cámaras.
Los detectores actuales son YOLOv8 **de detección por cajas** (COCO/EPP),
por lo que sus predicciones **no incluyen máscaras de instancia**.
Para no inventar esas máscaras, este incremento usa un procedimiento
distinto y explícito: umbral de contraste RGB sobre los píxeles reales,
limitado a las cajas detectadas en el fotograma.

## Flujo inicial

1. YOLO ONNX analiza el fotograma de la simulación y devuelve cajas.
2. El usuario activa «Superponer máscara cromática aproximada».
3. Se miden los colores reales del fotograma capturado para cada ROI.
4. Se usa la media RGB de las cuatro esquinas de cada ROI como referencia
   aproximada del fondo; se destacan píxeles cuya distancia RGB
   es mayor que el umbral elegido (20–160).
5. Se crea una máscara binaria y se representa un overlay semitransparente,
   manteniendo visibles las cajas del modelo.
6. Se calcula el área unida de píxeles segmentados con respecto
   al área real del fotograma. No se cuentan dos veces solapamientos.
7. Al desactivar la capa, se vuelve al fotograma YOLO sin el overlay.

**Limitaciones:** la máscara es cromática y experimental. No afirma
corresponder al objeto ni sustituye un modelo YOLO-seg. Una región
uniforme puede producir máscara vacía; las sombras, texturas y reflejos
pueden generar falsas regiones. Nunca se deben tratar los porcentajes
como superficie real industrial, calidad ni cumplimiento de EPP.

## Pruebas y requisitos de salida

- SG01: píxeles reales de canvas y cero inferencia adicional al cambiar máscara.
- SG02: sin píxeles diferenciables, máscara vacía sin resultados ficticios.
- SG03: área y proporción calculadas directamente desde píxeles del frame.
- SG04: unión de regiones solapadas sin doble conteo.
- SG05: cuatro escenarios, parámetros inválidos y recuperación tras fallo.
- SG06: no alterar la telemetría original de YOLO ni evidencia PNG.

**Validación pendiente:** TypeScript, Vitest, CI Chromium, rendimiento
y revisión visual antes de aprobar la fase 10. No se han creado modelos
nuevos, archivos de entrada ni dependencias de pago.

## Mejora de presentación del primer incremento

El visor muestra el porcentaje cromático aproximado por región YOLO,
con barras visuales para las primeras seis detecciones, además del
porcentaje total unido del fotograma. Los porcentajes por región son
relativos al rectángulo detectado, no a superficie física del objeto.
Se presenta **0,0 %** cuando no hay diferencia RGB suficiente, sin
sustituirlo por una etiqueta de objeto segmentado.
