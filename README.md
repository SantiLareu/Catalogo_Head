# RealStep / HEAD — Catálogo mayorista

Aplicación React/Vite para explorar un catálogo mayorista, seleccionar
variantes y talles, preparar un carrito y enviar una solicitud de pedido.
El catálogo se genera desde un Excel y el build oficial puede firmarse con
Ed25519 y verificarse mediante hashes SHA-256.

> **Antes de realizar cambios estructurales, leer [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).**
> Allí se documentan la arquitectura, las decisiones vigentes, el estado real,
> las restricciones y el roadmap.

## 1. Descripción del proyecto

### Objetivo

El proyecto es un catálogo mayorista interactivo para la marca **HEAD**,
operado por la empresa **RealStep**. Permite:

- explorar el catálogo por categoría, producto, variante y talle;
- buscar por nombre, código, color u otros campos estructurados;
- ver la galería y la ficha técnica de cada producto;
- preparar un carrito persistido y reconciliado contra el catálogo vigente;
- enviar la solicitud de pedido por correo electrónico a través de EmailJS;
- verificar criptográficamente la integridad del build publicado.

No es un ecommerce con pago en línea: la solicitud queda sujeta a confirmación
comercial. El catálogo vigente no incluye inventario transaccional exacto
(la configuración declara `stockIsAvailabilityOnly: true`).

### Tecnologías

| Capa | Tecnología |
|---|---|
| Lenguaje | JavaScript ES Modules (`type: module` en `package.json`) |
| Frontend | React 19, Vite 8, `@vitejs/plugin-react` 8 |
| Importador | Node.js, `exceljs` 4.4 |
| Carrito | `localStorage` (transitorio, no autoritativo) |
| Envío de pedidos | `@emailjs/browser` (transitorio, no autoritativo) |
| Firma | Ed25519 vía `node:crypto` |
| Hashing | SHA-256 |
| Tests | `node --test` (nativo, no Jest/Vitest) |
| Hosting previsto | Netlify para `dist/` (objetivo a evaluar); GitHub Pages es un objetivo futuro |

### Arquitectura general

```text
catalog/products.xlsx
        │
        ▼
scripts/catalog-import/ + scripts/import-products.mjs
        │
        ▼
generated/catalog.json
        │
        ▼
React 19 + Vite (src/, public/, public/editorial/)
        │
        ├── catálogo, selección y galería
        ├── carrito persistido en localStorage
        └── checkout con EmailJS (transitorio)
                    │
                    ▼
            public/catalog.json (autoritativo del frontend)
                    │
                    ▼
            ReactSecurityVerifier (verifyPublishedIntegrity)

scripts/integrity/
        │
        ▼
dist/integrity-manifest.json + dist/integrity-manifest.sig
        │
        ▼
publicación de dist/ en Netlify
```

## 2. Estructura del proyecto

Después del refactor estructural no existe ninguna carpeta `react-app/`.
Todo el proyecto vive en la raíz del repositorio.

