# Contexto técnico del proyecto

Documento de incorporación, continuidad y toma de decisiones para el catálogo mayorista RealStep / HEAD.

## Índice

1. [Advertencia para desarrolladores y agentes de IA](#1-advertencia-para-desarrolladores-y-agentes-de-ia)
2. [Visión del proyecto](#2-visión-del-proyecto)
3. [Objetivos de calidad](#3-objetivos-de-calidad)
4. [Arquitectura actual](#4-arquitectura-actual)
5. [Arquitectura objetivo aprobada](#5-arquitectura-objetivo-aprobada)
6. [Estado funcional actual](#6-estado-funcional-actual)
7. [Reconciliación del carrito](#7-reconciliación-del-carrito)
8. [Firma e integridad](#8-firma-e-integridad)
9. [Estructura del repositorio](#9-estructura-del-repositorio)
10. [Configuración central](#10-configuración-central)
11. [Datos del catálogo](#11-datos-del-catálogo)
12. [Scripts disponibles](#12-scripts-disponibles)
13. [Flujos de trabajo frecuentes](#13-flujos-de-trabajo-frecuentes)
14. [Pruebas y criterios de finalización](#14-pruebas-y-criterios-de-finalización)
15. [Seguridad y privacidad](#15-seguridad-y-privacidad)
16. [Principios arquitectónicos vigentes](#16-principios-arquitectónicos-vigentes)
17. [Roadmap](#17-roadmap)
18. [Reglas para agentes de IA](#18-reglas-para-agentes-de-ia)
19. [Decisiones pendientes](#19-decisiones-pendientes)

## 1. Advertencia para desarrolladores y agentes de IA

> **Leer este archivo antes de modificar el proyecto.** El objetivo es conservar las decisiones arquitectónicas existentes y evitar cambios innecesarios. No modificar, leer, copiar ni mostrar claves privadas, secretos o archivos `.env`. No hacer commit, push ni despliegue salvo instrucción expresa. Toda tarea debe terminar informando archivos creados o modificados, pruebas ejecutadas y limitaciones o riesgos. Los mensajes de commit del proyecto se escriben en español.

Antes de actuar, comprobar el código, la configuración y las pruebas reales. Una idea incluida en el roadmap no es una funcionalidad implementada.

## 2. Visión del proyecto

El proyecto busca convertirse en un motor reutilizable para catálogos mayoristas interactivos. La instalación actual corresponde a **RealStep** y exhibe productos **HEAD**. Según `react-app/src/config/company.js` y la configuración de integridad, el motor y la autoría del software se atribuyen a Santiago Lareu; RealStep es el licenciatario de esta instalación.

La configuración de software y licencia no demuestra ni reclama derechos sobre marcas, imágenes, descripciones u otros contenidos de terceros. Esos derechos deben tratarse por separado.

El objetivo es poder adaptar el motor a otras marcas o instalaciones mediante configuración y datos, sin duplicarlo innecesariamente. En su estado actual:

- no es un ecommerce con pago en línea;
- permite explorar el catálogo, preparar un carrito y enviar una solicitud de pedido;
- el pedido queda sujeto a confirmación comercial;
- el envío actual se realiza desde el navegador mediante EmailJS y es transitorio.

## 3. Objetivos de calidad

Las decisiones deben priorizar, en este orden orientativo:

1. seguridad;
2. integridad de datos;
3. fiabilidad;
4. mantenibilidad;
5. reutilización;
6. rendimiento;
7. accesibilidad;
8. simplicidad;
9. portabilidad;
10. testabilidad.

No se deben introducir patrones, capas o abstracciones por sí mismos. Una abstracción se justifica cuando resuelve un problema real y verificable sin perjudicar claridad, cohesión ni operabilidad.

## 4. Arquitectura actual

El flujo implementado es:

```text
catalog/products.xlsx
        │
        ▼
scripts/catalog-import + scripts/import-products.mjs
        │
        ▼
generated/catalog.json
        │
        ▼
React 19 + Vite (react-app)
        │
        ├── catálogo, selección y galería
        └── carrito persistido en localStorage
                    │
                    ▼
                 checkout
                    │
                    ▼
             EmailJS desde el navegador
```

El importador transforma el Excel en el JSON consumido por React. El carrito persiste localmente y se reconcilia con el catálogo vigente. El checkout construye en el navegador el contenido del pedido y `react-app/src/services/emailService.js` lo envía mediante EmailJS.

EmailJS es una solución **transitoria**. El navegador todavía participa en la construcción, validación y envío del pedido; por lo tanto, no es una autoridad confiable ni un registro duradero.

## 5. Arquitectura objetivo aprobada

La dirección futura aprobada, todavía no implementada, es:

```text
React / Vite
     │
     ▼
backend Node.js autoritativo
     │
     ▼
PostgreSQL
     │
     ├── persistencia del pedido
     └── notificaciones enviadas desde el servidor
```

Sus objetivos son:

- hacer del backend la autoridad del pedido;
- volver a validar productos, variantes, talles, disponibilidad y cantidades;
- recalcular precios y totales en el servidor;
- persistir antes de notificar;
- implementar idempotencia y manejo de concurrencia;
- soportar múltiples marcas e instalaciones con configuración separada;
- usar el correo como notificación, nunca como registro maestro.

**Estado:** backend, API, PostgreSQL y Prisma no están implementados en este repositorio. Node.js y PostgreSQL son la dirección propuesta; la adopción concreta de Prisma y el diseño de persistencia continúan pendientes.

## 6. Estado funcional actual

Los estados usados aquí son: **implementado**, **parcialmente implementado**, **transitorio**, **planificado** y **pendiente de diseño**.

| Subsistema | Estado | Archivos principales | Pruebas | Limitaciones relevantes |
|---|---|---|---|---|
| Importación desde Excel | Implementado | `catalog/products.xlsx`, `scripts/import-products.mjs`, `scripts/catalog-import/` | `tests/importer/` | El Excel debe respetar el esquema; hay códigos/SKU pendientes y advertencias de datos. |
| Catálogo React | Implementado | `react-app/src/App.jsx`, `react-app/src/components/catalog/`, `react-app/src/components/product/` | `react-app/tests/productSelection.test.mjs`, `navigation.test.mjs` | Consume un JSON estático; no consulta stock autoritativo en tiempo real. |
| Categorías y navegación | Implementado | `react-app/src/components/catalog/`, `react-app/src/components/layout/` | `navigation.test.mjs` | La cobertura automatizada no sustituye pruebas manuales en dispositivos reales. |
| Búsqueda de productos | Implementado | `react-app/src/data/productSearch.js`, `react-app/src/components/search/ProductSearch.jsx` | `react-app/tests/search.test.mjs` | Indexa datos estructurados del catálogo vigente; los códigos presentes solo dentro de nombres de imágenes no se consideran SKU. |
| Productos, variantes, talles y precios | Implementado | `react-app/src/components/product/`, `react-app/src/hooks/productSelectionReducer.js`, `react-app/src/hooks/useProductSelection.js` | `productSelection.test.mjs` | Disponibilidad y precio dependen del catálogo publicado. |
| Galería y lightbox | Implementado | `react-app/src/components/product/ProductGallery.jsx`, `react-app/src/components/lightbox/Lightbox.jsx` | Cobertura indirecta en pruebas React | No hay suite visual o E2E específica. |
| Ficha técnica desplegable | Implementado | `react-app/src/components/product/ProductCard.jsx`, `Specifications.jsx`, `react-app/src/styles/product.css` | `react-app/tests/presentation.test.mjs` | Cerrada por defecto; al abrir ocupa el ancho de galería y panel y desactiva el sticky comercial. En móvil conserva el orden lógico. |
| Carrito | Implementado | `react-app/src/context/CartContext.jsx`, `react-app/src/reducers/cartReducer.js`, `react-app/src/components/cart/` | `react-app/tests/cart.test.mjs` | No existe validación server-side. |
| Persistencia local | Transitorio | `react-app/src/hooks/usePersistentCart.js`, `react-app/src/services/cartStorage.js` | `cart.test.mjs` | `localStorage` es editable, borrable y no sirve como autoridad. |
| Checkout | Implementado parcialmente / transitorio | `react-app/src/components/checkout/`, `react-app/src/services/emailService.js` | `checkout.test.mjs` | Valida en frontend; no persiste pedidos ni garantiza idempotencia duradera. |
| Envío de pedidos | Transitorio | `react-app/src/services/emailService.js` | `checkout.test.mjs` | EmailJS opera desde el navegador; el correo no es una base de datos. |
| Navegación responsive | Implementado | componentes de layout y estilos en `react-app/src/styles/` | `navigation.test.mjs` | Sin pruebas E2E, visuales ni de accesibilidad automatizadas. |
| Reconciliación de carrito | Implementado como protección transitoria | `react-app/src/services/cartReconciliation.js`, `CartContext.jsx`, componentes de carrito/checkout | `cart.test.mjs`, `checkout.test.mjs` | Consistencia frontend, no seguridad; depende del JSON vigente. |
| Firma e integridad | Implementado | `scripts/integrity/`, `react-app/src/security/integrityVerifier.js`, `react-app/src/main.jsx` | `tests/integrity/`, `react-app/tests/integrityVerifier.test.mjs` | La verificación en navegador es no bloqueante; el alojamiento final debe conservar archivos y headers. |
| Backend, base de datos y autenticación | Planificado / pendiente de diseño | No existen módulos en el repositorio | No existen | No evaluables como implementación actual. |

## 7. Reconciliación del carrito

La reconciliación es una protección transitoria implementada en `react-app/src/services/cartReconciliation.js` e integrada en el contexto y las vistas del carrito.

Las líneas persistidas conservan identificadores (`productId`, `variantId`), talle, cantidad y `priceSnapshot`. Los nombres, imágenes, precios vigentes y totales se vuelven a resolver desde `generated/catalog.json`; los textos y totales persistidos no se consideran autoridad.

Estados de reconciliación:

- `available`: la línea coincide con el catálogo vigente;
- `product_removed`: el producto ya no existe;
- `variant_removed`: la variante ya no existe dentro del producto;
- `size_unavailable`: el talle no está disponible;
- `unavailable`: la combinación no tiene disponibilidad vigente;
- `price_changed`: el precio vigente difiere del snapshot y requiere revisión.

Las líneas inválidas no se eliminan silenciosamente: se conservan, se marcan y el usuario puede quitarlas. Un cambio de precio actualiza el precio mostrado, requiere reconocimiento y los totales se recalculan con el catálogo vigente. El checkout queda bloqueado mientras existan líneas inválidas o cambios sin revisar.

La reconciliación se ejecuta al hidratar el carrito, al abrirlo, al abrir el checkout y justo antes del envío. La operación repetida debe ser determinista y tolera estructuras antiguas o corruptas sin romper la aplicación.

> Esta medida protege la consistencia de la interfaz, pero no equivale a validación de seguridad. `localStorage` y todo dato del navegador pueden ser modificados por el usuario. El backend futuro deberá volver a validar y recalcular todo.

## 8. Firma e integridad

La implementación se encuentra en `scripts/integrity/`, la explicación operativa en [`docs/integrity-signing.md`](docs/integrity-signing.md) y la verificación cliente en `react-app/src/security/integrityVerifier.js`.

Características verificadas:

- firma Ed25519;
- hashes SHA-256 de los archivos publicados;
- manifiesto `integrity-manifest.json` y firma `integrity-manifest.sig`;
- clave pública publicada para verificación;
- identificadores: `softwareId` `santiago-lareu-catalog-engine`, `projectId` `realstep-head-catalog` y `licenseId` `SLCE-LIC-2026-0001`;
- titular y desarrollador configurados: Santiago Lareu;
- licenciatario configurado: RealStep;
- build firmado mediante `npm run react:build:signed`;
- verificación mediante `npm run integrity:verify`;
- publicación transaccional preferida con `atomic-rename`;
- fallback de copia con backup y restauración en plataformas donde el renombrado atómico no está disponible; este fallback se informa como `copy-fallback` y no ofrece la misma atomicidad estricta;
- estados de integridad expuestos por React en `data-integrity-status`: `verified`, `invalid`, `unavailable` y `error`; actualmente la comprobación es silenciosa y no bloqueante.

La clave privada predeterminada está en `.signing/ed25519-private.pem`, ruta ignorada por Git. **Nunca debe entrar al repositorio ni copiarse a prompts, logs o documentación.** Una computadora nueva no la obtiene con `git clone`: para firmar se debe transferir manualmente desde un respaldo seguro, mediante un canal controlado.

No regenerar ni rotar la clave sin una decisión explícita. `npm run generate-signing-keys` exige confirmación y no se debe usar `--force` de forma casual, porque puede reemplazar la identidad criptográfica existente.

El build oficial destinado a publicación debe ser el firmado. `npm run react:build` sirve para desarrollo o comprobación local, pero no agrega manifiesto ni firma.

## 9. Estructura del repositorio

| Ruta | Finalidad |
|---|---|
| `catalog/` | Excel fuente, guía del esquema y recursos de trabajo del catálogo. |
| `generated/` | `catalog.json` generado y baseline canónico aprobado. |
| `assets/` | Imágenes y recursos originales referenciados por el importador. |
| `scripts/` | Puntos de entrada para importar, comparar y verificar el proyecto. |
| `scripts/catalog-import/` | Lectura, validación, normalización y construcción del catálogo. |
| `scripts/integrity/` | Generación de claves, manifiesto, firma, verificación y publicación transaccional. |
| `react-app/` | Aplicación React/Vite y su lockfile independiente. |
| `react-app/src/` | Componentes, contexto, reducer, hooks, servicios, configuración y estilos. |
| `react-app/public/` | Catálogo y assets expuestos, clave pública, `_headers` y archivos de integridad del árbol fuente. |
| `react-app/tests/` | Pruebas de carrito, checkout, navegación, selección e integridad del frontend. |
| `tests/` | Pruebas del importador y del sistema de integridad. |
| `docs/` | Documentación técnica específica. |
| `.signing/` | Ubicación local ignorada de la clave privada; no se distribuye por Git. |

`react-app/dist/` es un artefacto generado e ignorado. Es la única carpeta que debe publicarse como sitio estático.

## 10. Configuración central

`react-app/src/config/company.js` exporta `companyConfig`. Sus grupos reales son:

| Grupo/campo | Tipo | Uso actual |
|---|---|---|
| `companyName` | Comercial / instalación | Nombre RealStep mostrado por la aplicación. |
| `catalogName` | Comercial / instalación | Nombre HEAD Mayorista mostrado por la aplicación. |
| `orderEmail` | Comercial / operativo | Destinatario de solicitudes usado por EmailJS. No es un secreto. |
| `storageKey` | Técnico / instalación | Nombre declarado para persistencia. Actualmente `cartStorage.js` replica el mismo valor; todavía no es una única fuente central efectiva. |
| `software` | Técnico | `softwareId` y nombre del motor. |
| `ownership` | Legal / técnico | Titular, desarrollador, `projectId`, año y aviso de derechos del software. |
| `license` | Legal / instalación | `licenseId` y licenciatario. |
| `contact` | Comercial / instalación | URL pública de Instagram, número internacional de WhatsApp y mensaje inicial. Los enlaces se ocultan cuando falta su dato obligatorio. |

Modificar valores legales, de autoría, licencia o identidad de instalación requiere autorización explícita. Para múltiples marcas, se debe evolucionar hacia configuración separada sin duplicar el motor.

Los contactos públicos se completan en `companyConfig.contact`. `instagramUrl` debe ser una URL HTTPS completa de Instagram. `whatsappNumber` debe contener solo dígitos en formato internacional; para Argentina, sin `+`, espacios ni guiones. `whatsappMessage` puede adaptarse por instalación. Con valores vacíos no se renderizan enlaces ni botones sin destino.

## 11. Datos del catálogo

`catalog/products.xlsx` es la fuente editable. `generated/catalog.json` es un artefacto generado: no se edita manualmente. `tests/fixtures/catalog-baseline.json` es el baseline canónico aprobado usado para revisar cambios.

Operaciones distintas:

- **check** (`check-products`): valida y reconstruye en memoria sin escribir; además compara el resultado con el JSON actual. Después de editar el Excel puede informar, correctamente, que el JSON está desactualizado.
- **import** (`import-products`): valida y escribe `generated/catalog.json` cuando no hay errores.
- **compare** (`compare-catalog`): compara el JSON generado con el baseline aprobado y muestra el impacto.
- **aprobación** (`update-catalog-baseline`): actualiza el baseline; modifica un artefacto canónico y solo debe ejecutarse tras revisión consciente.

Los errores impiden importar. Las advertencias señalan datos incompletos o sospechosos que requieren revisión, pero no siempre bloquean. El esquema contempla categorías, productos, variantes, imágenes, stock y características. La configuración actual trata el stock como disponibilidad, no como inventario transaccional exacto. Los talles y la disponibilidad surgen de las filas de stock. Las imágenes se validan contra rutas existentes y las características se agrupan por producto.

Persisten códigos/SKU con valores pendientes; no se debe afirmar que todos los productos tienen códigos comerciales definitivos.

### Flujo exacto para cambiar productos o stock

1. Editar `catalog/products.xlsx`.
2. Ejecutar `npm run check-products` como preflight sin escritura; si el Excel cambió, la comparación con el JSON puede fallar por desactualización.
3. Corregir todos los errores de esquema o datos.
4. Ejecutar `npm run import-products` para regenerar `generated/catalog.json`.
5. Volver a ejecutar `npm run check-products`; ahora debe aprobar.
6. Ejecutar `npm run compare-catalog` y revisar cada diferencia.
7. Solo si el cambio queda aprobado, ejecutar `npm run update-catalog-baseline`.
8. Ejecutar las pruebas y el flujo firmado descrito más abajo.

Al redactar este documento, el árbol de trabajo contiene cambios previos en `catalog/products.xlsx` y `npm run check-products` informa dos diferencias de stock frente al JSON vigente. Esta documentación no modifica ni aprueba esos cambios.

## 12. Scripts disponibles

Todos los comandos de esta tabla existen en el `package.json` raíz.

| Comando | Propósito | ¿Modifica archivos? | Cuándo usarlo |
|---|---|---:|---|
| `npm run import-products` | Importa `catalog/products.xlsx` a `generated/catalog.json`. | Sí | Después de validar una edición del Excel. |
| `npm run check-products` | Valida el Excel y lo compara con el JSON sin escribir. | No | Antes y después de importar. |
| `npm run compare-catalog` | Compara catálogo generado y baseline. | No | Antes de aprobar cambios de datos. |
| `npm run update-catalog-baseline` | Aprueba el JSON actual como nuevo baseline. | Sí | Solo después de revisar el diff; cambia la referencia canónica. |
| `npm run test-importer` | Ejecuta las pruebas del importador y baseline. | No, salvo temporales administrados por las pruebas | Ante cambios de catálogo/importador y en validación general. |
| `npm run test-react` | Ejecuta todas las pruebas Node del frontend. | No | Ante cambios en React, carrito, checkout o servicios. |
| `npm run test-integrity` | Ejecuta las pruebas del sistema de integridad. | No, salvo temporales administrados por las pruebas | Ante cambios de firma, build, publicación o integridad. |
| `npm run react:test` | Alias de `test-react`. | No | Compatibilidad; preferir `test-react` en documentación y CI. |
| `npm run react:dev` | Inicia Vite en desarrollo. | No | Desarrollo local. |
| `npm run react:build` | Genera un build Vite normal en `react-app/dist`. | Sí | Comprobación local; no es el build oficial firmado. |
| `npm run react:build:signed` | Construye, manifiesta, firma, verifica y publica `react-app/dist`. | Sí | Build oficial de publicación; requiere clave privada. |
| `npm run generate-signing-keys` | Invoca la generación de claves Ed25519. | Sí, con confirmación | Solo al crear o rotar deliberadamente la identidad; no usar `--force` casualmente. |
| `npm run integrity:manifest` | Genera el manifiesto de hashes de un directorio. | Sí | Operación técnica del flujo de integridad. |
| `npm run integrity:sign` | Firma un manifiesto con la clave privada. | Sí | Operación técnica; no exponer la clave. |
| `npm run integrity:verify` | Verifica manifiesto, firma y hashes del build. | No | Después del build firmado y antes de publicar. |
| `npm run react:preview` | Sirve localmente el build de Vite. | No | Revisión manual del contenido de `react-app/dist`. |

El `package.json` de `react-app` también expone `dev`, `build`, `preview` y `test`. Pueden ejecutarse como `npm --prefix react-app run <script>`, aunque los aliases raíz son la interfaz operativa recomendada.

## 13. Flujos de trabajo frecuentes

### Actualizar productos o stock

```text
editar Excel
  → npm run check-products
  → npm run import-products
  → npm run check-products
  → npm run compare-catalog
  → revisar diferencias
  → npm run update-catalog-baseline
  → npm run test-importer
  → npm run test-react
  → npm run react:build:signed
  → npm run integrity:verify
  → publicar react-app/dist
```

No actualizar el baseline si las diferencias no fueron entendidas y aprobadas.

### Trabajar desde dos computadoras

Antes de empezar:

```bash
git status
git pull --ff-only
```

Al terminar una tarea autorizada:

```bash
npm run test-importer
npm run test-react
npm run test-integrity
git diff --check
git status
git add <archivos-revisados>
git commit -m "Documentar el cambio realizado"
git push
```

Elegir las suites pertinentes; ejecutar todas ante cambios transversales. No trabajar sobre cambios no sincronizados en ambas computadoras. Commit, push y despliegue requieren autorización expresa cuando trabaja un agente de IA.

### Configurar una computadora nueva

El repositorio contiene dos lockfiles, por lo que se instalan ambas capas:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_REPOSITORIO>/realstep-head
node --version
npm --version
npm ci
npm --prefix react-app ci
npm run test-importer
npm run test-react
npm run test-integrity
npm run react:build
```

No hay una versión de Node fijada mediante `engines` en los `package.json`; confirmar una versión compatible con las dependencias y mantenerla consistente entre equipos.

Ejemplos de cambio de carpeta:

```powershell
# Windows PowerShell
Set-Location C:\ruta\al\repositorio\realstep-head
```

```bash
# Linux, incluido CachyOS
cd /ruta/al/repositorio/realstep-head
```

Git no entrega `.signing/ed25519-private.pem`. Un build normal permite comprobar la instalación. Para firmar, restaurar la clave desde un respaldo seguro por un canal manual y controlado; nunca pegarla en un chat ni registrarla en scripts o documentación.

### Publicar en Netlify

1. Ejecutar las pruebas pertinentes.
2. Ejecutar `npm run react:build:signed` en un entorno confiable con acceso seguro a la clave.
3. Ejecutar `npm run integrity:verify`.
4. Revisar `react-app/dist` con `npm run react:preview` si corresponde.
5. Publicar **solo** `react-app/dist`.

Nunca publicar la raíz del repositorio. Si Netlify reconstruye en sus servidores, el comando oficial debe ser el build firmado y la clave debe suministrarse por un mecanismo secreto seguro, nunca por Git. Si la clave no se entrega a Netlify, desplegar el `dist` firmado previamente sin volver a construirlo allí. `react-app/public/_headers` se copia al build y define headers básicos; verificar su aplicación en el dominio productivo.

## 14. Pruebas y criterios de finalización

Suites existentes:

| Suite | Comando | Objetivo |
|---|---|---|
| Importador y baseline | `npm run test-importer` | Validación, parsing, normalización, generación y comparación del catálogo. |
| React | `npm run test-react` | Carrito y reconciliación, checkout, navegación, selección de producto y verificador de integridad. |
| Integridad | `npm run test-integrity` | Manifiesto, firma, hashes, build firmado y estrategias de publicación. |

No existen suites E2E, visuales, de accesibilidad ni de rendimiento dedicadas. Las pruebas unitarias y de integración existentes no sustituyen una revisión manual del flujo completo.

Toda modificación debe ejecutar las pruebas pertinentes y todas deben aprobar. Además:

- cambios de integridad o publicación: `npm run test-integrity`, `npm run react:build:signed`, `npm run integrity:verify` y `git diff --check`;
- cambios de catálogo: `check-products`, `import-products` y `compare-catalog` según corresponda, `npm run test-importer` y `npm run test-react`;
- cambios de frontend: `npm run test-react`, build apropiado y revisión manual si afecta interfaz.

El informe final debe indicar exactamente qué se ejecutó y qué no se pudo ejecutar.

## 15. Seguridad y privacidad

### Fortalezas actuales verificadas

- React escapa texto renderizado y no se encontró uso de `dangerouslySetInnerHTML` ni escritura directa de `innerHTML` en `react-app/src`.
- `emailService.js` escapa los valores incorporados al HTML del correo.
- Ed25519, SHA-256, manifiesto y pruebas protegen la integridad del artefacto publicado.
- La ruta de clave privada está ignorada por Git.
- `_headers` define `X-Frame-Options`, `frame-ancestors`, `X-Content-Type-Options` y política de referrer básicas.
- Existen pruebas de integridad tanto en scripts como en el frontend.

### Limitaciones actuales

- EmailJS envía desde el frontend y es transitorio.
- No hay backend autoritativo, API ni persistencia de pedidos en base de datos.
- `localStorage` es modificable por el usuario y no debe contener secretos ni ser autoridad.
- No hay idempotencia duradera ni control propio de rate limiting.
- Privacidad, consentimiento, retención, eliminación, backups y proveedores deben definirse antes de procesar datos personales reales.
- La aplicación solicita datos de contacto y entrega en checkout, pero su tratamiento definitivo todavía depende de EmailJS y del correo receptor.
- La presencia de `_headers` en el build no garantiza que el hosting los aplique; se debe verificar en producción.
- Backend, autenticación, autorización, roles y seguridad de base de datos no son evaluables porque no están implementados.
- La verificación de integridad en navegador es actualmente informativa y no bloquea la interfaz.

> **Nunca confiar en datos provenientes del navegador. El servidor futuro deberá validar y recalcular todo.**

No incluir datos personales en URLs, logs del navegador ni `localStorage` salvo una decisión explícita y minimizada. No considerar al sistema invulnerable por usar firma o escaping.

## 16. Principios arquitectónicos vigentes

### Vigentes e implementados o aplicados en el frontend

- El frontend es una fuente no confiable.
- Los IDs son referencias; nombres, imágenes, precios y totales persistidos no son autoridad.
- El catálogo publicado vigente es la fuente actual del frontend.
- KISS, bajo acoplamiento, alta cohesión y código defensivo deben prevalecer.
- Configuración antes que duplicación del motor.
- Evitar sobreingeniería y abstracciones sin beneficio demostrable.

### Dirección futura, todavía no implementada

- El backend será la fuente de verdad del pedido.
- Persistir antes de notificar; el correo no es base de datos.
- Guardar snapshots históricos en las líneas del pedido persistido.
- Implementar idempotencia y control de concurrencia.
- Preferir un monolito modular antes que microservicios.
- PostgreSQL es la dirección propuesta de persistencia.
- Separar datos y configuración por marca o instalación.

Estas pautas futuras no autorizan por sí solas una tecnología o un esquema: el diseño detallado continúa pendiente.

## 17. Roadmap

### Completado

- importador Excel/JSON y baseline;
- catálogo React/Vite con categorías, productos, variantes, talles, precios, galería y lightbox;
- selección, carrito, checkout y envío actual;
- navegación adaptable;
- firma Ed25519, manifiestos SHA-256 y verificación;
- suites del importador, frontend e integridad.

### Transitorio

- EmailJS desde el navegador;
- reconciliación frontend del carrito;
- carrito persistido en `localStorage`;
- catálogo estático como fuente vigente de disponibilidad.

### Próximo

- diseñar el pedido oficial y sus estados;
- backend mínimo Node.js;
- PostgreSQL y diseño de persistencia;
- validación y recálculo autoritativos;
- idempotencia y manejo de concurrencia;
- correo enviado desde backend después de persistir.

### Posterior

- optimización y medición de rendimiento a escala;
- política integral de privacidad y retención;
- panel administrativo y roles;
- multi-marca / multi-instalación;
- protección de dominio y marcas invisibles de instalación;
- evolución de licencia por instalación;
- pruebas E2E y de accesibilidad;
- observabilidad, alertas y recuperación operativa.

El roadmap expresa intención; no representa compromisos ya implementados.

## 18. Reglas para agentes de IA

Antes de modificar:

1. leer `PROJECT_CONTEXT.md`;
2. leer `README.md`;
3. revisar `git status` y preservar cambios ajenos;
4. inspeccionar el código y las pruebas relevantes;
5. no asumir funcionalidades ni estados sin evidencia;
6. no instalar dependencias sin justificarlo y obtener autorización;
7. no modificar Excel, JSON generado ni baseline salvo que la tarea lo requiera;
8. no tocar firma, licencia o configuración legal sin autorización;
9. no leer, mostrar ni copiar claves privadas, secretos o archivos `.env`;
10. no hacer commit, push o deploy salvo orden expresa;
11. conservar compatibilidad con datos y carritos existentes;
12. ejecutar las pruebas pertinentes;
13. ejecutar `git diff --check`;
14. informar archivos creados y modificados;
15. declarar limitaciones, riesgos y verificaciones no ejecutadas;
16. sugerir mensajes de commit en español.

## 19. Decisiones pendientes

- Política exacta de stock: disponibilidad binaria, cantidades reservables y actualización.
- Definición de precio vigente, listas, impuestos y cambios durante el checkout.
- Texto y efecto contractual de “pedido sujeto a confirmación”.
- Datos obligatorios del cliente, empresa, facturación y entrega.
- Política de privacidad, consentimiento, retención y eliminación.
- Proveedor y despliegue del backend.
- Hosting definitivo del frontend y del backend.
- Proveedor y estrategia de correo transaccional.
- Modelo multi-marca o multi-tenant y aislamiento de datos.
- Roles, autenticación, autorización y administración.
- Comportamiento productivo ante integridad inválida o no verificable.
- Alcance y valor de la verificación en navegador frente a controles de despliegue.
- ORM y esquema final; Prisma no está implementado ni confirmado como decisión cerrada.
