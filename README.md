# VISION AI

Plataforma empresarial de visión computacional para detección de objetos, segmentación de imágenes y reconocimiento de patrones.

## Estado

Inicio del proyecto conforme al Manual avanzado de VISION AI, versión 4.0. Fases 1 a 3 aprobadas en su alcance documental, matemático y de referencias demo: alcance, contratos geométricos y cuatro escenarios con 12 casos calibrados. La aplicación todavía no está implementada.

## Escenarios

- Seguridad industrial.
- Almacén inteligente.
- Control de calidad.
- Retail.

## Plan

16 fases. La Fase 6 corresponde al diseño UX/UI empresarial y construcción de la interfaz. El hito demo funcional y la integración de IA real se aceptan por separado.

## Documentación

Consultar [el índice de documentación](docs/README.md) para alcance, requisitos, permisos, trazabilidad, decisiones, riesgos y backlog.

## Responsable

Eros Igor Córdova Pintado — Ingeniería de Software con IA, SENATI.


## Verificar los fundamentos visuales

```bash
python3 -m unittest discover -s tests -v
```

La referencia usa solo la biblioteca estándar de Python. Verifica cajas, transformaciones, máscaras y filtros; no ejecuta un modelo de IA ni requiere un servidor. Consulta [contratos de visión](docs/contratos_vision.md) y [evidencias](docs/evidencias_fases_01_02.md).

## Escenarios definidos

Consulta las [fichas y reglas](docs/escenarios.md) o la [galería de referencias](docs/galeria_escenarios.md). Los diagramas son recursos preparados, no inferencia real.
