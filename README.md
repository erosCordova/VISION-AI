# VISION AI

Plataforma empresarial de visión computacional para detección de objetos, segmentación de imágenes y reconocimiento de patrones.

## Estado

**Fases 1 a 5 aprobadas en su alcance. Avance administrativo: 31.25 %.** Base React y TypeScript compilable, contratos validados y 112 pruebas automatizadas aprobadas localmente. La siguiente fase construirá la interfaz empresarial. No hay API de inferencia ni despliegue.

## Preparar y comprobar

Requisitos: Node.js 24.22.1 recomendado (.nvmrc), npm 11.9.0 y Python 3.12 para las referencias.

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
python3 -m unittest discover -s tests
```

Ver [entorno y comandos](docs/entorno.md). npm run dev inicia la pantalla técnica local; no abre nuevas terminales ni publica. El modo predeterminado es DEMO y el motor todavía no está conectado.

## Arquitectura

- React + TypeScript + Vite.
- Dominio y casos de uso separados de infraestructura.
- Puertos VisionEngine y AnalysisRepository.
- Repositorio VOLÁTIL de contrato: aún no conserva datos al recargar.
- Validación de resultados, identidad, versiones, máscaras y transiciones.
- GitHub Actions preparado para checks y build, sin despliegue.

## Escenarios

Seguridad industrial, Almacén inteligente, Control de calidad y Retail. Consulta [fichas y reglas](docs/escenarios.md) o [galería de 12 referencias](docs/galeria_escenarios.md). Los diagramas son recursos preparados; no son inferencia de IA ni datos de evaluación real.

## Plan y documentación

16 fases. La **Fase 6** es diseño UX/UI y construcción de la interfaz. Hito demo y versión real se aceptan por separado. El modelo real se incorpora en Fase 15.

[Documentación](docs/README.md) · [Estado](docs/estado.md) · [Arquitectura](docs/arquitectura.md) · [Casos de uso](docs/casos_uso.md) · [Permisos](docs/permisos.md)

## Responsable

Eros Igor Córdova Pintado — Ingeniería de Software con IA, SENATI.
