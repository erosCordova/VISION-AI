# Evidencias y cierre de fases 1 y 2

Fecha: 2026-11-03. Ejecución: entorno de trabajo del proyecto, no computadora del usuario. Referencia: manual 4.0, con ajuste de dependencia D08.

## Fase 1 — Cierre documental

| Caso del manual | Comprobación | Resultado |
| --- | --- | --- |
| AL01 | 22 requisitos únicos, fases 1 a 16 válidas y dos casos por requisito; 44 filas de trazabilidad | Aprobado documentalmente |
| AL02 | Alcance distingue demo e inferencia real, cobertura por escenario y condiciones de cierre | Aprobado documentalmente |
| AL03 | D08 cambia la condición de capacidad y actualiza alcance, decisiones, backlog y estado | Aprobado documentalmente |

D08 es una revisión técnica de planificación: los presupuestos siguen siendo hipótesis. Las mediciones se exigen en las fases que construyen el componente. Este cierre no acredita rendimiento, capacidad del equipo del usuario ni pruebas de navegador.

## Fase 2 — Referencia matemática

Comando desde raíz:

```bash
python3 -m unittest discover -s tests -v
```

Resultado observado del último recorrido: **22 pruebas ejecutadas, 22 aprobadas**, sin paquetes externos.

| Caso del manual | Pruebas de referencia que lo sustentan | Resultado |
| --- | --- | --- |
| FV01 — geometría inválida | Valores negativos, caja sin área, fuera de imagen, NaN, infinito y booleanos | Aprobado |
| FV02 — transformaciones | Tres viewports, letterbox conocido, resize redondeado, inversión, giros y borde flotante | Aprobado |
| FV03 — máscara conocida | Área, IoU, Dice, primer plano vacío, RLE y dimensiones inválidas | Aprobado |

Cobertura adicional: IoU de cajas idénticas, separadas, tangentes y parcialmente superpuestas; umbral inclusivo y extremos; lista bruta sin eliminación por filtrado; límite de píxeles antes de decodificar RLE.

La fixture es sintética y matemática: no hay imagen de personas identificables, anotación visual validada, detector entrenado ni evaluación mAP. Los giros de referencia no sustituyen decodificación EXIF. Zoom, desplazamiento y devicePixelRatio requieren pruebas del visor posterior.

## Entregables

- docs/contratos_vision.md: convenciones, campos, fórmulas y errores.
- docs/fixtures/fase02.json: valores esperados independientes del cálculo.
- tools/vision_reference.py: implementación matemática de referencia.
- tests/test_vision_reference.py: casos reproducibles.
- Documentación de Fase 1 actualizada y estado explícito de mediciones pendientes.

## Decisión de avance

Fases aprobadas en su alcance: 1 (documental) y 2 (especificación y referencia matemática). Avance administrativo = 2 / 16 × 100 = **12.5 %**. Esto no es porcentaje de interfaz, inferencia ni implementación productiva.

Siguiente fase: 3 — escenarios empresariales y criterios operativos. La interfaz comienza en Fase 6 y la inferencia real en Fase 15.
