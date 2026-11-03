# Estado verificado del proyecto

Fecha: 2026-11-03. Referencia: manual 5.0 y decisiones D08 a D12.

| Fase | Alcance validado | Evidencia |
| --- | --- | --- |
| 1 | Alcance, requisitos, decisiones y planificación | [Cierre documental](evidencias_fases_01_02.md) |
| 2 | Geometría, máscaras, métricas y filtros | [22 pruebas Python](../tests/test_vision_reference.py) |
| 3 | Cuatro escenarios y 12 recursos calibrados | [Cierre de escenarios](evidencias_fase_03.md) |
| 4 | Casos de uso, estados, permisos y errores | [Cierre de negocio](evidencias_fase_04.md) |
| 5 | React, contratos, arquitectura, instalación limpia y build | [Cierre técnico](evidencias_fase_05.md) |

**Avance administrativo: 31.25 % (5 de 16 fases).** No mide precisión de un modelo ni porcentaje de interfaz terminada.

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
