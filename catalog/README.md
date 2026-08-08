# Pipeline del catálogo

`catalog/products.xlsx` es la única fuente manual del catálogo.
`generated/catalog.json` es un artefacto determinista generado por Node y la
única fuente de catálogo consumida por React. Su identidad se publica en
`generated/catalog-version.json`.

```text
catalog/products.xlsx
         ↓
importador Node
         ↓
generated/catalog.json
         +
generated/catalog-version.json
         ↓
React
```

El catálogo JavaScript anterior fue retirado y no forma parte del pipeline.

## Hojas

- `Categorias`: jerarquía, estado, targets y filtros.
- `Productos`: datos generales y orden global.
- `Variantes`: colores, códigos y precios opcionales.
- `Imagenes`: imágenes de producto o variante.
- `Stock`: disponibilidad por talle.
- `Caracteristicas`: ficha técnica normalizada por filas.
- `Listas`: valores permitidos para validaciones; permanece oculta.

El importador rechaza fórmulas. Todos los valores del workbook deben ser
literales. Los IDs se preservan exactamente, incluidos los espacios finales.

## Versión determinista

`npm run import-products` genera conjuntamente el catálogo y un manifiesto con
`schemaVersion`, `catalogFile` y una versión `sha256-...`. La versión es el
SHA-256 de los bytes UTF-8 exactos escritos en `generated/catalog.json`.

No se usa un timestamp: la misma entrada produce los mismos dos archivos en
cualquier importación. `generated/catalog-version.json` es generado y no debe
editarse manualmente.

## Stock

El JSON incluye `"stockIsAvailabilityOnly": true`. Los valores de stock
representan disponibilidad y no deben interpretarse como inventario comercial
exacto hasta que se apruebe ese cambio de modelo.

## Baseline canónico

`tests/fixtures/catalog-baseline.json` es el snapshot versionado del catálogo
comercial aprobado. No es una fuente editable ni debe modificarse a mano.

Flujo normal:

```powershell
npm run import-products
npm run check-products
npm run compare-catalog
npm run test-importer
```

- `import-products`: valida Excel y genera `generated/catalog.json` junto con
  `generated/catalog-version.json`.
- `check-products`: reconstruye el catálogo sin escribir y comprueba que el
  JSON y su manifiesto de versión estén actualizados.
- `compare-catalog`: compara el JSON generado contra el baseline sin modificar
  archivos; devuelve código 1 ante cualquier diferencia.

## Aprobar un cambio comercial

1. Modificar únicamente `catalog/products.xlsx`.
2. Ejecutar `npm run import-products`.
3. Revisar el diff de `generated/catalog.json`.
4. Ejecutar checks, tests y build.
5. Obtener aprobación comercial.
6. Ejecutar deliberadamente:

   ```powershell
   npm run update-catalog-baseline
   ```

7. Revisar y versionar juntos Excel, JSON y baseline.

`update-catalog-baseline` nunca se ejecuta desde build, dev, tests o importación.
Antes de escribir, exige que Excel y JSON sean válidos e idénticos.
