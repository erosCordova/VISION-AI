# VISION-AI

Plataforma educativa y experimental de visión computacional con
**cuatro escenarios empresariales simulados en 3D** y detecciones
YOLO ONNX reales sobre sus fotogramas. Interfaz en español.

## Estado del proyecto

**Fases 1–15 aprobadas (93,75 %). Fase 16: código, manuales y CI aprobados; confirmación de Render Free pendiente para el 100 %.**
Los porcentajes se refieren a entregables del plan de 16 fases,
no a precisión ni rendimiento de la red neuronal.

- **Frontend:** React 19, TypeScript, Vite y Three.js/WebGL,
  publicado con GitHub → Vercel Hobby.
- **Inferencia:** YOLOv8n COCO (80 clases) y YOLOv8s EPP (14 clases),
  ejecutados mediante ONNX Runtime Web/WASM en el propio navegador.
  Los pesos se descargan bajo demanda y se verifican con SHA-256.
- **Backend:** FastAPI de estado en Render Free, sin inferencia,
  cargas de imágenes, PyTorch ni base de datos.
- **Persistencia:** IndexedDB del navegador, con guardado explícito,
  revisiones humanas, exportaciones CSV/JSON y privacidad local.
- **Entradas:** únicamente los fotogramas renderizados por las
  simulaciones 3D. **No hay webcam, videos, fotos subidas o datasets**.
- **Limitaciones:** ni la confianza YOLO ni las cajas constituyen
  verificación de seguridad, precisión mAP, inspección certificada
  de defectos o identificación personal.

## Abrir la aplicación

**<https://vision-ai-erosss.vercel.app>**

### Escenarios

| Escenario | Modelo y alcance |
| --- | --- |
| Seguridad industrial | Detector especializado EPP para indicios de protección personal, sujetos a revisión |
| Manufactura / Calidad | Detector COCO general; no certifica defectos del producto |
| Retail | Detecciones de personas visibles por fotograma; no certifica aforo ni identidades |
| Logística | Detecciones generales; COCO no prueba la existencia de montacargas ni zonas seguras |

### Recorrido principal

1. Abrir **Análisis en vivo**, elegir escenario y cámara 3D.
2. Entrar en **YOLO real** y pulsar **Iniciar YOLO real**.
3. Observar cajas, etiquetas, confianza y tiempos medidos por
   preparación → ONNX → posprocesamiento.
4. Ajustar filtros **visuales** o cadencia adaptativa/manual sin
   modificar los resultados originales.
5. Guardar sesión; consultar **Historial**, revisar indicios en
   **Operaciones**, exportar CSV/JSON o informe A4.
6. Consultar **Privacidad** para gestión de IndexedDB y borrado
   voluntario con confirmación explícita.

Los modelos pueden devolver cero detecciones sobre geometría
estilizada. Nunca se generan cajas falsas para ocultarlo.

## Instalación y pruebas

Requisitos: Node.js definido en `.nvmrc`, npm, Python 3.12 para
las pruebas del backend. En Git Bash de Windows o shell equivalente:

```bash
git clone https://github.com/erosCordova/VISION-AI.git
cd VISION-AI
npm ci --no-audit --no-fund
npm run check
npm run build
python3 -m pip install -r backend/requirements-render-free.txt "httpx>=0.28,<1"
python3 -m unittest discover -s tests
```

Para explorar en local, ejecutar `npm run dev` en la terminal
existente. No es necesario instalar YOLO en Python, crear una base
de datos ni configurar variables para la inferencia ONNX del navegador.
Los tests de Chromium de extremo a extremo se ejecutan en
[GitHub Actions](https://github.com/erosCordova/VISION-AI/actions).

## Documentación vigente

- [Manual de usuario](docs/manual/Manual_Usuario_VISION_AI.md).
- [Manual técnico](docs/manual/Manual_Tecnico_VISION_AI.md).
- [Despliegue gratuito, seguridad y rollback](docs/despliegue_gratuito.md).
- [Acta de entrega de Fase 16](docs/fase16_operacion_entrega.md).
- [Estado verificable y evidencias de las 16 fases](docs/estado.md).
- [Backlog](docs/backlog.md).
- [Motor YOLO ONNX y Fase 15](docs/fase15_optimizacion_yolo.md).

La documentación previa sobre webcams, videos o YOLO26 con envío
remoto de JPEG queda **obsoleta** frente a estos manuales. El
documento Word histórico continúa en `docs/manual` solo como
referencia de planificación, no como manual operativo actualizado.

## Despliegue y costes

El frontend puede operar en Vercel Hobby para uso personal/no
comercial y el backend puede usar un único Web Service Render Free.
La disponibilidad y los límites están sujetos a las políticas
actuales del proveedor. Evitar activación de funciones pagadas,
GPU remota, almacenamiento de imágenes o planes de pago.

## Licencias y garantías

Revisar las licencias de modelos y assets externos (el modelo
especializado EPP se documenta como AGPL-3.0) antes de explotación
comercial. Los indicios no son afirmaciones definitivas. La
aplicación no es un sistema de videovigilancia ni un producto de
seguridad industrial certificado.

**Proyecto académico individual — Ingeniería de Software con IA.**

## Estado de validación de Fase 16

La [CI integral de entrega](https://github.com/erosCordova/VISION-AI/actions/runs/41939143207)
pasó 327 pruebas TypeScript, 72 Python y 12 recorridos Chromium
con ONNX en los cuatro escenarios y guía de usuario visible.
Se conserva el acta JSON en artifacts. El frontend Vercel se
verifica por su SHA de producción. La API real de Render Free
requiere identificar el workspace/servicio, verificar plan y
consultar /api/v1/health; el código status-only no prueba por sí
solo la disponibilidad externa de ese servidor.