```text
.
├── .agents/                  # Skills y CODEX_CONTEXT para agentes de IA
├── .atl/                     # State local del runtime Pi (ignorado por Git)
├── .gitignore                # Exclusiones de node_modules, dist, .signing, etc.
├── .signing/                 # Clave privada Ed25519 (local, ignorada por Git)
├── AGENTS.md                 # Instrucciones permanentes para agentes de IA
├── NOTICE                    # Información legal del repositorio
├── PROJECT_CONTEXT.md        # Contexto técnico, decisiones, roadmap
├── README.md                 # Este archivo
├── assets/                   # Imágenes fuente del catálogo (no bundleables)
├── catalog/                  # Excel fuente + README del pipeline
├── dist/                     # Build (ignorado por Git). Lo único a publicar.
├── docs/                     # Documentación técnica
│   ├── integrity-signing.md
│   └── auditorias/           # Auditorías históricas fechadas
├── generated/                # catalog.json (artefacto generado)
├── index.html                # Entry point de Vite
├── node_modules/             # Dependencias (ignorado por Git)
├── package.json              # Único, raíz
├── package-lock.json         # Único, raíz
├── public/                   # Assets públicos bundleados 1:1 a dist/
│   ├── _headers
│   ├── ownership.json
│   ├── signing-public-key.pem
│   └── editorial/
├── scripts/                  # Importador, integridad, verificación de build
│   ├── import-products.mjs
│   ├── compare-catalog.mjs
│   ├── update-catalog-baseline.mjs
│   ├── build-signed.mjs
│   ├── generate-signing-keys.mjs
│   ├── generate-integrity-manifest.mjs
│   ├── sign-integrity-manifest.mjs
│   ├── verify-integrity.mjs
│   ├── verify-build.mjs      # Verificación post-build
│   ├── catalog-import/
│   └── integrity/
├── src/                      # Aplicación React
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/           # 31 .jsx organizados por dominio
│   ├── config/
│   ├── context/
│   ├── data/
│   ├── hooks/
│   ├── reducers/
│   ├── security/             # integrityVerifier.js
│   ├── services/
│   ├── styles/
│   └── utils/
├── tests/                    # Suites de tests
│   ├── importer/             # Suite del importador Excel
│   ├── integrity/            # Suite del sistema de firma
│   ├── frontend/             # Suite del frontend (carrito, checkout, etc.)
│   ├── build/                # Suite estática de paths de assets
│   └── fixtures/             # catalog-baseline.json
└── vite.config.js            # Configuración de Vite
```

`dist/` es el único directorio que debe publicarse como sitio estático.
`assets/` permanece fuera del bundle por decisión de diseño (Vite solo
bundlea lo que `import.meta.glob` y `public/` incluyen); `editorial/` está
duplicado en `public/editorial/` para ser bundleado por Vite.

## 3. Requisitos

- Node.js 20.x o superior (probado con Node 24.18).
- npm 10.x o superior.
- Git.
- Clave privada Ed25519 solo si se debe generar un build oficial firmado.

El proyecto no declara versión de Node en `engines`. Verificar versiones
instaladas:

```bash
node --version
npm --version
```

## 4. Instalación

Desde un clon limpio, en la raíz del repositorio:

```bash
npm install
```

Hay un único `package.json` y un único `package-lock.json` en la raíz que
cubre importador y frontend. No es necesario ejecutar `npm ci` en
subcarpetas.

No es necesario clonar claves, secretos ni `.env`. La clave privada
Ed25519 vive fuera del repositorio y debe restaurarse manualmente si se
quiere ejecutar el flujo firmado (ver §8).

### Trabajar desde otra computadora

Antes de empezar:

```bash
git status
git pull --ff-only
```

