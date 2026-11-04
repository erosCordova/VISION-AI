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

## Incremento 5: recuperación fiable sin pérdida de evidencia

Se corrige la transición de un fallo YOLO a un reintento: **REINTENTANDO**
es ahora un estado propio y no se confunde con **CARGANDO MODELO**.
Por ello, el monitor conserva las observaciones originales, las marcas
de tiempo y el historial de indicios EPP durante el nuevo intento.
El resultado tardío de un reintento cancelado no se añade a la sesión,
porque la operación continúa protegida por generación y token.
Un fotograma fallido conserva su identidad, sin fabricar detecciones.

Mientras un reintento esté en ejecución se puede **Detener inferencia**,
pero no iniciar una segunda operación ni guardar una sesión incompleta.
Si el reintento concluye, el nuevo resultado se incorpora y la sesión
queda disponible para guardarse. La revisión EPP no emite de nuevo una
alerta existente solo porque el motor haya fallado temporalmente.
El monitor oculta señales «activas» durante fallos/reintentos, aunque
la bitácora ya registrada sigue disponible.

**Sin despliegue** y sin aprobación de fase hasta ejecutar CI y
Chromium. El avance oficial continúa en 8/16 = 50 %.

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

## Incremento 6: trazabilidad del origen 3D en el historial

Cada lectura nueva incorpora `source` con escenario, instante de
la animación, calidad visual y cámara de la captura. El componente
capturador conserva ese contexto al fallar y reintentar **el mismo**
frame. Las sesiones guardadas usan esa procedencia y no la posición
de la simulación al pulsar Guardar; la huella reproducible continúa
calculándose a partir de la versión y tiempo de escena asociados a
la detección. No se almacena imagen, archivo ni dataset.
Una lectura con origen de escenario diferente se rechaza, y se
mantiene compatibilidad con lecturas históricas sin este campo.
Las pruebas cubren las cuatro instalaciones y un cambio de cámara,
modo de representación y tiempo después de la captura.

**Estado:** incremento en commit preparado fuera de main, pendiente
de ejecución integral de TypeScript/Chromium; fase 9 no aprobada.

Validación adicional: el origen de un fotograma se comprueba también
cuando llega como dato corrupto (incluido `null`); el monitor no falla
ni registra inferencia inválida. No se altera la compatibilidad histórica.

## Incremento 7: aceptación de filtros sin nueva inferencia

El ensayo Chromium de Seguridad espera el primer fotograma EPP real,
pausa la simulación, registra el número de lecturas y el conteo original,
sube la confianza visual al 85 % y comprueba que el monitor mantiene sus
predicciones y que no hubo otra inferencia. El ensayo también revisa que
los objetos visibles no superen la cantidad retenida por el modelo.
Las pruebas unitarias incorporan filtros independientes de la evidencia
persistida en los cuatro escenarios y la ausencia de alertas EPP
sintéticas. No se usan archivos externos.

Se verificaron **10 casos aislados** ejecutando la lógica extraída
directamente de las funciones de validación del origen y del regulador
de cadencia. Esta comprobación *no sustituye* `npm run check`, el
paquete completo de Vitest ni Chromium. El commit queda preparado sin
actualizar `main` y sin activar ningún despliegue.

## Incremento 8: aceptación funcional de recuperación del motor

El QA de Chromium incorpora un **fallo controlado y temporal**
en la lectura de píxeles para YOLO, después de que el modelo EPP
haya procesado un fotograma real de la simulación. Esta instrumentación
solo existe en el ensayo automatizado: no altera el runtime de producción.
El ensayo exige que aparezcan el error y el botón de reintento,
reanaliza el **mismo fotograma**, mantiene su ID y comprueba que
se añade exactamente una observación nueva. Valida la transición
a `DETENIDO` y el estado coherente del monitor tras recuperar.
También restaura explícitamente la función nativa de Chromium.

El código de esta validación está preparado, pero **solo se considerará
superada** cuando se ejecute en el runner real junto con TypeScript,
Vitest, Python y la compilación. No se activó ningún nuevo despliegue.

## Incremento 9: exportación auditable de evidencia, sin datasets

Se añadió **Exportar evidencia YOLO (PNG)** al visor, solo cuando
existe al menos un fotograma realmente analizado. El PNG se dibuja
de nuevo sobre el mismo fotograma y contiene **todas las predicciones
retenidas por YOLO después del postprocesamiento**, sin aplicar los
filtros visuales de confianza ni clase. Los cambios de filtro no
provocan una nueva inferencia. El nombre incluye escenario, ID de
fotograma y fecha de captura, sin datos del usuario.

El visor expone por separado conteos de predicciones retenidas y de
detecciones actualmente visibles; muestra además la cámara y el
segundo de escena de la evidencia completada. El archivo se genera
localmente en el navegador, sin cámara externa, sin datasets, sin
subida de imágenes ni almacenamiento de la imagen en Render.
Se incorporaron pruebas de nombre/validación para los cuatro escenarios,
y QA de codificación PNG con el canvas real después de recuperar
una inferencia. La ejecución de Chromium sigue pendiente antes de
la aceptación formal de fase 9.

## Puente a Fase 10 sin aprobación anticipada

Una vez preparada la exportación íntegra de evidencias de las
detecciones YOLO, se incorpora en un incremento independiente
una capa de **segmentación cromática experimental**.
No pertenece a la salida de YOLOv8-det ni sustituye la aceptación
pendiente de OB01–OB05. El trabajo se documenta en
[segmentación de escenarios 3D](fase10_segmentacion_3d.md).
Se mantienen la validación de fase 9 y el avance oficial de 50 %.

## Endurecimiento del cierre de aceptación

La batería Chromium del bloque incorpora comprobación de reanudación
real del motor después del fallo, al menos una lectura nueva,
detención efectiva, continuidad de las métricas originales y
persistencia de controles de máscara durante su validación. Se
eliminan aserciones que podían dar falsos positivos o fallar por
comparar tipos de datos distintos. Queda por **ejecutar** la batería
completa antes de aprobar la fase.

### Selector estable de fotogramas para QA

Separados los contadores `browser-yolo-count-evidence` (detecciones
originales/visibles) y `browser-yolo-count-frames` (fotogramas realmente
procesados). La QA usa exclusivamente el segundo para verificar que
filtros, reintentos y máscaras no desencadenen análisis adicionales;
antes el selector de clase compartida podía confundir objetos con frames.

## Validación adicional obligatoria de los cuatro escenarios

La aceptación exige ejecutar YOLO ONNX real con el modelo COCO en
**Manufactura, Retail y Logística**, comprobar al menos un fotograma
procesado en cada escena y detenerlo antes del siguiente cambio.
**Seguridad** debe ejecutar el detector EPP real, incluyendo error
temporal, reintento, reanudación y detención. La salida puede ser
vacía cuando el modelo no identifica objetos en escenas 3D; eso no
constituye un fallo de motor ni permite inventar detecciones.

Esta ampliación sustituye a una simple inspección de pestañas;
no se considerará validada hasta completar la nueva ejecución CI.
