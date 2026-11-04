# VISION AI

Plataforma empresarial de visión computacional con cuatro escenarios de análisis de video: Seguridad industrial, Almacén inteligente, Control de calidad y Retail.

## Estado verificado

**Fases 1 a 5 aprobadas; avance administrativo: 31.25 % (5 de 16). Fase 6 en curso.** El repositorio contiene React, Vite, un simulador 2D interactivo de cuatro escenarios, controles de cámara, reproducción de videos en bucle, un visor de fotogramas analizados y un piloto opcional FastAPI + YOLO26n en CPU. El frontend y los contratos están cubiertos por CI; no se ha acreditado aún inferencia en el hardware final, precisión ni FPS sostenidos con un modelo real. No se ha declarado despliegue productivo.

## Ejecutar y validar

Requisitos frontend: Node.js indicado en `.nvmrc`, npm compatible. Pruebas de referencia: Python 3.12.

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
python3 -m unittest discover -s tests
```

Para poner en marcha **el motor real local**, pesos, API y Vite, sigue [las instrucciones del backend](backend/README.md). La inferencia requiere instalar librerías Python y pesos YOLO; el servidor debe estar conectado antes de pulsar «Iniciar análisis». Los archivos de video permanecen en el navegador y solo se envían fotogramas mientras el usuario activa el análisis.

## Diferencias entre escenarios

- **Retail:** el checkpoint general permite verificar la clase «person» y contar detecciones visibles por fotograma. No identifica personas ni certifica aforo.
- **Seguridad industrial:** contar personas no demuestra EPP. Cascos y chalecos requieren pesos especializados y asociación por instancia.
- **Almacén inteligente:** un vehículo genérico no es un montacargas. Las zonas requieren calibración y reglas adicionales.
- **Control de calidad:** necesita defectos del producto entrenados y segmentación validada antes de declarar conformidad.

El visor comprueba la identidad del fotograma, la versión y el hash SHA256 del JPEG y descarta resultados fuera de sincronía. Las métricas registran el tiempo observado, sin extrapolar a FPS sostenidos antes de medir.

## Arquitectura y despliegue

Frontend React + TypeScript + Vite; contratos de dominio; backend piloto FastAPI/YOLO26n. El backend actual se ejecuta en loopback y no debe exponerse públicamente sin autenticación, límites, TLS y orígenes autorizados. **Render Free se usa exclusivamente como API de estado sin inferencia YOLO**, y una página publicada en Vercel no puede depender de localhost del visitante. Se está evaluando inferencia ONNX en navegador frente a backend de inferencia con recursos suficientes.

No hay persistencia durable ni modelos especializados validados. Los PNG del proyecto son fixtures esquemáticos, no detecciones de la IA.

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

**7 de 16 fases aprobadas = 43,75 %.**
Fases 1–7 aprobadas. La **Fase 8 (Dashboard e indicadores verificables)**
está en desarrollo: los KPI se calculan exclusivamente a partir de las
sesiones 3D guardadas en IndexedDB, con filtros por escenario, origen y
periodo, sin datos demo ni carga de datasets.
La Fase 7 aprobó DA01–DA04 (persistencia, reproducibilidad,
integridad y recuperación de capacidad).
Pruebas: https://github.com/erosCordova/VISION-AI/actions/runs/41873829082 .
Consulta [estado](docs/estado.md), [cierre Fase 7](docs/fase07_sesiones_simuladas.md)
e [indicadores Fase 8](docs/indicadores.md).
