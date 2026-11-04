# Laboratorio de simulación 3D — VISION-AI

## Objetivo

Elevar la Fase 6 del manual avanzado a un centro de simulación industrial tridimensional, autónomo, visualmente profesional y publicado con infraestructura gratuita. La interfaz es una **maqueta operacional digital**, no un detector de objetos entrenado. Cada escena es dinámica, posee geometría volumétrica y presenta un panel de supervisión con datos explícitamente sintéticos.

## Tecnología

Se usa **WebGL2 nativo**, con shaders GLSL ES 3.00, geometría procedural en TypeScript, normales e iluminación lambertiana, prueba de profundidad por z-buffer, cámara en perspectiva y proyección 3D/2D para dibujar anotaciones. Es 3D real renderizado por GPU del navegador, **no** la escena SVG anterior ni un video grabado.

No se incorporaron Three.js ni React Three Fiber porque implicarían nuevos paquetes y modificar el archivo de bloqueo. El motor nativo mantiene la instalación npm existente, Vercel Hobby y Render Free, con cero dependencia de GPU remota. Esta decisión puede reevaluarse para modelos 3D más complejos, texturas GLTF y animación esqueletal.

### Componentes

- \`src/modules/live/scene-math.ts\`: vectores, cámara orbital, límites y proyección de coordenadas.
- \`src/modules/live/industrial-renderer.ts\`: geometría volumétrica, materiales básicos, decorados por escenario y renderer WebGL2.
- \`src/modules/live/IndustrialScene3D.tsx\`: lienzo GPU, etiquetas 2D ancladas a objetos 3D, gestos, teclado y captura.
- \`src/modules/live/InteractiveSimulator.tsx\`: panel operativo, controles, escenarios y cronología.
- \`src/modules/live/simulation-engine.ts\`: trayectorias y eventos deterministas del simulador previo, reutilizados sin mezclarlos con inferencia.
- \`src/styles/simulator-3d.css\`: estilo y diseño adaptativo de la consola tridimensional.

## Escenarios tridimensionales

| Vista | Geometría | Eventos calculados |
| --- | --- | --- |
| Seguridad | Trabajadores con casco/chaleco, estaciones de trabajo y perímetro restringido | Entrada sintética de persona sin casco a zona |
| Manufactura | Cinta, rodillos, estructura de inspección y productos | Paso de defecto superficial ilustrativo por inspección |
| Retail | Góndolas, clientes y zona de aforo ilustrativa | Conteo espacial de personas |
| Logística | Racks metálicos, carga, pallets y montacargas | Invasión sintética de vía de seguridad |

## Operación

La modalidad inicial «Simulador 3D» permite cambiar entre los cuatro sectores. Al arrastrar con ratón o touch sobre el lienzo se rota la cámara; la rueda del ratón y botones ± ajustan el zoom. Se ofrecen vistas Isométrica, Frontal y Superior y restablecimiento de cámara. En navegación por teclado, enfocar el canvas y usar flechas para rotar, +/− para acercar y R para restablecer.

Velocidad 0.5×/1×/2×/4×, controles Pausar/Reanudar y Reiniciar, escala temporal desplazable, activación de cajas, rótulos, resaltado y zonas, umbral de referencia para mostrar anotaciones y captura PNG del renderizado y HUD. La pantalla completa utiliza Fullscreen API según permisos del navegador.

Las barras de clase, alertas y líneas de tendencia indican expresamente «sintético» o «referencia». FPS corresponde solo al renderizado visual de WebGL2, jamás a inferencias por segundo de YOLO.

## Rendimiento y seguridad

- Un batch de triángulos por frame evita múltiples draw calls; cámara y viewport se actualizan con ResizeObserver.
- Se limita el renderizado aproximadamente a 30 fotogramas/s para no desperdiciar CPU/GPU.
- devicePixelRatio se limita a 1.65 para equipos modestos.
- Se detiene el cálculo gráfico cuando la pestaña está oculta y se libera el buffer y shader al desmontar.
- WebGL2 no disponible: se informa del problema; la vista no suplanta la inferencia con datos inventados.
- Los archivos y geometrías son procedurales: no hay videos de personas, reconocimiento facial ni transmisión de imágenes.
- El PNG solo se genera por solicitud del usuario.

## Evidencia y límites

Tests TypeScript: proyección, límites de cámara, volumen de mallas, cambios de vista y los cuatro escenarios. QA Chromium prueba diseño a 360, 768 y 1440 píxeles y presencia de controles. Se requiere comprobación manual de suavidad, contraste, navegación de cámara, rendimiento real en GPU integrada y captura PNG para cerrar Fase 6.

Las otras modalidades «Video con YOLO» y «Cámara con YOLO» conservan su conexión a API. El Render Free vigente solo ofrece salud y configuración ligera: **no hay YOLO de inferencia en servidor gratuito**. El simulador avanzado 3D no es entrenamiento ni inferencia de un detector.

## Despliegue

El repositorio se mantiene en rama \`main\`; Vercel Hobby publica frontend y sirve WebGL2. Render Free permanece para la API ligera de estado. No se necesita otro servicio o plan de pago para las escenas 3D. No se altera el avance administrativo 31.25 %, dado que aún falta validar el cierre de Fase 6.
