
# Fase 7 — Modelo de datos y sesiones reproducibles de simulaciones

Estado: **en curso**. Dependencia: fase 6 revisada con pruebas UI01–UI04.

## Alcance actualizado

La decisión de producto es **exclusivamente cuatro simulaciones 3D** (Seguridad Industrial,
Manufactura, Retail y Logística) con YOLO ONNX sobre fotogramas renderizados. No se solicitan
datasets, imágenes, videos ni cámara externa. Las sesiones se guardan explícitamente, nunca
automáticamente por abrir la página. No se persisten fotogramas, videos ni archivos.

## Datos versionados

`SimulationSession` se guarda como registro único en `IndexedDB`,
base `vision-ai-simulation-sessions`, objeto `sessions`, con `schemaVersion=1`,
clave `id` e índice `savedAt`. Se conserva:

- Identificador de ejecución único; fecha UTC de guardado; escenario y nombre visible,
  modo `synthetic` o `yolo`.
- Fuente de la simulación: `sceneVersion=vision-ai-3d-simulation-v1`,
  tiempo redondeado en milisegundos, tipo de renderizador, cámara, huella reproducible,
  evento y cantidad de objetos **sintéticos claramente identificados**.
- Si existe análisis YOLO: identificador secuencial del fotograma inferido,
  instante observado, modelo COCO o EPP, duración, detecciones y bitácora
  de posibles señales EPP. Son datos procedentes de ONNX.
- Ninguna imagen original: la huella del simulador no pretende certificar
  los píxeles de un frame YOLO; identifica la configuración geométrica.

Una misma escena y un mismo tiempo producen la misma huella; cada guardado
genera un ID y fecha nuevos. Las etiquetas YOLO se guardan como instantánea
para que un eventual cambio futuro del catálogo no cambie el historial.

## Integridad y errores

El repositorio valida versión, escenario, tiempo, origen, rango de detecciones y
huella determinista al guardar y leer. La escritura se considera confirmada
únicamente en el evento `transaction.oncomplete` (no al ejecutar `objectStore.add`).
No se hace fallback silencioso a memoria. Datos corruptos, quota agotada,
bloqueo del esquema e identificadores duplicados producen errores visibles.
Límite voluntario: **100 sesiones**, sin eliminación automática de registros anteriores.
El usuario puede eliminar una sesión de forma explícita y confirmada.

El esquema actual no requiere migraciones desde otro almacén productivo,
porque el repositorio anterior era volátil. La actualización a v2, de existir,
deberá preservar los registros v1 o detenerse sin borrarlos. No se eliminan
stores históricos durante un `onupgradeneeded`.

## Flujo de usuario

1. Abrir `#Análisis en vivo` y seleccionar uno de los cuatro escenarios.
2. Elegir **Simulación visual** o **YOLO real**. En el segundo caso iniciar YOLO y
   comprobar al menos una inferencia real.
3. Pulsar **Guardar sesión**. El mensaje aparece solo después de confirmación
   de la transacción.
4. Ir a **Historial**, filtrar, abrir detalle y recargar el navegador: el registro permanece.
5. Si se desea, usar **Eliminar** y confirmar. Nunca se considera un evento
   programado como un hallazgo YOLO.

## Criterios del manual

| Caso | Comprobación | Estado |
| --- | --- | --- |
| DA01 | Guardar, navegar, recargar y recuperar relaciones | **Aprobado en Chromium, ejecución 41869875516** |
| DA02 | Mismo escenario y tiempo → misma huella; IDs distintos | Prueba unitaria |
| DA03 | Etiqueta histórica conservada tras cambiar catálogo vivo | Prueba unitaria |
| DA04 | Rechazo de cuota y fallo sin afirmar persistencia | Validación de código; prueba automatizada de cuota pendiente |

Por estas dependencias, **la Fase 7 sigue en curso**. La Fase 8
no se marca completada por los indicadores actuales del simulador.
