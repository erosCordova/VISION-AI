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


## Incremento 2: ciclo correlacionado y reintento de fotogramas

El coordinador `frame-analysis-cycle.ts` distingue generación, frameId
e intento. `YoloBrowserPanel` bloquea de forma síncrona dos comienzos
consecutivos, solo acepta el resultado del intento activo, protege
contra cambios de escena y valida cajas normalizadas antes de anunciar
un fotograma completado. Un fallo deja la ejecución marcada como failed,
sin inventar detecciones; el botón **Reintentar último fotograma**
reutiliza la captura de esa misma simulación conservada temporalmente
en memoria, con nuevo token e intento. El usuario no carga archivos.

Los filtros de confianza/clase continúan afectando exclusivamente
la presentación. El contador de detecciones del monitor refleja los
resultados retenidos antes de aplicar filtros visuales. Una prueba de
navegador comprueba el identificador de ejecución correlacionado con
la salida ONNX. Las pruebas AN01–AN04 del coordinador comprueban
antiduplicación, invalidación de respuestas anteriores, geometría
al redimensionar, error y reintento. Falta todavía demostrar AN03/AN04
con fallos de motor y persistencia en navegador para aprobar la fase.

## Incremento 3: procedencia y cadencia, preparado sin despliegue

La captura tiene una hora propia `capturedAtMs` separada del inicio
de cada intento `startedAtMs`. Los reintentos conservan el ID y la
hora de captura originales; las estadísticas y la bitácora de revisión
no confunden un fotograma reintentado con una nueva observación.
Las capturas solo se contabilizan cuando el ciclo acepta un intento
activo; los resultados posteriores a detener o cambiar de detector
se descartan también en la ruta de error del reintento.

La cadencia objetivo ahora puede ser **Ágil (350 ms)**,
**Equilibrada (750 ms)** o **Ahorro (1500 ms)**. No es una promesa de
FPS: la inferencia puede tardar más y nunca se procesan dos capturas
en paralelo. Si la simulación se pausa o el documento no es visible,
no se capturan nuevas imágenes hasta reanudar.

**Estado del bloque:** cambios preparados para validación local/CI
y posterior publicación conjunta. No debe declararse aprobado
hasta ejecutar el paquete de pruebas y revisar los cuatro escenarios
en Chromium. La fase se mantiene abierta y el avance oficial
continúa en 8/16 = 50 %.

## Incremento 4: validación de escenarios y tiempos independientes

Se añade una hora de finalización opcional `completedAtMs` a las
observaciones YOLO. El panel distingue claramente **FPS de capturas**
de **FPS de inferencias terminadas**, y calcula la antigüedad del
resultado desde que está disponible, no desde que se fotografió la escena.
La revisión EPP conserva su hora de captura y no mezcla eventos
programados con predicciones.

La ampliación de QA Chromium realiza una inspección de los **cuatro
escenarios** (Manufactura, Retail, Logística y Seguridad), revisando:
modelo COCO/EPP apropiado, ausencia de entradas externas, cero datos
anteriores al activar un nuevo escenario y filtros reiniciados. Después
mantiene la comprobación con ONNX real en Seguridad y prueba que el
motor puede detenerse y ofrecer reanudación.

**Estado:** pruebas e implementación añadidas a un commit de trabajo
sin asignar a `main`, para no activar Vercel. Se deben ejecutar la
batería TypeScript, la compilación y la prueba Chromium con el nuevo
paquete antes de considerar la fase aprobada. Avance oficial 50 %.