Para una computadora nueva:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_REPOSITORIO>
npm install
npm run test-importer
npm run test-react
npm run test-integrity
npm run test:build
npm run verify:build
npm run build
```

En Windows PowerShell:

```powershell
Set-Location C:\ruta\al\repositorio
```

En Linux, incluido CachyOS:

```bash
cd /ruta/al/repositorio
```

## 5. Scripts

Todos los comandos están definidos en el `package.json` único de la raíz.
El proyecto ya no expone aliases heredados (`react:dev`, `react:build`,
`react:preview`, `react:test`); se usan los nombres planos.

| Comando | Propósito | ¿Modifica archivos? | Uso habitual |
|---|---|---:|---|
| `npm run import-products` | Valida el Excel y genera `generated/catalog.json` y `generated/catalog-version.json` con SHA-256. | Sí | Después de editar el Excel. |
| `npm run check-products` | Valida el Excel y compara en memoria el JSON y su manifiesto sin escribir. | No | Preflight y validación posterior. |
| `npm run compare-catalog` | Compara el JSON generado con el baseline aprobado. | No | Antes de aprobar cambios. |
| `npm run update-catalog-baseline` | Actualiza el baseline canónico. | Sí | Solo tras revisión consciente. |
| `npm run test-importer` | Ejecuta la suite del importador y comparación. | No | Cambios de catálogo o importador. |
| `npm run test-react` | Ejecuta la suite del frontend (carrito, checkout, etc.). | No | Cambios en React, carrito, checkout o servicios. |
| `npm run test-integrity` | Ejecuta la suite de firma e integridad. | No | Cambios de build, firma o publicación. |
| `npm run test:build` | Ejecuta la suite estática de paths de assets. | No | Después de cualquier cambio en `src/data/`, `src/components/layout/` o paths de assets. |
| `npm run verify:build` | Verifica post-build que `dist/` contiene las imágenes, logo, hero y bundle correctos. | No | Después de `npm run build` y antes de un build firmado. |
| `npm run react:build:signed` | Construye, firma, verifica y publica `dist`. | Sí | Build oficial; requiere clave privada. |
| `npm run generate-signing-keys` | Inicia la generación de claves Ed25519. | Sí, con `--confirm` | Solo creación o rotación deliberada. |
| `npm run integrity:manifest` | Genera el manifiesto de hashes. | Sí | Operación técnica de integridad. |
| `npm run integrity:sign` | Firma el manifiesto. | Sí | Operación técnica con clave privada. |
| `npm run integrity:verify` | Verifica firma y archivos del build. | No | Después de cada build firmado. |
| `npm run dev` | Inicia Vite en modo desarrollo. | No | Desarrollo local. |
| `npm run build` | Genera un build Vite normal en `dist/`. | Sí | Comprobación local; no publicar como build oficial. |
| `npm run preview` | Sirve localmente el contenido de `dist/`. | No | Revisión previa a publicación. |

## 6. Flujo de desarrollo

El flujo habitual para una modificación de código es:

```text
modificar código
        ↓
ejecutar tests pertinentes
        ↓
npm run test:build
        ↓
npm run verify:build
        ↓
npm run react:build:signed
        ↓
npm run integrity:verify
        ↓
git diff --check
        ↓
git add <archivos> && git commit -m "..."
        ↓
git push
        ↓
publicar dist/
```

### Selección de las suites

| Tipo de cambio | Suites obligatorias |
|---|---|
| Catálogo / importador | `test-importer`, `test:build` |
| Frontend, carrito, checkout | `test-react`, `test:build`, `verify:build` |
| Build, firma, publicación | `test-integrity`, `test:build`, `verify:build` |
| Path de assets (`src/data/`, `src/components/layout/`) | `test:build` (crítico). Si cambia, también `test-react` y `verify:build`. |
| Configuración central, licencia, ownership | Actualizar documentación con la misma rigurosidad que el código. |
| Refactor estructural | Todas las suites + revisión manual. |

Ningún agente de IA debe hacer commit, push ni deploy sin orden expresa.

## 7. Flujo cuando cambia el catálogo

El catálogo solo se edita en `catalog/products.xlsx`. Este es el flujo
completo:

```text
editar catalog/products.xlsx
        ↓
npm run check-products             # preflight, sin escribir
        ↓
corregir errores de esquema o datos
        ↓
npm run import-products            # regenera generated/catalog.json
        ↓
npm run check-products             # ahora debe aprobar
        ↓
npm run compare-catalog            # revisar cada diferencia
        ↓
npm run update-catalog-baseline    # solo si el cambio queda aprobado
        ↓
npm run test-importer
        ↓
npm run test-react
        ↓
npm run test-integrity
        ↓
npm run test:build
        ↓
npm run verify:build
        ↓
npm run react:build:signed
        ↓
npm run integrity:verify
        ↓
git diff --check
        ↓
