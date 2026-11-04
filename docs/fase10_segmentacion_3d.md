# Fase 10 — Segmentación cromática y capas de máscara sobre escenarios 3D

Estado: **APROBADA — segmentación cromática experimental verificada en CI**.
Las fases 1–10 están aprobadas (10/16 = 62,5 %); fase 11 pendiente.
Evidencia CI: https://github.com/erosCordova/VISION-AI/actions/runs/41926688909.

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
4. Se usa la mediana superior RGB de las cuatro esquinas de cada ROI como referencia
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

**Verificación aprobada:** TypeScript, Vitest, CI Chromium 360/768/1440, pruebas de cálculo y visualización. No se han creado modelos nuevos, archivos de entrada ni dependencias de pago.

## Mejora de presentación del primer incremento

El visor muestra el porcentaje cromático aproximado por región YOLO,
con barras visuales para las primeras seis detecciones, además del
porcentaje total unido del fotograma. Los porcentajes por región son
relativos al rectángulo detectado, no a superficie física del objeto.
Se presenta **0,0 %** cuando no hay diferencia RGB suficiente, sin
sustituirlo por una etiqueta de objeto segmentado.

## Incremento 2: limpieza de ruido y visualización de silueta

Se añade filtro de componentes conectados con vecindad de 4 píxeles,
calculado sobre la máscara binaria obtenida de la imagen y las regiones
YOLO. El usuario puede eliminar regiones de menos de **4, 16 o 64
píxeles**, o desactivar la limpieza. Después de filtrar se recalculan
el área unida y las áreas por región para evitar discrepancias.

El visor permite dos vistas: **superpuesta** sobre la imagen real 3D y
**silueta** cromática sobre fondo oscuro. Las cajas y etiquetas siguen
procediendo de YOLO. Cambiar estos controles no invoca ONNX y no altera
el PNG de evidencia original. Se agregan pruebas de ruido aislado,
conectividad 4, solapamiento, validación de parámetros y QA de controles.

La máscara continúa siendo una estimación por contraste; no representa
identidades de objetos ni mediciones de superficie física.

## Incremento 3: PNG transparente y separación de evidencias

El usuario puede exportar la **máscara cromática visible** a un PNG
de fondo transparente. Los píxeles que no superan el contraste se
guardan con alfa cero. Este archivo es distinto del PNG original
con cajas YOLO: los nombres comienzan con `vision-ai-mask-` y
`vision-ai-yolo-`, respectivamente, y ambos conservan el mismo ID
y fecha del frame. La máscara respeta los filtros visuales activos,
no modifica el historial original y se genera localmente sin subir datos.
La acción verifica que la máscara corresponde al fotograma actual.
Se añaden pruebas para transparencia, integridad geométrica y
nombres de los cuatro escenarios.

## Incremento 4: estimación robusta del fondo

La referencia de color para cada región pasa de la media de las cuatro
esquinas a la **mediana superior por canal RGB**. Así, una esquina
ocupada por un objeto oscuro ya no desplaza indebidamente todo el
fondo claro y evita resaltar un rectángulo completo por contaminación
de una única muestra. Se añaden pruebas de esquinas atípicas, ruido
aislado y consistencia de componentes. La operación sigue siendo
experimental y no equivale a segmentación por IA.

El ensayo Chromium corrige tres falsas alarmas del propio QA:
comparar un estado de ejecución con un conteo, ocultar la máscara
antes de revisar sus controles y confirmar «Detener» sin pulsarlo.
Ahora exige una reanudación real que produce una nueva lectura
antes de detener el motor. También verifica que el 85 % del filtro
sea un valor de estado React y no solo un atributo DOM alterado.

## Incremento 5: contornos y perímetro de píxeles

La máscara cromática permite una tercera vista **Contornos sobre imagen
3D**, que destaca únicamente los píxeles situados en el borde de las
regiones seleccionadas. Se calcula el número de píxeles de contorno y
el perímetro estimado por lados de píxel expuestos, usando vecindad
de 4 píxeles. Las medidas están expresadas en unidades de imagen,
no en metros ni en superficies físicas.

La vista no modifica las cajas, la telemetría ni el PNG original de YOLO.
El PNG exportable de máscara sigue siendo el canal alfa de la máscara
completa, incluso cuando se muestran solo contornos.
Pruebas matemáticas: bloque 3×3 (8 píxeles de borde, 12 lados),
un píxel aislado, máscara vacía e invariancia del área.

## Acta de cierre — SG01–SG07

**Aprobado en GitHub Actions 41926688909.** Se verificaron
implementación y tests de máscaras RGB sobre los fotogramas ONNX,
limpieza de componentes, visualización de silueta y contornos,
métricas de área y perímetro en unidades de píxel, exportación PNG
separada, y ausencia de nuevas inferencias al cambiar filtros.
Se prohíbe presentar estas máscaras como YOLO-seg o segmentación
semántica de instancias: son un análisis cromático aproximado
condicionado por las cajas detectadas.
