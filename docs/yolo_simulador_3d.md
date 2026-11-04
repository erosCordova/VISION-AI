# YOLO real sobre la simulación 3D (fase 6, integración piloto)

## Objetivo

VISION-AI ofrece **dos modos independientes** en «Análisis en vivo» → «Simulador 3D»:

1. **Simulación visual:** las etiquetas, puntuaciones, zonas y alertas se derivan del estado conocido de una escena sintética; no son resultados de visión computacional.
2. **YOLO real (navegador):** toma los **píxeles renderizados de la escena 3D sin etiquetas de simulación**, aplica letterbox sin distorsión y normalización RGB 0–1, crea el tensor ONNX y ejecuta una red YOLOv8n real en el navegador con ONNX Runtime Web (WASM). Las cajas aparecen **sobre una copia inmutable del fotograma realmente inferido**, no sobre fotogramas posteriores.

El botón «Iniciar YOLO real» pide explícitamente comenzar y descargar aproximadamente 13 MB de pesos, más el motor. Se permite detener/reanudar; la vista no muestra inferencia si el modelo falla, si no hay conectividad o si no hay detecciones. El usuario puede cambiar a «Simulación visual» en cualquier momento.

## Pesos, procedencia, integridad y licencia

- Fuente de los pesos: [YOLO8-ONNX](https://huggingface.co/unileon-robotics/YOLO8-ONNX), `yolov8n.onnx`, detectores Ultralytics YOLOv8 reexportados a ONNX, archivo público de 12.8 MB.
- Formato confirmado por la ficha del modelo: entrada `images: float32[1,3,480,640]`; salida `output0: float32[1,84,6300]`; 80 clases COCO.
- Integridad obligatoria: SHA256 `fa2c856b0effedce4f49fffd121f438247a64c8f633bf0e6d5e5960e869ccc5a`, obtenido de la página del archivo. Una descarga de otro hash **no se ejecuta**.
- Licencia: **AGPL-3.0** heredada de Ultralytics; no se declara MIT ni dominio público. Para distribución empresarial o despliegues con restricciones de código/licencia se debe evaluar cumplimiento y, en su caso, licencia comercial.
- ONNX Runtime Web: `1.22.0` desde un CDN con versión fijada; backend `wasm` con un único hilo para compatibilidad sin aislamiento del origen.
- Se solicita CORS a Hugging Face para descargar el ONNX; algunos navegadores, proxies o bloqueadores podrían impedir la descarga.

## Pipeline implementado

```text
Escena tridimensional Three.js / WebGL2  (Vercel, GPU del visitante)
             |
             +-- Captura GPU SIN overlay sintético: canvas
             |
        Snapshot / 960 px máx.
             |
      Resize con letterbox 640 × 480
             |
      Normalización RGB a float32 CHW, 0-1
             |
      ONNX Runtime Web (WASM, CPU local)
             |
      YOLOv8n [1,84,6300] -> score por clase COCO
             |
      Umbral -> reproyección -> NMS por clase (IoU 0.45)
             |
      Fotograma congelado con cajas reales y confianza
```

Se evita superponer predicciones sobre la animación que avanza, porque el tiempo de inferencia puede ser elevado. Cada ciclo captura un único frame, procesa sin concurrencia intencionada y actualiza la imagen de resultado solo si la sesión sigue activa. No se envían los frames ni los pesos a Render.

La interfaz muestra número de detecciones, personas detectadas, milisegundos medidos de inferencia, FPS observados de inferencia y el último fotograma procesado. **Un resultado vacío es válido:** la red puede no identificar humanos estilizados, especialmente porque COCO contiene fotografías naturales y hay cambio de dominio (synthetic-to-real).

## Qué NO detecta este modelo general

El dataset COCO incluye 80 categorías como persona, bicicleta, camión, mochila y silla. **No ofrece clases separadas para casco, chaleco reflectante, montacargas, defecto de fabricación o incumplimiento de EPP.** No se pueden convertir eventos del simulador en predicciones de la red, ni afirmar una precisión medida sin evaluación.

Para culminar el proyecto se necesitarán pesos especializados y su validación con datos propios de escenarios. El sistema de Render Free permanece en modo API ligera sin PyTorch ni inferencia de visión.

## Implementación y validación

- `yolo-postprocess.ts`: clases COCO, geometría letterbox, salidas ONNX y NMS con tests unitarios de formatos transpuestos, coordenadas, casos vacíos y errores.
- `yolo-browser.ts`: carga diferida, hash SHA256, ONNX Runtime, preprocesamiento y cálculo de tiempo real.
- `YoloBrowserPanel.tsx`: consentimiento explícito de carga, botón iniciar/parar, estados y resultado de frame asociado.
- `IndustrialScene3D.tsx` y `HumanizedScene3D.tsx`: exponen `rawCanvas()` sin mezclarlo con `capture()` que sí exporta el overlay sintético.
- `InteractiveSimulator.tsx`: modos separados y anotaciones geométricas deshabilitadas durante análisis YOLO.
- Las pruebas automáticas verifican el postprocesamiento. La ejecución efectiva en navegador con los pesos, el rendimiento por CPU y las detecciones bajo cada escenario deben quedar documentados con capturas o logs del runtime. La compilación TypeScript **no** demuestra por sí sola que se haya ejecutado YOLO.

Referencia: https://huggingface.co/unileon-robotics/YOLO8-ONNX/blob/main/yolov8n.onnx


## Extensión especializada: Seguridad Industrial / EPP

Además del detector general COCO, el escenario Seguridad incorpora **YOLOv8s EPP v0.3**, cargado solo por decisión expresa del usuario en el navegador:

- Fuente: https://huggingface.co/constructelligence/construction-site-safety-hazards
- Archivo: `buildvision-hazards-v0.3.onnx`; 44.8 MB descargados bajo demanda.
- Integridad SHA256 publicada: `55f4dd2f53158eac4ff093d938b9fbda80c99454a03672145bbc36f539988249`.
- Licencia de los pesos: **AGPL-3.0**; datos de entrenamiento bajo CC BY 4.0 según el publicador. Antes de una explotación cerrada/comercial es necesario evaluar obligaciones de la licencia.
- Entrada: RGB `float32[1,3,640,640]`, normalizado 0–1, con letterbox gris 114.
- Salida: `float32[1,18,N]` sin NMS, con cuatro coordenadas y catorce puntuaciones de clases. El decodificador genérico soporta 4+C, proyección espacial y NMS por clase.

Clases en el orden oficial: persona, casco, sin casco, chaleco, sin chaleco, sin mascarilla, guantes, calzado de seguridad, excavadora, cargadora, camión volquete, gafas, sin gafas y sin guantes.

La interfaz **no deduce incumplimiento cuando un casco o chaleco no aparece**: solo contabiliza como indicio para revisión las predicciones positivas de clases explícitas `no-hardhat`, `no-safety vest`, `no-goggles` y `no-gloves`. Se excluye `no-mask` de las señales de revisión, ya que el autor advierte que esa clase no fue aprendida de forma fiable. No se asocia automáticamente una prenda a una persona concreta; una inferencia espacial de asociación requeriría calibración y evaluación separadas.

**La fuente de entrada del usuario es exclusivamente el simulador 3D**. No existen controles para cargar fotografías, videos, datasets o etiquetas de entrenamiento. Los pesos ONNX ya están preentrenados; el usuario solo decide cuándo ejecutar inferencia sobre fotogramas simulados.

La ficha del publicador informa un mAP@50 global de 0.634 en su evaluación; **NO es un resultado medido en VISION-AI**. El sistema no afirma precisión, recall ni mAP para nuestros escenarios, porque no se han medido; se presentan únicamente predicciones y latencias de cada ejecución. Hasta contar con él, los conteos de EPP y las advertencias se consideran exclusivamente resultados exploratorios sin uso para prevención de riesgos ni cumplimiento normativo.

La carga de 44.8 MB y la ejecución CPU/WASM pueden ser más lentas en un ordenador de recursos limitados. El modelo COCO liviano sigue disponible. Backend Render Free sin cambios. No se han añadido dependencias npm ni API de pago.


## Decisión de producto — simulación exclusiva (4 de noviembre de 2026)

Se ha retirado la opción de «Imagen real local», la importación de archivos y el laboratorio de evaluación EPP por solicitud del usuario. **El único origen de YOLO es el fotograma generado por WebGL2/Three.js en alguno de los cuatro escenarios.** Las variantes de renderizado no modifican la procedencia de las detecciones.

No confundir el requisito «sin datasets para el usuario» con que el modelo neuronal no necesite conocimientos preentrenados: los pesos de detección proceden de entrenamiento externo y se verifican con SHA256 antes de la inferencia. El usuario nunca deberá cargar ni entrenar datasets.


## Monitor en vivo de predicciones (sin datos de escena sintéticos)

Al entrar en «YOLO real», el panel lateral «Monitor YOLO» sustituye al dashboard de analítica sintética. Recibe eventos de estado y una observación de cada inferencia terminada (modelo, ID secuencial de fotograma, timestamp, latencia y detecciones). Muestra recuentos del último frame, personas reconocidas, latencia y FPS medidos, histograma de hasta 30 lecturas, clases detectadas y señales explícitas de posible ausencia de EPP para revisión. Una predicción con valor de confianza alto no equivale a una medición de precisión. Si el modelo no reconoce objetos, el resultado es cero; antes de la primera inferencia la cifra no se conoce y se presenta como «—». El panel deja indicado cuándo está detenido o no hay lecturas recientes, y no anuncia cumplimiento de seguridad por falta de predicciones.

Al volver a «Simulación visual», reaparece el dashboard geométrico con el rótulo «DATOS SINTÉTICOS». Para preservar consistencia, cambiar escenario, calidad gráfica o modelo descarta las lecturas previas; las capturas de fotograma sin overlays sintéticos siguen siendo la única entrada de YOLO. La tasa de inferencia no debe confundirse con la tasa de dibujo de Three.js/WebGL2 ni con exactitud, mAP o calidad certificada.