publicar dist/
```

No editar manualmente `generated/catalog.json`, `generated/catalog-version.json`
ni `tests/fixtures/catalog-baseline.json`. La versión usa SHA-256 sobre los bytes
exactos del catálogo, no un timestamp, para preservar el determinismo.

### Detección en runtime

La carga inicial continúa usando los JSON importados por Vite. En runtime,
`CartContext` mantiene conjuntamente `activeCatalog` y `activeVersion`. Un único
controlador consulta cada 60 segundos `catalog-version.json` con
`cache: 'no-store'`; pausa las comprobaciones mientras la pestaña está oculta y
comprueba inmediatamente al recuperar visibilidad o foco.

Cuando cambia la versión, descarga `catalog.json?v=<sha256>`, calcula SHA-256
con Web Crypto sobre los bytes recibidos y solo entonces aplica conjuntamente
catálogo y versión. Las solicitudes concurrentes se deduplican. Ante errores de
red, manifest, JSON o hash se conserva el último estado válido y el próximo
ciclo vuelve a intentar. El carrito `realstep-head-cart` no se reinicia ni se
reescribe por esta actualización.

Los JSON importados por Vite se usan únicamente como bootstrap. Una vez
montada la aplicación, `activeCatalog` es la fuente única para productos,
categorías, búsqueda, tarjetas y resolución del carrito. Una actualización
válida se refleja sin recargar la página, conserva selecciones todavía válidas
y corrige variante, talle o índice de imagen cuando desaparecen.

Cada versión aplicada muestra una sola notificación no bloqueante. El footer
expone los primeros ocho caracteres del SHA-256 activo para facilitar soporte;
esa referencia también cambia sin F5.

Antes de cada envío, el checkout realiza una consulta nueva del manifest,
incluso si acaba de ejecutarse el polling. Espera cualquier comprobación de
background en curso y luego consulta con un nonce nuevo y `cache: 'no-store'`.
El email se construye exclusivamente con el catálogo validado.

Si cambia una línea —precio, nombre, SKU, color, producto, variante, talle o
disponibilidad— ese intento no se envía. El modal muestra el detalle y exige
revisión y una segunda confirmación; los precios además deben aceptarse desde
el carrito. Si falla la red, el manifest, el JSON o el SHA-256, el formulario y
el carrito se conservan y EmailJS no se ejecuta.

Sin backend no existe una garantía transaccional absoluta: puede publicarse
otra versión entre la última validación y el envío. La garantía ofrecida es que
el pedido se contrasta con la última versión pública conocida inmediatamente
antes de invocar EmailJS.
No aprobar el baseline sin comprender el diff. Ver también
[`catalog/README.md`](catalog/README.md).

## 8. Build firmado e integridad

### Qué es la firma

El build firmado emite una **publicación verificable**: un `dist/` acompañado
de un manifiesto (`integrity-manifest.json`) con hashes SHA-256 de cada archivo
regular y una firma Ed25519 sobre la canonicalización de ese manifiesto. La
firma:

- identifica al motor (`santiago-lareu-catalog-engine`), proyecto
  (`realstep-head-catalog`) y licencia (`SLCE-LIC-2026-0001`);
- vincula la publicación con Santiago Lareu como titular y desarrollador, y
  RealStep como licenciatario;
- protege contra la sustitución silenciosa de archivos entre el build y el
  hosting;
- permite que el frontend (`src/security/integrityVerifier.js`) verifique
  criptográficamente el contenido servido.

La firma **no** impide copiar el frontend ni ofrece DRM, verificación remota,
telemetría ni desactivación. La protección depende del contrato y de la
custodia de la clave privada.

### Cómo funciona

1. `npm run react:build:signed` ejecuta un build Vite en un directorio
   temporal del mismo filesystem.
2. La clave privada se importa desde `.signing/ed25519-private.pem` (o desde
   `SIGNING_PRIVATE_KEY_PATH` / `SIGNING_PRIVATE_KEY_PEM`).
3. Se deriva y publica la clave pública en `dist/signing-public-key.pem`.
4. Se calcula un manifiesto con SHA-256 de cada archivo regular de `dist/`.
5. Se firma la canonicalización del manifiesto con Ed25519.
6. Se verifica la copia antes de promoverla.
7. El `dist` vigente se reemplaza mediante `atomic-rename` (con fallback por
   copia en entornos que no lo permiten).

La explicación técnica detallada está en
[`docs/integrity-signing.md`](docs/integrity-signing.md).

### La clave privada

La clave privada **no se versiona**. Vive en `.signing/ed25519-private.pem`,
ruta ignorada por `.gitignore`. Una computadora nueva no la obtiene al
clonar: debe restaurarse manualmente desde un backup seguro, por un canal
controlado.

Reglas absolutas:

- **Nunca** subir la clave a Git, prompts, logs, scripts, documentación ni
  archivos compartidos.
- **Nunca** ejecutar `npm run generate-signing-keys -- --force` sin una
  decisión explícita: reemplaza la identidad criptográfica existente.
- **Nunca** modificar `scripts/integrity/integrityCore.mjs` ni
  `scripts/integrity/releaseOperations.mjs` sin entender el contrato de
  canonicalización v1.
- Ante pérdida o compromiso de la clave, archivar evidencia histórica y
  emitir una identidad nueva. La revocación no es automática para copias
  ya distribuidas.

### Variables de entorno reconocidas

- `SIGNING_PRIVATE_KEY_PATH`: ruta a una clave privada PKCS#8 externa.
- `SIGNING_PRIVATE_KEY_PEM`: contenido PEM entregado por variable de entorno.
- `SIGNING_PUBLIC_KEY_PATH`: ruta alternativa para importar o exportar la
  clave pública.
- `BUILD_COMMIT`: identificador opcional cuando Git no está disponible.

## 9. Publicación

El proyecto está preparado para servir el contenido firmado de `dist/` desde
un hosting estático. La elección del proveedor no está cerrada todavía; las
opciones son:

### Opción actual: Netlify (recomendada por su soporte nativo de `_headers`)

1. Ejecutar `npm run test-importer`.
2. Ejecutar `npm run test-react`.
3. Ejecutar `npm run test-integrity`.
4. Ejecutar `npm run test:build`.
5. Ejecutar `npm run verify:build`.
6. Ejecutar `npm run react:build:signed` en un entorno con la clave
   privada.
7. Ejecutar `npm run integrity:verify`.
8. Publicar **únicamente** el contenido de `dist/`.

`public/_headers` se copia al `dist/` y define los headers de seguridad
básicos (`X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors
'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`). Verificar en el dominio productivo que
Netlify aplique estos headers.

