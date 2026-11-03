# Casos de aceptación

Estado inicial de todos los casos funcionales: **pendiente de ejecución**. Las comprobaciones documentales se registran aparte.

## RF-01-OK
- Requisito: RF-01.
- Fase: 6.
- Preparación y acción: Abrir una ruta autorizada con el perfil correcto.
- Resultado de aceptación: Navegar como operador, supervisor, administrador y auditor según permisos.md. La sesión demo es visual; la versión real valida identidad y recursos en servidor.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-01-ERR
- Requisito: RF-01.
- Fase: 6.
- Preparación y acción: Intentar una acción de administración con perfil operador.
- Resultado de aceptación: Navegar como operador, supervisor, administrador y auditor según permisos.md. La sesión demo es visual; la versión real valida identidad y recursos en servidor.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-02-OK
- Requisito: RF-02.
- Fase: 7.
- Preparación y acción: Modificar una clase y consultar el catálogo.
- Resultado de aceptación: Crear, consultar, editar y desactivar escenarios y clases; las referencias históricas siguen siendo válidas.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-02-ERR
- Requisito: RF-02.
- Fase: 7.
- Preparación y acción: Desactivar una clase con historial sin romper sus análisis.
- Resultado de aceptación: Crear, consultar, editar y desactivar escenarios y clases; las referencias históricas siguen siendo válidas.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-03-OK
- Requisito: RF-03.
- Fase: 9.
- Preparación y acción: Cargar JPG y PNG válidos y verificar dimensiones.
- Resultado de aceptación: Validar JPG y PNG, bytes, píxeles y decodificación; mostrar vista previa y error accionable.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-03-ERR
- Requisito: RF-03.
- Fase: 9.
- Preparación y acción: Cargar un archivo corrupto o por encima de los límites.
- Resultado de aceptación: Validar JPG y PNG, bytes, píxeles y decodificación; mostrar vista previa y error accionable.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-04-OK
- Requisito: RF-04.
- Fase: 9.
- Preparación y acción: Completar un análisis y conservar ID y resultado.
- Resultado de aceptación: Un envío produce una operación; queued, processing, completed o failed reflejan motor y persistencia.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-04-ERR
- Requisito: RF-04.
- Fase: 9.
- Preparación y acción: Repetir el clic y simular fallo de escritura sin éxito falso.
- Resultado de aceptación: Un envío produce una operación; queued, processing, completed o failed reflejan motor y persistencia.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-05-OK
- Requisito: RF-05.
- Fase: 9.
- Preparación y acción: Cambiar tamaño del visor y filtrar por clase y umbral.
- Resultado de aceptación: Mostrar cajas normalizadas, clase y confianza; filtrar sin eliminar resultados brutos.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-05-ERR
- Requisito: RF-05.
- Fase: 9.
- Preparación y acción: Recibir una caja fuera de rango o respuesta tardía de otra imagen.
- Resultado de aceptación: Mostrar cajas normalizadas, clase y confianza; filtrar sin eliminar resultados brutos.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-06-OK
- Requisito: RF-06.
- Fase: 10.
- Preparación y acción: Mostrar máscara fixture y comprobar ratio conocido.
- Resultado de aceptación: Superponer máscaras alineadas con leyenda y controles de capa; calcular área a partir de píxeles.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-06-ERR
- Requisito: RF-06.
- Fase: 10.
- Preparación y acción: Recibir dimensiones incompatibles o recurso de máscara perdido.
- Resultado de aceptación: Superponer máscaras alineadas con leyenda y controles de capa; calcular área a partir de píxeles.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-07-OK
- Requisito: RF-07.
- Fase: 11.
- Preparación y acción: Evaluar un caso positivo y uno negativo por regla.
- Resultado de aceptación: Evaluar evidencia bruta con reglas versionadas para cada escenario; admitir resultado indeterminado.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-07-ERR
- Requisito: RF-07.
- Fase: 11.
- Preparación y acción: Evaluar evidencia incompleta y valor exactamente en el umbral.
- Resultado de aceptación: Evaluar evidencia bruta con reglas versionadas para cada escenario; admitir resultado indeterminado.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-08-OK
- Requisito: RF-08.
- Fase: 11.
- Preparación y acción: Revisar una alerta y recuperar su estado tras recarga.
- Resultado de aceptación: Generar alertas únicas y registrar revisión y cierre con actor, fecha y nota.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-08-ERR
- Requisito: RF-08.
- Fase: 11.
- Preparación y acción: Evaluar dos veces el hallazgo o simular conflicto de revisión.
- Resultado de aceptación: Generar alertas únicas y registrar revisión y cierre con actor, fecha y nota.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-09-OK
- Requisito: RF-09.
- Fase: 8.
- Preparación y acción: Comparar indicadores con cálculo manual.
- Resultado de aceptación: Calcular KPI y series desde el repositorio con periodo y origen coherentes; ausencia de datos explícita.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-09-ERR
- Requisito: RF-09.
- Fase: 8.
- Preparación y acción: Consultar un periodo vacío o una consulta fallida.
- Resultado de aceptación: Calcular KPI y series desde el repositorio con periodo y origen coherentes; ausencia de datos explícita.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-10-OK
- Requisito: RF-10.
- Fase: 12.
- Preparación y acción: Recargar y abrir por ID un análisis guardado.
- Resultado de aceptación: Buscar, filtrar, paginar y abrir análisis con entrada disponible, versiones y resultados relacionados.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-10-ERR
- Requisito: RF-10.
- Fase: 12.
- Preparación y acción: Abrir un recurso expirado o un ID inexistente.
- Resultado de aceptación: Buscar, filtrar, paginar y abrir análisis con entrada disponible, versiones y resultados relacionados.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-11-OK
- Requisito: RF-11.
- Fase: 12.
- Preparación y acción: Exportar varias páginas con tildes y comillas.
- Resultado de aceptación: Exportar todas las detecciones filtradas y declarar origen, fecha de corte y formato; proteger campos textuales.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-11-ERR
- Requisito: RF-11.
- Fase: 12.
- Preparación y acción: Exportar conjunto vacío o texto que parezca una fórmula.
- Resultado de aceptación: Exportar todas las detecciones filtradas y declarar origen, fecha de corte y formato; proteger campos textuales.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-12-OK
- Requisito: RF-12.
- Fase: 7.
- Preparación y acción: Actualizar umbral válido y guardar nueva versión.
- Resultado de aceptación: Validar umbrales, zonas, límites y versiones; conservar configuración aplicada al análisis histórico.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-12-ERR
- Requisito: RF-12.
- Fase: 7.
- Preparación y acción: Intentar valores negativos, umbral mayor que uno o zona inválida.
- Resultado de aceptación: Validar umbrales, zonas, límites y versiones; conservar configuración aplicada al análisis histórico.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-13-OK
- Requisito: RF-13.
- Fase: 6.
- Preparación y acción: Identificar claramente la salida de cada adaptador.
- Resultado de aceptación: Mostrar el motor activo en cabecera y conservar el origen en detalles y exportación; no fallback silencioso.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-13-ERR
- Requisito: RF-13.
- Fase: 6.
- Preparación y acción: Simular caída real y comprobar que no se presentan semillas como inferencia.
- Resultado de aceptación: Mostrar el motor activo en cabecera y conservar el origen en detalles y exportación; no fallback silencioso.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-14-OK
- Requisito: RF-14.
- Fase: 15.
- Preparación y acción: Analizar imagen etiquetada con modelo y versión identificables.
- Resultado de aceptación: Procesar imágenes nuevas mediante modelos versionados y probar API, métricas, permisos y almacenamiento.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RF-14-ERR
- Requisito: RF-14.
- Fase: 15.
- Preparación y acción: Provocar timeout, recurso ajeno o escenario no validado.
- Resultado de aceptación: Procesar imágenes nuevas mediante modelos versionados y probar API, métricas, permisos y almacenamiento.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-01-OK
- Requisito: RNF-01.
- Fase: 5.
- Preparación y acción: Sustituir adaptador conservando contrato.
- Resultado de aceptación: Componentes consumen casos de uso y contratos; geometría, reglas y persistencia no se mezclan con JSX.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-01-ERR
- Requisito: RNF-01.
- Fase: 5.
- Preparación y acción: Detectar importación de almacenamiento o modelo desde componentes.
- Resultado de aceptación: Componentes consumen casos de uso y contratos; geometría, reglas y persistencia no se mezclan con JSX.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-02-OK
- Requisito: RNF-02.
- Fase: 6.
- Preparación y acción: Completar navegación con teclado y movimiento reducido.
- Resultado de aceptación: Textos en español, foco, teclado, errores accesibles y revisión en 360, 768 y 1440 píxeles.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-02-ERR
- Requisito: RNF-02.
- Fase: 6.
- Preparación y acción: Abrir diálogo o error de formulario sin perder contexto.
- Resultado de aceptación: Textos en español, foco, teclado, errores accesibles y revisión en 360, 768 y 1440 píxeles.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-03-OK
- Requisito: RNF-03.
- Fase: 14.
- Preparación y acción: Repetir un caso por escenario y conservar resultados.
- Resultado de aceptación: Casos versionados con esperado, observado y evidencia; cero defectos bloqueantes al cerrar el hito.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-03-ERR
- Requisito: RNF-03.
- Fase: 14.
- Preparación y acción: Introducir fallo de motor y comprobar recuperación.
- Resultado de aceptación: Casos versionados con esperado, observado y evidencia; cero defectos bloqueantes al cerrar el hito.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-04-OK
- Requisito: RNF-04.
- Fase: 7.
- Preparación y acción: Guardar y recuperar un análisis tras recarga.
- Resultado de aceptación: Resultados, recursos y configuración mantienen relaciones; cuota, corrupción y migración se controlan.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-04-ERR
- Requisito: RNF-04.
- Fase: 7.
- Preparación y acción: Simular cuota agotada y migración fallida.
- Resultado de aceptación: Resultados, recursos y configuración mantienen relaciones; cuota, corrupción y migración se controlan.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-05-OK
- Requisito: RNF-05.
- Fase: 13.
- Preparación y acción: Verificar acceso autorizado y borrado según política.
- Resultado de aceptación: Validar entradas y ciclo de vida; en real autorizar por recurso y mantener secretos solo en servidor.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-05-ERR
- Requisito: RNF-05.
- Fase: 13.
- Preparación y acción: Consultar recurso de otro usuario y revisar paquete por secretos.
- Resultado de aceptación: Validar entradas y ciclo de vida; en real autorizar por recurso y mantener secretos solo en servidor.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-06-OK
- Requisito: RNF-06.
- Fase: 7.
- Preparación y acción: Abrir detalle y reproducir condiciones del análisis.
- Resultado de aceptación: Conservar ID, origen, fecha, configuración y versiones de escenario, regla y modelo aplicables.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-06-ERR
- Requisito: RNF-06.
- Fase: 7.
- Preparación y acción: Actualizar catálogo sin alterar la interpretación histórica.
- Resultado de aceptación: Conservar ID, origen, fecha, configuración y versiones de escenario, regla y modelo aplicables.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-07-OK
- Requisito: RNF-07.
- Fase: 14.
- Preparación y acción: Medir flujo y memoria con resolución y volumen objetivo.
- Resultado de aceptación: Medir los presupuestos de decisiones.md con equipo, navegador, dataset, muestra y volumen identificados.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-07-ERR
- Requisito: RNF-07.
- Fase: 14.
- Preparación y acción: Superar límite o tiempo de espera y comprobar error controlado.
- Resultado de aceptación: Medir los presupuestos de decisiones.md con equipo, navegador, dataset, muestra y volumen identificados.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-08-OK
- Requisito: RNF-08.
- Fase: 16.
- Preparación y acción: Restaurar una copia y ejecutar flujo principal.
- Resultado de aceptación: Documentar entrega, salud, reinicios, backup y restauración; separar incidencias técnicas de alertas de negocio.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## RNF-08-ERR
- Requisito: RNF-08.
- Fase: 16.
- Preparación y acción: Revertir versión fallida con esquema compatible.
- Resultado de aceptación: Documentar entrega, salud, reinicios, backup y restauración; separar incidencias técnicas de alertas de negocio.
- Evidencia: versión, entrada, esperado, observado y registro de ejecución.
- Estado: pendiente.

## Ampliación D12: YOLO y tiempo real

Los cuatro escenarios pasan a operar con cámara en vivo. La especificación vigente, los estados de sesión, límites de carga, reglas temporales y los diez casos RT pendientes se detallan en [YOLO y tiempo real](tiempo_real_yolo.md). Los diagramas y las pruebas previas conservan su función de referencia; no acreditan inferencia ni seguimiento real. La Fase 6 incorpora selección de cámara, Iniciar, Pausar y Detener, permisos, preview y estados de conexión. La integración YOLO real continúa pendiente de implementación y evaluación.
