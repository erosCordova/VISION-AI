# Registro inicial de riesgos

Todos los riesgos están abiertos como elementos de planificación; no se afirma que hayan ocurrido.

| ID | Riesgo | Impacto | Mitigación | Responsable | Revisión |
| --- | --- | --- | --- | --- | --- |
| R01 | Imágenes sin licencia o anotaciones adecuadas | Alto | Inventario, autorización y casos verificados antes de calibrar | Desarrollador | Fase 3 |
| R02 | Resultados demo atribuidos a cualquier imagen | Alto | Asociar recurso exacto y bloquear salida incompatible | Desarrollador | Fases 7 y 9 |
| R03 | Cajas o máscaras desplazadas | Alto | Transformaciones reversibles y pruebas de geometría | Desarrollador | Fases 2, 9 y 10 |
| R04 | Pérdida local por cuota, corrupción o migración | Alto | Escrituras consistentes, aviso y recuperación | Desarrollador | Fases 5 y 7 |
| R05 | Alertas erróneas por falta de evidencia | Alto | Asociaciones por instancia y estado indeterminado | Desarrollador | Fases 3 y 11 |
| R06 | Acceso cruzado o exposición de credenciales | Alto | Autorización por recurso, secretos en servidor y pruebas | Desarrollador | Fases 13 y 15 |
| R07 | Modelo sin capacidad para todos los escenarios | Alto | Evaluar cada escenario por separado y declarar cobertura | Desarrollador | Fase 15 |
| R08 | Coste o recursos de alojamiento insuficientes | Alto | Medir antes de elegir servicio y validar condiciones | Desarrollador | Fases 15 y 16 |
| R09 | Cambios de numeración o alcance inconsistentes | Medio | Manual 4.0, backlog único y control de cambios | Desarrollador | Todas |
| R10 | Doble envío o resultado tardío sobrescribe otro | Alto | Correlación, control de estado y deduplicación | Desarrollador | Fases 9 y 11 |
