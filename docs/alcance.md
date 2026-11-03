# Fase 1 — Alcance de VISION AI

Fecha: 2026-11-03. Responsable: Eros Igor Córdova Pintado. Versión: 1.0.

## Problema y finalidad

La revisión manual de imágenes empresariales dificulta localizar objetos, delimitar regiones y relacionar hallazgos con alertas e historial. VISION AI unifica ese flujo y permite que una persona revise la evidencia antes de confirmar un hallazgo.

## Flujo principal

Seleccionar imagen o escenario → validar → preparar entrada → ejecutar motor → validar resultados → aplicar reglas → mostrar evidencia → guardar → revisar alertas → consultar y exportar.

## Objetivos verificables

1. Localizar objetos y mostrar clase, confianza y cajas alineadas.
2. Mostrar máscaras de regiones con cálculo de área reproducible.
3. Interpretar resultados mediante reglas versionadas y evidencia identificable.
4. Mantener alertas revisables, historial persistente e indicadores derivados.
5. Separar UI, casos de uso, visión y persistencia para reemplazar el motor.
6. Integrar inferencia real solo después de evaluarla sobre datos etiquetados.

## Escenarios y límites de interpretación

| Escenario | Objetos y tarea | Regla revisable |
| --- | --- | --- |
| Seguridad industrial — piloto | Persona, casco y chaleco | Posible EPP incompleto por persona; no concluir por ausencia de una detección global. |
| Almacén inteligente | Cajas, pallets y montacargas | Presencia en una zona con criterio geométrico explícito. |
| Control de calidad | Un producto y defecto específicos al comenzar | Región defectuosa y condición documentada de revisión. |
| Retail | Personas, estantes y productos | Conteo u ocupación de un instante; no implica seguimiento. |

Cada escenario necesita, en Fase 3, un caso positivo, uno negativo y uno ambiguo. Las imágenes deben tener procedencia y autorización de uso documentadas. Todavía no se han incorporado recursos visuales ni se han validado anotaciones.

## Hito A — Demo funcional

Aplicación navegable con cuatro escenarios calibrados, resultados deterministas, detección, máscaras, reglas, alertas, historial local, dashboard y CSV. Una imagen desconocida puede previsualizarse, pero no recibe resultados de otra imagen. Todo resultado preparado se identifica como DEMO.

Aceptación: fases 1 a 14 aprobadas y verificación de la entrega demo de Fase 16. La aprobación de la demo no acredita inferencia real.

## Hito B — Versión real

API y adaptador real, modelos por tarea con cobertura declarada, evaluación sobre prueba reservada, permisos en servidor, metadatos persistentes y archivos protegidos. Los cuatro escenarios deben evaluarse por separado.

Aceptación: Fase 15 aprobada para todos los escenarios y Fase 16 aprobada con esa versión. Un escenario no validado permanece pendiente.

## Exclusiones

- Video continuo, cámaras en vivo, seguimiento temporal y grabación masiva.
- Reconocimiento facial o identificación biométrica.
- Decisiones médicas, disciplinarias o de seguridad sin revisión humana.
- Reconocer cualquier objeto o defecto sin datos y modelo adecuados.
- Entrenamiento automático al pulsar Analizar.
- Notificaciones externas o envíos a personas sin alcance posterior explícito.
- Precisión universal garantizada o disponibilidad productiva no medida.

## Restricciones de trabajo

Desarrollo individual, interfaz en español y construcción por fases. Priorizar herramientas sin coste y validar límites antes de elegir proveedores. No existe despliegue ni presupuesto de servicio aprobado en este repositorio. La decisión de alojamiento se aborda en Fase 16.

## Cierre de Fase 1

Requiere requisitos trazados, permisos, presupuestos identificados, riesgos y backlog. Los presupuestos iniciales están propuestos y la prueba de capacidad sigue pendiente; por ello la fase se registra en curso y no como aprobada.
