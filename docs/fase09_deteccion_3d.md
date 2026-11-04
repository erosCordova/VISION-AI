# Fase 9 — Centro de detección YOLO en los cuatro escenarios 3D

Estado: **EN CURSO** (4 de noviembre de 2026). Avance oficial: 8/16 = 50 %.

## Alcance operativo

Una sola fuente: fotogramas renderizados por las simulaciones 3D de
Seguridad Industrial, Manufactura, Retail y Logística. **No hay importación
de datasets, fotografías, videos ni conexión de cámara externa.**
El procesamiento YOLO ONNX se ejecuta en el navegador y no en Render Free.
El modelo COCO detecta objetos generales; el modelo EPP especializado
está disponible en Seguridad Industrial. No se promete exactitud ni
detección de categorías que el checkpoint no contiene.

## Criterios de aceptación

| ID | Resultado requerido | Estado |
| --- | --- | --- |
| OB01 | Fotograma capturado = fotograma sobre el que se dibujan cajas YOLO; sin coordenadas de escena programadas | Implementación existente; falta verificación integral de Fase 9 |
| OB02 | Filtrar por confianza y clase sin modificar evidencia original ni reejecutar ONNX solo por cambiar filtros | Primer incremento implementado; CI pendiente |
| OB03 | Estados Iniciar / Cargando / Analizando / Detenido / Error y descarte de respuestas atrasadas, incluso al cambiar de escenario | Implementación parcial existente; QA específico pendiente |
| OB04 | Resultados vacíos se muestran como vacíos, nunca como cumplimiento, y la detección no se mezcla con KPI sintéticos | Implementación existente; aceptación pendiente |
| OB05 | Pruebas de continuidad, pausa, recuperación de error y ausencia de duplicación al cambiar ajustes | Pendiente |

## Incremento 1: detecciones y presentación separadas

El decodificador de YOLO usa una confianza base de **15 %**, mínima
admitida por el control actual. La lista producida por el modelo se
conserva en telemetría y en el registro de la sesión.
El control de **confianza visual mínima** (15–85 %) y el selector de
**clase visible** filtran únicamente las cajas, rótulos y conteos del visor.
Cambiar filtros no inicia otra inferencia; la selección puede producir
cero cajas incluso cuando existe evidencia bruta. Una ausencia de cajas
bajo un filtro no implica ausencia de objetos en el escenario.
El postprocesamiento continúa aplicando NMS y un máximo de 35 predicciones;
por ello, evidencia original significa la salida decodificada retenida,
no todos los tensores sin procesar.

La revisión EPP se calcula a partir de la evidencia de YOLO, con su
umbral independiente de 55 % y regla temporal 2 de 3 fotogramas.
La selección visual no debe alterar los indicios almacenados.

## Puertas de cierre

No aprobar Fase 9 hasta que OB01–OB05 superen pruebas automatizadas
y se comprueben los cuatro escenarios en Chromium, incluidos
errores del modelo, salidas vacías y consistencia de la sesión guardada.
