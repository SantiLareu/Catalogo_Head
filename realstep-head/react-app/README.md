# Aplicación React · Real Step

Aplicación React + Vite del catálogo mayorista. Consume exclusivamente
`../generated/catalog.json`, configuración React y recursos de `../assets/`.
No carga HTML, CSS, configuración ni JavaScript de la aplicación clásica.

## Comandos desde la raíz

```powershell
npm run import-products
npm run check-products
npm run compare-catalog
npm run test-react
npm run react:dev
npm run react:build
npm run react:preview
```

La importación del Excel es explícita: no existen hooks `predev` ni `prebuild`.
Vite genera rutas relativas mediante `base: './'`.
