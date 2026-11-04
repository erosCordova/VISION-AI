# VISION AI

Plataforma empresarial de visión computacional con cuatro escenarios de análisis de video: Seguridad industrial, Almacén inteligente, Control de calidad y Retail.

## Estado verificado

**Fases 1 a 5 aprobadas; avance administrativo: 31.25 % (5 de 16). Fase 6 en curso.** El repositorio contiene React, Vite, un simulador 2D interactivo de cuatro escenarios, controles de cámara, reproducción de videos en bucle, un visor de fotogramas analizados y un piloto opcional FastAPI + YOLO26n en CPU. El frontend y los contratos están cubiertos por CI; no se ha acreditado aún inferencia en el hardware final, precisión ni FPS sostenidos con un modelo real. No se ha declarado despliegue productivo.

## Ejecutar y validar

Requisitos frontend: Node.js indicado en `.nvmrc`, npm compatible. Pruebas de referencia: Python 3.12.

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
python3 -m unittest discover -s tests
```

Para poner en marcha **el motor real local**, pesos, API y Vite, sigue [las instrucciones del backend](backend/README.md). La inferencia requiere instalar librerías Python y pesos YOLO; el servidor debe estar conectado antes de pulsar «Iniciar análisis». Los archivos de video permanecen en el navegador y solo se envían fotogramas mientras el usuario activa el análisis.

## Diferencias entre escenarios

- **Retail:** el checkpoint general permite verificar la clase «person» y contar detecciones visibles por fotograma. No identifica personas ni certifica aforo.
- **Seguridad industrial:** contar personas no demuestra EPP. Cascos y chalecos requieren pesos especializados y asociación por instancia.
- **Almacén inteligente:** un vehículo genérico no es un montacargas. Las zonas requieren calibración y reglas adicionales.
- **Control de calidad:** necesita defectos del producto entrenados y segmentación validada antes de declarar conformidad.

El visor comprueba la identidad del fotograma, la versión y el hash SHA256 del JPEG y descarta resultados fuera de sincronía. Las métricas registran el tiempo observado, sin extrapolar a FPS sostenidos antes de medir.

## Arquitectura y despliegue

Frontend React + TypeScript + Vite; contratos de dominio; backend piloto FastAPI/YOLO26n. El backend actual se ejecuta en loopback y no debe exponerse públicamente sin autenticación, límites, TLS y orígenes autorizados. **Render Free se usa exclusivamente como API de estado sin inferencia YOLO**, y una página publicada en Vercel no puede depender de localhost del visitante. Se está evaluando inferencia ONNX en navegador frente a backend de inferencia con recursos suficientes.

No hay persistencia durable ni modelos especializados validados. Los PNG del proyecto son fixtures esquemáticos, no detecciones de la IA.

## Documentación

Manual vigente: **versión 6.0**, 16 fases, con Fase 6 reservada a diseño y construcción de interfaz. [Estado](docs/estado.md) · [Tiempo real y YOLO](docs/tiempo_real_yolo.md) · [Escenarios](docs/escenarios.md) · [Diseño de interfaz](docs/diseno_ui.md) · [Arquitectura](docs/arquitectura.md).

## Responsable

Proyecto individual, Ingeniería de Software con IA — SENATI.

## Publicación Vercel Hobby + Render Free

Consulta [alcance y configuración de la publicación gratuita](docs/despliegue_gratuito.md). La interfaz pública puede reproducir video, pero Render Free no ejecuta el modelo YOLO: el estado del motor se comunica explícitamente.

## Simulador visual interactivo

En **Análisis en vivo → Simulador interactivo** aparecen los cuatro escenarios animados con zonas, objetos y anotaciones, controles de capas, velocidad, pausa y captura PNG. Es una escena sintética **sin detecciones YOLO**; el motor real se mantiene en las otras dos modalidades y no está disponible en Render Free. Ver [funcionamiento detallado](docs/simulacion_interactiva.md).


## Laboratorio 3D avanzado (Fase 6)

**Análisis en vivo → Simulador 3D** abre una instalación interactiva WebGL2: geometría volumétrica de personas, EPP, montacargas, racks, cajas, productos, cinta y zonas en suelo. Incorpora tres vistas de cámara (isométrica, frontal y superior), rotación con ratón y flechas, zoom de rueda, ajustes de visualización, cronología, cambio de velocidad, pausa, reinicio, pantalla completa y captura PNG. Su renderizador es WebGL2 nativo con shaders y mallas 3D generadas localmente, sin bibliotecas adicionales ni coste de GPU remota.

Las puntuaciones, escenas y alertas del simulador siguen siendo **datos sintéticos** y están rotulados como tales. Las otras dos modalidades son **Video con YOLO** y **Cámara con YOLO**, que no pretenden inferencia disponible en Render Free.

Ver [manual técnico del laboratorio 3D](docs/simulacion_interactiva_3d.md).
