# Real Step · Catálogo HEAD

El catálogo React vive en `react-app/`. La fuente manual de datos es
`catalog/products.xlsx`; `generated/catalog.json` es el artefacto generado que
consume la aplicación.

## Validación habitual

```powershell
npm run import-products
npm run check-products
npm run compare-catalog
npm run test-importer
npm run test-react
npm run react:build
```

El snapshot canónico se encuentra en
`tests/fixtures/catalog-baseline.json`. Solo se actualiza después de aprobar un
cambio comercial:

```powershell
npm run update-catalog-baseline
```

No se debe editar el snapshot manualmente. `js/data/**` pertenece únicamente a
la aplicación clásica y no participa en importación, comparación, tests, build
ni runtime de React.

