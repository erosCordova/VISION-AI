# Matriz de permisos propuesta

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
