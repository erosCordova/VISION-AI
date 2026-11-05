# Docker local — VISION-AI

## Finalidad

Docker permite ejecutar y verificar el **backend FastAPI** de forma reproducible,
sin instalar Python ni dependencias del servidor en Windows. La aplicación pública
sigue en **Vercel** y el backend remoto en **Render Free con runtime Python**.
**No migramos Render a Docker, no activamos ningún servicio de pago y no
modificamos el procesamiento visual que ya se ejecuta en el navegador.**

Esta imagen **no** instala PyTorch, OpenCV, modelos de reconocimiento ni una base
de datos. Solo usa las dependencias de `backend/requirements-render-free.txt`.

## Requisitos

- Docker Desktop funcionando en Windows 11 con contenedores Linux y Docker Compose v2.
- Git Bash en la ventana que ya utilizas.
- El repositorio `VISION-AI` actualizado en la rama `main`.

No necesitas crear un archivo `.env` ni configurar contraseñas.

## Inicio (Git Bash, desde la raíz de VISION-AI)

```bash
docker compose -f compose.yaml up --build -d api
docker compose -f compose.yaml ps
curl -fsS http://127.0.0.1:8010/api/v1/health
```

La respuesta de salud debe incluir `"ok":true` y
`"inferenceAvailable":false`. Esto es **correcto**: el reconocimiento
real de imágenes sigue funcionando en la página web, no en la API Docker.

La API queda accesible **solo desde el propio dispositivo** en
`http://127.0.0.1:8010`. No se publica en la red local ni en Internet.

## Pruebas independientes dentro de Docker

```bash
docker build --target test -f backend/Dockerfile .
```

La etapa `test` incluye los tests Python y fixtures del proyecto,
los ejecuta durante la construcción y detiene el build si algún test falla.
La imagen final `runtime` **no contiene los tests, fixtures o archivos
de las simulaciones**.

Para comprobar el estado y consultar logs:

```bash
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail=60 api
```

Para detener y eliminar únicamente el contenedor de VISION-AI:

```bash
docker compose -f compose.yaml down
```

No usar `docker compose down --volumes`, `docker system prune` ni
eliminar otros contenedores: este archivo no crea volúmenes persistentes.

## Puerto ocupado

Por defecto se usa `127.0.0.1:8010`. Si ya hay una aplicación usando
ese puerto, cambiar **solo el puerto local** sin tocar el backend:

```bash
VISION_LOCAL_API_PORT=18010 docker compose -f compose.yaml up --build -d api
curl -fsS http://127.0.0.1:18010/api/v1/health
```

## Seguridad y recursos

- Proceso con usuario no privilegiado (UID 10001).
- Sistema de archivos de solo lectura y espacio temporal limitado.
- Sin privilegios adicionales ni acceso al dispositivo de cámara.
- Límite de 256 MB de memoria, una CPU y 64 procesos.
- Sin base de datos, montajes de carpetas personales o puertos externos.
- El servicio se inicia manualmente y no se reinicia automáticamente.

Una cámara pública externa puede fallar aunque Docker esté funcionando,
porque las transmisiones llegan directamente al navegador desde su proveedor.

## CI y despliegues

GitHub Actions ejecuta la construcción `test`, la imagen final y el
contrato de API en un contenedor real cuando cambian los archivos relevantes.
El flujo está en `.github/workflows/docker-backend.yml`.

**Docker es opcional para VISION-AI**, no reemplaza el frontend Vercel y no
requiere modificar `vercel.json` ni configurar Render como servicio Docker.
El uso local de Docker Desktop no genera cargos de Vercel o Render.
