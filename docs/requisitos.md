# Requisitos verificables

Versión 1.0. Los criterios son especificaciones de aceptación, no pruebas ya aprobadas.

## RF-01 — Sesión y perfiles de interfaz
Fase responsable: 6.

Navegar como operador, supervisor, administrador y auditor según permisos.md. La sesión demo es visual; la versión real valida identidad y recursos en servidor.

Validación de éxito: `RF-01-OK`.
Validación alternativa o negativa: `RF-01-ERR`.

## RF-02 — Escenarios y clases
Fase responsable: 7.

Crear, consultar, editar y desactivar escenarios y clases; las referencias históricas siguen siendo válidas.

Validación de éxito: `RF-02-OK`.
Validación alternativa o negativa: `RF-02-ERR`.

## RF-03 — Entrada de imágenes
Fase responsable: 9.

Validar JPG y PNG, bytes, píxeles y decodificación; mostrar vista previa y error accionable.

Validación de éxito: `RF-03-OK`.
Validación alternativa o negativa: `RF-03-ERR`.

## RF-04 — Ejecución y estados
Fase responsable: 9.

Un envío produce una operación; queued, processing, completed o failed reflejan motor y persistencia.

Validación de éxito: `RF-04-OK`.
Validación alternativa o negativa: `RF-04-ERR`.

## RF-05 — Detección y filtros
Fase responsable: 9.

Mostrar cajas normalizadas, clase y confianza; filtrar sin eliminar resultados brutos.

Validación de éxito: `RF-05-OK`.
Validación alternativa o negativa: `RF-05-ERR`.

## RF-06 — Segmentación visual
Fase responsable: 10.

Superponer máscaras alineadas con leyenda y controles de capa; calcular área a partir de píxeles.

Validación de éxito: `RF-06-OK`.
Validación alternativa o negativa: `RF-06-ERR`.

## RF-07 — Patrones y reglas
Fase responsable: 11.

Evaluar evidencia bruta con reglas versionadas para cada escenario; admitir resultado indeterminado.

Validación de éxito: `RF-07-OK`.
Validación alternativa o negativa: `RF-07-ERR`.

## RF-08 — Alertas y revisión
Fase responsable: 11.

Generar alertas únicas y registrar revisión y cierre con actor, fecha y nota.

Validación de éxito: `RF-08-OK`.
Validación alternativa o negativa: `RF-08-ERR`.

## RF-09 — Dashboard
Fase responsable: 8.

Calcular KPI y series desde el repositorio con periodo y origen coherentes; ausencia de datos explícita.

Validación de éxito: `RF-09-OK`.
Validación alternativa o negativa: `RF-09-ERR`.

## RF-10 — Historial
Fase responsable: 12.

Buscar, filtrar, paginar y abrir análisis con entrada disponible, versiones y resultados relacionados.

Validación de éxito: `RF-10-OK`.
Validación alternativa o negativa: `RF-10-ERR`.

## RF-11 — CSV
Fase responsable: 12.

Exportar todas las detecciones filtradas y declarar origen, fecha de corte y formato; proteger campos textuales.

Validación de éxito: `RF-11-OK`.
Validación alternativa o negativa: `RF-11-ERR`.

## RF-12 — Configuración
Fase responsable: 7.

Validar umbrales, zonas, límites y versiones; conservar configuración aplicada al análisis histórico.

Validación de éxito: `RF-12-OK`.
Validación alternativa o negativa: `RF-12-ERR`.

## RF-13 — Origen DEMO y REAL
Fase responsable: 6.

Mostrar el motor activo en cabecera y conservar el origen en detalles y exportación; no fallback silencioso.

Validación de éxito: `RF-13-OK`.
Validación alternativa o negativa: `RF-13-ERR`.

## RF-14 — IA real evaluada
Fase responsable: 15.

Procesar imágenes nuevas mediante modelos versionados y probar API, métricas, permisos y almacenamiento.

Validación de éxito: `RF-14-OK`.
Validación alternativa o negativa: `RF-14-ERR`.

