# Módulos funcionales — VISION-AI

La interfaz se organiza por responsabilidades, conforme a la sección 5.2 del
documento de diseño técnico. Cada carpeta existente contiene código usado
por la aplicación o por pruebas automatizadas.

| Módulo | Responsabilidad |
| --- | --- |
| `analysis/` | Cámaras públicas, análisis de fotogramas, errores y validación de respuestas. |
| `detections/` | Reconocimiento de objetos, filtros, postprocesamiento y mediciones. |
| `segmentation/` | Máscaras y operaciones de segmentación por contraste. |
| `patterns/` | Identificación de observaciones repetidas a partir de detecciones. |
| `alerts/` | Presentación y revisión manual de señales que requieren atención. |
| `history/` | Sesiones, análisis guardados e informes descargables. |
| `scenarios/` | Simulación 3D, escenas, cámara virtual y movimiento. |
| `dashboard/` | Indicadores derivados de registros efectivamente guardados. |
| `settings/` | Preferencias y privacidad local. |
| `experience/` | Portada inmersiva de la interfaz, módulo adicional no contemplado en el árbol sugerido. |

No se crean carpetas de características hipotéticas sin implementación.
Los servidores de video son externos; los modelos de reconocimiento funcionan
en el navegador y no en la API ligera de Render.
