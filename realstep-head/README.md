# Catálogo mayorista RealStep / HEAD

Aplicación React/Vite para explorar un catálogo mayorista, seleccionar variantes y talles, preparar un carrito y enviar una solicitud de pedido. El catálogo se genera desde Excel y el build oficial puede firmarse con Ed25519 y verificarse mediante hashes SHA-256.

> **Antes de realizar cambios estructurales, leer [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).** Allí se documentan la arquitectura, las decisiones vigentes, el estado real, las restricciones y el roadmap.

## Estado actual

Están implementados el importador Excel/JSON, el catálogo interactivo, galería y lightbox, carrito persistido, reconciliación contra el catálogo vigente, checkout, envío por EmailJS y firma/integridad del build.

Son soluciones **transitorias** el carrito en `localStorage`, su reconciliación frontend y EmailJS desde el navegador. No existen todavía backend autoritativo, API, PostgreSQL, Prisma ni persistencia duradera de pedidos. No es un ecommerce con pago online; las solicitudes quedan sujetas a confirmación comercial.

## Requisitos previos

- Git.
- Node.js y npm compatibles con las dependencias actuales.
- Acceso al repositorio.
- Clave privada Ed25519 solo si se debe generar un build oficial firmado.

El proyecto no declara actualmente una versión de Node mediante `engines`. Verificar las versiones instaladas:

```bash
node --version
npm --version
```

## Instalación

Desde la raíz `realstep-head`:

```bash
npm ci
npm --prefix react-app ci
```

Hay un lockfile en la raíz para el importador y otro en `react-app` para el frontend; ambos deben instalarse.

## Desarrollo

```bash
npm run react:dev
```

Vite mostrará la URL local. Para un build normal de comprobación:

```bash
npm run react:build
npm run react:preview
```

El build normal no agrega firma. El build destinado a publicación debe ser el firmado.

## Estructura resumida

```text
catalog/                 Excel fuente y documentación del esquema
generated/               JSON generado y baseline aprobado
assets/                  imágenes fuente del catálogo
scripts/catalog-import/  importador y validadores
scripts/integrity/       firma, manifiesto, verificación y publicación
react-app/src/           aplicación React
react-app/public/        catálogo/assets públicos, headers y clave pública
react-app/tests/         pruebas del frontend
tests/                   pruebas del importador y de integridad
docs/                    documentación técnica específica
.signing/                clave privada local ignorada por Git
```

## Scripts

Todos los comandos siguientes existen en el `package.json` raíz.

| Comando | Propósito | ¿Modifica archivos? | Uso habitual |
|---|---|---:|---|
| `npm run import-products` | Genera `generated/catalog.json` desde el Excel. | Sí | Después de validar cambios del catálogo. |
| `npm run check-products` | Valida el Excel y compara en memoria contra el JSON. | No | Preflight y comprobación posterior a la importación. |
| `npm run compare-catalog` | Compara JSON generado y baseline. | No | Revisar impacto antes de aprobar. |
| `npm run update-catalog-baseline` | Actualiza el baseline aprobado. | Sí | Solo tras revisión consciente. |
| `npm run test-importer` | Ejecuta pruebas del importador. | No, salvo temporales de prueba | Cambios de catálogo o importador. |
| `npm run test-react` | Ejecuta pruebas del frontend. | No | Cambios React, carrito, checkout o servicios. |
| `npm run test-integrity` | Ejecuta pruebas de firma e integridad. | No, salvo temporales de prueba | Cambios de build, firma o publicación. |
| `npm run react:test` | Alias de `test-react`. | No | Compatibilidad. |
| `npm run react:dev` | Inicia Vite en desarrollo. | No | Desarrollo local. |
| `npm run react:build` | Genera un build Vite normal. | Sí | Comprobación local; no publicar como build oficial. |
| `npm run react:build:signed` | Construye, firma, verifica y publica `react-app/dist`. | Sí | Build oficial; requiere clave privada. |
| `npm run generate-signing-keys` | Inicia la generación de claves Ed25519. | Sí, con confirmación | Solo creación o rotación deliberada. |
| `npm run integrity:manifest` | Genera el manifiesto de hashes. | Sí | Operación técnica de integridad. |
| `npm run integrity:sign` | Firma el manifiesto. | Sí | Operación técnica con clave privada. |
| `npm run integrity:verify` | Verifica firma y archivos del build. | No | Después de cada build firmado. |
| `npm run react:preview` | Sirve localmente el build. | No | Revisión previa a publicación. |

`react-app/package.json` también ofrece `dev`, `build`, `preview` y `test`; se recomienda usar los aliases de la raíz.

## Actualizar productos o stock

