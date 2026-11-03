# Estado verificado del proyecto

Fecha: 2026-11-03. Referencia: manual 4.0 y decisiones D08 a D10.

## Fases aprobadas

| Fase | Alcance validado | Evidencia |
| --- | --- | --- |
| 1 | Alcance, requisitos, permisos propuestos, casos, decisiones y planificación | [Cierre documental](evidencias_fases_01_02.md) |
| 2 | Geometría, máscaras, métricas y filtros | [22 pruebas visuales](../tests/test_vision_reference.py) |
| 3 | Cuatro escenarios, 12 diagramas y anotaciones calibradas | [Cierre de escenarios](evidencias_fase_03.md) |
| 4 | Casos de uso, estados, permisos y errores | [Cierre de contratos de negocio](evidencias_fase_04.md) |

**Avance administrativo: 25 % (4 de 16 fases).** No equivale a porcentaje de interfaz o calidad de un modelo productivo.

## Verificación

62 pruebas aprobadas: 22 fundamentos matemáticos, 14 catálogo y 26 contratos de negocio. Los 44 casos funcionales iniciales siguen pendientes de la aplicación; no se confunden con estas pruebas de referencia.

## Pendientes

- No hay aplicación React, motor de reglas visuales productivo, API de inferencia ni despliegue.
- Los permisos de referencia no constituyen sesiones autenticadas ni control real en servidor.
- Los PNG son diagramas DEMO, no fotografías ni predicciones de un modelo.
- No se han seleccionado modelos ni datasets fotográficos de evaluación.
- Los presupuestos de capacidad y rendimiento se medirán en las fases técnicas acordadas por D08.

## Próximo incremento

Fase 5: arquitectura modular, contratos y entorno técnico reproducible. Interfaz en Fase 6; inferencia real en Fase 15.
