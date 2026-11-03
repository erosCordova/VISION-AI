# Fase 4 — Casos de uso y reglas de negocio

Versión: business-contract-v1. Fecha: 2026-11-03. Alcance: especificación y referencia ejecutable; todavía no existe API, UI ni autenticación real.

Los casos cubren perfiles, entrada, análisis, evidencia, alertas, indicadores, historial, exportación, configuración y recuperación. Cada caso tiene ruta principal y alternativa negativa. Los 44 casos originales de requisitos conservan estado pendiente; las pruebas de esta fase verifican reglas de referencia separadas.

## CU01 — Elegir perfil y navegar

- Requisitos: RF-01, RF-13.
- Actor: Todos los perfiles; sesión demo identificada.
- Precondición: Perfil válido, rutas y modo disponibles.
- Ruta principal: Aplicar perfil; consultar permisos; abrir módulo autorizado con cabecera DEMO o REAL.
- Poscondición: No expone opciones de otro perfil.
- Alternativa o error: Perfil inválido o inactivo: no se concede acceso. En demo no se finge identidad segura.

## CU02 — Mantener escenarios y clases

- Requisitos: RF-02, RF-12.
- Actor: Administrador.
- Precondición: Catálogo y esquema disponibles.
- Ruta principal: Consultar; crear o editar; validar; guardar nueva versión o desactivar sin romper historial.
- Poscondición: Se conserva versión aplicada a análisis anteriores.
- Alternativa o error: Valores inválidos: conservar formulario. Escritura fallida: no mostrar éxito.

## CU03 — Cargar imagen

- Requisitos: RF-03.
- Actor: Operador, supervisor o administrador.
- Precondición: Archivo seleccionado y límites configurados.
- Ruta principal: Validar extensión, tipo declarado, tamaño, píxeles y decodificación; orientar y previsualizar.
- Poscondición: Entrada lista con identidad y geometría canónica.
- Alternativa o error: Archivo incompatible, corrupto o excesivo: no iniciar análisis y permitir reemplazo.

## CU04 — Ejecutar análisis

- Requisitos: RF-04, RF-13, RF-14.
- Actor: Operador, supervisor o administrador.
- Precondición: Entrada válida; modo, motor y escenario compatibles.
- Ruta principal: Crear ID y correlación; queued a processing; invocar motor; validar y guardar resultado; completed.
- Poscondición: Una ejecución trazable con origen y configuración.
- Alternativa o error: Doble envío: no duplicar. Fallo o resultado inválido: failed. Timeout real: consultar estado, sin demo silencioso.

## CU05 — Filtrar y explorar evidencia

- Requisitos: RF-05, RF-06, RF-07.
- Actor: Usuario con lectura del análisis.
- Precondición: Resultado disponible y autorizado.
- Ruta principal: Ajustar clase, umbral o capas; transformar visor; mostrar evidencia asociada.
- Poscondición: Cambia consulta y vista, sin mutar resultado bruto ni reglas ya aplicadas.
- Alternativa o error: Máscara o recurso no disponible: mensaje específico; no dibujar datos de otra imagen.

## CU06 — Revisar y cerrar alerta

- Requisitos: RF-08.
- Actor: Supervisor o administrador del ámbito autorizado.
- Precondición: Alerta existente, versión actual y evidencia accesible.
- Ruta principal: Leer evidencia; añadir nota; new a reviewed; posteriormente reviewed a closed.
- Poscondición: Evento con actor, nota, estados, instante y versión; conserva análisis original.
- Alternativa o error: Operador o auditor: denegar. Conflicto de versión: recargar sin perder borrador. Sin nota: impedir envío.

## CU07 — Consultar dashboard

- Requisitos: RF-09.
- Actor: Todos, con alcance según permisos.
- Precondición: Repositorio consultable y filtro de periodo válido.
- Ruta principal: Consultar conjunto autorizado; calcular KPI y series; mostrar origen y actualización.
- Poscondición: Valores reproducibles a partir del mismo conjunto y denominadores.
- Alternativa o error: Sin datos: cero o Sin datos. Consulta fallida: error, nunca números de ejemplo encubiertos.

## CU08 — Buscar y abrir historial

- Requisitos: RF-10.
- Actor: Todos, con alcance según permisos.
- Precondición: Registros persistidos.
- Ruta principal: Validar filtros; ordenar establemente; paginar; abrir ID y configuración histórica.
- Poscondición: Detalle correcto, incluidas referencias a regla y recurso.
- Alternativa o error: ID inexistente o no autorizado: no revelar contenido. Recurso borrado: conservar explicación y metadatos permitidos.

## CU09 — Exportar CSV

- Requisitos: RF-11.
- Actor: Todos, con alcance según permisos.
- Precondición: Consulta autorizada y formato definido.
- Ruta principal: Fijar fecha de corte; tomar conjunto filtrado completo; escapar texto y generar archivo.
- Poscondición: Todas las filas correspondientes, origen y configuración de consulta identificados.
- Alternativa o error: Error de generación: no entregar parcial. Conjunto vacío: informar y exportar cabecera según opción elegida.

## CU10 — Administrar identidad real

- Requisitos: RF-01, RNF-05.
- Actor: Administrador; solo modalidad real.
- Precondición: Proveedor o mecanismo de identidad definido y servidor disponible.
- Ruta principal: Validar autorización; administrar usuario y permisos; registrar operación.
- Poscondición: Cambios de acceso trazables en servidor.
- Alternativa o error: En demo: operación no disponible. No aceptar rol u organización declarados libremente por el cliente.

## CU11 — Aplicar retención y borrado

- Requisitos: RNF-04, RNF-05, RNF-08.
- Actor: Administrador.
- Precondición: Política vigente, datos elegibles y confirmación explícita de la acción concreta.
- Ruta principal: Verificar elegibilidad y permisos; confirmar; eliminar metadatos y recursos según política; auditar mínimo.
- Poscondición: No quedan referencias inválidas ni contenido privado retenido fuera de política.
- Alternativa o error: No elegible o fallo parcial: no afirmar borrado completo; reconciliar recursos y registrar incidente.

## CU12 — Gestionar errores y reintentos

- Requisitos: RF-03, RF-04, RNF-03, RNF-08.
- Actor: Actor autorizado sobre su operación.
- Precondición: Error identificado y estado conocido.
- Ruta principal: Mostrar mensaje público y acción; conservar entrada cuando proceda; consultar trabajo; crear intento nuevo si se decide reanalizar.
- Poscondición: Trazabilidad entre intento fallido y nuevo sin reusar un ID terminal.
- Alternativa o error: No cambiar origin ni perder fallo anterior; rechazar respuesta tardía de un trabajo distinto.

## Integración posterior

La referencia de reglas está en [workflow_reference.py](../tools/workflow_reference.py), con [pruebas](../tests/test_workflow_reference.py). El catálogo de mensajes está en [errores.json](errores.json). Ver [estados y concurrencia](estados.md) y [permisos](permisos.md).

La Fase 5 transformará estos contratos en interfaces técnicas; la Fase 6 implementará navegación y formularios. El backend real deberá autorizar y persistir atómicamente: pasar las pruebas locales no acredita esas garantías en un servidor.
