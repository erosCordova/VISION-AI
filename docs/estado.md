# Estado verificado del proyecto

Última actualización: 2026-11-04. Referencia: manual avanzado de 16 fases y decisión vigente de utilizar exclusivamente simulaciones 3D.

**ESTADO VIGENTE: 10 de 16 fases aprobadas = 62,5 %. Fase 11 pendiente.** Los registros de incrementos anteriores que aparecen más abajo son históricos y no sustituyen este cierre.

| Fase | Alcance validado | Evidencia |
| --- | --- | --- |
| 1 | Alcance, requisitos, decisiones y planificación | [Cierre documental](evidencias_fases_01_02.md) |
| 2 | Geometría, máscaras, métricas y filtros | [22 pruebas Python](../tests/test_vision_reference.py) |
| 3 | Cuatro escenarios y 12 recursos calibrados | [Cierre de escenarios](evidencias_fase_03.md) |
| 4 | Casos de uso, estados, permisos y errores | [Cierre de negocio](evidencias_fase_04.md) |
| 5 | React, contratos, arquitectura, instalación limpia y build | [Cierre técnico](evidencias_fase_05.md) |
| 6 | Interfaz navegable, cuatro simulaciones 3D, teclado, responsive y movimiento reducido | [Cierre UX](evidencias_fase_06.md) |
| 7 | Sesiones reproducibles, IndexedDB v2, integridad y recuperación DA01–DA04 | [Cierre y evidencias](evidencias_fase_07.md) |
| 8 | Dashboard, KPI y revisión EPP con indicadores verificables | [CI aprobada](https://github.com/erosCordova/VISION-AI/actions/runs/41882458652) |
| 9 | Captura sincronizada y detección YOLO ONNX de cuatro escenarios 3D, estados, reintento, filtros y evidencia PNG | [CI de aceptación](https://github.com/erosCordova/VISION-AI/actions/runs/41926688909) |
| 10 | Máscara cromática por píxeles ROI YOLO, limpieza, siluetas, contornos, áreas y PNG alfa | [CI de aceptación](https://github.com/erosCordova/VISION-AI/actions/runs/41926688909) |

**Avance administrativo vigente: 62,5 % (10 de 16 fases aprobadas).** No mide precisión del modelo, mAP ni exactitud de los objetos estilizados.

## Verificación local

57 pruebas TypeScript y 62 Python aprobadas: **119 en total**. Tipos estrictos, guard de arquitectura y compilación correctos; instalación reproducida con npm ci. El workflow remoto de CI está preparado y se debe consultar en GitHub Actions para su resultado específico.

## Pendientes

- Fase 6 en curso: interfaz navegable, cuatro escenarios, perfiles de prueba y controles de cámara. Falta QA integral y captura física en contexto seguro.
- El repositorio actual es VOLÁTIL: no hay persistencia tras recargar ni cuota de navegador comprobada.
- No hay motor demo integrado, motor de reglas visuales productivo, API real ni despliegue.
- Los PNG son diagramas DEMO; no se han seleccionado datasets fotográficos ni modelos reales.
- Los permisos de referencia no son autenticación de servidor.
- Los 44 casos funcionales del producto siguen pendientes de integración; las mediciones completas se conservan según D08.

## Próximo incremento

Fase 6: interfaz empresarial, rutas, componentes, sistema visual y estados. Persistencia durable en Fase 7; inferencia real en Fase 15.

## Estado de la ampliación en vivo

YOLO y tiempo real son ahora requisitos de los cuatro escenarios. Se añadieron contratos TypeScript de sesión y puerto de inferencia, documentación y diez casos de aceptación pendientes. No hay adaptador YOLO, cámara ni transporte implementados. El 31.25 % corresponde únicamente a la base anterior; la ampliación temporal de esas fases debe revalidarse. Las pruebas nuevas cubren el controlador con dobles, no cámara física ni YOLO. Próximo trabajo: interfaz y controles de cámara de Fase 6. Ver [YOLO y tiempo real](tiempo_real_yolo.md).

## Incremento de Fase 6

Ver [diseño e inventario](diseno_ui.md) y [evidencias](evidencias_fase_06.md). El porcentaje se mantiene en 31.25 % hasta aprobar los criterios completos de la fase.

Segundo incremento de Fase 6: formulario validado de propuesta temporal, modal con foco, filtros y tabla de historial, notificaciones y recuperación de errores por ruta. Cámara confirmada por el usuario; QA integral pendiente.

Tercer incremento Fase 6: recorrido guiado (escenario → cámara → resultados), estados de cámara visibles y bloque explícito de resultados sin inferencia. Se mantiene 31.25 % hasta QA integral. Ver evidencias_fase_06.md.

Cuarto incremento Fase 6: visor de fotograma con cajas, máscaras RLE, patrones, caducidad y rechazo por identidad; sin conexión de YOLO. Pruebas de sincronización y QA responsive automatizado sujetos a CI. No se declara cierre hasta QA manual y cámara real completa.


## Incremento de simulación de video real (en validación)

A petición del usuario se adelanta un piloto local de inferencia para cuatro escenarios: fuente de video en bucle o webcam, captura JPEG limitada a 640 px y envío a FastAPI por HTTP mientras esté activo el análisis, sin cola concurrente en el navegador. El servidor carga YOLO26n en CPU y devuelve cajas reales. La cobertura de casco, chaleco, montacargas y defectos requiere datasets y pesos especializados, y no se afirma inferencia de estas clases con COCO. Persistencia, alerta temporal, segmentación y despliegue seguro continúan pendientes.

La fase 6 sigue sin cierre hasta comprobar cámara, permisos, accesibilidad y simulación en hardware. El repositorio incluye código fuente y pruebas de contrato; que la CI compile no acredita un modelo descargado o ejecutado en el equipo final.

## Incremento de Fase 6 — métricas y lectura por escenario (manual 6.0)

- Estado de conexión de la API: no configurada, comprobando, conectada y fuera de línea; permite reintentar.
- Identificación del primer resultado y medición de frecuencia de respuestas realmente verificadas (no de FPS de cámara). Latencia de inferencia y captura a recepción medidas por separado.
- Comprobación SHA256 del JPEG en navegador y rechazo de respuestas cuya identidad, dimensiones, etiquetas o geometría no coinciden con la captura.
- Panel específico de los cuatro escenarios: retail cuenta detecciones de persona; los otros escenarios no declaran EPP, ingreso a zona ni defecto conforme sin clases y reglas especializadas.
- QA responsive ampliado para verificar selector de fuente, estado de inferencia y visor en 360, 768 y 1440 px. Sigue pendiente recorrido manual integral de accesibilidad y funcionamiento con pesos reales en hardware.

El avance global continúa en 31.25 %, hasta aprobar formalmente la Fase 6. El manual vigente es versión 6.0.

## Publicación en servicios gratuitos

Se introduce un modo **API de estado sin inferencia** para Render Free. Esto permite publicar la interfaz en Vercel y una API liviana en Render sin sobreprometer reconocimiento YOLO. El frontend distingue explícitamente API conectada de motor disponible y no habilita análisis si no hay motor. Ver docs/despliegue_gratuito.md. Publicar no implica cerrar Fase 6 ni aumentar el avance global.

## Incremento de Fase 6 — simulador visual interactivo

Se implementa una escena digital SVG animada y autocontenida en «Análisis en vivo» (modalidad inicial), con cuatro escenarios, elementos móviles, zonas, cajas, anotaciones, capas, umbral sintético, velocidades, pausa y captura PNG. No descarga modelos ni utiliza inferencia YOLO; marca sus resultados como **datos sintéticos** y conserva por separado las modalidades de video/cámara reales. Ver [guía del simulador](simulacion_interactiva.md). CI responsive y pruebas unitarias deben verificarse antes de cerrar este incremento. Avance administrativo 31.25 %.


## Octavo incremento Fase 6 — laboratorio 3D WebGL2

Se sustituye la escena 2D por un escenario tridimensional con mallas procedurales, luces por normales, perspectiva y profundidad de WebGL2, cámara orbital controlable, vistas isométrica/frontal/superior y decorado industrial específico para los cuatro sectores. Se incorporan controles de pausa, velocidad, línea de tiempo, cámara, captura PNG, capas y registro de eventos. El motor de geometría y sus eventos son sintéticos y no se presentan como inferencia real.

Se conserva la aplicación Vercel Hobby y la API de estado en Render Free, sin costes de servidor de GPU. Las pruebas de geometría 3D y QA responsive verifican los componentes disponibles; la calidad visual y WebGL2 hardware requieren validación en distintos dispositivos. **No declarar Fase 6 cerrada ni variar el 31.25 %** sin completar sus criterios.


## Noveno incremento de Fase 6 — movimiento multidireccional y analítica V3

Se implementa un planificador de trayectorias interconectadas, con decisiones pseudoaleatorias reproducibles, velocidad por tramo, inspecciones, pausas, repulsión de proximidad y rumbo propio para cada entidad. El renderizador gira los modelos 3D y anima marcha y brazos en función del movimiento; el montacargas cambia dirección visualmente. Los cuatro escenarios tienen comportamientos diferenciados y sus alertas se derivan de posiciones sintéticas.

Panel analítico renovado con tarjetas KPI, curva de actividad operacional, minimapa de actores y bitácora derivada del estado, con etiquetado sintético visible y sin confusión con inferencia YOLO. Se agregan pruebas puras de trayectoria y métricas y QA responsive del panel. No se ha modificado Render Free ni añadido ningún coste de GPU, y el avance sigue en 31.25 % hasta el cierre de fase 6.

## Décimo incremento Fase 6 — personajes humanos riggeados (Human Edition)

Se incorpora una vista avanzada con Three.js (renderizado PBR y sombras suaves), modelos humanos GLB CC0 asignados según escenario, clips de caminar/esperar y accesorios EPP visuales. Se conserva la vista WebGL2 de geometría anterior como «Modo ligero». Los modelos se descargan bajo demanda desde la biblioteca pública de Gobkit; si no hay red o el proveedor falla, se visualiza un humano articulado de respaldo con aviso visible. La publicación permanece en Vercel Hobby y Render Free sin inferencia YOLO ni servicios de GPU de pago.

Las trayectorias y eventos siguen siendo los definidos por el simulador sintético; utilizar modelos humanos no significa tener detección real. Se mantiene la Fase 6 abierta y el avance administrativo en 31.25 % hasta validar FPS, carga de GLB, cámara y accesibilidad en dispositivos físicos.

## Undécimo incremento de Fase 6 — integración de modelo YOLO en navegador

Se añade un modo separado para capturar fotogramas del simulador 3D **sin overlays** y realizar inferencia real con un modelo YOLOv8n ONNX y runtime WASM del navegador. No se utilizan posiciones programadas para crear detecciones. La salida de red se valida, filtra por confianza e IoU y se superpone solo al fotograma inferido. El piloto distingue fallos y resultados vacíos de las anotaciones sintéticas. La descarga es opcional por botón y verifica SHA256. Debe comprobarse en navegador real la disponibilidad del modelo externo, su latencia y reconocimiento efectivo. Manual técnico: [YOLO sobre simulador 3D](yolo_simulador_3d.md). Render sigue sin procesar video. Avance administrativo 31.25 %; fase 6 aún abierta.


## Duodécimo incremento de Fase 6 — reconocimiento EPP especializado

Se amplió YOLO de 80 clases generales COCO a un **modelo especializado de 14 clases** para Seguridad Industrial, sin modificar el backend Render. Los pesos ONNX verificados se descargan desde Hugging Face solo a solicitud del usuario. El preprocesamiento ahora admite entrada variable 640×480 o 640×640; el decodificador valida el número de clases para impedir etiquetas ficticias. El simulador tiene selector de modelo y fuente de imagen (escena 3D o fotografía local), conteos de EPP y posibles ausencias explícitamente detectadas, nunca inferidas por silencio del detector. La clase sin mascarilla del proveedor se excluye de señales de revisión.

**No declarar precisión o mAP del proyecto sin datos de prueba etiquetados** ni considerar un resultado vacío como cumplimiento. Falta validar el ONNX especializado en Chromium y obtener métricas con fotos reales; la Fase 6 sigue abierta, 31.25% administrativo.


## Decimotercer incremento de Fase 6 — validación cuantitativa de EPP

Se implementa un laboratorio de evaluación con carga de imágenes reales locales, anotaciones TXT, data.yaml obligatorio y mapeo explícito de clases al modelo EPP. Se calculan TP/FP/FN, precisión, recall, F1 y AP@50/mAP@50 mediante comparación por IoU; se descartan resultados de métricas sin GT. Hay revisión gráfica por fotografía y exportación CSV/JSON con procedencia y parámetros. El sistema no genera puntuaciones ficticias ni considera detecciones de la simulación como verdad terreno. Para obtener métricas del proyecto hace falta un dataset real independiente y etiquetado. [Manual de evaluación](evaluacion_epp.md). Persisten Vercel Hobby y Render Free, sin backend de GPU. Fase 6 abierta y 31,25 % administrativo.


## Decimocuarto incremento de Fase 6 — alcance corregido: solo simulaciones

Se deja exclusivamente «Simulador 3D» en el análisis en vivo. Se desactivan las entradas de cámara y video y se elimina la carga de fotografías, el importador de datasets y el laboratorio de evaluación EPP. YOLO (COCO/EPP según escenario) recibe **solo fotogramas de las simulaciones 3D**, con recuadros generados por inferencia ONNX. Las reglas programadas y la analítica sintética siguen rotuladas por separado. No se piden datasets ni se publican métricas de precisión no comprobadas. El backend sigue en Render Free, el frontend en Vercel Hobby. Se mantienen las cuatro simulaciones y la Fase 6 abierta al 31,25 % administrativo.


## Decimoquinto incremento Fase 6 — monitor YOLO asociado a cada inferencia

Se añadió un monitor independiente para modo «YOLO real». Las cifras de objetos, personas, latencia de inferencia, FPS de inferencia, clases detectadas, evolución temporal y señales positivas de EPP proceden **únicamente de tensores reales analizados por ONNX**. El sistema no reutiliza eventos, conteos de actores, confidencias ni posiciones geométricas del simulador para estos indicadores. Al activar YOLO se oculta la analítica sintética; al volver a Simulación visual se presenta el panel de reglas programadas. Cada cambio de escenario, modo gráfico o detector reinicia el monitor, con protección frente a fotogramas duplicados, tardíos o provenientes de otro modelo.

Los FPS mostrados en el monitor son inferencias por segundo, no renderizado GPU; los porcentajes de confianza no representan precisión validada. Para Seguridad, las clases explícitas de posibles ausencias de EPP son indicios para revisión y no certifican incumplimientos. Vercel Hobby frontend y Render Free backend no se modifican. La Fase 6 se mantiene abierta; avance administrativo 31,25 %.


## Decimosexto incremento Fase 6 — señales de revisión EPP con estabilidad temporal

Se añadió una capa de evidencias **exclusivamente a partir de las predicciones de YOLO** para Seguridad Industrial: una señal de posible ausencia de EPP requiere al menos 2 fotogramas positivos entre las últimas 3 inferencias, dentro de una ventana de 30 segundos y con confianza mínima de 55%. Las clases admitidas son `no-hardhat`, `no-safety vest`, `no-goggles` y `no-gloves`; `no-mask` queda excluida. El panel registra hasta 12 episodios de indicios, sin atribuirles identidad individual ni calificar infracciones confirmadas. Si dejan de repetirse, desaparecen de la lista activa. El historial es local y se elimina al cambiar de sesión/modelo.

Las señales no utilizan el estado geométrico, las alertas programadas ni datasets. Se corrigieron los selectores de modo y calidad para evitar limpiar telemetría cuando ya estaba seleccionada la misma opción. Fase 6 permanece abierta y el avance administrativo no cambia hasta que se completen las comprobaciones requeridas.


## Transición real de fases — cierre de UX y comienzo de datos reproducibles

Se reorganiza el trabajo conforme al **Manual avanzado v5.0**:
- **Fase 6 = interfaz navegable** y validación UI01–UI04. Los incrementos
  anteriores de YOLO no eran por sí solos un criterio para prolongar esta fase.
- **Fase 7 = modelo de datos y escenarios reproducibles**: se ha creado
  IndexedDB local con esquema 1, un identificador único por sesión,
  hash geométrico reproducible, grabación de metadatos de escenarios y
  detecciones ONNX guardadas sin fotogramas, historial, filtros y eliminación.
  Ver `fase07_sesiones_simuladas.md`.
- Cierre administrativo de la Fase 6 **pendiente de ejecución CI del commit**.
  Al aprobar UI01–UI04, el total pasa de 5/16 a **6/16 = 37,5 %**.
- La Fase 7 queda **en curso**, sin contabilizarse como aprobada hasta DA01–DA04
  y recuperación/migración verificadas.


## Estado vigente y registro de aprobación — 4 de noviembre de 2026

**Fase 6: APROBADA.** El Manual avanzado v5.0 establece que la Fase 6 es
«Diseño UX UI empresarial y construcción de la interfaz». Los casos UI01–UI04
han superado la verificación automatizada en Chromium:

- UI01: acceso a rutas y títulos, con regreso a la interfaz desde navegación.
- UI02: salto al contenido mediante Enter del teclado.
- UI03: nueve recorridos a 360, 768 y 1440 px sin desbordamientos.
- UI04: emulación de `prefers-reduced-motion: reduce` conservando los controles.

Evidencia: https://github.com/erosCordova/VISION-AI/actions/runs/41869875516 .
**237 pruebas unitarias (171 TypeScript y 66 Python)**; Vercel desplegado
correctamente. No se afirma cobertura total de lector de pantalla o auditoría
WCAG certificada; queda como validación transversal de Fase 14.

**Fase 7: EN CURSO.** El modelo de datos de sesiones reproducibles e
IndexedDB v1 está implementado. DA01 ha sido comprobada en Chromium:
guardar sesión sintética, cambiar a Historial, recargar el navegador y recuperar
el registro. DA02 y DA03 cuentan con pruebas unitarias; DA04 (simulación de
agotamiento de cuota y recuperación controlada) sigue pendiente, junto con
la validación de corrupción y versiones/migraciones. No se aprueba la Fase 7
anticipadamente.

**Avance oficial: 6/16 = 37,5 %.** Las notas antiguas de este documento
sobre Fase 6 en curso y porcentaje 31,25 % son registros históricos
superados por esta actualización. El alcance vigente son exclusivamente
los cuatro escenarios 3D y YOLO sobre sus fotogramas: sin cargas de datasets
ni fuentes externas, frontend en Vercel y backend ligero en Render.


## Incremento de transición Fases 7 y 8

Se implementó el aislamiento de registros corruptos y la migración
física aditiva IndexedDB 1→2 sin borrar información histórica. La batería
DA04 incluye límite de 100 sesiones, mensajes de error sin falso guardado,
integridad de datos tras recarga y recuperación con eliminación manual.

Se inició la **Fase 8** con indicadores derivados de sesiones reales
guardadas en IndexedDB: conteos por escenario, detecciones YOLO guardadas,
confianza media, latencia media y señales de revisión, todos con origen
y filtros explícitos. Ver `docs/indicadores.md`. Su implementación parcial
no significa que la Fase 8 esté aprobada.

Hasta que finalicen las pruebas de este incremento, el avance oficial
sigue siendo **6/16 = 37,5 %**. La Fase 7 se aprobará exclusivamente cuando
DA01–DA04 pasen y quede verificada la migración.


## Registro definitivo — Fase 7 APROBADA, Fase 8 EN CURSO

**Aprobación: 4 de noviembre de 2026**. Código verificado:
`5cb73e4e04d37646f3e371c39b4f95ebcf2745c4`.
Evidencia CI: https://github.com/erosCordova/VISION-AI/actions/runs/41873829082 .

Casos de aceptación:
- **DA01** aprobado: guardar sesión, navegar al historial, recargar y recuperar.
- **DA02** aprobado: los cuatro escenarios conservan huella reproducible y
  generan identificadores de ejecución diferentes.
- **DA03** aprobado: etiqueta y resultado histórico no cambian al modificar
  los objetos de origen en memoria.
- **DA04** aprobado: límite de 100 sesiones, rechazo visible sin falso guardado,
  inyección de dos registros incompatibles, aislamiento sin eliminación
  automática, recuperación tras recarga y eliminación confirmada para
  recuperar la capacidad de escritura.

Migración física IndexedDB 1→2 implementada de forma aditiva, conservando
el almacén y la versión lógica v1 de cada registro; Chromium comprobó la
estructura v2 y el índice por escenario. **No se han realizado pruebas
sobre datos históricos de usuarios reales**; cualquier migración futura
requiere una prueba sobre copia antes de utilizarla en producción.

Validación: **178 pruebas TypeScript, 66 Python, 9 recorridos responsive y
YOLO EPP real en Chromium**. Vercel `READY`. Las advertencias o limitaciones
del almacenamiento del navegador siguen siendo aplicables; los registros
son locales al dispositivo y perfil.

**Avance administrativo definitivo: 7/16 = 43,75 %.**
La **Fase 8** está en curso; KP01 y KP03 cuentan con pruebas unitarias y
de navegador iniciales. KP02 y las pruebas de rendimiento quedan pendientes.
Las cifras históricas 31,25 % y 37,5 % de las secciones precedentes
corresponden a fechas anteriores y ya no son el estado vigente.


## Fase 8 — incremento de KP02 y rendimiento (validación en curso)

Se incorporó la revisión humana de episodios EPP persistidos,
con transición abierta→revisada e idempotencia de cierres, sin cambiar
los resultados originales de YOLO. IndexedDB v3 es una migración aditiva
desde la versión 2: mantiene el almacén `sessions` e incorpora
`reviewClosures` con clave compuesta y relación por sesión.
Operaciones ofrece filtros y estados, y el dashboard refleja conteos
abiertos/cerrados en los filtros activos. El monitor 3D expone tasas
de captura e inferencia separadas, antigüedad, capturas sin fuente y
sesión local activa.

Se añadieron pruebas KP02 de cálculo, protección contra doble cierre,
consistencia tras recarga, QA de Chromium y una prueba de rendimiento
con 100 sesiones. **Fase 8 permanece abierta hasta aprobar CI.**
Avance administrativo vigente: **43,75 % (7 de 16)**.

## Cierre Fase 8 e inicio Fase 9 — 4 de noviembre de 2026

**Fase 8 APROBADA.** Ejecución CI satisfactoria:
https://github.com/erosCordova/VISION-AI/actions/runs/41882458652
(KP01–KP03, cálculos desde IndexedDB, cierre EPP único,
filtros, serie temporal, pruebas de 100 sesiones / 1 200 episodios,
comprobaciones de Chromium, contratos y compilación).

**Avance administrativo: 8 de 16 fases = 50 %.**
**Fase 9 EN CURSO:** se añade un filtro de confianza/clase
exclusivamente visual en el panel YOLO. El decodificador conserva las
predicciones disponibles desde el umbral base del 15 %, y la vista
aplica sus filtros sin reescribir resultados del monitor ni sesiones.
Los casos de sincronización de fotogramas, errores de ejecución y
aceptación integral de Fase 9 siguen pendientes. El sistema solo
analiza fotogramas generados por los cuatro escenarios 3D.


## Fase 9 — coordinación de ejecuciones por fotograma, segundo incremento

Se integró `FrameAnalysisCycle` con identificador de generación, fotograma
e intento, exclusión de doble inicio, descarte de resultados atrasados,
validación de la salida YOLO y conservación temporal del mismo fotograma
para reintentar tras un fallo de inferencia. El visor continúa filtrando
confianza y clase **sin modificar las predicciones originales** del
modelo ni el historial de la simulación. La posición de cada caja se
convierte desde coordenadas normalizadas sobre el mismo fotograma
representado en el canvas. AN01–AN04 tienen pruebas unitarias
adicionales; su cierre final requiere CI y QA con errores controlados.
El avance aprobado se mantiene en **8/16 = 50 %**.

## Cierre verificado de Fases 9 y 10 — 4 de noviembre de 2026

**Aprobadas administrativamente: Fase 9 y Fase 10, 10/16 = 62,5 %.**
La ejecución de GitHub Actions
https://github.com/erosCordova/VISION-AI/actions/runs/41926688909
debe figurar como **success** antes de promover este cierre a `main`.

Evidencia reproducible: `npm ci`, verificación de arquitectura,
`tsc --noEmit`, 259 tests Vitest, 66 tests Python, compilación Vite,
y QA de Chromium en 360, 768 y 1440 píxeles. Se incluye prueba real
del modelo COCO ONNX en Manufactura, Retail y Logística, y del detector
EPP ONNX en Seguridad, sin pedir imágenes, video, cámaras ni datasets.

En Fase 9 se verifican los eventos OB01–OB05/AN01–AN04:
correlación de fotogramas, filtros sin reinferencia, escenarios separados,
resultados vacíos no concluyentes, pausa, detención, fallo controlado,
reintento del mismo frame y trazabilidad. Los PNG de evidencia contienen
detecciones retenidas originales, no únicamente las visibles.

En Fase 10 se comprueban SG01–SG07 y sus pruebas matemáticas: máscaras
cromáticas calculadas únicamente con los píxeles dentro de regiones
YOLO, cálculo de área unida, limpieza de ruido, contornos, perímetro
en lados de píxel, estilos visuales y PNG con transparencia.
**No es YOLO-seg ni una máscara de instancia semántica**; no representa
metros cuadrados, no acredita calidad ni cumplimiento de seguridad.

**Siguiente fase: 11 — reglas, gestión de alertas y revisión humana.**
La publicación con Vercel Hobby y Render Free mantiene únicamente
un motor ONNX en el navegador; Render no procesa fotogramas.
