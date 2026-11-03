# Matriz de permisos — business-contract-v1

La sesión demo controla vistas. En la fase real, cada operación se autoriza también en API y por recurso. Propuesta inicial para una organización; no se incorpora multitenencia sin decisión adicional.

| Operación | Operador | Supervisor | Administrador | Auditor |
| --- | --- | --- | --- | --- |
| Ejecutar análisis | Sí | Sí | Sí | No |
| Consultar análisis | Propios | Organización | Organización | Organización, lectura |
| Consultar dashboard | Propios | Organización | Organización | Organización, lectura |
| Revisar o cerrar alertas | No | Sí | Sí | No |
| Consultar alertas | De sus análisis | Organización | Organización | Organización, lectura |
| Exportar CSV | Propios | Organización | Organización | Organización |
| Cambiar escenarios, clases, zonas o reglas | No | No | Sí | No |
| Administrar usuarios | No | No | Sí, solo versión real | No |
| Consultar auditoría | No | No | Sí | Sí, lectura |
| Ejecutar borrado conforme a retención | No | No | Sí, con control | No |

Las reglas de retención definen qué se conserva en auditoría sin retener imágenes eliminadas. Antes de operar con contenido privado deben probarse alcance y acceso cruzado con dos usuarios.

## Contrato ejecutable de Fase 4

Implementación de referencia: [workflow_reference.py](../tools/workflow_reference.py). La operación desconocida, rol desconocido, actor inactivo, modo inválido, recurso faltante o ámbito distinto se deniegan. Se verifica que el tipo de recurso corresponda a la operación; no basta un ID válido de otro módulo.

El actor y su rol deben derivarse de una sesión validada en servidor; owner_id y organization_id se cargan de la persistencia autorizada, no de valores que el cliente elige. El alcance de dashboard se traduce en filtros de consulta del servidor; la referencia representa ese alcance sin ejecutar consultas.

La organización es el límite lógico de datos previsto, incluso para administrador; no añade UI de múltiples organizaciones ni aislamiento de servidor ya implementado. El auditor puede consultar y exportar datos autorizados, pero no iniciar análisis, revisar alertas ni administrar.

Para borrar no basta el permiso: se requiere elegibilidad por retención, confirmación explícita y reconciliación de recursos. El permiso solo evalúa autorización; esas precondiciones se implementan en el caso de uso posterior.
