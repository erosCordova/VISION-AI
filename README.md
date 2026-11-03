# VISION AI

Plataforma empresarial de visión computacional para detección de objetos, segmentación de imágenes y reconocimiento de patrones.

## Estado

**Fases 1 a 5 aprobadas en su alcance. Avance administrativo: 31.25 %.** Base React y TypeScript compilable, contratos validados y 116 pruebas automatizadas aprobadas localmente. Fase 6 en curso: interfaz empresarial navegable y controles de cámara; QA integral pendiente. No hay API de inferencia ni despliegue.

## Preparar y comprobar

Requisitos: Node.js 24.22.1 recomendado (.nvmrc), npm 11.9.0 y Python 3.12 para las referencias.

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
python3 -m unittest discover -s tests
```

Ver [entorno y comandos](docs/entorno.md). npm run dev inicia la interfaz local; no abre nuevas terminales ni publica. El modo predeterminado es DEMO y el motor todavía no está conectado.

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

## Alcance vigente: YOLO y tiempo real

Los cuatro escenarios usarán YOLO con cámara en vivo. Webcam inicial y conector IP/RTSP posterior en backend. La Fase 6 ya incorpora controles de cámara, pendientes de validación con hardware; YOLO, transporte y seguimiento siguen pendientes. El avance de 31.25 % corresponde a la base previa y no acredita esta ampliación. Ver [especificación temporal](docs/tiempo_real_yolo.md). Manual vigente: 5.0.
