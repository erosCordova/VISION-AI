# Fase 13 — Seguridad, privacidad y gobierno de datos

**Estado:** implementación preparada; pendiente de la CI integral.
Avance aprobado al iniciar esta fase: **12/16 = 75 %**.

## Alcance verificable

El producto usa únicamente fotogramas renderizados por cuatro
simulaciones 3D. Los datos de sesiones explícitamente guardadas,
las cajas YOLO y las decisiones humanas residen en IndexedDB del
navegador. Los PNG/CSV/JSON se descargan a solicitud del usuario.

### Controles entregados

1. Ruta **Privacidad** accesible desde el menú para cualquier perfil
   de demostración, sin fingir autorización de servidor.
2. Resumen local: sesiones válidas, revisiones, registros incompatibles
   y sesiones elegibles para depuración.
3. Retención **manual** por 30, 90 o 180 días, sin limpieza automática.
4. Borrado por antigüedad: valida fechas, preserva registros recientes
   y corruptos, y elimina las revisiones asociadas en una transacción.
5. Borrado total voluntario de sesiones y revisiones, incluidos
   registros incompatibles, en una única transacción IndexedDB.
6. Frases distintas de confirmación para depuración y borrado total.
7. Mensajes claros: no hay cifrado propio, autenticación real
   ni sincronización remota; el selector de rol es una demostración.
8. Historial auditable y exportable antes de eliminar datos.

**Limitaciones:** eliminar IndexedDB no elimina pesos ONNX de caché,
archivos descargados, otros dispositivos o copias de seguridad.
No se debe afirmar que el selector de «Administrador» sea un control
de acceso. Los endpoints públicos del backend Render no deben tratar
el rol de demostración como identidad.

## Pruebas de aceptación

- PR01: los conteos se basan en la persistencia local, no en datos demo.
- PR02: caducidad de 30/90/180 días y fechas corruptas seguras.
- PR03: depuración de registros viejos y sus cierres sin tocar recientes.
- PR04: borrado total idempotente y atómico de las dos colecciones.
- PR05: controles inaccesibles sin frase exacta, relectura tras recarga.
- PR06: las rutas y mensajes no anuncian autenticación inexistente.
- PR07: no se habilitan webcam, archivos, datasets o servicios de pago.

**Aprobación pendiente:** TypeScript, Vitest, Python, Vite y Chromium
con tests de IndexedDB en 360, 768 y 1440 píxeles.
