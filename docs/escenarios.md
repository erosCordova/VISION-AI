# Fase 3 — Escenarios empresariales y criterios operativos

Versión: 1.0.0. Fecha: 2026-11-03. Referencia: manual avanzado 4.0.

Se definen cuatro escenarios, con Seguridad industrial como piloto. Cada escenario utiliza el mismo flujo de análisis y tiene clases, reglas, evidencia, revisión y tres casos de referencia propios.

## Qué se entrega y qué acredita

Se entregan **12 imágenes PNG esquemáticas de 800×600**, anotaciones y resultados preparados: una positiva, una negativa y una ambigua por escenario. Son diagramas creados dentro del proyecto, sin imágenes de terceros ni fotografías de personas. Los resultados se identifican como DEMO; no se atribuye reconocimiento a un modelo.

Estas imágenes son recursos calibrados para construir y probar el flujo. No son fotografías empresariales ni datos de entrenamiento o test de un detector. No deben utilizarse para medir la precisión de la fase real: incluyen rótulos de caso y patrones artificiales que filtrarían la respuesta al entrenamiento.

Catálogo consumible: [catalog.json](fixtures/scenarios/catalog.json). Cada PNG tiene ruta, dimensiones, procedencia y SHA-256. Cambiar una imagen obliga a revisar anotaciones y actualizar su huella. Los casos actuales son de especificación y no forman todavía un motor de reglas de la Fase 11.

## Semántica común

- Positivo: existe evidencia suficiente para activar la regla y solicitar revisión.
- Negativo: hay evidencia suficiente y la condición configurada no se cumple; no garantiza ausencia de cualquier otro problema.
- Ambiguo: falta evidencia o hay incertidumbre que afecta la decisión; resultado indeterminate, no un negativo automático.
- Identificadores internos en inglés y etiquetas de interfaz en español mediante classLabels.
- Toda geometría usa coordenadas normalizadas de la imagen orientada.
- Revisión de hallazgos: supervisor o administrador según permisos.md.

## 1. Seguridad industrial

Identificador: `industrial-safety`. Versión: `1.0.0`. Clases: Persona, Casco, Chaleco.

### Tarea y regla

Localizar personas y asociar casco y chaleco a cada instancia por ID. En este piloto, cada persona requiere ambos elementos. El caso positivo señala posible casco ausente solo si el anotador declara cabeza y torso visibles y evaluación completa. La ausencia global de detección no basta para afirmar incumplimiento.

La asociación explícita de las referencias demo no demuestra que un modelo pueda resolver esa asociación. El adaptador real deberá aportar asociación espacial evaluada y gestionar oclusiones.

### Casos y decisión

- Positivo: persona visible con chaleco, cabeza visible y casco ausente según referencia; posible falta de casco, severidad warning.
- Negativo: persona con casco y chaleco asociados; regla no activada.
- Ambiguo: cabeza cubierta por oclusión; helmetPresent=null, no visible. Revisión indeterminada.

### Segmentación prevista y requisitos reales

La persona se segmentará por instancia si se usa su región para asociar EPP. Los PNG actuales contienen siluetas esquemáticas y cajas; no incluyen una máscara de persona inferida ni un contorno de producción validado. Los datos reales deben cubrir varias personas, casco visible, oclusión, poses y chalecos diferentes, con anotaciones por instancia y autorización de uso.

### Riesgo y revisión

Un falso positivo puede atribuir una falta inexistente; el supervisor revisa la evidencia antes de confirmar. Un falso negativo no elimina la necesidad de supervisión humana. Guardar regla, configuración y objetos asociados.

### Recursos calibrados

| Caso | Imagen PNG | Esperado |
| --- | --- | --- |
| positive | [industrial-positive](../assets/scenarios/industrial-positive.png) | triggered |
| negative | [industrial-negative](../assets/scenarios/industrial-negative.png) | not-triggered |
| ambiguous | [industrial-ambiguous](../assets/scenarios/industrial-ambiguous.png) | indeterminate |

## 2. Almacén inteligente

Identificador: `smart-warehouse`. Versión: `1.0.0`. Clases: Caja, Pallet, Montacargas.

### Tarea y regla

Localizar cajas, pallets y montacargas. La zona rectangular restringida va de (0.60,0.20) a (0.90,0.75). Se evalúa el centro de la caja del montacargas y se incluye la frontera. Una caja que solo intersecta la zona no activa esta política si su centro está fuera.

Los valores se comparan con tolerancia de 1e-9 para redondeo. No es una tolerancia física de seguridad. La ubicación de la zona es fija en estos recursos; una fotografía de otra cámara necesita recalibración.

### Casos y decisión

- Positivo: centro del montacargas dentro de zona y posición fiable; regla activada, severidad warning.
- Negativo: centro fuera de zona; regla no activada.
- Ambiguo: centro geométrico sobre frontera pero posición no fiable por oclusión; resultado indeterminado incluso si el cálculo puntual cae dentro.

### Segmentación prevista y requisitos reales

Detección y geometría bastan para el criterio del centro elegido. No se exige una máscara para afirmar esta relación. Si se cambia a intersección de máscara, se crea otra versión de regla. Los datos reales deben representar distintos tamaños, distancias, zonas, objetos y oclusiones con calibración por escena.

### Riesgo y revisión

El centro de una caja no describe toda la huella física del vehículo. Este piloto es una regla visual de revisión, no una barrera de seguridad ni una medida de distancia real. Supervisor revisa zona, cámara, evidencia y configuración.

