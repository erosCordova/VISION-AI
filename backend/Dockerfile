# syntax=docker/dockerfile:1
# Backend ligero de VISION-AI. El reconocimiento visual se ejecuta en el navegador.
FROM python:3.12-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8010

WORKDIR /app
COPY backend/requirements-render-free.txt /app/backend/requirements-render-free.txt
RUN python -m pip install --no-cache-dir -r /app/backend/requirements-render-free.txt \
    && useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin visionai
COPY backend/app/ /app/backend/app/
COPY server/ /app/server/
USER 10001:10001

# Solo esta etapa incluye fixtures y tests; nunca se envían a la imagen final.
FROM base AS test
COPY --chown=10001:10001 tests/ /app/tests/
COPY --chown=10001:10001 tools/ /app/tools/
COPY --chown=10001:10001 docs/fixtures/ /app/docs/fixtures/
COPY --chown=10001:10001 assets/scenarios/ /app/assets/scenarios/
RUN python -m unittest discover -s tests -v

FROM base AS runtime
EXPOSE 8010
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import json,urllib.request; r=json.load(urllib.request.urlopen('http://127.0.0.1:8010/api/v1/health',timeout=3)); assert r.get('ok') is True and r.get('inferenceAvailable') is False" || exit 1
CMD ["uvicorn","server.api.app:app","--host","0.0.0.0","--port","8010"]
