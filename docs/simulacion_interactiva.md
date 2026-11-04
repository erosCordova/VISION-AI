# Simulador visual interactivo — Fase 6

## Objetivo y referencia de diseño

En la aplicación publicada, «Análisis en vivo» abre el **Simulador interactivo**: escenario digital 2D con personas, equipo de protección, montacargas, pallets, productos o clientes en movimiento. Sigue el formato de demostración empresarial solicitado: zona punteada, cajas con etiquetas superpuestas, resaltado opcional, eventos visibles, panel lateral, selector de escenario y botones para pausar y capturar.

No necesita archivos externos, cámaras, pesos de IA, GPU ni backend: funciona en el navegador con React y SVG. Es adecuado para mostrar la UX y explicar las reglas antes de obtener datasets reales.

## Escenarios implementados en la animación

| Vista | Elementos | Movimiento y evento sintético |
| --- | --- | --- |
| Seguridad | Tres personas, cascos, chalecos y área restringida | Una persona sin casco cruza la zona en algunos instantes; se muestra un evento sintético |
| Manufactura | Cinta de transporte, productos y defecto superficial | Una pieza marcada atraviesa la zona de inspección |
| Retail | Personas, estantes y zona de conteo | Se cuenta el número de centros de persona dentro de la zona; aviso ilustrativo por encima de 3 |
| Logística | Montacargas, pallets, cajas y vía de seguridad | El vehículo cruza por intervalos la zona de seguridad |

## Controles funcionales

Selector de cuatro escenarios, umbral para visualizar puntuaciones sintéticas (50–99 %), capas para cajas, etiquetas, máscaras visuales y zonas, porcentajes, velocidad 0.5×/1×/2×, pausar/reanudar, guardar PNG de la escena. El panel indica Hz de actualización observados de la animación (no FPS de YOLO), conteos y gráficos sintéticos del estado del escenario.

Para accesibilidad, botones con `aria-pressed`, inputs etiquetados, foco visible y descripción `aria-label` del SVG. El cálculo determinista tiene pruebas unitarias: sincronización de objetos, límites de zonas, eventos y los cuatro casos.

## Separación estricta de la IA

- **Simulador 2D:** entidades, puntuaciones, eventos y cuadros dibujados desde datos geométricos deterministas, identificados como sintéticos. Las «máscaras» son resaltados visuales, no máscaras inferidas.
- **Video con YOLO:** carga video auténtico del dispositivo; requiere API con motor real.
- **Cámara con YOLO:** solicita permiso para webcam y requiere API con motor real.

Render Free conserva la API ligera con `inferenceAvailable=false`; **no** ejecuta YOLO. La interfaz debe mostrar la diferencia entre una escena animada y un resultado de detección. No se acreditan precisión, mAP, clasificación real de EPP, segmentación ni seguimiento real a partir de esta demo.

## Publicación y verificación

Frontend Vercel Hobby vinculado a `erosCordova/VISION-AI`. Se añade al QA responsive de Chromium la comprobación del lienzo, las pestañas, el filtro y la etiqueta de simulación en 360, 768 y 1440 px. El simulador añade pruebas puras del estado temporal. El historial gráfico sintético no debe persistirse ni incorporarse como detección real.

Manual 6.0: este incremento pertenece a **Fase 6 (interfaz y simulación visual)**. No adelanta como cerradas las fases posteriores de inferencia especializada.
