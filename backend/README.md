# Inferencia real de YOLO para simulaciones en tiempo real

**Alcance piloto**: videos locales en bucle o cámara autorizada del navegador; cada fotograma JPEG se envía al servidor local, que ejecuta YOLO26n real en CPU y devuelve detecciones. No se guardan video ni capturas; sin audio. **No hay reconocimiento simulado**.

## Requisitos

Python 3.11/3.12, 16 GB RAM recomendados, conexión a internet solo al descargar pesos la primera vez. Sin GPU ni servicio de pago obligatorio. Los paquetes y modelos se instalan localmente; pueden consumir espacio considerable. El entrenamiento de clases especiales no está incluido en este primer piloto.

## Git Bash (Windows), en la raíz del repositorio

Un único bloque, sin iniciar otras terminales. Abre Git Bash existente; deja los dos procesos en segundo plano **en esa misma terminal** (no se abre CMD/PowerShell):

\`\`\`bash
git pull origin main
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -r backend/requirements-local.txt
python -c "from ultralytics import YOLO; YOLO('yolo26n.pt')"
cp .env.example .env.local
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8015 > /tmp/vision-ai-yolo.log 2>&1 &
npm ci --no-audit --no-fund
npm run dev
\`\`\`

En \`.env.local\`, usar \`VITE_VISION_MODE=real\` y \`VITE_VISION_API_BASE_URL=http://127.0.0.1:8015\` **antes** de ejecutar Vite. Los dos valores son públicos; no contienen secretos. Visita http://127.0.0.1:5173 y comprueba http://127.0.0.1:8015/api/v1/health. Al terminar, detén los procesos desde el mismo Git Bash; la cámara debe detenerse en la interfaz.

## Escenarios

- **Seguridad industrial**: YOLO26n base detecta personas; casco y chaleco solo con pesos entrenados para esas clases y asociación de equipos. Nunca declarar incumplimiento con el modelo general.
- **Almacén**: no se trata un camión como montacargas. Se requieren pesos con clase \`forklift\` y calibración de la zona.
- **Calidad**: el checkpoint base no certifica defectos; se necesitan pesos para cada defecto y producto.
- **Retail**: YOLO26n puede detectar personas visibles y actualizar su conteo por fotograma; no es aforo certificado ni seguimiento único entre sesiones.

Para usar pesos propios de cada escenario, definir variables de entorno del proceso Python con rutas locales a \`.pt\`: \`VISION_MODEL_SAFETY\`, \`VISION_MODEL_WAREHOUSE\`, \`VISION_MODEL_QUALITY\`, \`VISION_MODEL_RETAIL\`. Las clases que reconoce cada archivo se leen del propio modelo. Solo la cobertura declarada por esos pesos puede considerarse disponible; todavía faltan reglas temporales, calibración, validación y métricas.

## Privacidad y límites

Servidor atado a 127.0.0.1, CORS local, sin grabación ni almacenamiento. No publicar esta API directamente en internet: necesita autenticación, TLS, control de permisos y protección de consumo para despliegue remoto. Una única inferencia CPU concurrente; si el motor tarda, disminuye el FPS observado. La interfaz descarta resultados tardíos y detiene nuevas capturas al parar o cambiar de escena.

**Licencia**: el paquete Ultralytics y pesos YOLO26 tienen licencia AGPL-3.0 o Enterprise. Revisar obligaciones antes de distribuir o prestar servicio. RF-DETR Nano/Small/Medium/Large (Apache 2.0) es alternativa futura sujeta a benchmarks en el hardware real.