### Recursos calibrados

| Caso | Imagen PNG | Esperado |
| --- | --- | --- |
| positive | [warehouse-positive](../assets/scenarios/warehouse-positive.png) | triggered |
| negative | [warehouse-negative](../assets/scenarios/warehouse-negative.png) | not-triggered |
| ambiguous | [warehouse-ambiguous](../assets/scenarios/warehouse-ambiguous.png) | indeterminate |

## 3. Control de calidad

Identificador: `quality-control`. Versión: `1.0.0`. Clases: Producto, Defecto superficial.

### Tarea y regla

Inspeccionar un único producto piloto representado por una región rectangular de área normalizada 0.30. El defecto superficial es una región poligonal asociada al producto. La regla activa revisión cuando área de unión de defectos / área del producto > 0.01, con inspección completa.

El denominador es el producto inspeccionado, no toda la fotografía. La comparación es estricta: exactamente 1 % no activa esta regla. En estos casos solo hay un defecto; al añadir varios debe utilizarse unión para no duplicar áreas superpuestas.

### Casos y decisión

- Positivo: región defectuosa de área 0.004; ratio 0.004/0.30 ≈ 0.01333, supera 1 %; revisar, severidad warning.
- Negativo: inspección declarada completa, sin defecto anotado; ratio cero y regla no activada.
- Ambiguo: parte del producto oculta; no se puede concluir conformidad por ausencia de defecto visible. Resultado indeterminado.

### Segmentación prevista y requisitos reales

Se usa segmentación regional binaria de defecto sobre el producto específico. El polígono actual es una anotación esquemática, que deberá rasterizarse y validarse en Fase 10. Los datos reales necesitan muestras conformes y defectuosas, máscaras, definición del defecto, iluminación y superficies diversas. Un modelo aprobado para este defecto no detecta automáticamente otros tipos.

### Riesgo y revisión

Rechazar o aceptar un producto solo por área puede ser inadecuado en otros contextos; tipo y ubicación del defecto pueden importar. La regla piloto no certifica calidad industrial. El supervisor confirma el hallazgo y registra observación.

### Recursos calibrados

| Caso | Imagen PNG | Esperado |
| --- | --- | --- |
| positive | [quality-positive](../assets/scenarios/quality-positive.png) | triggered |
| negative | [quality-negative](../assets/scenarios/quality-negative.png) | not-triggered |
| ambiguous | [quality-ambiguous](../assets/scenarios/quality-ambiguous.png) | indeterminate |

## 4. Retail

Identificador: `retail`. Versión: `1.0.0`. Clases: Persona, Estante, Producto.

### Tarea y regla

Contar personas cuyos centros de caja están en una zona rectangular de observación, desde (0.15,0.20) hasta (0.85,0.80), frontera incluida. El umbral de la referencia es más de dos personas. Es un ejemplo operativo configurable y no una capacidad legal de un local.

Para objetos dudosos se conserva un intervalo [conteo confirmado, conteo máximo compatible]. Si el intervalo cruza el umbral, la decisión es indeterminada. Si el mínimo ya lo supera, la evidencia puede activar regla; si el máximo no lo supera, no la activa.

### Casos y decisión

- Positivo: tres personas confirmadas dentro de la zona; intervalo [3,3] y regla activada, severidad info.
- Negativo: dos personas confirmadas; intervalo [2,2] y regla no activada.
- Ambiguo: dos confirmadas y una persona parcialmente oculta; intervalo [2,3] y resultado indeterminado.

### Segmentación prevista y requisitos reales

El criterio actual se basa en detecciones y centros; no requiere una máscara. Los estantes y productos forman parte del catálogo pero no alteran el conteo de personas. Los datos reales deben cubrir perspectivas, densidades, personas parcialmente visibles y límites de la zona.

### Riesgo y revisión

Una imagen solo describe un instante. No se afirma afluencia, permanencia, seguimiento, identidad ni comportamiento individual. Supervisor revisa el conteo y la zona, sin confundir umbral de ejemplo con una norma oficial.

### Recursos calibrados

| Caso | Imagen PNG | Esperado |
| --- | --- | --- |
| positive | [retail-positive](../assets/scenarios/retail-positive.png) | triggered |
| negative | [retail-negative](../assets/scenarios/retail-negative.png) | not-triggered |
| ambiguous | [retail-ambiguous](../assets/scenarios/retail-ambiguous.png) | indeterminate |

## Reproducir la verificación

```bash
python3 -m unittest discover -s tests -v
```

La suite no requiere paquetes externos. Verifica catálogo, geometría, asociaciones, ratios, intervalos, hashes y cabeceras PNG. La decodificación visual de los archivos se revisó además durante su creación.

Para regenerar los PNG, se necesita Pillow, como dependencia opcional de autoría:

```bash
python3 tools/render_scenario_fixtures.py
```

Fuentes y versiones pueden modificar los bytes al regenerar. Se actualizan hashes y se revisan las imágenes; el catálogo versionado es la referencia del recurso exacto. No es necesario regenerarlas para ejecutar pruebas ni para consumirlas desde la futura aplicación.

## Condición para usar imágenes externas o reales

Registrar proveedor, URL o procedencia, autorización o licencia, fecha, finalidad y anotador. Verificar imagen y etiquetas antes de asociarlas a un caso. No se han seleccionado datasets fotográficos ni modelos en esta fase. Su incorporación a evaluación real requiere el protocolo de Fase 15.
