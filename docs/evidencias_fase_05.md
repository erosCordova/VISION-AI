# Evidencias y cierre de Fase 5

Fecha: 2026-11-03. Entorno de ejecución: Node.js 24.22.1, npm 11.9.0 y Python 3.12 del workspace; no computadora del usuario.

## Casos del manual

| Caso | Verificación ejecutada | Resultado local |
| --- | --- | --- |
| AR01 | Instalación limpia con npm ci, tipos y compilación | Aprobado: lockfile consistente y build generado. |
| AR02 | Inyectar motores de prueba DEMO y REAL con el mismo consumidor | Aprobado: mismo contrato; cambios de origen o identidad se rechazan. |
| AR03 | Resultado inválido, intento de completed sin resultado y restauración corrupta | Aprobado: no se modifica registro confirmado ni se deja completed sin resultado. |

AR03 prueba el comportamiento del adaptador volátil y la preparación antes de su reemplazo atómico. Las interrupciones de disco, cuota de IndexedDB y reinicios del navegador aún no se han probado y corresponden a Fase 7.

## Última verificación local

- npm ci --no-audit --no-fund: instalación limpia correcta.
- npm run check: guard de arquitectura, tipos estrictos y **50 pruebas TypeScript aprobadas**.
- npm run build: **correcto**, 23 módulos, HTML, CSS y JavaScript en dist.
- python3 -m unittest discover -s tests: **62 pruebas Python aprobadas**.
- Prueba negativa del guard: importación temporal de React en core/domain rechazada; archivo de comprobación retirado.

Total: **112 pruebas automatizadas aprobadas**, más comprobaciones de arquitectura, tipos y build. Los 44 casos funcionales originales del producto siguen pendientes de la integración de la aplicación.

## Cobertura y límites

Se verificaron entrada, identidad, origen, huellas, clases, cajas, máscaras RLE, evidencia de patrones, cancelación de consumidor, configuración pública, copia defensiva, comparación de versión y finalización concurrente. Las llamadas de prueba no usan modelos ni endpoints externos.

La instalación inicial detectó incompatibilidad de la API del compilador de TypeScript 7 con el guard; se fijó TypeScript 6.0.3 y se repitió instalación limpia y comprobaciones. Un caso parametrizado de Vitest se corrigió para pasar un array RLE completo a cada prueba.

## Medición inicial

Salida del último build local: JavaScript 227.19 kB (71.49 kB gzip), CSS 0.52 kB (0.34 kB gzip), HTML 0.49 kB (0.31 kB gzip). Son tamaños del build técnico actual, no tiempos de carga del usuario ni presupuestos de la interfaz final. No se ejecutaron pruebas de navegador, persistencia durable ni inferencia.

## Decisión de avance

Fase 5 aprobada para base técnica, contratos y compilación. Avance administrativo: **31.25 % (5 de 16 fases)**. La Fase 6 construirá interfaz, rutas, sistema visual y componentes.

El workflow queda preparado para verificación remota; su resultado se consulta en GitHub Actions. Este documento acredita los resultados locales descritos, no un despliegue.
