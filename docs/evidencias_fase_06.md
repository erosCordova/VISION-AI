# Evidencias Fase 6 — incremento inicial

Fecha: 2026-11-03. Referencia: manual 5.0, D12 y diseno_ui.md.

## Verificado

- Guard de arquitectura y tipos estrictos correctos.
- 54 pruebas TypeScript aprobadas, incluidas cuatro nuevas de propiedad de cámara: permiso tardío tras cancelación, pausa/reanudación/stop, reemplazo concurrente y reintento tras rechazo.
- Build Vite correcto; sin motor, backend ni persistencia añadidos.
- Navegador: Resumen → Análisis en vivo; cambio Seguridad industrial → Retail; Historial; Configuración restringida al operador; acceso al cambiar a administrador; Administración; perfil auditor sin ejecución.
- Vista de escritorio inspeccionada visualmente en Resumen y Análisis.
- El preview HTTP no es contexto seguro para getUserMedia: mensaje de error comprobado. No se elude esa restricción.

## No acreditado

Cámara real, permisos aceptados en navegador, pruebas de hardware, tres tamaños exigidos, accesibilidad integral, YOLO, latencia, seguimiento, máscaras, alertas ni almacenamiento durable. RT01/RT02 tienen evidencia parcial de controlador y error; siguen pendientes de integración.

No se aprueba el cierre completo de Fase 6. Próximo incremento: completar componentes y pruebas responsive/accesibilidad y cámara en contexto seguro, antes de Fase 7.

## Captura de escritorio

![Resumen de VISION AI](evidencias/fase06-resumen.jpg)

## Segundo incremento — componentes y confirmación de cámara

Confirmación del usuario: «ya funciona». La cámara funciona en su equipo; falta recorrer todos los casos de integración RT.

- 57 pruebas TypeScript aprobadas; tres nuevas prueban límites válidos, números no finitos/fraccionarios y rangos inválidos de configuración temporal.
- Formulario: confianza 2 rechazada, foco en el campo; 0.65 aceptada con aviso de propuesta temporal.
- Modal: Escape cierra y restaura foco a Restablecer valores.
- Historial: búsqueda cambia estado vacío, limpiar restablece; botones de paginación deshabilitados sin registros.
- Contraste de textos secundarios reforzado. Sin auditoría integral de contraste aún.
- Se revisó escritorio; no se acredita 360/768/1440. El zoom no alteró la anchura del viewport.
- Logs consultados: aparecen errores de una extensión del navegador; no se atribuyen al código de la aplicación.

![Configuración de interfaz](evidencias/fase06-configuracion.jpg)

Estado: Fase 6 en curso. Continúan pendientes visor de resultados por capa, estados de ejecución con fixtures y QA responsive/accesible integral. No hay YOLO ni persistencia.
