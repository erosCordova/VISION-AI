# VISION AI

Plataforma empresarial de visión computacional con cuatro escenarios exclusivamente simulados en 3D: Seguridad industrial, Almacén inteligente, Control de calidad y Retail.

## Estado verificado

**Fases 1 a 15 aprobadas; avance administrativo: 93,75 % (15 de 16). Fase 16 pendiente.** React + Vite ofrecen cuatro simulaciones 3D con humanos animados. YOLO ONNX (COCO y EPP) procesa fotogramas de estas escenas en el navegador; no se admiten datasets, fotografías, videos ni cámaras como entradas. Existen persistencia local IndexedDB, indicadores verificables y revisión humana de indicios EPP. El frontend se publica en Vercel Hobby; Render Free funciona como API ligera, sin inferencia remota. No se declara precisión, mAP ni rendimiento sostenido sin mediciones.

## Ejecutar y validar

Requisitos frontend: Node.js indicado en `.nvmrc`, npm compatible. Pruebas de referencia: Python 3.12.

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
python3 -m unittest discover -s tests
```

**La inferencia activa se ejecuta exclusivamente en el navegador con ONNX Runtime Web**, después de pulsar «Iniciar YOLO real», sobre capturas de los cuatro escenarios 3D. El proyecto no solicita datasets, videos, imágenes externas ni acceso a cámara. [Las instrucciones históricas del backend](backend/README.md) describen prototipos previos, no el flujo vigente del producto.

## Diferencias entre escenarios

- **Retail:** el checkpoint general permite verificar la clase «person» y contar detecciones visibles por fotograma. No identifica personas ni certifica aforo.
- **Seguridad industrial:** contar personas no demuestra EPP. Cascos y chalecos requieren pesos especializados y asociación por instancia.
- **Almacén inteligente:** un vehículo genérico no es un montacargas. Las zonas requieren calibración y reglas adicionales.
- **Control de calidad:** necesita defectos del producto entrenados y segmentación validada antes de declarar conformidad.

El visor comprueba la identidad del fotograma, la versión y el hash SHA256 del JPEG y descarta resultados fuera de sincronía. Las métricas registran el tiempo observado, sin extrapolar a FPS sostenidos antes de medir.

## Arquitectura y despliegue

Frontend React + TypeScript + Vite; contratos de dominio; backend piloto FastAPI/YOLO26n. El backend actual se ejecuta en loopback y no debe exponerse públicamente sin autenticación, límites, TLS y orígenes autorizados. **Render Free se usa exclusivamente como API de estado sin inferencia YOLO**, y una página publicada en Vercel no puede depender de localhost del visitante. Se está evaluando inferencia ONNX en navegador frente a backend de inferencia con recursos suficientes.

Existe persistencia local IndexedDB de sesiones; el modelo YOLO general y el modelo EPP ejecutan inferencia ONNX sobre los fotogramas 3D. Los PNG de evidencia exportados desde el visor contienen cajas originales calculadas por el detector, y el PNG separado de máscara contiene una aproximación cromática, no salida semántica YOLO-seg.

## Documentación

Manual vigente: **versión 6.0**, 16 fases, con Fase 6 reservada a diseño y construcción de interfaz. [Estado](docs/estado.md) · [Tiempo real y YOLO](docs/tiempo_real_yolo.md) · [Escenarios](docs/escenarios.md) · [Diseño de interfaz](docs/diseno_ui.md) · [Arquitectura](docs/arquitectura.md).

## Responsable

Proyecto individual, Ingeniería de Software con IA — SENATI.

## Publicación Vercel Hobby + Render Free

Consulta [alcance y configuración de la publicación gratuita](docs/despliegue_gratuito.md). La interfaz pública puede reproducir video, pero Render Free no ejecuta el modelo YOLO: el estado del motor se comunica explícitamente.

## Simulador visual interactivo

En **Análisis en vivo → Simulador interactivo** aparecen los cuatro escenarios animados con zonas, objetos y anotaciones, controles de capas, velocidad, pausa y captura PNG. Es una escena sintética **sin detecciones YOLO**; el motor real se mantiene en las otras dos modalidades y no está disponible en Render Free. Ver [funcionamiento detallado](docs/simulacion_interactiva.md).


## Laboratorio 3D avanzado (Fase 6)

**Análisis en vivo → Simulador 3D** abre una instalación interactiva WebGL2: geometría volumétrica de personas, EPP, montacargas, racks, cajas, productos, cinta y zonas en suelo. Incorpora tres vistas de cámara (isométrica, frontal y superior), rotación con ratón y flechas, zoom de rueda, ajustes de visualización, cronología, cambio de velocidad, pausa, reinicio, pantalla completa y captura PNG. Su renderizador es WebGL2 nativo con shaders y mallas 3D generadas localmente, sin bibliotecas adicionales ni coste de GPU remota.

Las puntuaciones, escenas y alertas del simulador siguen siendo **datos sintéticos** y están rotulados como tales. **La única modalidad operativa del análisis en vivo es el simulador 3D**, que admite detecciones de YOLO realizadas sobre sus fotogramas.

Ver [manual técnico del laboratorio 3D](docs/simulacion_interactiva_3d.md).


## Simulador 3D Pro (movimiento no cíclico)

El modo de simulación usa rutas multidirigidas, paradas de inspección, comportamiento por escenario y orientaciones 3D. Incluye dashboard con KPI sintéticos, un gráfico de actividad y minimapa actualizados a partir de los estados de la escena. No representa YOLO real. Consulta [documentación de simulación 3D](docs/simulacion_interactiva_3d.md).

## Human Edition — simulación 3D con humanos animados

La modalidad inicial «Simulador 3D» ahora ofrece la opción **Humanos animados**: personajes humanos GLB gratuitos con animaciones de esqueleto, entorno iluminado con Three.js, variaciones de empleados y clientes, movimiento multirruta, captura PNG y los indicadores del tablero. Para equipos modestos se conserva «Modo ligero» con la vista WebGL2 anterior.

Assets externos: Gobkit CC0 (https://gobkit.com/api/free). Se descargan bajo demanda; puede verse un humano alternativo si la red o el proveedor no responden. Este modo no usa YOLO. Los modelos EPP, el movimiento y las alertas son simulaciones visuales; no constituyen seguridad certificada ni pruebas de detección real. [Detalles técnicos y licencias](docs/simulacion_interactiva_3d.md).

## YOLO sobre el simulador 3D (piloto ONNX)

En «Análisis en vivo» → «Simulador 3D» se puede elegir entre **Simulación visual** (anotaciones sintéticas) y **YOLO real (navegador)**. La segunda modalidad descarga un modelo YOLOv8n ONNX sólo si se presiona «Iniciar YOLO real»; comprueba su hash, infiere píxeles capturados de la escena sin etiquetas, y presenta las cajas generadas por el modelo sobre el mismo fotograma. Si no detecta personas, no se inventan resultados. Este detector COCO no reconoce cascos, chalecos ni defectos industriales específicos. [Alcance, licencias y arquitectura](docs/yolo_simulador_3d.md).


### Detector EPP para Seguridad Industrial

El simulador 3D permite elegir **YOLOv8s EPP (14 clases)** o **YOLOv8n COCO (80 clases)**. El especializado se descarga cuando se solicita (44.8 MB; SHA256 verificado), identifica personas, cascos, chalecos y ciertas señales explícitas de EPP ausente. Las observaciones EPP solo sirven para revisión; resultados vacíos no demuestran cumplimiento. Datos, límites y licencia AGPL-3.0: [manual del piloto](docs/yolo_simulador_3d.md).


## Decisión vigente: exclusivamente simulaciones 3D

VISION-AI se desarrolla **únicamente con cuatro escenarios 3D generados en el navegador**: seguridad industrial, manufactura, retail y logística. No existe un flujo de usuario para importar datasets, etiquetas, fotografías, videos ni cámaras. La fuente de fotogramas de YOLO es siempre la propia simulación; el detector general COCO se utiliza en los escenarios y el especializado EPP permanece disponible en Seguridad.

Se distinguen dos vistas de un mismo escenario: **Simulación visual** (reglas y anotaciones programadas) y **YOLO real** (inferencia sobre los píxeles renderizados, sin leer etiquetas ni coordenadas del simulador). La descarga de pesos preentrenados ONNX es automática tras pulsar Iniciar YOLO; no se solicita cargar ni entrenar datasets. El usuario puede pausar, reanudar, ajustar velocidad, cámara y confianza. Los resultados reales dependen de los objetos que el detector consiga reconocer.

Esta decisión sustituye las opciones anteriores de cargas locales y laboratorio de evaluación. **No se comunica precisión ni mAP no medido.** Vercel aloja el frontend, Render Free permanece exclusivamente como backend ligero, sin inferencia de visión remota.


### Monitor YOLO ligado a las simulaciones

Al iniciar **YOLO real** en cualquiera de los cuatro escenarios 3D, la barra lateral sustituye la analítica sintética por **Monitor YOLO**, con número de detecciones del último fotograma, personas, latencia, FPS inferidos, histórico de lecturas, clases observadas y revisión positiva de EPP cuando corresponda. Antes de inferir aparecen valores sin determinar; el monitor no toma contadores ni alertas del escenario geométrico. Para volver a ver KPI y movimientos programados, cambiar a **Simulación visual**. La aplicación sigue sin pedir datasets, videos ni fotografías, y no afirma precisión sin mediciones verificadas.


### Alertas de revisión basadas en YOLO (sin inventar infracciones)

El detector EPP de Seguridad tiene **señales temporales de revisión**, visibles solo en modo YOLO: exige 2 de los últimos 3 fotogramas con predicciones explícitas de la misma clase de posible ausencia, confianza >=55 % y separación máxima de 30 segundos. Mantiene un historial local de indicios y deja de mostrar la señal activa cuando desaparece. Una lectura puntual o la ausencia de detecciones no se convierten en infracción o cumplimiento. No realiza seguimiento individual de personas ni usa datos geométricos del simulador para estos eventos. No se requieren datasets, imágenes ni videos del usuario.


## Progreso de fases — estado vigente 4 de noviembre de 2026

**15 de 16 fases aprobadas = 93,75 %.** Fases 1–15 aprobadas; fase 16 pendiente.
La fase 8 validó KPI KP01–KP03, revisión humana EPP y rendimiento con sesiones locales.
Pruebas: https://github.com/erosCordova/VISION-AI/actions/runs/41882458652 .
Las fases 9 y 10 validaron YOLO real sobre los cuatro escenarios 3D, sincronización, fallos y reintentos, y máscaras cromáticas por píxel sin alterar evidencias.
Ejecución integral: https://github.com/erosCordova/VISION-AI/actions/runs/41926688909 .
Consulta [estado](docs/estado.md), [indicadores Fase 8](docs/indicadores.md)
[cierre Fase 9](docs/fase09_deteccion_3d.md) y [cierre Fase 10](docs/fase10_segmentacion_3d.md).

## Fase 11 — Reglas y revisión YOLO

El monitor aplica reglas explícitas sobre detecciones de los cuatro
escenarios: EPP repetido para revisión humana; observaciones informativas
de personas en Retail y Logística; defectos no verificables con COCO.
Operaciones registra decisiones y notas opcionales en IndexedDB sin
cambiar las detecciones. No hay sanciones automáticas ni seguimiento
personal. Ver [fase 11](docs/fase11_reglas_alertas.md) y [CI aprobada](https://github.com/erosCordova/VISION-AI/actions/runs/41928837022).

## Fase 12 — Historial y exportaciones

La sección **Historial** muestra informes derivados de sesiones válidas
IndexedDB y decisiones humanas: filtros combinables, tres archivos
CSV (sesiones, detecciones YOLO e indicios), auditoría JSON y
reporte A4 imprimible. Los archivos se generan en el navegador
al solicitarlos, sin imágenes, cámaras, datasets ni procesamiento
remoto. Las CSV incluyen protección frente a fórmulas de hojas de cálculo.
Ver [cierre Fase 12](docs/fase12_informes_historial.md) y
[CI aprobada](https://github.com/erosCordova/VISION-AI/actions/runs/41931298826).

## Fase 13 — Privacidad y protección del navegador

La nueva sección **Privacidad** presenta sesiones, revisiones y datos
incompatibles de IndexedDB. Permite retención manual de 30/90/180 días,
depuración por antigüedad y borrado total atómico, con frases de
confirmación. Los roles son perfiles de prueba y **no** autenticación.
Las cabeceras de Vercel impiden iframes, deniegan permisos de
cámara/micrófono/geolocalización y evitan sniffing de MIME.
No se borran automáticamente backups, descargas o caché ONNX.
Ver [documentación](docs/fase13_seguridad_privacidad.md) y
[CI](https://github.com/erosCordova/VISION-AI/actions/runs/41933824408).

## Fase 14 — Rendimiento y accesibilidad

Se optimizó el ciclo WebGL para evitar reconstruir geometría y
material en cada frame cuando el snapshot no cambia. En pausa se
reduce el ritmo solicitado; el reloj React evita trabajar oculto;
`prefers-reduced-motion` detiene la animación inicialmente.
La cámara 3D tiene controles de teclado accesibles. La CI publica
12 mediciones reales de Chromium (tiempo de navegación observado,
heap JavaScript y FPS de escena) en un JSON adjunto al run,
sin confundirlas con Core Web Vitals ni FPS garantizados.
Ver [informe de Fase 14](docs/fase14_rendimiento_accesibilidad.md)
y [CI](https://github.com/erosCordova/VISION-AI/actions/runs/41935480618).

## Fase 15 — Optimización ONNX sobre simulaciones 3D

El panel de YOLO incluye el modo opcional **Cadencia adaptativa**
(muestreo ajustado a tiempos reales de captura y ejecución del modelo),
conservando tres velocidades manuales. Los resultados muestran
preprocesamiento, tiempo de ONNX/WASM, posprocesamiento y total
por fotograma. El decodificador evita indexaciones dinámicas en
la exploración de clases sin alterar evidencias YOLO.

Los cuatro escenarios se procesan en Chromium con ONNX real y
publican `fase15-inferencia-onnx.json` en los archivos del run CI.
No se usan datasets, cámaras ni imágenes externas; no se declara
precision/recall/mAP ni mejora porcentual sin evidencia comparable.
Ver [Fase 15](docs/fase15_optimizacion_yolo.md)
y [GitHub Actions](https://github.com/erosCordova/VISION-AI/actions/runs/41936880222).
