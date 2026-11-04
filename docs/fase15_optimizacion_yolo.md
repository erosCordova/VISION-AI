# Fase 15 — Optimización y evaluación técnica de YOLO ONNX

**Estado:** trabajo implementado en rama de validación, pendiente de CI.
**Avance anterior:** 14/16 fases = 87,5 %.

## Arquitectura vigente

El motor de inferencia utiliza **ONNX Runtime Web y WebAssembly** en
el navegador, nunca el backend Render, con dos familias de pesos ONNX
preentrenados fijados por URL y verificados por SHA-256:
YOLOv8n COCO (80 clases) y YOLOv8s EPP (14 clases). La carga solo
se inicia con acción del usuario; el modelo descargado y su sesión
se reutilizan en memoria. Los únicos fotogramas provienen del canvas
de las cuatro simulaciones 3D: Seguridad, Manufactura, Retail y Logística.

## Cambios de fase

- Cadencia **adaptativa opcional** para equilibrar inferencia y
  renderizado WebGL. Mantiene las tres cadencias manuales existentes
  sin modificarlas y no solapa las inferencias.
- Media exponencial de la duración real de captura y ONNX, con
  intervalo acotado entre 500 y 2500 ms y reserva mínima de 100 ms.
  No cambia los pesos, clases, confianza ni los fotogramas.
- **Perfil de ejecución** por fotograma: preproceso,
  `InferenceSession.run`, posproceso y total del motor. Son tiempos
  reales de `performance.now()`. El periodo entre capturas no forma
  parte del tiempo de inferencia.
- Decodificación de salida `[1, 4+C, N]` y `[1, N, 4+C]`
  sin indexador dinámico por clase, para reducir llamadas en el
  bucle de ~80 clases × miles de anclas. Se conservan mismos
  cálculos geométricos, orden de empate, umbral, NMS por clase y
  detecciones originales (sin generar ni sustituir cajas).
- Pruebas de equivalencia de tensores orientados de las dos formas,
  detecciones nulas y corruptas, y scheduler adaptativo.

## Validación de los cuatro escenarios

Chromium ejecuta los modelos ONNX reales sobre un fotograma de cada
simulación 3D y almacena `qa-artifacts/fase15-inferencia-onnx.json`
con escenario, modelo, número de fotogramas, conteo de detecciones
originales, fecha y tiempos de las cuatro etapas. Para aprobar,
los tiempos deben ser números reales no negativos, la etapa ONNX
debe durar más que cero y el total debe concordar con la suma.
El artifact se conserva en GitHub Actions, no se envía a Render.

## Alcance responsable

- **No hay datasets ni imágenes externas**; los tests numéricos
  de tensores no entrenan ni etiquetan un modelo.
- No se calculan precision, recall o mAP sin etiquetas verificadas.
  Un resultado de cero detecciones no es fallo de funcionamiento
  del pipeline ni prueba de conformidad industrial.
- No se garantiza que el modelo COCO detecte objetos industriales
  estilizados ni que YOLO EPP reconozca todos los elementos del avatar.
- Los tiempos de Chromium CI no son un benchmark del equipo final;
  no se promete una mejora porcentual sin medir antes/después bajo
  condiciones idénticas.

**Aceptación pendiente:** TypeScript, Vitest, 66 Python, build Vite,
Chromium responsive, cuatro ejecuciones ONNX y JSON del profiling,
regresiones del historial, reglas y privacidad.
