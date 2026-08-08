# Contexto técnico del proyecto

Documento de referencia para desarrolladores y agentes de IA que continúen
el catálogo mayorista RealStep / HEAD.

Antes de modificar el proyecto, leer este archivo completo. Después, leer
[`README.md`](README.md) y la documentación específica del subsistema
afectado. Antes de actuar, comprobar el código, la configuración y las
pruebas reales. Una idea incluida en el roadmap no es una funcionalidad
implementada.

## Índice

1. [Advertencia para nuevos desarrolladores y agentes de IA](#1-advertencia-para-nuevos-desarrolladores-y-agentes-de-ia)
2. [Visión del proyecto](#2-visión-del-proyecto)
3. [Arquitectura actual](#3-arquitectura-actual)
4. [Estado actual](#4-estado-actual)
5. [Arquitectura objetivo](#5-arquitectura-objetivo)
6. [Principios del proyecto](#6-principios-del-proyecto)
7. [Flujos importantes](#7-flujos-importantes)
8. [Estado de seguridad](#8-estado-de-seguridad)
9. [Pendientes](#9-pendientes)
10. [Reglas para agentes de IA](#10-reglas-para-agentes-de-ia)

## 1. Advertencia para nuevos desarrolladores y agentes de IA

> **Leer este archivo antes de modificar el proyecto.** El objetivo es
> conservar las decisiones arquitectónicas existentes y evitar cambios
> innecesarios.

Reglas innegociables:

- No modificar, leer, copiar ni mostrar claves privadas, secretos o
  archivos `.env`.
- No hacer commit, push, deploy ni publicación salvo instrucción expresa.
- No modificar firma, licencia, ownership ni configuración legal sin
  autorización.
- No instalar dependencias sin justificación concreta y autorización.
- Toda tarea debe terminar informando archivos creados o modificados,
  pruebas ejecutadas y limitaciones o riesgos.
- Los mensajes de commit del proyecto se escriben en español.

## 2. Visión del proyecto

El proyecto busca convertirse en un motor reutilizable para catálogos
mayoristas interactivos. La instalación actual corresponde a **RealStep**
y exhibe productos **HEAD**. El motor y la autoría del software se atribuyen
a Santiago Lareu; RealStep es el licenciatario de esta instalación.

`src/config/company.js` y la configuración de integridad concentran:

- `softwareId`: `santiago-lareu-catalog-engine`.
- `projectId`: `realstep-head-catalog`.
- `licenseId`: `SLCE-LIC-2026-0001`.
- `owner` y `developer`: Santiago Lareu.
- `licensedTo`: RealStep.

La configuración de software y licencia no demuestra ni reclama derechos
sobre marcas, imágenes, descripciones u otros contenidos de terceros. Esos
derechos se tratan por separado.

El objetivo es poder adaptar el motor a otras marcas o instalaciones
mediante configuración y datos, sin duplicarlo innecesariamente. En su
estado actual:

- no es un ecommerce con pago en línea;
- permite explorar el catálogo, preparar un carrito y enviar una
  solicitud de pedido;
- el pedido queda sujeto a confirmación comercial;
- el envío actual se realiza desde el navegador mediante EmailJS y es
  transitorio.

## 3. Arquitectura actual

El proyecto implementa cinco Subsistemas independientes que colaboran y
que están separados físicamente en el árbol de código.

### 3.1. Importador de catálogo

```text
catalog/products.xlsx
        │
        ▼
scripts/catalog-import/ + scripts/import-products.mjs
        ├── generated/catalog.json
        └── generated/catalog-version.json (SHA-256 del catálogo)
```

- `scripts/import-products.mjs` orquesta la lectura, validación y
  construcción.
- `scripts/catalog-import/buildCatalog.mjs` convierte el workbook en el
  modelo de catálogo.
- `scripts/catalog-import/catalogVersion.mjs` calcula la identidad SHA-256
  determinista sobre los bytes exactos serializados del catálogo.
- `scripts/catalog-import/catalogBaseline.mjs` compara el resultado contra
  el baseline aprobado y actualiza el baseline.
- `scripts/catalog-import/readWorkbook.mjs` lee las hojas con `exceljs`.
- `scripts/catalog-import/validateWorkbook.mjs` valida esquema y datos.
- `tests/importer/` cubre parsing, validación, normalización y comparación.

### 3.2. Catálogo React

```text
generated/catalog.json
        │
        ▼
src/data/catalog.js (import estático)
        │
        ▼
src/components/catalog/, src/components/product/
        │
        ▼
App.jsx
```

- `src/App.jsx` arma la estructura (CartProvider, Header, Hero, índice de
  categorías, secciones de catálogo, footer, toast).
- `src/main.jsx` monta StrictMode, importa los CSS y dispara
  `verifyPublishedIntegrity` en background.
- `src/components/catalog/` construye secciones por categoría.
- `src/components/product/` define ProductCard, ProductGallery,
  ProductInfo, QuantitySelector, SizeSelector, VariantSelector,
  Specifications, ThumbnailRail, ProductPrice, ProductActions.
- `src/components/lightbox/` define Lightbox con zoom, paneo y gestos.
- `src/components/cart/` define CartDrawer, CartItem, CartSummary.
- `src/components/checkout/` define CheckoutModal, CheckoutForm,
  CheckoutActions, CheckoutStatus, OrderPreview.
- `src/components/categories/` define CategoryIndex, CategoryMenu,
  CategoryGroup, CategoryLink.
- `src/components/search/ProductSearch.jsx` ofrece la búsqueda.
- `src/components/feedback/Toast.jsx` centraliza avisos.

### 3.3. Carrito y checkout

```text
localStorage (realstep-head-cart)
        │
        ▼
src/services/cartStorage.js
        │
        ▼
src/reducers/cartReducer.js
        │
        ▼
src/hooks/usePersistentCart.js
        │
        ▼
src/context/CartContext.jsx
        │
        ▼
src/services/cartReconciliation.js
        │
        ▼
src/services/publishedCatalog.js (fetch a catalog.json)
        │
        ▼
src/components/cart/, src/components/checkout/
        │
        ▼
src/services/emailService.js (EmailJS)
```

- La línea persistida es una **referencia** (`productId`, `variantId`,
  `talle`, `cantidad`, `priceSnapshot`). Nombres, imágenes y precios se
  vuelven a resolver contra el catálogo activo.
- `cartReconciliation.js` aplica estados `available`, `product_removed`,
  `variant_removed`, `size_unavailable`, `unavailable`, `price_changed`.
- `publishedCatalog.js` consulta primero `catalog-version.json` sin caché,
  descarga `catalog.json?v=<sha256>` sólo ante una versión distinta, verifica
  sus bytes con Web Crypto y comparte solicitudes concurrentes.
- `CartContext` mantiene atómicamente `activeCatalog` y `activeVersion`. Un
  controlador único consulta cada 60 segundos, se pausa con la pestaña oculta
  y comprueba al recuperar visibilidad o foco. Los errores de background
  conservan el último catálogo válido y no alteran el carrito persistido.
- El import estático es sólo el bootstrap: toda la interfaz visible deriva en
  runtime de `activeCatalog`. Al aplicar una versión válida, productos,
  categorías, búsqueda, precios y variantes cambian sin recarga; las tarjetas
  preservan selecciones válidas y corrigen referencias que dejaron de existir.
- Cada versión nueva aplicada dispara un único toast discreto y el footer
  muestra ocho caracteres de `activeVersion` como referencia de soporte.
- El submit del checkout espera cualquier polling en curso y fuerza después
  una consulta nueva sin caché. Compara las líneas revisadas con nombres, SKU,
  color, precio y disponibilidad del catálogo validado; cualquier diferencia
  bloquea ese intento y exige revisión y una nueva confirmación. Un fallo de
  red, manifest, JSON o SHA-256 bloquea EmailJS sin perder formulario ni
  carrito.
- Esta validación es inmediata pero no transaccional: sin backend puede
  publicarse otra versión entre la comprobación final y el envío.
- `emailService.js` arma el HTML escapado y envía al destinatario (orden
  al titular primero, copia al cliente después).

### 3.4. Cadena de integridad

```text
catalog.json (al boot)
        │
        ▼
src/security/integrityVerifier.js
        │
        ▼
fetch integrity-manifest.json, integrity-manifest.sig, signing-public-key.pem
        │
        ▼
Verificación Ed25519 contra SHA-256 + Base64 canónica
        │
        ▼
data-integrity-status = verified | invalid | unavailable | error
```

- `src/security/integrityVerifier.js` implementa canonicalización, decodifica
  estrictamente la firma, importa la clave con `crypto.subtle`, verifica
  archivo por archivo.
- En `src/main.jsx` se llama una vez al boot; el resultado se refleja en
  `rootElement.dataset.integrityStatus`.

### 3.5. Pipeline de build firmado

```text
scripts/build-signed.mjs
    ├── readPrivateKey         (.signing/ed25519-private.pem + fallback env)
    ├── runNpmBuild             (Vite build en staging del mismo filesystem)
    ├── writePublicKey
    ├── createManifest          (SHA-256 sobre todos los archivos regulares)
    ├── writeManifest
    ├── writeSignature          (Ed25519 sobre canonicalización v1)
    ├── loadAndVerifyPublication
    ├── promoteStaging          (atomic-rename o copy-fallback)
    └── cleanup staging
```

- `scripts/integrity/paths.mjs` centraliza paths (`repoRoot`,
  `publicationRoot`, `manifestPath`, `signaturePath`, `publicKeyPath`,
  `defaultPrivateKeyPath`, `exportedPublicKeyPath`).
- `scripts/integrity/integrityCore.mjs` implementa el contrato de
  canonicalización v1, hashing, firma, verificación y validación de
  manifest.
- `scripts/integrity/publicationConfig.mjs` lee la identidad desde
  `src/config/company.js`.
- `scripts/integrity/publicationFiles.mjs` recorre la publicación y
  construye la lista de archivos protegidos.
- `scripts/integrity/releaseOperations.mjs` orquesta la creación
  transactionaria con rename atómico y fallback por copia.

### 3.6. Pruebas

```text
npm run test-importer
   └─ tests/importer/*.test.mjs          (validación, parsing, baseline)

npm run test-react
   └─ tests/frontend/*.test.mjs          (carrito, checkout, navegación,
                                          selección, presentación, búsqueda,
                                          publishedCatalog, integrityVerifier)

npm run test-integrity
   └─ tests/integrity/*.test.mjs
       + tests/frontend/integrityVerifier.test.mjs

npm run test:build
   └─ tests/build/assetPaths.test.mjs     (estático, previene regresión
                                             de paths de assets)
```

Todas usan `node --test` nativo. No se usa Jest ni Vitest.

### 3.7. Verificación post-build

```text
npm run verify:build
   └─ scripts/verify-build.mjs
       ├── dist/index.html
       ├── dist/catalog.json
       ├── dist/assets/ (>= 300 imágenes de productos)
       ├── dist/assets/Real_Step_logo-* (>= 1 KB)
       ├── dist/assets/2026-padel-coello-heroHeader-* (>= 10 KB)
       └── busca "doesn't exist at build time" en el bundle JS
```

Exit 0 si todo OK, 1 si falla. Wired en `npm run verify:build`.

## 4. Estado actual

Los estados usados aquí son: **implementado**, **transitorio**, **planificado**
y **pendiente**.

### Implementado

- ✔ Refactor estructural: `realstep-head/` eliminado, todo en la raíz.
- ✔ Importador Excel → `generated/catalog.json` (Node, `exceljs`).
- ✔ Manifiesto determinista `generated/catalog-version.json`, generado sin
  timestamps y publicado junto con el catálogo.
- ✔ Detección runtime por versión, polling de 60 segundos y validación SHA-256
  antes de actualizar `activeCatalog`/`activeVersion`.
- ✔ Baseline canónico versionado (`tests/fixtures/catalog-baseline.json`).
- ✔ `npm run compare-catalog` revisa el impacto antes de aprobar.
- ✔ `npm run update-catalog-baseline` aprueba el JSON como baseline.
- ✔ Suite de tests del importador (32 tests).
- ✔ Aplicación React 19 + Vite 8 (`src/`).
- ✔ Catálogo navegable por categoría y hash.
- ✔ Buscador por nombre, código, color, SKU.
- ✔ Galería y lightbox con zoom, paneo, gestos.
- ✔ Ficha técnica desplegable.
- ✔ Variantes y talles con validación de stock.
- ✔ Carrito persistido en `localStorage` (`realstep-head-cart`).
- ✔ Reconciliación local contra el catálogo vigente.
- ✔ Reconciliación remota con `catalog.json` y `cache: 'no-store'`.
- ✔ Checkout con EmailJS (transitorio).
- ✔ Header, Hero, menú de categorías, footer, buscador.
- ✔ Responsive (desktop, tablet, móvil).
- ✔ Contactos del footer (Instagram, WhatsApp) configurables.
- ✔ Suite de tests del frontend (115 tests).
- ✔ Firma Ed25519 sobre manifiesto SHA-256.
- ✔ Canonicalización interna del manifiesto v1.
- ✔ Publicación transactionaria con `atomic-rename` y `copy-fallback`.
- ✔ Clave pública bundleada en `dist/signing-public-key.pem`.
- ✔ Verificador `src/security/integrityVerifier.js` con verificación
  archivo por archivo.
- ✔ Suite de tests de integridad (33 tests).
- ✔ `data-integrity-status` en `<div id="root">` para observabilidad.
- ✔ `_headers` con X-Frame-Options, CSP, X-Content-Type-Options, Referrer.
- ✔ Suite estática de paths de assets (`tests/build/assetPaths.test.mjs`).
- ✔ Script de verificación post-build (`scripts/verify-build.mjs`).
- ✔ `npm install` único (no hay dos `package.json`).

### Transitorio

- ⚠ EmailJS construye y envía el pedido desde el navegador.
- ⚠ `localStorage` puede ser manipulado; la reconciliación protege
  consistencia, no seguridad.
- ⚠ La verificación de integridad en el navegador es no bloqueante.
- ⚠ Stock como disponibilidad binaria, no como inventario transaccional.

### Planificado

- ☐ Backend Node.js autoritativo.
- ☐ PostgreSQL como persistencia.
- ☐ Prisma como ORM.
- ☐ API REST/JSON para pedidos.
- ☐ Persistencia del pedido antes de notificar.
- ☐ Idempotencia y concurrencia controlada.
- ☐ Correo enviado desde el servidor.
- ☐ Autenticación, autorización y roles.
- ☐ Multi-marca / multi-instalación.
- ☐ Panel de administración.

## 5. Arquitectura objetivo

La dirección aprobada, todavía no implementada, es:

```text
React / Vite (frontend)
        │
        ▼
       API
        │
        ▼
backend Node.js autoritativo
        │
        ▼
PostgreSQL
        │
        ├── persistencia del pedido
        ├── persistencia de identidad criptográfica
        ├── historial de pedidos
        └── eventos del cliente
        │
        └── notificación por correo (servidor)
```

### Objetivos

- que el backend sea la autoridad del pedido;
- volver a validar productos, variantes, talles, disponibilidad y
  cantidades;
- recalcular precios y totales en el servidor;
- persistir antes de notificar;
- implementar idempotencia y manejo de concurrencia;
- soportar múltiples marcas e instalaciones con configuración separada;
- usar el correo como notificación, nunca como registro maestro.

### Decisiones aún abiertas

- ORM: Prisma es la dirección propuesta, no confirmada.
- Esquema de base de datos: todavía no diseñado.
- Auth/Roles: estrategia no definida.
- Hosting del backend: no decidido.
- Proveedor de correo transaccional: no decidido.
- Multi-tenant: forma de aislamiento por marca no decidida.

## 6. Principios del proyecto

### Principios comerciales

- El motor no es propietario de marcas, imágenes ni datos de terceros.
- RealStep es licenciatario de esta instalación; la firma no transfiere
  propiedad.
- El pedido queda sujeto a confirmación comercial; el correo no es un
  contrato.
- El sistema debe soportar múltiples empresas e instalaciones.

### Principios arquitectónicos

- **React nunca es autoridad comercial.** El frontend es una fuente no
  confiable.
- **Los IDs son la autoridad.** Nombres, imágenes, precios y totales
  persistidos no son autoridad; se vuelven a resolver desde el catálogo
  activo.
- **Todo pedido deberá validarse server-side.** Ningún precio, total ni
  cantidad del navegador es definitive.
- **El catálogo publicado vigente es la fuente actual del frontend.** El
  importador es la única fuente de datos estructurados.
- **Excel es herramienta de carga, no autoridad final.** El JSON generado
  es la autoridad inmediata.
- **Configuración antes que duplicación del motor.** Multi-marca es
  configuración, no fork.
- **KISS por encima de abstracciones especulativas.** No crear patrones
  para requisitos futuros no aprobados.
- **Bajo acoplamiento, alta cohesión, código defensivo.** Evitar
  sobreingeniería.

### Principios de seguridad

- **Build firmado obligatorio.** La identidad criptográfica no es
  opcional.
- **Integridad obligatoria en cada publicación.** Ningún release sin
  manifiesto firmado y verificado.
- **La clave privada no se comparte ni se versiona.** Custodia externa
  obligatoria.
- **Privacidad por diseño.** No recolectar datos personales sin base
  legal y minimización.
- **No confiar en el navegador.** Validar todo en el servidor (futuro).

### Principios de mantenimiento

- **Cambios pequeños, cohesivos, verificables.** Cada commit resuelve un
  problema, no mezcla destinos.
- **Tests para contratos observables.** No eliminar ni debilitar tests
  sin reemplazarlos.
- **Compatibilidad con datos y carritos existentes.** No normalizar ni
  corregir silenciosamente identificadores legacy.
- **README y PROJECT_CONTEXT son la fuente de verdad.** Actualizados
  junto con el código.

## 7. Flujos importantes

### 7.1. Carga de catálogo

```text
catalog/products.xlsx
        ↓
npm run check-products             (preflight)
        ↓
npm run import-products            (genera generated/catalog.json)
        ↓
npm run check-products             (verifica)
        ↓
npm run compare-catalog            (vs baseline)
        ↓
npm run update-catalog-baseline    (solo aprobación consciente)
```

### 7.2. Carrito

```text
localStorage (realstep-head-cart)
        ↓
sanitizeCart → cartReducer
        ↓
usePersistentCart → CartContext
        ↓
render en CartDrawer, CartItem, CartSummary
        ↓
reconcileCart (líneas inválidas marcadas, no eliminadas)
```

### 7.3. Checkout

```text
CheckoutModal → CheckoutForm → validateEmailConfig
        ↓
buildOrderLines → buildOwnerParams → EmailJS send (owner)
        ↓
delay 1150 ms
        ↓
buildCustomerParams → EmailJS send (customer)
        ↓
clearCart
```

### 7.4. Firma

```text
.signing/ed25519-private.pem (o SIGNING_PRIVATE_KEY_PATH/PEM)
        ↓
npm run react:build:signed
        ├── staging build
        ├── writePublicKey
        ├── createManifest (SHA-256 de cada archivo regular)
        ├── writeSignature (Ed25519 sobre canonicalización v1)
        ├── loadAndVerifyPublication
        ├── promoteStaging (atomic-rename o copy-fallback)
        └── cleanup
```

### 7.5. Integridad en runtime

```text
boot
        ↓
verifyPublishedIntegrity(companyConfig)
        ├── fetch integrity-manifest.json
        ├── fetch integrity-manifest.sig
        ├── fetch signing-public-key.pem
        ├── canonicalize manifest
        ├── verify Ed25519
        ├── fetch cada archivo protegido
        ├── comparar SHA-256
        ├── data-integrity-status = verified | invalid | unavailable | error
        └── no bloquea la interfaz
```

### 7.6. Publicación

```text
tests
        ↓
npm run test:build
        ↓
npm run verify:build
        ↓
npm run react:build:signed
        ↓
npm run integrity:verify
        ↓
publicar dist/
        ↓
verificar data-integrity-status en /?integrity=verified
```

## 8. Estado de seguridad

### Qué protege actualmente el sistema

- **Firma Ed25519 + SHA-256**: cualquier cambio de archivos entre el build
  firmado y la publicación queda detectado.
- **Canonicalización determinista v1**: la firma es reproducible byte a
  byte.
- **Verificación en runtime**: el frontend declara el estado de integridad
  en `data-integrity-status`.
- **Headers de seguridad**: `X-Frame-Options: DENY`, `frame-ancestors
  'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`.
- **Escape de HTML**: React escapa por defecto; `emailService.js` escapa
  el HTML del correo.
- **Sin `dangerouslySetInnerHTML`**: no se encontró uso en `src/`.
- **Sin secretos en el frontend**: EmailJS usa claves públicas por diseño;
  `public/signing-public-key.pem` es por definición pública.
- **Test suite de integridad**: 33 tests cubren hashing, firma,
  verificación, claves y publicación.

### Qué todavía depende del frontend

- **Envío de pedidos por EmailJS**: construir y enviar el correo desde el
  navegador es estructuralmente débil. Es transitorio.
- **Persistencia del carrito en `localStorage`**: editable, borrable,
  sincronizable manualmente. No es autoridad.
- **Reconciliación de carrito**: protege consistencia de UI, no es
  seguridad. `priceSnapshot` puede ser manipulado.
- **Verificador de integridad en navegador**: actualmente no bloquea la
  aplicación. Un estado `invalid` o `error` no impide el uso del catálogo.
- **EmailJS público**: cualquier modificación del frontend puede suplantar
  el envío.

### Qué debe migrarse al backend

- **Persistencia del pedido**: el backend debe ser la única fuente de
  verdad del pedido.
- **Validación y recálculo**: productos, variantes, talles, disponibilidad,
  cantidades, precios y totales se recalculan en el servidor.
- **Idempotencia**: cada solicitud debe procesarse una sola vez, incluso
  con reintentos.
- **Concurrencia**: el servidor debe coordinar múltiples requests
  simultáneos del mismo cliente.
- **Notificación por correo**: el envío se hace después de persistir.
- **Autenticación y autorización**: roles, sesiones, revocación.
- **Retención y eliminación**: política explícita de datos personales.
- **Rate limiting**: control de cadencia por IP, cliente, etc.
- **Logs y auditoría**: registro persistente de operaciones críticas.

## 9. Pendientes

### 9.1. Críticos

- ☐ Diseñar el pedido oficial y sus estados (`pending`, `confirmed`,
  `rejected`, `cancelled`, `fulfilled`).
- ☐ Diseñar el contrato de idempotencia para el endpoint de pedido.
- ☐ Definir el formato de notificación por correo **desde el servidor**.
- ☐ Seleccionar el proveedor de correo transaccional.
- ☐ Definir la política de privacidad, consentimiento, retención y
  eliminación.
- ☐ Endurecer la verificación de integridad en el runtime: bloquear
  acciones críticas cuando el estado es `invalid` o `error`.

### 9.2. Importantes

- ☐ Diseñar el modelo de datos del pedido (líneas, totales, snapshots,
  cliente).
- ☐ Diseñar el endpoint público de catálogo (`GET /catalog.json`) con
  versionado.
- ☐ Crear el backend mínimo Node.js para servir el catálogo versionado.
- ☐ Diseñar el esquema de PostgreSQL.
- ☐ Decidir ORM (Prisma es la dirección propuesta, no confirmada).
- ☐ Política de stock: disponibilidad binaria, cantidades reservables,
  actualización.
- ☐ Definir precio vigente, listas, impuestos y cambios durante el
  checkout.
- ☐ Datos obligatorios del cliente, empresa, facturación y entrega.
- ☐ Hosting definitivo del frontend y del backend.
- ☐ Agregar CI (`.github/workflows/`) que corra las suites y `verify:build`.
- ☐ Agregar `pre-push` hook que rechace push sin build firmado.

### 9.3. Futuros

- ☐ Optimización y medición de rendimiento a escala.
- ☐ Panel administrativo y roles.
- ☐ Multi-marca / multi-instalación con configuración separada.
- ☐ Protección de dominio y marcas invisibles de instalación.
- ☐ Evolución de licencia por instalación.
- ☐ Pruebas E2E y de accesibilidad.
- ☐ Observabilidad, alertas y recuperación operativa.
- ☐ Migración de `assets/products/` a `public/products/` para bundle
  automático (evaluar impacto).
- ☐ AI-friendly aliases en Vite (`@/components/...`) para reducir
  fragilidad de paths relativos.

## 10. Reglas para agentes de IA

Antes de modificar:

1. Leer `PROJECT_CONTEXT.md`.
2. Leer `README.md`.
3. Revisar `git status` y preservar cambios ajenos.
4. Inspeccionar el código y las pruebas relevantes.
5. No asumir funcionalidades ni estados sin evidencia.
6. No instalar dependencias sin justificarlo y obtener autorización.
7. No modificar Excel, JSON generado ni baseline salvo que la tarea lo
   requiera.
8. No tocar firma, licencia o configuración legal sin autorización.
9. No leer, mostrar ni copiar claves privadas, secretos o archivos
   `.env`.
10. No hacer commit, push o deploy salvo orden expresa.
11. Conservar compatibilidad con datos y carritos existentes.
12. Ejecutar las pruebas pertinentes.
13. Ejecutar `git diff --check`.
14. Informar archivos creados y modificados.
15. Declarar limitaciones, riesgos y verificaciones no ejecutadas.
16. Sugerir mensajes de commit en español.

### Reglas específicas para scripts

- **Nunca modificar scripts de `scripts/integrity/` sin entender el
  contrato de canonicalización v1.** Cambios futuros requieren nueva
  versión del formato o compatibilidad explícita.
- **Nunca regenerar claves sin decisión explícita.** `npm run
  generate-signing-keys -- --force` reemplaza la identidad criptográfica
  y puede invalidar publicaciones existentes.
- **Nunca modificar `scripts/verify-build.mjs` o `tests/build/assetPaths.test.mjs`
  sin actualizar este documento.** Son las barreras contra la regresión
  de assets bundleados.

### Reglas específicas para tests

- **Nunca eliminar tests.** Si un test es obsoleto, marcarlo como
  `skip` con razón explícita, no borrarlo.
- **Nunca debilitar aserciones.** Si una prueba es flaky, arreglarla;
  nunca relajar umbrales.
- **Cubrir nuevos contratos.** Toda función exportada debería tener al
  menos un test que falle cuando la implementación se rompe.

### Reglas específicas para multi-marca

- **Mantener compatibilidad con múltiples marcas.** Toda rama de
  configuración (`projectId`, `licenseId`, `softwareId`, `owner`,
  `developer`, `licensedTo`) debe ser cargada desde `src/config/company.js`
  y nunca hardcoded en el código.
- **No hardcodear valores de marca** en componentes, mensajes, headings
  o assets. Usar siempre `companyConfig`.

### Reglas de documentación

- **Mantener `README.md` y `PROJECT_CONTEXT.md` actualizados.** Cualquier
  cambio de scripts, paths, configuración o estado debe reflejarse en
  estos archivos.
- **Documentar decisiones importantes.** Si una acción toca un
  invariante, registrarla.
- **No documentar cosas que no existen.** Una sección del roadmap no es
  documentación de una funcionalidad.
