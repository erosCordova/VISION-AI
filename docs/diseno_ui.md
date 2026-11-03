# Fase 6 — Interfaz empresarial y cámara

Estado: implementación inicial verificada; fase en curso, sin cierre integral.

## Sistema visual

Sidebar azul profundo, superficies blancas, fondo gris azulado y acciones cyan. Acentos suaves distinguen escenarios. Tipografías Manrope y DM Sans con alternativa sans-serif; fuentes remotas opcionales. Rejillas de cuatro indicadores y dos columnas de escenarios; una columna y menú compacto bajo 760 px. Foco visible, enlace al contenido, etiquetas de formulario y movimiento reducido.

## Rutas e inventario

La navegación usa fragmentos URL, admite acceso directo, recarga y atrás/adelante sin reglas de servidor. Perfil inicial Operador; el perfil es de prueba, no una sesión autenticada.

| Ruta | Vista | Acceso visual |
| --- | --- | --- |
| #Resumen | Indicadores de disponibilidad y cuatro escenarios | Todos |
| #Análisis%20en%20vivo | Selector de escenario y cámara; panel Detecciones/Máscaras/Patrones | Todos; auditor sin cámara |
| #Visión%20IA | Familia YOLO, tareas y disponibilidad | Todos |
| #Operaciones | Alertas, estado vacío y acceso a historial | Todos |
| #Historial | Sesiones, estado vacío sin datos inventados | Todos |
| #Configuración | Estado del entorno y destinos de datos | Administrador |
| #Administración | Usuarios, escenarios y auditoría pendientes | Administrador |

Una ruta restringida sigue comprobando el perfil aunque se escriba directamente. El cambio de perfil o escenario desmonta el visor; navegar fuera del análisis también libera la cámara. La API deberá aplicar permisos reales en Fase 13/15.

## Cámara implementada

Solicitud por botón, cámara predeterminada y enumeración tras permiso; selección de otra cámara con la sesión detenida. Sin audio, envíos a servidores, grabaciones ni almacenamiento. Pausa deshabilita las pistas de video; reanudar las habilita. Detener libera todas las pistas y desvincula el elemento video. Ocultar la pestaña detiene la cámara para evitar captura oculta. No existe reconexión automática.

Estados: detenida, esperando permiso, vista en vivo, pausada, no disponible. Cancelar invalida la generación; si llega un permiso tarde se liberan sus pistas. Desconexión y rechazo muestran salida de recuperación. El controlador se prueba con streams dobles; esos tests no equivalen a una cámara física.

## Resultado e integración futura

La cámara es preview, no análisis YOLO. No hay cajas o máscaras ficticias sobre video. Los tres paneles muestran estado vacío; las capas se incorporarán sobre resultados de su fotograma exacto al integrar el motor. Los indicadores sin datos se muestran con raya, no con cifras simuladas. Las vistas de operaciones, historial y administración son estructuras iniciales; no poseen CRUD ni persistencia.

## Pendientes para cerrar Fase 6

- Probar cámara física en contexto seguro: permiso aceptado/rechazado/pendiente, pausa, stop, cambio de fuente, navegación y pérdida de dispositivo.
- QA visual a 360, 768 y 1440 px; medición de contraste y navegación completa con teclado/lector.
- Completar biblioteca de formularios, filtros, tablas, paginación, modal y toast cuando se integren sus contratos de UI.
- Visor de fotograma analizado y controles por capa con fixtures explícitas, sin fingir motor activo.
- Verificar todos los estados de ejecución y recuperación con fixtures UI identificados.

El avance administrativo permanece en 31.25 % (5 de 16 fases cerradas). Fase 6 en progreso; una compilación correcta no demuestra cierre de UX ni tiempo real.
