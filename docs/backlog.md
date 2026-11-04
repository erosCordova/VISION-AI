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
| 09 | Centro de análisis y detección de objetos | Captura 3D, YOLO, cajas y filtros sin pérdida de evidencia | En curso |
| 10 | Segmentación de imágenes y capas visuales | Máscaras, capas y cálculo de área | Pendiente |
| 11 | Patrones, reglas y gestión de alertas | Motor de reglas y ciclo de revisión de alertas | Pendiente |
| 12 | Historial, reportes y exportación | Historial, detalle y CSV | Pendiente |
| 13 | Seguridad, privacidad y gobierno de datos | Controles de acceso y gobierno de datos | Pendiente |
| 14 | Pruebas integradas, rendimiento y accesibilidad | Pruebas integradas y candidato demo | Pendiente |
| 15 | Integración de inteligencia artificial real | API, modelos, datasets y evaluación por escenario | Pendiente |
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

Fase 9: reforzar el ciclo de análisis YOLO sobre capturas exclusivas de los cuatro escenarios 3D. Filtros de clase/confianza exclusivamente visuales; sincronía fotograma–resultado; estados del motor; pruebas de errores y detecciones vacías. Nunca introducir archivos externos ni métricas inventadas. Ver [plan de Fase 9](fase09_deteccion_3d.md).

## Ampliación D12: YOLO y tiempo real

Los cuatro escenarios pasan a operar con cámara en vivo. La especificación vigente, los estados de sesión, límites de carga, reglas temporales y los diez casos RT pendientes se detallan en [YOLO y tiempo real](tiempo_real_yolo.md). Los diagramas y las pruebas previas conservan su función de referencia; no acreditan inferencia ni seguimiento real. La Fase 6 incorpora selección de cámara, Iniciar, Pausar y Detener, permisos, preview y estados de conexión. La integración YOLO real continúa pendiente de implementación y evaluación.
