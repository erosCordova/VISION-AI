# Fase 13 — Seguridad, privacidad y gobierno de datos

**Estado: APROBADA.** Avance oficial **13/16 = 81,25 %**.
CI de aceptación: https://github.com/erosCordova/VISION-AI/actions/runs/41933824408 .

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

## Prueba Chromium integrada

PR01–PR07 se comprueban sobre una base IndexedDB aislada del runner.
Después de terminar todos los ensayos de YOLO ONNX, Chromium modifica
únicamente la fecha de una sesión de prueba, confirma depuración de
retención 90 días, verifica que la sesión antigua desapareció y que
se conserva la revisión no relacionada. Finalmente confirma «BORRAR TODO»
y comprueba cero sesiones y cero revisiones incluso tras recargar.
Se verifican deshabilitación previa de acciones y mensajes honestos
sobre los perfiles de prueba. Sin alteraciones a datos de producción.

## Incremento 3 — Protección HTTP y minimización visual

Se añaden cabeceras en `vercel.json` para deshabilitar captura de
cámara/micrófono y geolocalización (no se usan en las simulaciones),
impedir `iframe`, impedir sniffing de tipos MIME y limitar
`Referer` de terceros. Se incluyen pruebas declarativas con Vitest.
No se añade una CSP que rompa trabajadores WebAssembly o modelos ONNX
sin un inventario y validación completa de recursos externos.
Se elimina del sidebar el nombre personal hardcodeado, reemplazado por
un «Entorno de prueba» sin cuenta autenticada.
Estas cabeceras se verifican en la configuración, pero su activación
pública solo podrá confirmarse después de publicar en Vercel.

## Acta de cierre

PR01–PR07: seguridad del almacenamiento local, conservación de
registros recientes, borrado atómico de revisiones asociadas,
confirmación explícita, persistencia tras recarga, transparencia
sobre roles de prueba y cero fuentes externas.

La aceptación requiere TypeScript, Vitest, Python, Vite y QA Chromium
en 360/768/1440 píxeles, con ejecución de inferencia YOLO ONNX real
en los cuatro escenarios antes de probar operaciones destructivas
en el perfil aislado del runner. La configuración de cabeceras se
valida por pruebas unitarias; su aplicación efectiva debe verificarse
en Vercel tras publicación.