1. Editar `catalog/products.xlsx`.
2. Ejecutar el preflight sin escritura:

   ```bash
   npm run check-products
   ```

   Tras editar el Excel puede informar que `generated/catalog.json` está desactualizado; corregir primero cualquier error de esquema o datos.

3. Regenerar y volver a comprobar:

   ```bash
   npm run import-products
   npm run check-products
   npm run compare-catalog
   ```

4. Revisar todas las diferencias. Si se aprueban, actualizar el baseline:

   ```bash
   npm run update-catalog-baseline
   ```

5. Validar y generar el artefacto oficial:

   ```bash
   npm run test-importer
   npm run test-react
   npm run test-integrity
   npm run react:build:signed
   npm run integrity:verify
   git diff --check
   ```

No editar manualmente `generated/catalog.json` ni aprobar el baseline sin comprender el diff. Ver también [`catalog/README.md`](catalog/README.md).

## Pruebas

```bash
npm run test-importer
npm run test-react
npm run test-integrity
git diff --check
```

Todas las suites pertinentes deben aprobar. No existen todavía suites E2E, visuales, de accesibilidad o rendimiento dedicadas.

## Build firmado e integridad

```bash
npm run react:build:signed
npm run integrity:verify
```

El resultado queda en `react-app/dist`. El proceso usa Ed25519, un manifiesto con hashes SHA-256 y una estrategia transaccional de publicación. La explicación completa está en [`docs/integrity-signing.md`](docs/integrity-signing.md).

### Advertencia sobre `.signing`

La clave privada predeterminada vive en `.signing/ed25519-private.pem` y está ignorada por Git. Nunca debe copiarse a commits, prompts, logs, documentación o archivos compartidos. Una computadora nueva no la recibe al clonar: debe restaurarse manualmente desde un respaldo seguro. No regenerar ni rotar la clave, y no usar `--force`, sin una decisión explícita.

## Publicación en Netlify

1. Ejecutar pruebas.
2. Ejecutar el build firmado y su verificación.
3. Publicar **únicamente** `react-app/dist`.

Nunca publicar la raíz del repositorio. Si Netlify ejecuta el build, debe usar el flujo firmado y recibir la clave por un mecanismo secreto seguro. Si no dispone de la clave, desplegar el `dist` firmado previamente sin reconstruirlo. Verificar en el dominio publicado que Netlify aplique los headers provenientes de `react-app/public/_headers`.

## Trabajar desde otra computadora

Antes de empezar:

```bash
git status
git pull --ff-only
```

Para una computadora nueva:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_REPOSITORIO>/realstep-head
npm ci
npm --prefix react-app ci
npm run test-importer
npm run test-react
npm run test-integrity
npm run react:build
```

En Windows PowerShell, una ruta se cambia con:

```powershell
Set-Location C:\ruta\al\repositorio\realstep-head
```

En Linux, incluido CachyOS:

```bash
cd /ruta/al/repositorio/realstep-head
```

Al terminar, ejecutar las pruebas pertinentes y luego:

```bash
git diff --check
git status
git add <archivos-revisados>
git commit -m "Describir el cambio en español"
git push
```

No trabajar en paralelo sobre cambios no sincronizados. Los agentes de IA no deben hacer commit, push ni despliegue sin una orden expresa.

## Limitaciones actuales

- EmailJS construye y envía el pedido desde el navegador.
- `localStorage` puede ser manipulado; la reconciliación protege consistencia, no seguridad.
- No hay backend, base de datos, autenticación, autorización ni persistencia duradera.
- No existe idempotencia server-side ni control propio de rate limiting.
- La privacidad, retención y eliminación de datos personales están pendientes de diseño.
- La verificación de integridad en React es actualmente no bloqueante.

Nunca confiar en datos provenientes del navegador. El backend futuro deberá validar disponibilidad, cantidades y precios, recalcular totales y persistir antes de notificar.

## Próximos pasos

La dirección aprobada es un backend Node.js con PostgreSQL, persistencia autoritativa del pedido, idempotencia, concurrencia controlada y correo desde servidor. Prisma, el esquema, los proveedores, los roles y las políticas de privacidad todavía no están implementados o cerrados. Consultar el roadmap y las decisiones pendientes en [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).

## Contribución

- Revisar `git status` antes de modificar.
- No tocar Excel, baseline, firma, licencia o configuración legal si la tarea no lo requiere.
- No instalar dependencias sin justificarlo.
- Mantener cambios pequeños, cohesivos y compatibles.
- Ejecutar las pruebas pertinentes y `git diff --check`.
- Informar archivos modificados, pruebas y limitaciones.
- Escribir los mensajes de commit en español.

No hacer commit, push ni despliegue cuando la tarea no lo autorice expresamente.
