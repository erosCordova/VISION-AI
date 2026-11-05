# Manual de usuario — VISION-AI

**Producto:** laboratorio de visión computacional con transmisiones HLS en directo (SDOT) y simulaciones 3D.
**Interfaz:** español. **Fuentes:** videos HLS públicos de tránsito para monitoreo vial o cuatro escenas 3D internas.
**No utiliza la cámara del dispositivo y no requiere datasets.**

## 1. Para qué sirve

Permite experimentar cómo un detector de objetos YOLO analiza imágenes
obtenidas de cámaras públicas con licencia o de una simulación empresarial. La escena 3D describe un
entorno ficticio; el detector ONNX procesa **sus píxeles**, no lee
las posiciones internas de los objetos ni recibe etiquetas ocultas.
Las cajas, clases y confidencias presentadas como YOLO son predicciones
reales del modelo. No equivale a un sistema de vigilancia ni certifica
cumplimiento de seguridad industrial.

## 2. Requisitos del visitante

Navegador moderno con WebAssembly y WebGL, internet para descargar
los modelos bajo demanda (aprox. 13 MB COCO / 44,8 MB EPP, además del
runtime), y memoria suficiente para la simulación 3D. Una GPU dedicada
no es requisito; el rendimiento depende del equipo. Un bloqueador de
CDN o modo de navegación restrictivo puede impedir descargar pesos.
Los resultados de sesión se guardan en **IndexedDB del navegador**
únicamente cuando se solicita.

## 3. Conectar video en tiempo real

1. Acceder a https://vision-ai-erosss.vercel.app .
2. Abrir **Análisis en vivo** y seleccionar **Video público en directo**.
3. Elegir una cámara SDOT de Seattle: 2nd Ave / Pike St,
   Western Ave / Broad St, 4th Ave / Battery St o Queen Anne / Thomas.
4. Pulsar **Iniciar video en directo**. Se descarga Hls.js bajo demanda;
   se valida que el manifiesto HLS sea de tipo LIVE y que avancen nuevos
   fotogramas antes de mostrar **DIRECTO**.
5. Pulsar **Iniciar reconocimiento** para cargar YOLOv8n y examinar los
   píxeles de los fotogramas recibidos. El último fotograma inferido se
   muestra a la derecha, separado del video que sigue avanzando.
6. Se informa la cantidad real de inferencias, clases, confianza y tiempo
   de procesamiento. No se promete 30 FPS: depende del procesador.
7. Detener el reconocimiento o el video cuando haya terminado.
8. Para estudiar EPP, calidad industrial y logística sintética,
   seleccionar **Simulaciones 3D** en la misma pantalla.

**Límites:** el video puede tener varios segundos de retraso; la
disponibilidad de cada cámara depende del proveedor. Si el servidor no
autoriza acceso CORS a los píxeles, se informa el error y no se inventan
resultados. No se almacena video ni se identifican rostros o matrículas.

## 4. Los cuatro escenarios

| Escenario | Qué representa | Qué puede inferirse |
| --- | --- | --- |
| Seguridad industrial | Personal, protección y zonas de trabajo | YOLO EPP puede detectar indicios de casco/chaleco; revisión humana obligatoria |
| Manufactura / Calidad | Productos y cinta transportadora | COCO reconoce únicamente clases generales disponibles; **no** certifica defectos |
| Retail | Personas y estanterías | Puede detectar la clase persona por fotograma; no hace aforo ni identificación |
| Logística | Estantes, pallets y montacargas simulados | COCO no certifica montacargas ni distancias seguras; sólo clases predichas |

Las situaciones físicas son simuladas, pero los resultados ONNX no
se fabrican ni se sustituyen por posiciones conocidas de la escena.

## 5. Ejecutar YOLO real

1. Seleccionar **YOLO real** en Análisis en vivo.
2. En Seguridad utilizar, si interesa, **EPP industrial**; en los
   otros escenarios se utiliza el detector general COCO.
3. Presionar **Iniciar YOLO real**. Se descarga el modelo únicamente
   al iniciarlo, se verifica SHA-256 y se carga ONNX/WASM.