**Nunca publicar la raíz del repositorio**. Si Netlify reconstruye en sus
servidores, el comando oficial debe ser el build firmado y la clave debe
suministrarse por un mecanismo secreto, nunca por Git. Si la clave no se
entrega a Netlify, desplegar el `dist` firmado previamente sin reconstruirlo
allí.

### Opción futura: GitHub Pages

GitHub Pages es un objetivo futuro. Requiere:

- garantizar HTTPS estricto (Pages ya lo cumple);
- configurar el dominio y la rama de despliegue;
- replicar manualmente los headers de `public/_headers` (GitHub Pages no
  aplica archivos `_headers` de Netlify; requiere configuración equivalente
  en `_headers`/`Routes`/CDN);
- servir `dist/` como artefacto de despliegue.

No está implementado todavía.

### Otros hostings estáticos

Cualquier hosting que sirva únicamente `dist/` con HTTPS y soporte
`Cache-Control` adecuado es viable. Validar siempre que la verificación
en navegador (`integrityStatus: verified`) se cumpla en producción.

### Verificación post-deploy

Después de publicar:

```bash
curl -I https://<HOST>/_headers
curl -I https://<HOST>/integrity-manifest.json
curl -I https://<HOST>/signing-public-key.pem
```

El frontend ejecuta `verifyPublishedIntegrity(companyConfig)` al boot y refleja
el estado en `data-integrity-status` del `<div id="root">`. Valores
esperados: `verified`, `invalid`, `unavailable` o `error`.

## 10. Troubleshooting

### Falta la clave privada para build firmado

