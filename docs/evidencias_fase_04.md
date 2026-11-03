# Evidencias y cierre de Fase 4

Fecha: 2026-11-03. Alcance validado: contratos de negocio y referencia ejecutable, no servidor productivo.

## Casos del manual

| Caso | Verificación | Resultado |
| --- | --- | --- |
| RN01 | Transición inválida, salto de estados, evento tardío, versión antigua y finalización sin guardado | Rechazo explícito; instantánea original intacta. |
| RN02 | Filtros y revisiones no cambian resultado bruto | Filtro conserva lista y revisión mantiene identidad del análisis y cadena de eventos. |
| RN03 | Matriz por rol, recurso y organización | Acceso incorrecto, rol desconocido o inactivo y operación no aplicable se deniegan. |

## Pruebas ejecutadas

Comando desde raíz: `python3 -m unittest discover -s tests`.

Último recorrido: **62 pruebas aprobadas**: 22 fundamentos visuales, 14 catálogo de escenarios y 26 contratos de estados/permisos. No requieren paquetes externos.

Los nuevos casos cubren ejecución normal, fallo con motivo, estados terminales, validación y guardado, idempotencia de evento por versión, identidad y correlación, fechas con zona, acceso por objeto, roles de consulta, administración real, auditoría, entradas mal tipadas, notas de revisión, conflictos y cierre de alertas.

## Entregables

- 12 casos de uso con precondiciones, ruta principal, poscondición y alternativa negativa.
- Máquinas de estados y reglas de concurrencia documentadas.
- Matriz de permisos versionada y denegación predeterminada.
- 20 errores con mensajes y recuperación; 10 implementados en referencia y 10 previstos.
- Referencia Python y 26 pruebas nuevas.
- Estado y backlog actualizados sin marcar los 44 casos funcionales originales como ejecutados.

## Límites explícitos

Los actores de prueba no son sesiones autenticadas. Las funciones no verifican tokens ni escriben datos. Las precondiciones de finalización se modelan como banderas estrictas; el servidor debe derivarlas de validación y persistencia. El control de versión debe convertirse en comparación y escritura atómicas para soportar concurrencia real.

No se reabre ni se elimina una alerta; esas operaciones no se incorporan por inferencia. El borrado por retención se especifica con elegibilidad y confirmación, pero no se ejecuta en esta fase. La organización delimita el ámbito de autorización previsto, sin implementar una plataforma multitenant.

## Cierre y siguiente paso

Fase 4 aprobada para especificación y referencia de reglas. Avance administrativo: **25 % (4 de 16 fases)**. Próximo incremento: Fase 5, arquitectura modular, contratos de servicio y entorno técnico reproducible. La construcción de la interfaz permanece en Fase 6.