4. Esperar la primera lectura. El visor presenta el fotograma exacto,
   cajas, etiquetas, confianza y tiempos medidos.
5. Elegir cadencia **Equilibrada**, **Ágil**, **Ahorro** o **Adaptativa**;
   esta última ajusta el intervalo a la duración observada del ciclo
   sin superponer inferencias.
6. La **confianza visual mínima** y el filtro de clases solo cambian
   lo mostrado; nunca reescriben la evidencia original.
7. Presionar **Detener inferencia** cuando haya terminado.
   Si falla la lectura, intentar **Reintentar último fotograma**
   y revisar el mensaje de error.

Una detección vacía no significa que no exista el objeto o que
las medidas de seguridad se cumplan. La confianza no equivale a una
medición de exactitud. No se prometen FPS específicos.

## 6. Segmentar y exportar evidencia

Cuando hay inferencia y detecciones, la **máscara cromática** opcional
usa píxeles/contrastes dentro de las regiones YOLO. Se puede
visualizar como superposición, contorno o silueta, y exportar PNG
con transparencia. **No** es segmentación semántica YOLO-seg.
La exportación de evidencia YOLO PNG conserva las cajas **originales**,
independientemente del filtro visual de confianza.

## 7. Guardar sesión y revisar indicios

Guardar una sesión del escenario si desea conservar la captura
analizada como **metadatos**, no como video o captura binaria.
En Historial se ven ID, fecha, escenario, estado 3D reproducible,
modelo, detecciones y sus indicadores. El visor no recupera los
píxeles exactos del fotograma pasado, solo su estado reproducible.
En **Operaciones** se revisan indicios EPP y se puede declarar
«seguimiento», «descartado» o «sin conclusión», con nota opcional.
Estas son decisiones humanas locales, no sanciones.

## 8. Historial e informes

Use búsqueda y filtros por escenario, modalidad, fecha y estado de
revisión; luego exporte los datos **filtrados** mediante:
CSV de sesiones, CSV de detecciones, CSV de revisiones, JSON de
auditoría o informe imprimible A4. CSV/JSON no restauran
automáticamente las sesiones borradas.

## 9. Privacidad y eliminación

La pantalla Privacidad informa los registros en IndexedDB.
Puede solicitar depuración **manual** de registros de 30, 90 o
180 días y confirmar con «DEPURAR»; o eliminar todas las sesiones y
revisiones confirmando «BORRAR TODO». Ambas operaciones son
destructivas. Antes de borrar, exporte los archivos necesarios.
No se eliminan archivos ya descargados, caché ONNX ni datos
en otro navegador o dispositivo. Los perfiles del menú son
roles **de prueba**, no cuentas autenticadas.

## 10. Dudas frecuentes

- **«El modelo tarda en iniciar».** Primera descarga de pesos,
  ejecución WASM y capacidad del equipo pueden influir.
- **«No reconoce el objeto».** YOLO general fue entrenado en otro
  dominio visual. Pruebe otro ángulo o escenario; no es una
  medición de fallo por sí sola.
- **«No veo la sesión al cambiar de navegador».** IndexedDB no
  sincroniza información entre perfiles/dispositivos.
- **«Render no responde de inmediato».** Los servicios Free
  pueden reactivarse tras inactividad; YOLO del simulador continúa
  en el navegador.
- **«¿Es gratuito?».** La aplicación utiliza los planes
  Hobby/Free en límites aplicables. El usuario no necesita
  pagar un servicio externo para ejecutar las simulaciones.
- **«¿Puedo subir imágenes?»** No. La fuente del análisis son
  los videos de cámaras públicas y las simulaciones 3D.

## Cámaras públicas: condiciones y límites

La fuente procede de Transport for London (TfL). El frontend obtiene
las imágenes por **rutas HTTPS del mismo dominio en Vercel**, mediante
reescrituras exactas hacia dos JPEG de TfL; Render no interviene.
La fuente se identifica
visiblemente como **Powered by TfL Open Data**. La licencia gratuita
incluye obligaciones de atribución, registro y límites de consulta:
https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service

