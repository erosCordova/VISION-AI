# Entorno reproducible de VISION AI

## Versiones verificadas

Node.js 24.22.1 y npm 11.9.0. La versión recomendada está en .nvmrc y el rango compatible en package.json. Python 3.12 ejecuta las referencias existentes sin paquetes externos. No se requiere Python para compilar el frontend.

| Dependencia directa | Versión instalada |
| --- | --- |
| react | 19.3.1 |
| react-dom | 19.3.1 |
| @types/node | 24.19.2 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| @vitejs/plugin-react | 6.2.1 |
| typescript | 6.0.3 |
| vite | 8.3.5 |
| vitest | 5.1.0 |

## Instalación y validación

Desde la raíz del repositorio, en la terminal Git Bash ya abierta:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
python3 -m unittest discover -s tests
```

No se necesita un archivo .env para verificar el modo demo predeterminado. .env.example documenta opciones públicas. No se crean credenciales ni endpoints ficticios.

## Comandos

| Comando | Resultado |
| --- | --- |
| npm run dev | Servidor local enlazado a 127.0.0.1; solo al solicitar vista local. |
| npm run typecheck | Verificación estricta de tipos, sin emitir archivos. |
| npm run check:architecture | Detecta acoplamientos prohibidos entre capas. |
| npm test | Pruebas TypeScript de contratos en Node. |
| npm run check | Arquitectura, tipos y pruebas TypeScript. |
| npm run build | Verifica tipos y genera dist. |
| npm run test:reference | 62 comprobaciones Python de fases previas. |
| npm run preview | Sirve dist localmente después de compilar; no publica. |

La pantalla existente es una base técnica inicial, no el dashboard ni la interfaz empresarial final de Fase 6. No se publicó ni se abrió un servidor de desarrollo en este incremento.

## Integración continua

.github/workflows/verify.yml verifica push a main y pull requests: npm ci, arquitectura, tipos, pruebas TypeScript, referencias Python y compilación. Las acciones se fijan por SHA y el permiso del trabajo es contents:read. No realiza despliegues ni tiene secretos configurados.

La existencia del workflow no acredita una ejecución remota exitosa: se debe revisar el resultado de GitHub Actions asociado al commit. Las comprobaciones locales se registran por separado.

## Errores habituales

- Node incompatible: usar una versión dentro de engines; no desactivar engine-strict para ocultarlo.
- Registro npm inaccesible: corregir conectividad y reintentar npm ci sin regenerar lockfile arbitrariamente.
- Configuración real sin URL: mantener demo o indicar el backend cuando exista; la URL sola no conecta un modelo.
- Copia incompatible: conservar datos y versión actual; no forzar migración ni eliminar el almacén automáticamente.
