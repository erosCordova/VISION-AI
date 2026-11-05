# Manual de usuario — VISION-AI

**Producto:** laboratorio de visión computacional con cámaras públicas TfL y simulaciones 3D.
**Interfaz:** español. **Fuentes:** fotografías reales públicas de tráfico
(para logística, transporte y retail) o cuatro escenas 3D internas.
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

## 3. Abrir la aplicación

1. Acceder a https://vision-ai-erosss.vercel.app .
2. Entrar en **Análisis en vivo**.
3. La pestaña **Cámara pública TfL** muestra dos fuentes con URLs JPEG
   públicas: Piccadilly Circus y Romford Road / Tennyson Road.
   Seleccionar una cámara y esperar la fotografía.
4. Pulsar **Iniciar YOLO** para descargar ONNX/WASM y obtener detecciones
   reales de vehículos y personas visibles en la imagen.
5. Ajustar la confianza, actualizar la fotografía o descargar evidencia PNG.
6. Para los escenarios industriales sintéticos, seleccionar **Simulaciones 3D**.
   Allí se conservan los cuatro escenarios y el detector de EPP.
7. Si los humanos 3D resultan pesados, cambiar a la visualización
   **ligera**, cuando el visor lo permita.
8. Ajustar cámara (isométrica, frontal, superior o primer plano),
   velocidad, pausa y zonas según se necesite.

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
  únicamente las simulaciones 3D del proyecto.

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