La foto se vuelve a solicitar como mínimo cada tres minutos; **no
equivale a 30 FPS ni permite medir movimiento continuo**. El estado de
disponibilidad y la hora de consulta no son prueba de la hora exacta de
captura por la cámara. Si el proveedor devuelve error no se muestran
predicciones falsas ni se accede a ninguna cámara privada.

Cámaras de calles **no permiten certificar EPP industrial ni defectos
de fabricación**. Los resultados de YOLO COCO muestran únicamente
clases reconocibles sobre los píxeles del fotograma de tráfico.

**Nota sobre frescura:** aunque la aplicación consulte la fuente cada tres
minutos, TfL puede conservar temporalmente una imagen anterior o suspender
la transmisión; la hora de consulta no representa la hora real de captura.

## Video público de tránsito SDOT

Las cámaras SDOT del Departamento de Transporte de Seattle publican
video HLS para monitoreo del tráfico, disponible en el portal oficial:
https://web.seattle.gov/travelers . La plataforma conecta el reproductor
del navegador directamente con el proveedor (sin proxy de video
ni transcodificación en Render o Vercel). La reproducción y detección
requieren conectividad y permiso CORS para leer fotogramas.
El análisis se limita al conteo de clases generales visibles por
fotograma; no es control de cumplimiento industrial ni biométrico.

Ver las condiciones del operador antes de distribuir comercialmente
el sistema. La disponibilidad pública para ver tráfico no equivale a
un permiso universal para redistribuir el video.

## Recuperación de transmisiones en vivo

Si un servidor SDOT deja de entregar segmentos HLS o el navegador informa
**«Failed to load because no supported source was found»**, VISION-AI
intenta recuperar la decodificación o la red y puede reinicializar el
reproductor hasta tres veces, con pausas de 1,2 s, 3 s y 6,5 s.
Si el navegador rechaza el formato HLS nativo, el siguiente intento
utiliza Hls.js cuando el navegador lo admite.

Mientras no llegan fotogramas nuevos, el estado no se etiqueta como
**DIRECTO** y YOLO no puede generar detecciones adicionales.
Si antes estaba activado, YOLO vuelve a analizar fotogramas nuevos
cuando la transmisión se recupera. Si se agotan los intentos,
puede pulsarse **Reintentar cámara** o **Otra cámara**, sin
actualizar toda la página.

Ningún mecanismo puede garantizar que una cámara externa
esté siempre encendida o que permita lectura de píxeles por CORS.
Las pruebas de compilación no sustituyen una prueba real del
proveedor y el navegador.

## Funciones ampliadas del análisis de video

- **Cambio de cámara:** después de agotar tres reconexiones, el monitor
  puede probar otra fuente pública, sin inventar disponibilidad. La opción
  se puede desactivar en el propio monitor.
- **Filtros:** confianza mínima y clase visible. Solo cambian la
  representación; no modifican las detecciones originales.
- **Guardar análisis:** guarda explícitamente fecha local de análisis,
  cámara, modelo, tiempo y cajas/clases/confianzas en el navegador.
  **No se almacena la imagen ni una grabación del video.**
- **Descargar imagen:** descarga en el equipo una copia PNG del fotograma
  previamente analizado, con las cajas que el usuario tenga visibles.
- **Historial de cámaras:** búsqueda por cámara/clase, periodo, detalle,
  eliminación confirmada y exportación CSV de los registros filtrados.
- **Resumen:** indicadores y clases frecuentes provenientes exclusivamente
  de observaciones guardadas, sin métricas inventadas.
- **Preferencias:** confianza, cambio de cámara y pausa entre análisis
  aplicados realmente al monitor; se conservan en este navegador.
- **Privacidad:** depurar por antigüedad o borrar todo incluye los registros
  guardados de cámaras, además de las sesiones 3D.

El conteo por fotograma no identifica individuos, no es aforo único ni
seguimiento de identidades. La confianza del modelo no es una medida
de exactitud. Los registros de video muestran la **hora local de análisis**,
no la hora de grabación certificada por el operador de la cámara.
