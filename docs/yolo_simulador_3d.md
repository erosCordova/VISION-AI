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
