# Backlog por fases

Fuente: Manual avanzado de VISION AI 4.0. Los IDs son estables; la tabla no acredita implementación.

| Fase | Objetivo | Entregable principal | Estado |
| --- | --- | --- | --- |
| 01 | Definición del proyecto y alcance verificable | Alcance, requisitos, permisos, pruebas, decisiones y riesgos | Aprobada documentalmente |
| 02 | Fundamentos y especificación del análisis visual | Contratos geométricos, máscaras, métricas y fixtures | Aprobada con referencia matemática |
| 03 | Escenarios empresariales y criterios operativos | Cuatro fichas con casos positivo, negativo y ambiguo | Aprobada con referencias esquemáticas |
| 04 | Requisitos funcionales y reglas de negocio | Casos de uso, reglas, estados y alternativas de error | Aprobada con referencia de negocio |
| 05 | Arquitectura modular y base técnica | Repositorio técnico, contratos, entorno y scripts | Aprobada con build y contratos |
| 06 | Diseño UX/UI empresarial y construcción de la interfaz | Frontend navegable, componentes y sistema visual | Aprobada |
| 07 | Modelo de datos y escenarios reproducibles | Sesiones 3D reproducibles, IndexedDB y migración aditiva | Aprobada |
| 08 | Dashboard e indicadores verificables | KPI y gráficos verificados desde el repositorio | Aprobada |
| 09 | Centro de análisis y detección de objetos | Captura 3D, YOLO, cajas y filtros sin pérdida de evidencia | Aprobada; CI integral con ONNX de cuatro escenarios |
| 10 | Segmentación de imágenes y capas visuales | Máscaras cromáticas de píxeles, capas, contornos y áreas | Aprobada como segmentación cromática experimental; no YOLO-seg |
| 11 | Patrones, reglas y gestión de alertas | Reglas por escenario y resoluciones humanas trazables | En desarrollo — validación pendiente |
| 12 | Historial, reportes y exportación | Historial, detalle y CSV | Pendiente |
| 13 | Seguridad, privacidad y gobierno de datos | Controles de acceso y gobierno de datos | Pendiente |
| 14 | Pruebas integradas, rendimiento y accesibilidad | Pruebas integradas y candidato demo | Pendiente |
| 15 | Integración de inteligencia artificial real | Optimización de modelos preentrenados y medición sobre simulaciones 3D, sin datasets externos | Pendiente |
| 16 | Despliegue, operación y cierre técnico | Versión entregada, restauración y manuales | Pendiente |

## Tareas actuales de Fase 1

- [x] Registrar problema, objetivos y exclusiones.
- [x] Definir los dos hitos y los cuatro escenarios.
- [x] Escribir requisitos y propuestas de permisos.
- [x] Vincular requisitos con fase y casos de aceptación.
- [x] Registrar decisiones, presupuestos y riesgos.
- [x] Registrar revisión de presupuestos y sus mediciones obligatorias posteriores mediante D08.
- [x] Registrar cierre documental y evidencia AL01 a AL03.

## Siguiente incremento

Fase 11: diseñar y validar reglas de negocio, estados de revisión de alertas basados únicamente en detecciones observadas por YOLO, auditoría de decisiones y persistencia reproducible. No utilizar datos programados de la simulación como detecciones reales. Ver [cierre de Fases 9 y 10](estado.md).

## Ampliación D12: YOLO y tiempo real

Los cuatro escenarios pasan a operar con cámara en vivo. La especificación vigente, los estados de sesión, límites de carga, reglas temporales y los diez casos RT pendientes se detallan en [YOLO y tiempo real](tiempo_real_yolo.md). Los diagramas y las pruebas previas conservan su función de referencia; no acreditan inferencia ni seguimiento real. La Fase 6 incorpora selección de cámara, Iniciar, Pausar y Detener, permisos, preview y estados de conexión. La integración YOLO real continúa pendiente de implementación y evaluación.


**Nota vigente de alcance:** la ampliación histórica D12 que aparece más arriba es anterior a la decisión definitiva. La aplicación actual utiliza únicamente fotogramas de cuatro simulaciones 3D; no hay captura de webcam, importación de videos, imágenes ni datasets.
