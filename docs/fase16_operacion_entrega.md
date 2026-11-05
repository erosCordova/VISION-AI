# Acta técnica de entrega — Fase 16

**Proyecto:** VISION-AI · cuatro simulaciones 3D con YOLO ONNX real.
**Fecha de preparación:** 4 de noviembre de 2026.
**Estado de preparación:** código y manuales completos; la aprobación
requiere CI integral y comprobación del servicio Render real.

## Condiciones de cierre

| ID | Condición | Evidencia |
| --- | --- | --- |
| RF01 | Herramienta de reconocimiento accesible en «Visión IA» | Chromium comprueba fuente 3D, cámaras públicas, controles y acceso a historial |
| RF02 | Doce recorridos responsive y cuatro modelos/escenas YOLO | CI GitHub Actions |
| RF03 | Frontend publicado en Vercel con SHA exacto y estado READY | API de despliegues Vercel + HTTPS |
| RF04 | Backend Render Free identificado, plan comprobado y /health real | API del workspace Render confirmado |
| RF05 | API remota sin inferencia ni recepción de imágenes | TestClient: GET /health=200 y POST /infer=503 |
| RF06 | CORS, cabeceras y dependencias mínimas | Pruebas Python y configuración Vercel |
| RF07 | Historial/CSV/JSON/privacidad sin regresiones | Chromium y Vitest |
| RF08 | Manual usuario, manual técnico y rollback documentados | Archivos de docs/manual y despliegue |
| RF09 | Artefactos del runner y acta con SHA | qa-artifacts/fase16-acta-qa.json |
| RF10 | Una publicación final, sin servicios de pago nuevos | main y Vercel; revisión Render Free |

**No declarar 100 % mientras RF04 carezca de evidencia en el
workspace confirmado.** Los demás criterios solo se marcan aprobados
después de su verificación efectiva.

## Qué se entrega

React/Vite/TypeScript, simulación Three.js/WebGL, modelos ONNX
COCO y EPP ejecutados por WASM en navegador, reglas de revisión
humana, sesiones IndexedDB, CSV/JSON y protección local. FastAPI de
Render Free responde únicamente estado; no procesa imágenes.

## Procedimiento de recuperación

1. Conservar el SHA aprobado de main y el ID de despliegue READY.
2. En caso de fallo, inspeccionar el deploy actual y el anterior;
   **no** ejecutar rollback automáticamente como prueba.
3. Tras autorización, restaurar un deploy de producción previamente
   validado o revertir por commit + CI. Comprobar dominio y cabeceras.
4. En Render, verificar workspace, servicio y plan antes de acceder
   al historial de deploys o reactivar. No crear duplicados.
5. Las operaciones de rollback de código **no restauran IndexedDB**.
   Los CSV/JSON descargados no son una función de reimportación.

## Riesgos que siguen siendo explícitos

Los perfiles son de prueba, no autenticación real. IndexedDB es
privado de cada navegador y no tiene backup remoto. La confianza de
YOLO no mide mAP ni certifica EPP o defectos. No se admite cámara,
video, imagen subida o dataset. Los modelos requieren conectividad.
La disponibilidad y gratuidad están sujetas a límites de Render Free
y Vercel Hobby; Hobby está destinado a uso personal/no comercial.

## Referencias

- [Manual de usuario](manual/Manual_Usuario_VISION_AI.md).
- [Manual técnico](manual/Manual_Tecnico_VISION_AI.md).
- [Despliegue gratuito y rollback](despliegue_gratuito.md).
- [Estado de fases](estado.md).
- [CI](https://github.com/erosCordova/VISION-AI/actions).
- https://vision-ai-erosss.vercel.app .

## Evidencia técnica aprobada antes de publicación

GitHub Actions: https://github.com/erosCordova/VISION-AI/actions/runs/41939143207 .
327 pruebas TypeScript, 72 Python y 12 recorridos Chromium,
incluyendo RF01 y RF02. El servidor FastAPI status-only rechaza
la inferencia con 503 y verifica que su API no cargue PyTorch.
La comprobación RF04 de Render debe completarse por separado.
