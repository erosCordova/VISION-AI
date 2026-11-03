# Estado verificado del proyecto

Fecha: 2026-11-03. Referencia: manual 4.0 y revisión de dependencia D08.

## Fases aprobadas

| Fase | Alcance validado | Evidencia |
| --- | --- | --- |
| 1 | Alcance, 22 requisitos, permisos propuestos, 44 casos, trazabilidad, decisiones, riesgos y backlog | [Cierre documental](evidencias_fases_01_02.md) |
| 2 | Contratos de geometría y máscaras, métricas y filtros, fixture y referencia matemática | [22 pruebas aprobadas](../tests/test_vision_reference.py) |

Avance administrativo por fases aprobadas: **12.5 % (2 de 16)**. No equivale a porcentaje de interfaz ni de un modelo productivo.

## Pendientes de implementación y medición

- No hay aplicación React, servidor de inferencia ni despliegue.
- Los cuatro escenarios requieren fichas, imágenes autorizadas y anotaciones en las fases correspondientes.
- Los límites de carga, almacenamiento y rendimiento son presupuestos propuestos, no capacidad comprobada.
- D08 agenda mediciones en las fases técnicas correspondientes y evita exigir un frontend durante la planificación.
- Los 44 casos funcionales de trazabilidad.csv siguen pendientes; las pruebas matemáticas de Fase 2 son evidencia adicional separada.

## Próximo incremento

Fase 3: concretar clases, tareas, zonas, asociaciones, casos positivos, negativos y ambiguos y requisitos de datos de cada escenario. Mantener interfaz en Fase 6 e IA real en Fase 15.