```
IntegrityError: No se pudo leer la clave privada configurada.
  code: 'PRIVATE_KEY_INVALID'
```

Causa: `.signing/ed25519-private.pem` no existe. Solución: restaurar la clave
desde un backup seguro a la ruta por defecto, o exportar
`SIGNING_PRIVATE_KEY_PATH` apuntando a la clave. **Nunca** generar una clave
nueva sin una decisión explícita.

### Faltan imágenes en `dist/`

Síntoma: `npm run verify:build` falla por
`dist/assets/` contiene < 300 imágenes de productos. Causa típica: un path
en `src/data/productImages.js`, `src/components/layout/Header.jsx` o
`src/components/layout/Hero.jsx` apunta un nivel arriba de la raíz (el bundle
de Vite queda apuntando fuera de su alcance). Verificar contra
`tests/build/assetPaths.test.mjs`, que detecta ese caso antes del build.

### `npm run verify:build` advierte `doesn't exist at build time`

Síntoma: `npm run build` muestra
`new URL('../../../../assets/...', import.meta.url) doesn't exist at build time`.
Causa típica: un `new URL` o un `import.meta.glob` con un nivel de más o de
menos. `npm run test:build` detecta este patrón antes del build.

### `npm run integrity:verify` falla

Posibles causas:

- `dist/integrity-manifest.json` no existe: ejecutar `npm run react:build:signed`
  o `npm run integrity:manifest` + `npm run integrity:sign`.
- Clave pública no coincide: regenerar solo si la clave privada cambió; los
  hashes viejos son evidencia histórica.
- Hash incorrecto: el contenido de `dist/` se modificó después de firmar;
  reejecutar el build firmado.

### `npm run test-react` o `npm run test-integrity` fallan

No aplicar fixes sin reproducir el fallo. Capturar la salida completa y
revisar:

- cambios recientes en `src/` (carrito, checkout, integridad);
- paths absolutos en los tests (`new URL('../../generated/...', ...)` debe
  coincidir con la profundidad del archivo de test);
- compatibilidad de `node:test` con la versión de Node.

### `npm install` reporta vulnerabilidades en `uuid`

`uuid` es una dependencia transitiva de `exceljs`. Las versiones
vulnerables son `<11.1.1`. El fix requiere `npm audit fix --force` con
breaking change de `exceljs` (downgrade a `3.4.0`). La severidad es
moderada. Decisión del usuario si acepta el riesgo o fuerza el fix.

### Errores de import tras refactor

Si tras un cambio aparece `ERR_MODULE_NOT_FOUND` o un path roto, verificar:

- la profundidad del path relativo al archivo que importa;
- que `src/data/productImages.js` y `src/data/catalog.js` usen el mismo
  número de niveles que la profundidad del archivo;
- que `tests/frontend/*.test.mjs` usen `../../src/...` (dos niveles, porque
  viven en `tests/frontend/`).

### Imágenes de productos no se ven en runtime

Síntoma: la página carga pero las imágenes de las fichas de producto no
aparecen. Causa típica: `dist/assets/` no contiene las 396 imágenes
esperadas. Verificar:

- `npm run build` no emitió warnings sobre `doesn't exist at build time`;
- `npm run verify:build` pasó;
- `tests/build/assetPaths.test.mjs` pasó.

Si todas esas verificaciones pasan y la imagen sigue sin verse, el problema
es de runtime (CSP, MIME, headers); revisar la pestaña Network del browser.

### `git diff --check` reporta whitespace errors

`git diff --check` detecta errores de espacio al final de línea, tabs
mezclados con espacios, líneas largas. Corregir antes de commit.

### Build queda con `dist/` enorme (centenas de MB)

Normal: `dist/` pesa aproximadamente 55 MB por las 396 imágenes de productos
bundleadas. Si supera 200 MB, probablemente hay assets duplicados fuera de
`import.meta.glob` o imágenes sin comprimir. Usar `du -sh dist/assets/*` para
localizar.
