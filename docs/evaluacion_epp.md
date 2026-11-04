# Evaluación cuantitativa de YOLO EPP — Fase 6

## Qué permite medir

La nueva sección **Laboratorio de precisión** aparece exclusivamente cuando se selecciona «Seguridad → YOLO real → EPP industrial». Procesa fotografías reales con etiquetas YOLO para medir:

- Verdaderos positivos (TP), falsos positivos (FP), falsos negativos (FN), con correspondencia por clase y IoU mayor o igual a 0,50.
- Precisión micro, recall micro y F1 micro en el umbral de confianza elegido (5–90 %).
- **AP@50 por clase y mAP@50** como media de las AP de las clases con etiquetas de referencia. AP utiliza 101 niveles de interpolación de recall y detecciones de confianza desde el 5 %, tras NMS por clase.
- Tiempo total y medio de inferencia, número de imágenes, distribución de clases y comparación de cajas de **verdad terreno (GT)** con cajas calculadas por YOLO.

Si no hay anotaciones GT para una clase, su AP es «—», no cero ni cien. Si el dataset carece completamente de GT, mAP, recall y precisión aparecen como no definidos. **No se inventa ni presupone precisión antes de evaluar fotografías realmente etiquetadas.** Este cálculo no es el mAP@50-95 de COCO, ni una evaluación certificada de seguridad.

## Archivos requeridos (sin ZIP)

El usuario selecciona tres grupos locales en el navegador:

1. Fotografías en JPG, PNG o WebP (máximo 40, hasta 12 MB por imagen y 120 MB sumados).
2. Etiquetas YOLO TXT, **un archivo por imagen**, con el mismo nombre base. Se puede permitir la ausencia de TXT solo al confirmar explícitamente que son imágenes negativas verificadas.
3. **data.yaml / dataset.yaml**, obligatorio, que declara las clases y su orden. El evaluador admite YAML con nombres en lista en línea, lista multilínea o diccionario indexado. Si encuentra una clase no reconocida por el modelo de 14 categorías, rechaza el dataset en lugar de atribuirle una clase equivocada.

Ejemplo de dataset reducido para cascos:

\`\`\`text
foto001.jpg
foto001.txt
foto002.jpg
foto002.txt
data.yaml
\`\`\`

Ejemplo de \`data.yaml\`:

\`\`\`yaml
names: ['person', 'hardhat', 'no-hardhat']
\`\`\`

Ejemplo de \`foto001.txt\` (tres clases ordenadas como en el YAML):

\`\`\`text
0 0.500000 0.500000 0.400000 0.600000
1 0.480000 0.270000 0.200000 0.140000
\`\`\`

Cada línea es \`indice x_centro y_centro ancho alto\`, normalizado de 0 a 1. El modelo utiliza los nombres del YAML para convertir los índices propios del dataset a su catálogo original de 14 clases; por tanto puede evaluar subconjuntos o clases permutadas, pero **no supone que índices de otro dataset coincidan automáticamente**. Consulte el formato oficial: https://docs.ultralytics.com/datasets/detect .

Para una evaluación válida, seleccionar fotos de **validación o prueba independientes**, no fotos con las que se entrenó el modelo, y verificar manualmente las cajas de GT. Sin ello no existe evidencia de generalización.

## Ejecución

1. Abrir la página VISION-AI en Vercel y elegir Seguridad → YOLO real (navegador) → EPP industrial.
2. Detener la inferencia continua si está en ejecución.
3. Seleccionar las fotografías, las etiquetas y el archivo data.yaml.
4. Pulsar **Ejecutar evaluación YOLO**. El navegador carga el ONNX EPP verificado por SHA256 si no está cargado.
5. Revisar P/R/F1/mAP@50, la tabla de clases y las imágenes de errores. Cambiar el umbral para comparar P/R/F1 sin repetir inferencia; mAP@50 se calcula sobre el mismo conjunto de predicciones de baja confianza.
6. Exportar CSV de métricas o JSON con predicciones y GT para documentar la práctica.

**El archivo y las imágenes no se transmiten a Render.** La aplicación usa la CPU del navegador (ONNX Runtime Web WASM). La evaluación puede demorarse en computadoras modestes. Pulsar Detener deja acabar la inferencia ya iniciada y evita procesar nuevas imágenes.

## Límites, evidencias y próximos pasos

- Las categorías EPP «sin casco» y «sin chaleco» son predicciones del modelo, no una determinación concluyente de incumplimiento. Clase «sin mascarilla» no se utiliza como señal de infracción.
- El evaluador **no** incorpora automáticamente los datos y clases programados de la simulación 3D. Solo las etiquetas seleccionadas aportan GT.
- Los valores de AP son **estimaciones comparables dentro del mismo protocolo** (predicciones YOLO + NMS, corte de puntuación al 5 %, IoU=0,50, 101 puntos); para comparabilidad oficial y alta confianza estadística será necesaria una evaluación adicional con una batería grande y representativa, y un protocolo COCO completo.
- Las clases no etiquetadas en el dataset se excluyen del cálculo en lugar de penalizar al detector por objetivos fuera del alcance.
- Se exige registrar procedencia, licencia y origen de las fotos, cantidad real de imágenes, distribución por clases, proporción de negativos y evaluación con fotografías del entorno previsto.
- El modelo EPP de Constructelligence usa licencia AGPL-3.0. Revisar licencia y atribución antes de reutilización comercial.
- El proyecto continúa con **Fase 6 abierta y avance administrativo 31,25 %**. No se afirma que el detector ya cumpla un umbral de precisión industrial.
