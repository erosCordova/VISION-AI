# Decisiones y presupuestos iniciales

Responsable: Eros Igor Córdova Pintado. Fecha: 2026-11-03. Cambiar una decisión requiere registrar motivo, impacto, fases y pruebas afectadas.

## Decisiones adoptadas del manual

| ID | Decisión | Motivo | Fase de implementación |
| --- | --- | --- | --- |
| D01 | 16 fases, con interfaz en Fase 6 | Mantener una numeración coherente con el manual 4.0 | Todas |
| D02 | Cuatro escenarios; Seguridad industrial como piloto | Validar un recorrido completo antes de ampliar | 3 y 7 |
| D03 | DEMO y REAL separados y visibles | No atribuir inferencia a resultados preparados | 6, 7, 12 y 15 |
| D04 | Coordenadas normalizadas sobre imagen orientada | Mantener overlays al cambiar tamaño | 2, 9 y 10 |
| D05 | Reglas sobre resultados brutos, filtros solo de vista | Evitar cambiar hallazgos al ocultar detecciones | 8 a 12 |
| D06 | Revisar alertas con evidencia y registro de actor | Trazabilidad y control de incertidumbre | 11 |
| D07 | No entrenar al analizar | Separar entrenamiento e inferencia | 15 |

## Presupuestos propuestos pendientes de medición

Valores iniciales de ingeniería para el prototipo, no capacidad ni rendimiento acreditados. Se validan y pueden ajustarse con evidencia.

| Parámetro | Propuesta inicial | Respuesta al exceder | Medición o condición |
| --- | --- | --- | --- |
| Formato | JPG y PNG decodificables | Rechazar con motivo | Validación MIME, extensión y decodificación |
| Tamaño | 10 MiB por archivo | No iniciar análisis | Probar debajo, en y encima del límite |
| Resolución | 20 millones de píxeles y lado máximo 8192 px | Solicitar reducir imagen | Probar memoria y decodificación en navegador objetivo |
| Concurrencia local | 1 ejecución activa | Bloquear nuevo envío sin perder entrada | Probar doble clic y navegación durante proceso |
| Historial local | Objetivo de 100 análisis y presupuesto de 100 MiB | Avisar y solicitar limpieza; sin borrar automáticamente | Medir quota real disponible y ocupación de IndexedDB |
| Timeout demo | 10 segundos | Marcar error con reintento | Tiempo de espera máximo, no duración artificial de análisis |
| Timeout real | Inicialmente 60 segundos sin avance observable | Consultar estado antes de repetir | Ajustar con modelo y cola seleccionados; no asumir cancelación remota |
| Interacción del visor | Objetivo p95 menor a 100 ms para alternar capas | Optimizar antes de elevar volumen | Medir al menos 30 repeticiones con fixture y equipo identificados |
| Consulta local | Objetivo p95 menor a 500 ms con 100 análisis | Revisar consultas e índices | Medir sin incluir descarga de archivos grandes |
| Geometría | Error máximo objetivo de 1 px en viewport de prueba | No aprobar alineación | Probar tamaños de Fase 6 y transformaciones |
| Retención local | Limpieza manual autorizada; revisión a los 30 días | Avisar, no borrar sin política implementada | No simular borrado automático inexistente |
| Retención real | Definir antes de usar imágenes privadas | Mantener piloto con datos autorizados de prueba | Validar finalidad y política en Fases 13 y 15 |

La suma de archivos no implica que el navegador permita 100 MiB: la cuota se consulta y los fallos se controlan. Los artefactos reales de modelos se administran fuera de la cuota local prevista para imágenes.

## Decisiones aplazadas con dependencia

- Modelo y librería concreta: Fase 15, tras datos y evaluación.
- Segmentación semántica o de instancias por escenario: Fases 2 y 3.
- Persistencia local definitiva: Fase 5; IndexedDB es la opción propuesta cuando se guardan imágenes.
- Proveedor de alojamiento y recursos: Fase 16, tras mediciones y comprobación de oferta vigente.
- Autenticación productiva: Fases 5, 13 y 15; no exigir a una sesión demo garantías de servidor.

## Condición original de capacidad reemplazada por D08

Documentar una prueba de capacidad en el entorno objetivo o acordar formalmente la revisión de esos presupuestos. El repositorio contiene planificación; todavía no existe aplicación con la cual medirlos.

## D08 — Revisión de la condición de capacidad de Fase 1

Fecha: 2026-11-03. Decisión técnica del incremento 2.

La Fase 1 aprueba el alcance y los presupuestos como hipótesis explícitas, no como capacidad acreditada. La medición exige componentes que se construyen después: se agenda prueba de persistencia y cuota en Fases 5 y 7, visor en Fase 6, flujo y rendimiento en Fase 14 y recursos de modelo en Fase 15. Esto sustituye el bloqueo circular de exigir una aplicación durante la planificación inicial.

Impacto: se cierra documentalmente Fase 1; cada medición conserva estado pendiente y permanece obligatoria para el hito correspondiente. No se modifican los valores iniciales ni se afirma que hayan sido alcanzados. Cualquier incumplimiento exige corrección o revisión explícita del presupuesto.

Validación documental AL03: el cambio actualiza alcance, backlog, estado y registro de evidencia. Los casos funcionales de trazabilidad.csv siguen pendientes.

## D09 — Recursos propios de referencia para los escenarios

Fecha: 2026-11-03. Se usan 12 diagramas PNG del proyecto como recursos calibrados de la Fase 3, sin incorporar fotografías de terceros. Cada caso conserva etiquetas, geometría, evidencia y huella del archivo exacto.

Permiten aprobar las fichas y preparar la ejecución demo, pero no constituyen datos de entrenamiento o test de un detector real. La elección de fotografías, anotaciones y modelos se exige por separado al validar IA real en Fase 15. Los recursos preparados permanecen identificados como DEMO.

## D10 — Transiciones, versiones y ámbito de autorización

Fecha: 2026-11-03. Análisis: queued a processing a completed, con salida failed antes de finalizar; los estados terminales no se reutilizan. Completado requiere validación y escritura confirmadas. Alertas: new a reviewed a closed; no se incorpora reapertura.

Cada cambio utiliza identidad, correlación cuando corresponda, versión e instante con zona. Revisión requiere supervisor o administrador, nota y versión actual. Acceso desconocido se deniega; el ámbito lógico sigue siendo una organización. Las referencias puras se verificarán nuevamente con persistencia atómica y autenticación reales.

Impacto: Fases 5, 7, 9, 11, 13 y 15 deben implementar y conservar este contrato. Las funciones actuales no son una API ni acreditan seguridad productiva.