## RNF-01 — Modularidad
Fase responsable: 5.

Componentes consumen casos de uso y contratos; geometría, reglas y persistencia no se mezclan con JSX.

Validación de éxito: `RNF-01-OK`.
Validación alternativa o negativa: `RNF-01-ERR`.

## RNF-02 — Usabilidad y accesibilidad
Fase responsable: 6.

Textos en español, foco, teclado, errores accesibles y revisión en 360, 768 y 1440 píxeles.

Validación de éxito: `RNF-02-OK`.
Validación alternativa o negativa: `RNF-02-ERR`.

## RNF-03 — Calidad reproducible
Fase responsable: 14.

Casos versionados con esperado, observado y evidencia; cero defectos bloqueantes al cerrar el hito.

Validación de éxito: `RNF-03-OK`.
Validación alternativa o negativa: `RNF-03-ERR`.

## RNF-04 — Persistencia e integridad
Fase responsable: 7.

Resultados, recursos y configuración mantienen relaciones; cuota, corrupción y migración se controlan.

Validación de éxito: `RNF-04-OK`.
Validación alternativa o negativa: `RNF-04-ERR`.

## RNF-05 — Seguridad y privacidad
Fase responsable: 13.

Validar entradas y ciclo de vida; en real autorizar por recurso y mantener secretos solo en servidor.

Validación de éxito: `RNF-05-OK`.
Validación alternativa o negativa: `RNF-05-ERR`.

## RNF-06 — Trazabilidad
Fase responsable: 7.

Conservar ID, origen, fecha, configuración y versiones de escenario, regla y modelo aplicables.

Validación de éxito: `RNF-06-OK`.
Validación alternativa o negativa: `RNF-06-ERR`.

## RNF-07 — Rendimiento y capacidad
Fase responsable: 14.

Medir los presupuestos de decisiones.md con equipo, navegador, dataset, muestra y volumen identificados.

Validación de éxito: `RNF-07-OK`.
Validación alternativa o negativa: `RNF-07-ERR`.

## RNF-08 — Operación y recuperación
Fase responsable: 16.

Documentar entrega, salud, reinicios, backup y restauración; separar incidencias técnicas de alertas de negocio.

Validación de éxito: `RNF-08-OK`.
Validación alternativa o negativa: `RNF-08-ERR`.

## RF-15 — Cámara y sesión

Solicitar permiso explícito, seleccionar cámara y ofrecer inicio, pausa, detención y recuperación. Liberar pistas y conexiones incluso tras una autorización tardía.

Ampliación D12. Aceptación pendiente: casos RT01 a RT10 en tiempo_real_yolo.md. Fases responsables según matriz RT. Son 18 RF y 8 RNF; los 44 casos históricos no cubren esta ampliación.

## RF-16 — Procesamiento temporal acotado

Identificar sesión, generación y fotograma; limitar a una inferencia y un pendiente, descartar datos obsoletos y mantener overlays sobre el fotograma correcto.

Ampliación D12. Aceptación pendiente: casos RT01 a RT10 en tiempo_real_yolo.md. Fases responsables según matriz RT. Son 18 RF y 8 RNF; los 44 casos históricos no cubren esta ampliación.

## RF-17 — Inferencia YOLO

Usar modelos YOLO adecuados a detección y segmentación; declarar pesos, clases y versión y validar cada escenario con datos reservados.

Ampliación D12. Aceptación pendiente: casos RT01 a RT10 en tiempo_real_yolo.md. Fases responsables según matriz RT. Son 18 RF y 8 RNF; los 44 casos históricos no cubren esta ampliación.

## RF-18 — Eventos y métricas en vivo

Aplicar reglas temporales configurables, evitar alertas duplicadas por episodio y medir captura, inferencia, descartes y latencia sin mezclar relojes.

Ampliación D12. Aceptación pendiente: casos RT01 a RT10 en tiempo_real_yolo.md. Fases responsables según matriz RT. Son 18 RF y 8 RNF; los 44 casos históricos no cubren esta ampliación.
