# VISION-AI / EXPERIENCIA INMERSIVA

**Referencia de calidad:** https://activetheory.net .
Se estudió la profundidad, movimiento de WebGL, navegación concisa,
contraste y composición de un estudio creativo.
**No se reproducen su marca, código Hydra, texturas ni escenas.**

## Herramientas gratuitas realmente implementadas

- **Three.js 0.180.0 (MIT)**: escultura espacial original,
  órbitas, luz y partículas generadas por geometría procedural;
  reutiliza la dependencia ya fijada en `package-lock.json`.
- **SVG nativo (estándar abierto)**: cuatro ilustraciones
  vectoriales originales con tramas, gradientes y líneas isométricas.
- **CSS nativo**: sistema de tokens, profundidad, reflejos, gradientes,
  animaciones de entrada, navegación y responsive.
- **ResizeObserver + IntersectionObserver**: escalado exacto del
  canvas y suspensión del render cuando sale del viewport.
- **prefers-reduced-motion**: el sistema detiene el render 3D,
  elimina animaciones CSS y permite activación explícita.
- **GitHub Actions / Chromium**: prueba la portada a 360, 768 y
  1440 px con las cuatro tarjetas, botones funcionales y sin scroll
  horizontal; los modelos YOLO y sus resultados no se modifican.

Ninguna herramienta premium, cuenta de pago o SDK propietario es
necesario. Las dependencias siguen siendo React/Vite/Three. Se
descarta añadir un segundo motor de animación hasta comprobar
que supone un beneficio claro de rendimiento, para no duplicar loops.

## Jerarquía visual

1. Hero inmersivo de alto contraste. CTA «Explorar simulaciones»
   y acceso secundario a Historial. Etiquetas claras de que la
   inferencia ONNX sucede localmente.
2. KPI de sesiones **obtenido de IndexedDB real** y dashboard
   existente, sin cifras ni detecciones inventadas.
3. Cuatro experiencias de navegación con arte SVG original
   para Seguridad, Logística, Manufactura y Retail.
4. Pie de página con la ruta vigente y acceso a operaciones.
5. Menú lateral oscuro, jerarquía, estado de sistema y menú móvil
   con botón y fondo de cierre.

## Presupuesto de experiencia

El WebGL decorativo se activa solo en **Resumen**. El renderer
usa `powerPreference:low-power`, `devicePixelRatio<=1.5`,
tope aproximado de **30 FPS** (intervalo objetivo, no medida),
sin texturas externas ni cargas de red. Se libera la geometría,
materiales y renderer al abandonar la ruta. En ausencia de
WebGL se conserva un gradiente CSS legible.

La simulación industrial 3D y YOLO ONNX de Análisis en vivo
no se alteran. Los contadores locales y la inferencia real
siguen separados de la decoración, que no puede publicar cajas.

## Accesibilidad y prueba

La portada tiene título HTML real, los CTA son botones, los
cuatro escenarios tienen nombres accesibles, el menú móvil
puede cerrarse sin bloquear la aplicación y el canvas decorativo
no interfiere con teclado/lector de pantalla.

La primera versión se mantiene en **rama de validación**
sin despliegues intermedios. Solo publicar a `main` tras pasar
TypeScript, Vitest, Python, build y Chromium de 12 recorridos
con modelos ONNX reales de los cuatro escenarios.

**Nota de diseño:** este es un rediseño original inspirado
en la calidad de Active Theory, no una copia pixel-perfect.
