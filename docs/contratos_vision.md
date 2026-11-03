# Fase 2 — Contratos de análisis visual

Versión: vision-contract-v1. Fecha: 2026-11-03. Referencia: manual 4.0.

Esta fase especifica los datos y valida su geometría con una implementación matemática de referencia. No hay aplicación React, detector, segmentador entrenado ni procesamiento de imágenes reales todavía.

## Imagen y espacio canónico

| Campo | Regla |
| --- | --- |
| assetId | Identificador de recurso persistente; no URL blob como identidad histórica. |
| rawWidth, rawHeight | Enteros positivos del archivo antes de orientar. |
| width, height | Dimensiones después de aplicar orientación; referencia de toda geometría canónica. |
| orientationApplied | Indica que el decodificador ya aplicó orientación, incluidas inversiones cuando existan. |
| origin | demo o real, preservado en resultados y exportaciones. |
| contentHash | Huella del recurso exacto; no confundir nombre de archivo con identidad. |
| preprocessingVersion | Versión de orientación, redimensionado, normalización y color usados. |

Las cajas usan bordes continuos, origen arriba a la izquierda, x hacia la derecha e y hacia abajo. Los píxeles raster se indexan por fila y columna desde cero. Las dimensiones de una imagen rotada 90 o 270 grados se intercambian. El helper de giros no lee EXIF ni aplica reflejos: esa responsabilidad es del decodificador de la Fase 9.

## BoundingBox

`{x, y, width, height}` en coordenadas normalizadas respecto de la imagen orientada. Todos los valores deben ser finitos; no se admiten booleanos como números. x e y están en [0,1], ancho y alto en (0,1]. Debe cumplirse x+width <= 1 e y+height <= 1, con tolerancia numérica de 1e-9 en la suma. No aceptar cajas fuera de imagen ni recortarlas silenciosamente.

Una caja completa es `{x:0,y:0,width:1,height:1}`. Una caja de ancho cero es inválida. El motor real debe convertir sus formatos internos al contrato antes de devolver resultados.

## Transformación al visor

Para un visor centrado equivalente a `object-fit: contain`:

- scale = min(viewportWidth/imageWidth, viewportHeight/imageHeight).
- visibleWidth = imageWidth × scale; visibleHeight = imageHeight × scale.
- offsetX = (viewportWidth-visibleWidth)/2; offsetY = (viewportHeight-visibleHeight)/2.
- left = offsetX + x×visibleWidth; top = offsetY + y×visibleHeight.
- widthPx = width×visibleWidth; heightPx = height×visibleHeight.

La tolerancia objetivo de dibujo es 1 píxel CSS; no se trata de precisión del modelo. La referencia no incorpora zoom, desplazamiento ni relación devicePixelRatio: el visor de la Fase 6 deberá modelarlos expresamente si los añade.

## Redimensionado y relleno del modelo

Guardar dimensiones originales, lienzo objetivo, tamaño redimensionado efectivo y relleno izquierdo y superior. Utilizar valores efectivos enteros de resize, no reconstruirlos con un factor aproximado después del redondeo.

Ejemplo: 1000×800 → región 640×512 dentro de lienzo 640×640, con padTop=64 y padLeft=0. La caja (0.2,0.15,0.3,0.7) pasa a (0.2,0.22,0.3,0.56) en coordenadas normalizadas del lienzo. La inversión recupera la caja inicial.

Las cajas predichas dentro del relleno se rechazan al mapear a la imagen. Si un modelo exige clipping de su salida, la política se especifica en su adaptador y conserva la salida bruta; esta referencia no lo hace automáticamente.

## Segmentación por tarea

Decisión base: el contrato soporta máscaras binarias por región; cada escenario define si representan clase o instancia en Fase 3. Una máscara de persona debe conservar la instancia si se usa para asociar EPP. No se exige segmentación panóptica.

| Campo | Regla |
| --- | --- |
| id, analysisId | Identidad y pertenencia inequívoca. |
| classId | Clase del catálogo versionado. |
| instanceId | Obligatorio cuando el resultado representa una instancia individual. |
| coordinateSpace | oriented-original; no dibujar directamente sobre dimensiones del tensor. |
| width, height | Deben coincidir con la imagen canónica para el área y métricas aquí definidas. |
| data o maskRef | Exactamente un mecanismo de acceso; documentar formato, permisos y vigencia. |
| confidence | Opcional cuando el modelo la proporciona; su ausencia no significa cero. |

Formato de referencia: matriz rectangular de enteros 0/1. Alternativa compacta propuesta: `binary-rle-row-v1`, orden fila a fila, comenzando siempre con longitud de ceros. Solo el primer run puede tener longitud cero y la suma debe ser width×height. Ejemplo [[1,0],[1,1]] → counts [0,1,1,2]. Este formato propio **no es COCO RLE**. Cualquier formato de proveedor requiere adaptación explícita.

`areaRatio = píxeles positivos / (width×height)`. Para área total por clase con instancias superpuestas usar la unión, no sumar y contar píxeles dos veces. El resize de etiquetas se realizará sin inventar clases; su validación con imágenes corresponde a Fases 9 y 10.

## Confianza y filtros

Confianza en [0,1]; en UI mostrar porcentaje. Umbral inclusivo: se muestra una detección cuando confidence >= threshold. Se crea otra lista para la vista y se mantiene el resultado bruto. Estas puntuaciones no equivalen a porcentaje de aciertos ni prueban calibración.

NMS depende del detector y se define en Fase 15: clase, IoU y umbral deben conservarse en configuración. No añadir supresión duplicada a un modelo que ya entrega resultados postprocesados sin validarlo.

## Métricas

- IoU de cajas = área de intersección / área de unión; caja idéntica 1, cajas disjuntas 0.
- IoU de máscaras = píxeles de intersección / píxeles de unión.
- Dice = 2×intersección / suma de píxeles positivos de ambas máscaras.
- Dos máscaras sin primer plano: IoU y Dice = null; registrar por separado y excluir del promedio de regiones positivas. No convertir ausencia de objeto en un acierto perfecto. La evaluación futura debe conservar esta convención.
- Una vacía y otra con objeto: IoU y Dice = 0.
- No comparar máscaras de dimensiones distintas: registrar error de contrato.

mAP, precisión y recall del modelo se evaluarán en Fase 15 con etiquetas, coincidencia por clase, umbrales, protocolo y conjunto de prueba explícitos. Las pruebas geométricas de esta fase no certifican esas métricas ni las implementan como evaluación de un detector.

## Errores del contrato

Rechazar valores no finitos, geometría inválida, máscara no rectangular, etiqueta no binaria, RLE inconsistente o referencia a otra imagen. La API posterior utilizará códigos de error tipados; esta referencia utiliza ValueError. La UI nunca deberá anunciar completado para una salida rechazada.

## Reproducción

Desde la raíz: `python3 -m unittest discover -s tests -v`.

Código: [referencia matemática](../tools/vision_reference.py). Casos: [pruebas unitarias](../tests/test_vision_reference.py). Datos: [fixture sintética](fixtures/fase02.json). No se requiere instalación de paquetes externos.
