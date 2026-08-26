# Catálogo RealStep / HEAD

Catálogo mayorista estático para RealStep / HEAD. Los datos comerciales se
mantienen en `catalog/products.xlsx`, un importador Node.js genera el catálogo
JSON y React/Vite construye la aplicación publicada en GitHub Pages. El carrito
se conserva en el navegador y el checkout vigente envía el pedido mediante
EmailJS. Las pestañas abiertas detectan automáticamente cambios de catálogo y
de aplicación.

> **Regla principal:** los datos comerciales se editan en Excel. No editar a
> mano los JSON generados, las versiones, el baseline ni los artefactos de
> firma.

Para decisiones arquitectónicas y restricciones permanentes, consultar
[`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) y [`AGENTS.md`](AGENTS.md).

## 1. Requisitos

- Node.js y npm. El repositorio no declara una versión mínima en `package.json`;
  la publicación automática usa Node.js 24.
- Git.
- Excel u otra herramienta compatible con `.xlsx` para editar el catálogo sin
  cambiar nombres de hojas, encabezados ni tipos de celda.
- Una clave privada Ed25519 sólo para ejecutar localmente un build firmado. No
  hace falta para desarrollo, importación ni build local normal.

Comprobar el entorno e instalar dependencias desde la raíz:

```powershell
node --version
npm --version
git --version
npm install
```

En CI se usa `npm ci` para instalar exactamente el lockfile. Hay un único
`package.json` y un único `package-lock.json`, ambos en la raíz.

## 2. Estructura del proyecto

| Ruta | Función |
|---|---|
| `catalog/products.xlsx` | Única fuente manual de productos, categorías, precios, stock y relaciones comerciales. |
| `catalog/README.md` | Contrato resumido del workbook y del pipeline. |
| `generated/` | `catalog.json` y `catalog-version.json`, generados por el importador. |
| `assets/products/` | Imágenes fuente de productos referenciadas desde la hoja `Imagenes`. |
| `assets/` | Logo, hero e imágenes bundleadas por Vite. Cualquier cambio aquí modifica la versión de la app. |
| `public/` | Archivos copiados literalmente a `dist/`: favicon, icono Apple, portadas editoriales, headers y metadatos públicos. |
| `src/` | Aplicación React: componentes, estilos, carrito, checkout, configuración y servicios de actualización. |
| `scripts/catalog-import/` | Lectura, validación y construcción determinista del catálogo. |
| `scripts/integrity/` | Firma, hashing y verificación de la publicación. |
| `tests/` | Tests del importador, frontend, build e integridad; incluye el baseline aprobado. |
| `.github/workflows/deploy-pages.yml` | Build firmado y deploy automático a GitHub Pages al hacer push a `main`. |
| `dist/` | Build local generado e ignorado por Git. No se commitea. |

## 3. Flujo normal de trabajo

### ¿Qué quiero cambiar?

| Cambio | Archivos habituales | Resultado esperado | Validación mínima |
|---|---|---|---|
| Stock, precios, disponibilidad o datos de productos | `catalog/products.xlsx` | Cambian `generated/catalog.json` y `generated/catalog-version.json`. | `check-products`, `import-products`, `compare-catalog`, `test-importer`, `test-react`, build. |
| Producto nuevo | Excel; normalmente imágenes en `assets/products/` | Producto, relaciones e imágenes aparecen en el JSON. | Flujo completo de catálogo y revisión visual. |
| Imagen de producto | Archivo en `assets/products/` + hoja `Imagenes` | La imagen se valida, bundlea y queda asociada al producto o variante. | Flujo de catálogo, `test:build`, build y `verify:build`. |
| Categoría o subcategoría | Hojas `Categorias`, `Productos` y, si corresponde, `Listas` | Cambia la jerarquía y sus filtros. | Flujo completo de catálogo y revisión visual/navegación. |
| `pack_de` | Hoja `Productos` | La cantidad se compra en múltiplos del pack; el precio sigue siendo unitario. | Flujo de catálogo + `test-react`. |
| React, CSS o lógica de UI | `src/` | Cambia la aplicación y su `app-version`. | `test-react`, `test:build`, build y `verify:build`. |
| Logo, hero, favicon o portada editorial | `assets/`, `public/` y, para portadas, `src/config/categoryEditorialCovers.js` | Cambian assets y `app-version`. | `test-react`, `test:build`, build, `verify:build` y revisión visual. |
| Carrito o checkout | `src/context/`, `src/reducers/`, `src/services/`, `src/components/cart/`, `src/components/checkout/` | Cambia lógica sensible y contratos persistidos. | `test-react`, `test-integrity`, `test:build`, build, `verify:build` y prueba manual. |

Antes de tocar archivos:

```powershell
git status
git pull --ff-only
```

No hacer pull si hay cambios locales sin revisar: primero commit, stash o
resolución consciente de esos cambios.

## 4. Actualizar el Excel y el catálogo

`catalog/products.xlsx` contiene estas hojas obligatorias y encabezados
exactos:

| Hoja | Contenido |
|---|---|
| `Categorias` | `categoria_id`, jerarquía mediante `parent_id`, navegación, filtros, textos, estado y orden. |
| `Productos` | ID, nombre, categoría/subcategoría, género, SKU, precio, estado, modo de stock, orden y `pack_de`. |
| `Variantes` | Variante, SKU, color, precio opcional, thumbnail y orden. |
| `Imagenes` | Relación producto/variante, ruta y orden. |
| `Stock` | Producto/variante, talle, valor de stock y orden. |
| `Caracteristicas` | Clave, etiqueta, valor y orden de la ficha técnica. |
| `Listas` | Valores auxiliares permitidos, entre ellos talles y modos de stock. |

El importador rechaza fórmulas, encabezados alterados, IDs duplicados,
relaciones huérfanas, órdenes duplicados dentro del mismo alcance, tipos
inválidos y rutas de imagen inexistentes. Los IDs se preservan literalmente,
incluidos espacios finales: no corregirlos ni normalizarlos sin una migración
aprobada.

### Productos, variantes y precios

- El precio de `Productos.precio` es obligatorio, numérico y no negativo.
- `Variantes.precio` es opcional; si está vacío, la variante usa el precio del
  producto.
- Un producto habilitado con precio `0` genera una advertencia.
- Una variante activa necesita SKU, nombre de color e imágenes propias.
- `habilitado` y `habilitada` son booleanos literales, no textos como `"sí"`.

### Stock y disponibilidad

- `stock_mode` admite `none` o `size`.
- `none`: el producto no debe tener filas en `Stock`.
- `size`: el producto, o cada variante si las hay, debe tener filas por talle.
- El talle debe existir en `Listas`.
- El valor de stock debe ser un entero mayor o igual que cero.
- El catálogo actual publica `stockIsAvailabilityOnly: true`: `0` significa no
  disponible y un valor positivo significa disponible. No representa inventario
  cuantitativo reservable.

### `pack_de`

- Vive en la hoja `Productos`.
- Vacío equivale a `1`.
- Si se informa, debe ser un entero positivo mayor o igual que `1`.
- Se publica en JSON como `packDe`.
- El selector y el carrito sólo aceptan múltiplos de ese valor.
- El precio continúa siendo unitario; `pack_de: 6` no convierte el precio en
  precio por pack.

Cambiar un `pack_de` puede dejar líneas ya guardadas en revisión si su cantidad
no es múltiplo del valor nuevo.

### Agregar imágenes de producto

1. Copiar la imagen bajo `assets/products/`, preferentemente en la carpeta de
   su familia comercial.
2. Agregar una fila en `Imagenes` con el `producto_id`, el `variante_id` si
   corresponde, la ruta y el orden.
3. Usar `/` y una ruta como `assets/products/categoria/archivo.webp`.
4. Respetar exactamente mayúsculas y minúsculas del nombre real.

Extensiones admitidas: `.webp`, `.png`, `.jpg` y `.jpeg`. No se aceptan rutas
absolutas, `..`, barras invertidas ni archivos fuera de `assets/products/`.
Los archivos no referenciados generan warning, no error.

### Agregar categoría o subcategoría

1. Agregar la fila correspondiente en `Categorias`.
2. Para una subcategoría, usar un `parent_id` existente.
3. Mantener únicos `categoria_id`, `target` y `orden` dentro del mismo padre.
4. Asignar en `Productos` únicamente categorías/subcategorías definidas por las
   filas de `Categorias`.
5. Si se introduce un talle u otro valor controlado nuevo, actualizar también
   `Listas`.

### Secuencia correcta

Primero validar el Excel sin escribir:

```powershell
npm run check-products
```

Si se cambió el Excel, es normal que informe que los JSON generados están
desactualizados. Una vez corregidos los errores estructurales, generar:

```powershell
npm run import-products
npm run check-products
npm run compare-catalog
```

`import-products` escribe conjuntamente:

- `generated/catalog.json`;
- `generated/catalog-version.json`.

`check-products` reconstruye todo en memoria, comprueba esos dos archivos y no
escribe. `compare-catalog` compara el JSON generado con el baseline; devuelve
código 1 cuando hay diferencias comerciales, lo que exige revisión.

## 5. Cambio comercial vs. cambio de aplicación

### `catalog-version.json`

Identifica los bytes exactos de `catalog.json` con SHA-256. Cambia al modificar
productos, precios, stock, categorías, variantes o relaciones del Excel. Lo
genera `import-products`; no contiene timestamps.

Una pestaña abierta consulta esta versión cada 60 segundos, pausa el polling
cuando está oculta y vuelve a comprobar al recuperar foco o visibilidad. Si la
versión cambia, descarga el catálogo, verifica su hash y actualiza productos,
categorías, búsqueda, precios y carrito sin recargar la página. Ante un error
conserva el último catálogo válido.

### `app-version.json`

Vite lo genera dentro de `dist/` durante cada build. La versión deriva de:

- `assets/`, `public/` y `src/`;
- `index.html`, `package.json`, `package-lock.json` y `vite.config.js`.

No deriva de `generated/catalog.json`: un cambio puramente comercial puede
actualizarse sin recarga. Sin embargo, agregar o modificar una imagen bajo
`assets/` también es cambio de aplicación y sí cambia `app-version`.

La pestaña comprueba la app cada 60 segundos. Antes de recargar verifica que
`index.html`, JS y CSS del nuevo deploy estén completos y con hashes correctos.
No recarga durante un checkout abierto, evita loops y conserva el carrito.

## 6. Scripts npm

Esta tabla coincide con la salida actual de `npm run`:

| Comando | Qué hace / cuándo usarlo | ¿Escribe? | Precaución |
|---|---|---:|---|
| `npm run import-products` | Valida Excel, genera catálogo + versión y actualiza derivados de imágenes. | Sí, `generated/` y derivados locales | Revisar los diffs comerciales. |
| `npm run generate-product-images` | Genera incrementalmente WebP de producto de 200, 480 y 800 px. | Sí, `public/product-images/` y manifiesto | Automático desde import, dev y build. |
| `npm run check-products` | Valida Excel y comprueba catálogo/versión en memoria. | No | Seguro; warnings no equivalen a error. |
| `npm run compare-catalog` | Compara catálogo generado con baseline. | No | Código 1 puede significar cambio esperado aún no aprobado. |
| `npm run update-catalog-baseline -- --confirm` | Reemplaza el snapshot comercial aprobado. | Sí | Sólo con aprobación consciente. |
| `npm run test-importer` | Tests de lectura, validación, determinismo, baseline y versión. | Sólo temporales de test | Usar para catálogo/importador. |
| `npm run test-react` | Tests de frontend, catálogo dinámico, carrito, checkout, navegación e integridad del navegador. | No sobre el repo | Usar para cambios comerciales y frontend. |
| `npm run test-integrity` | Tests de firma, manifiesto y verificador. | Sólo temporales de test | Obligatorio para publicación/lógica crítica. |
| `npm run test:build` | Tests estáticos de assets, versiones y workflow de Pages. | Sólo temporales de test | Ejecutar antes de build/publicación. |
| `npm run verify:build` | Inspecciona un `dist/` existente: catálogo, versiones, entrypoints, logo, hero e imágenes. | No | Ejecutar después de un build. Falla si `dist/` no existe. |
| `npm run react:build:signed` | Construye en staging, firma, verifica y promueve `dist/`. | Sí, `dist/` | Requiere clave privada; no ejecutar sin autorización. |
| `npm run generate-signing-keys -- --confirm` | Crea una identidad Ed25519. | Sí | **No ejecutar en mantenimiento normal.** |
| `npm run integrity:manifest` | Genera clave pública de publicación y manifiesto en `dist/`. | Sí, `dist/` | Operación técnica; no sustituye el pipeline firmado. |
| `npm run integrity:sign` | Firma el manifiesto existente. | Sí, `dist/` | Requiere clave privada. |
| `npm run integrity:verify` | Verifica firma y archivos de `dist/`. | No | Después de un build firmado. |
| `npm run dev` | Inicia el servidor Vite de desarrollo. | No | Uso local. |
| `npm run build` | Genera un build Vite normal en `dist/`. | Sí, `dist/` | Sirve para validar; GitHub Pages publica el build firmado de CI. |
| `npm run preview` | Sirve el `dist/` ya generado. | No | Ejecutar después de build. |

## 7. Baseline del catálogo

`tests/fixtures/catalog-baseline.json` es el snapshot versionado del catálogo
comercial aprobado. Permite detectar altas, bajas, cambios de precio, stock,
orden, relaciones e imágenes aunque el Excel y el JSON generado sean válidos.

Una diferencia es esperada cuando el cambio comercial fue intencional. Antes
de aprobarla:

1. Revisar `git diff` del Excel mediante el resumen del importador y el diff
   legible de `generated/catalog.json`.
2. Ejecutar `npm run compare-catalog` y leer cada diferencia.
3. Confirmar que no haya cambios ajenos, IDs normalizados o bajas accidentales.
4. Obtener aprobación comercial.

Sólo entonces:

```powershell
npm run update-catalog-baseline -- --confirm
npm run compare-catalog
```

El script se niega a escribir sin `--confirm` y también exige que Excel y JSON
sean válidos e idénticos.

> **Nunca actualizar el baseline solamente para hacer pasar tests.** No
> actualizarlo ante errores de esquema, relaciones rotas o cambios todavía no
> aprobados.

## 8. Tests y validación

| Tipo de cambio | Validación mínima recomendada |
|---|---|
| Sólo Excel: stock/precios/datos | `check-products`, `import-products`, `check-products`, `compare-catalog`, `test-importer`, `test-react`, `test:build`, build, `verify:build`. |
| Producto/categoría/variante nueva | Flujo de catálogo anterior + revisión visual de navegación, búsqueda y carrito. |
| Imagen de producto o asset | Flujo de catálogo si aplica + `test-react`, `test:build`, build, `verify:build`. |
| React/CSS/frontend | `test-react`, `test:build`, build, `verify:build`. |
| Carrito/checkout | `test-react`, `test-integrity`, `test:build`, build, `verify:build` y prueba manual de éxito/fallo. |
| Integridad/workflow/publicación | `test-integrity`, `test:build`, build, `verify:build`; build firmado sólo autorizado. |

### Validación completa antes de publicar

```powershell
npm run check-products
npm run compare-catalog
npm run test-importer
npm run test-react
npm run test-integrity
npm run test:build
npm run build
npm run verify:build
git diff --check
git status
git diff --stat
git diff
```

Si `compare-catalog` detecta un cambio ya aprobado, actualizar el baseline con
el comando confirmado y volver a ejecutar la comparación antes de continuar.

## 9. Build

### Build local normal

```powershell
npm run build
npm run verify:build
npm run preview
```

`build` genera `dist/` para comprobación local. `verify:build` exige, entre
otras cosas, `index.html`, catálogo y versiones coherentes, entrypoints
correctos, logo, hero y al menos 300 imágenes de producto bundleadas.

`preview` sirve el build ya generado. La terminal muestra la URL local real;
no se fija un puerto en el repositorio.

### Build firmado

```powershell
npm run react:build:signed
npm run verify:build
npm run integrity:verify
```

El build firmado crea un staging, ejecuta Vite, publica la clave pública,
genera manifiesto y firma Ed25519, verifica todo y recién entonces reemplaza
`dist/`. No ejecutarlo localmente sin autorización y acceso legítimo a la clave.

El criterio operativo es que el build termine con código 0 y que
`verify:build` pase. No ignorar warnings de assets no resueltos.

## 10. Integridad y firma

La firma permite comprobar que los archivos publicados corresponden a una
misma publicación y no fueron alterados después del build. Usa SHA-256 por
archivo y una firma Ed25519 del manifiesto.

Artefactos publicados en `dist/`:

- `integrity-manifest.json`;
- `integrity-manifest.sig`;
- `signing-public-key.pem`.

La clave privada vive fuera de Git, normalmente bajo `.signing/` o mediante
variables secretas. Nunca mostrarla, copiarla al README ni versionarla.

> **NO EJECUTAR EN EL FLUJO NORMAL:** `npm run generate-signing-keys --
> --confirm`. Una rotación deliberada requiere además `--force` si ya existen
> claves y cambia la identidad criptográfica de futuras publicaciones.

GitHub Actions recibe la clave mediante el secret `SIGNING_PRIVATE_KEY_PEM`.
No hace falta ni corresponde copiar ese valor a archivos locales.

## 11. Desarrollo local

Iniciar Vite:

```powershell
npm run dev
```

Abrir la URL que informa la terminal. El servidor expone también
`catalog.json`, `catalog-version.json` y `app-version.json` para reproducir el
comportamiento real. Detener con `Ctrl+C`.

Para revisar el resultado de producción:

```powershell
npm run build
npm run verify:build
npm run preview
```

### Assets de la aplicación

- Logo: `assets/Real_Step_logo.jpeg`, consumido por `Header.jsx`.
- Hero: `assets/2026-padel-coello-heroHeader.jpg`, consumido por `Hero.jsx`.
- Originales de producto: `assets/products/`, referenciados únicamente desde Excel.
- Derivados responsive: `public/product-images/`, generados automáticamente y no versionados.
- Manifiesto determinista de derivados: `generated/product-image-derivatives.json`.
- Favicon: `public/favicon-32.png`, enlazado desde `index.html`.
- Icono para dispositivos Apple: `public/apple-touch-icon.png`.
- Portadas de categorías: archivos bajo `public/editorial/` y configuración en
  `src/config/categoryEditorialCovers.js`.

Al reemplazarlos, conservar las rutas o actualizar conjuntamente la referencia,
las dimensiones/metadata aplicables y sus tests. Después ejecutar
`test:build`, build, `verify:build` y una revisión visual responsive.

## 12. Git y publicación en GitHub Pages

Remoto actual: `https://github.com/SantiLareu/Catalogo_Head.git`.

No hay un `CNAME` ni un dominio personalizado versionado. La URL estándar
esperada de Pages es `https://santilareu.github.io/Catalogo_Head/`; la URL
efectiva de cada deploy también aparece en el environment `github-pages` de
GitHub Actions.

Flujo recomendado:

```powershell
git status
git diff --stat
git diff
git add README.md
git commit -m "Documentar manual operativo del catálogo"
git push origin main
```

Reemplazar `README.md` por la lista explícita de archivos del cambio. Evitar
`git add .`: puede incluir Excel, JSON, imágenes o archivos inesperados sin
revisión.

Cada push a `main` dispara `.github/workflows/deploy-pages.yml`. Automáticamente:

1. hace checkout;
2. configura Node 24 e instala con `npm ci`;
3. ejecuta `check-products`, `test-react`, `test:build` y `test-integrity`;
4. genera un build firmado usando el secret de GitHub;
5. ejecuta `verify:build` e `integrity:verify`;
6. sube únicamente `dist/` y lo publica en GitHub Pages.

Si cualquier paso falla, no se completa el deploy. La workflow no ejecuta
`import-products`, no corrige JSON, no actualiza baseline y no sustituye la
revisión local de `compare-catalog`/`test-importer`.

GitHub Pages sirve por HTTPS. `vite.config.js` usa `base: './'` y las URLs de
runtime se resuelven desde `document.baseURI`, por lo que funcionan tanto bajo
el subpath `/Catalogo_Head/` como con un futuro dominio personalizado.

## 13. Checklist antes de push

- [ ] Revisé `git status`, `git diff --stat` y `git diff`.
- [ ] Sólo modifiqué archivos relacionados con el objetivo.
- [ ] Si cambié Excel, `check-products` terminó con cero errores.
- [ ] Si cambié Excel, regeneré juntos catálogo y `catalog-version`.
- [ ] Leí todos los warnings del importador.
- [ ] Revisé conscientemente la salida de `compare-catalog`.
- [ ] Actualicé baseline únicamente si el cambio comercial fue aprobado.
- [ ] Ejecuté los tests correspondientes al alcance.
- [ ] Ejecuté `npm run build` y luego `npm run verify:build`.
- [ ] Revisé visualmente navegación, imágenes y checkout si fueron afectados.
- [ ] `git diff --check` pasó.
- [ ] No hay secretos, claves privadas, `.env`, temporales ni capturas.
- [ ] No agregué `dist/` ni `node_modules/`.
- [ ] Seleccioné archivos explícitos con `git add`.

## 14. Recetas rápidas

### Sólo cambié stock, precios o productos en Excel

```powershell
npm run check-products
npm run import-products
npm run check-products
npm run compare-catalog
# Revisar y aprobar el cambio comercial antes del siguiente comando:
npm run update-catalog-baseline -- --confirm
npm run compare-catalog
npm run test-importer
npm run test-react
npm run test:build
npm run build
npm run verify:build
git diff --check
```

### Agregué productos, imágenes o categorías

```powershell
npm run check-products
npm run import-products
npm run check-products
npm run compare-catalog
# Sólo después de aprobación comercial:
npm run update-catalog-baseline -- --confirm
npm run compare-catalog
npm run test-importer
npm run test-react
npm run test:build
npm run build
npm run verify:build
git diff --check
```

Después abrir el build o `npm run dev` y comprobar la nueva navegación,
búsqueda, imágenes, variantes, talles, cantidades y carrito.

### Cambié React, CSS o frontend

```powershell
npm run test-react
npm run test:build
npm run build
npm run verify:build
git diff --check
```

### Cambié checkout, carrito o lógica crítica

```powershell
npm run check-products
npm run test-react
npm run test-integrity
npm run test:build
npm run build
npm run verify:build
git diff --check
```

### Validación completa antes de publicar

```powershell
npm run check-products
npm run compare-catalog
npm run test-importer
npm run test-react
npm run test-integrity
npm run test:build
npm run build
npm run verify:build
git diff --check
git status
git diff --stat
git diff
```

### Comprobar qué voy a subir

```powershell
git status
git diff --stat
git diff
git diff --cached
```

### Traer cambios de GitHub

```powershell
git status
git pull --ff-only
```

No hacer pull con cambios locales sin revisar o guardar. Usar commit o stash
según corresponda.

## 15. Errores y warnings frecuentes

| Mensaje/situación | Significado | Acción |
|---|---|---|
| `PENDING_CODE` | El SKU contiene el valor literal `PENDIENTE`. Es warning conocido. | Confirmar que sea comercialmente intencional. |
| `UNUSED_IMAGE` | Hay un archivo bajo `assets/products/` no referenciado desde Excel. | Referenciarlo o retirarlo conscientemente; no impide importar. |
| `TECH_NOT_CURRENTLY_RENDERED` | La característica se conserva en JSON pero la UI actual no muestra esa clave. | No borrar el dato sólo para silenciar el warning. |
| `GENERATED_CATALOG_MISMATCH` | Excel y JSON generado no coinciden. | Revisar errores y ejecutar `import-products` si el cambio es intencional. |
| `compare-catalog` sale con código 1 | El catálogo difiere del baseline. | Revisar diferencias; aprobar y actualizar baseline sólo si corresponde. |
| Ruta de imagen inexistente o distinta en mayúsculas | El importador exige path y capitalización exactos. | Corregir la fila o el nombre físico. |
| Vite indica que un asset no existe al build | Un path relativo/glob no resolvió y puede romper imágenes públicas. | Revisar paths; ejecutar `test:build` y `verify:build`. |
| `verify:build` dice que no existe `dist/` | Se ejecutó antes del build. | Ejecutar primero `npm run build`. |
| Falta clave privada en build firmado | La notebook no tiene acceso a la identidad Ed25519. | Usar build normal; restaurar la clave sólo por un canal autorizado. |
| Warning LF/CRLF de Git | Git convertirá finales de línea según el entorno. | Revisar el diff; no reescribir archivos masivamente sólo por el warning. |

Actualmente `check-products` puede terminar correctamente con advertencias
conocidas de SKU pendientes, imágenes no usadas y claves técnicas no
renderizadas. El criterio de bloqueo son los errores y el exit code, pero cada
warning nuevo debe revisarse.

## 16. Cosas que no hay que hacer

- No editar manualmente `generated/catalog.json` ni
  `generated/catalog-version.json`.
- No editar manualmente `tests/fixtures/catalog-baseline.json`.
- No ejecutar `update-catalog-baseline` sólo para hacer pasar pruebas.
- No modificar IDs legacy ni quitar espacios finales silenciosamente.
- No interpretar stock positivo como cantidad reservable mientras
  `stockIsAvailabilityOnly` sea `true`.
- No editar `app-version.json`: sólo existe como salida de build.
- No generar ni rotar signing keys durante mantenimiento normal.
- No subir claves privadas, secretos, `.env`, `dist/` ni `node_modules/`.
- No hardcodear `/Catalogo_Head/` ni rutas absolutas para assets/runtime.
- No modificar Excel, JSON generado, baseline, código y assets en un mismo
  commit sin que todos pertenezcan al mismo cambio verificable.
- No usar `git add .` ni hacer push sin revisar el diff.
- No publicar manualmente la raíz del repositorio; Pages recibe únicamente
  `dist/` desde la workflow.

## 17. Sistema de pedidos actual

El sistema vigente usa EmailJS desde el navegador:

1. El carrito persiste referencias (`productId`, variante, talle, cantidad y
   `priceSnapshot`) en `localStorage`; nombres, precios e imágenes se resuelven
   otra vez desde el catálogo activo.
2. Antes del submit, el checkout espera cualquier polling en curso y fuerza una
   consulta fresca sin caché.
3. Producto, variante, talle, disponibilidad, `packDe`, nombre, SKU, color y
   precio se comparan con el catálogo publicado validado.
4. Un cambio bloquea ese intento y exige revisión; un precio nuevo debe
   aceptarse explícitamente.
5. EmailJS envía primero el correo al propietario, espera 1150 ms y luego envía
   la confirmación al cliente.
6. Si falla el correo del cliente después del primero, el reintento envía sólo
   la confirmación y evita duplicar el correo propietario.
7. El carrito y el formulario se conservan ante fallos. El carrito se vacía y
   las selecciones se reinician únicamente tras éxito completo.

El correo no confirma stock ni procesa pagos; el pedido queda sujeto a
confirmación comercial. La validación frontend mejora consistencia, pero no es
seguridad transaccional ni autoridad server-side.

Existe una migración futura de infraestructura de correo en desarrollo en un
repositorio separado. No forma parte del sistema activo documentado aquí.

## 18. Recuperación con Git stash

Guardar temporalmente cambios locales, incluidos archivos no trackeados:

```powershell
git stash push --include-untracked -m "Trabajo temporal"
git stash list
```

Recuperar sin borrar la entrada del stash:

```powershell
git stash apply
```

Revisar `git status` y resolver conflictos si los hubiera. El stash es local,
no se sube a GitHub y no reemplaza un backup permanente.

## 19. Fuentes de verdad

| Tema | Fuente de verdad |
|---|---|
| Datos comerciales editables | `catalog/products.xlsx` |
| Catálogo consumido por React/publicado | `generated/catalog.json`, generado desde Excel |
| Identidad del catálogo | `generated/catalog-version.json`, SHA-256 del JSON exacto |
| Snapshot comercial aprobado | `tests/fixtures/catalog-baseline.json` |
| Aplicación | `src/`, `assets/`, `public/`, `index.html` y configuración Vite/npm |
| Identidad de la app publicada | `dist/app-version.json`, generado por Vite |
| Código publicado | Rama `main` y artefacto `dist/` generado por GitHub Actions |
| Proceso de deploy | `.github/workflows/deploy-pages.yml` |
| Contratos verificables | Tests bajo `tests/` |
| Arquitectura y restricciones | `PROJECT_CONTEXT.md`, `AGENTS.md` y este manual |

Cuando documentación y código discrepen, comprobar primero scripts, workflow y
tests actuales. No considerar una idea de roadmap como funcionalidad existente.
