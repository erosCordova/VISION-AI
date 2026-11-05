# Documentación de VISION AI

Referencia vigente: **Manual avanzado de VISION AI, versión 5.0**. La **Fase 6 es Diseño UX/UI empresarial y construcción de la interfaz**.

## Fase 1

- [Alcance y objetivos](alcance.md).
- [Requisitos verificables](requisitos.md).
- [Matriz de permisos](permisos.md).
- [Casos de aceptación](casos_prueba.md).
- [Trazabilidad requisito-fase-prueba](trazabilidad.csv).
- [Decisiones y presupuestos](decisiones.md).
- [Riesgos](riesgos.md).
- [Backlog por fases](backlog.md).
- [Estado de avance](estado.md).
- [Manual de referencia](manual/Manual_Procedimiento_Vision_Computacional_IA.docx).

Los casos describen validaciones por ejecutar. No son resultados de una aplicación construida.

## Fase 2

- [Contratos del análisis visual](contratos_vision.md).
- [Fixture geométrica sintética](fixtures/fase02.json).
- [Referencia matemática](../tools/vision_reference.py).
- [Pruebas unitarias](../tests/test_vision_reference.py).
- [Evidencias y cierre de fases 1 y 2](evidencias_fases_01_02.md).

## Fase 3

- [Fichas de escenarios y reglas](escenarios.md).
- [Galería de las 12 referencias](galeria_escenarios.md).
- [Catálogo y anotaciones](fixtures/scenarios/catalog.json).
- [Evidencias y cierre](evidencias_fase_03.md).

## Fase 4

- [Casos de uso y alternativas](casos_uso.md).
- [Estados y concurrencia](estados.md).
- [Catálogo de errores](errores.json).
- [Referencia de estados y permisos](../tools/workflow_reference.py).
- [Evidencias y cierre](evidencias_fase_04.md).

## Fase 5

- [Arquitectura y contratos](arquitectura.md).
- [Instalación y comandos](entorno.md).
- [Evidencia de compilación y pruebas](evidencias_fase_05.md).
- [Tipos del dominio](../src/core/domain/model.ts).
- [Puertos de visión](../src/core/ports/vision-engine.ts) y [repositorio](../src/core/ports/analysis-repository.ts).

## Ampliación D12: YOLO y tiempo real

Los cuatro escenarios pasan a operar con cámara en vivo. La especificación vigente, los estados de sesión, límites de carga, reglas temporales y los diez casos RT pendientes se detallan en [YOLO y tiempo real](tiempo_real_yolo.md). Los diagramas y las pruebas previas conservan su función de referencia; no acreditan inferencia ni seguimiento real. La Fase 6 incorpora selección de cámara, Iniciar, Pausar y Detener, permisos, preview y estados de conexión. La integración YOLO real continúa pendiente de implementación y evaluación.

## Fase 6 en curso

- [Diseño UI e inventario de rutas](diseno_ui.md).
- [Evidencia y pendientes](evidencias_fase_06.md).

## Arquitectura vigente

- [Arquitectura modular de la sección 5.2](arquitectura.md)
- [Versión histórica de Fase 5](arquitectura_fase05.md)
