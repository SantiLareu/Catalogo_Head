# RealStep · Catálogo HEAD

Aplicación React del catálogo mayorista de RealStep con un pipeline de datos
basado en Excel. El frontend vive en `react-app/` y la raíz del repositorio
contiene el catálogo, el importador y sus pruebas.

## Arquitectura

```text
catalog/products.xlsx
        ↓
scripts/import-products.mjs
        ↓
generated/catalog.json
        ↓
react-app/
        ↓
react-app/dist
```

- `catalog/products.xlsx`: única fuente manual de datos comerciales.
- `generated/catalog.json`: artefacto determinista generado por el importador y
  única fuente de catálogo consumida por React.
- `tests/fixtures/catalog-baseline.json`: snapshot canónico del último catálogo
  comercial aprobado. No debe editarse manualmente.
- `react-app/`: código fuente de la única interfaz.
- `react-app/dist/`: build estático publicable; no se versiona.

## Requisitos

- Node.js.
- npm.
- Microsoft Excel o una aplicación compatible con archivos `.xlsx`.

## Instalación

Desde la raíz:

```powershell
npm install
npm --prefix react-app install
```

## Desarrollo

```powershell
npm run react:dev
```

La importación del Excel es deliberadamente explícita: desarrollo y build no
modifican el catálogo automáticamente.

## Actualización del catálogo

1. Editar `catalog/products.xlsx`.
2. Generar el JSON:

   ```powershell
   npm run import-products
   ```

3. Validar Excel y comprobar que el JSON esté actualizado:

   ```powershell
   npm run check-products
   ```

4. Revisar diferencias contra el último catálogo aprobado:

   ```powershell
   npm run compare-catalog
   ```

5. Revisar los cambios comerciales en Excel y JSON.
6. Solo después de su aprobación, actualizar deliberadamente el baseline:

   ```powershell
   npm run update-catalog-baseline
   ```

7. Ejecutar pruebas y build:

   ```powershell
   npm run test-importer
   npm run test-react
   npm run react:build
   ```

Excel, JSON y baseline deben versionarse juntos cuando se aprueba un cambio
comercial. `update-catalog-baseline` nunca es ejecutado automáticamente por
dev, build, importación o tests.

## Scripts

| Comando | Función |
|---|---|
| `npm run import-products` | Valida Excel y genera `generated/catalog.json`. |
| `npm run check-products` | Valida Excel y verifica el JSON actual sin escribir. |
| `npm run compare-catalog` | Compara JSON contra el baseline canónico. |
| `npm run update-catalog-baseline` | Reemplaza explícitamente el baseline aprobado. |
| `npm run test-importer` | Ejecuta las pruebas del pipeline. |
| `npm run test-react` | Ejecuta las pruebas del frontend. |
| `npm run react:test` | Alias compatible de `test-react`. |
| `npm run react:dev` | Inicia Vite en desarrollo. |
| `npm run react:build` | Genera `react-app/dist`. |
| `npm run react:preview` | Sirve localmente el build de producción. |

## Publicación

Configuración para hosting estático:

```text
Build command: npm run react:build
Publish directory: react-app/dist
```

No debe publicarse la raíz completa: contiene el Excel y herramientas del
pipeline. El build usa rutas relativas y puede alojarse bajo un subdirectorio.

## Autoría y protección técnica

Santiago Lareu es el autor, desarrollador y titular del software. RealStep es
el cliente y licenciatario autorizado. Esta relación se centraliza en
`react-app/src/config/company.js` y se refleja en el aviso legal del footer,
los metadatos HTML, los atributos `data-*` de la raíz de React y el archivo
público `ownership.json`.

Vite copia automáticamente `react-app/public/ownership.json` y
`react-app/public/_headers` a `react-app/dist`. El segundo configura en Netlify
la protección contra iframes externos y cabeceras de seguridad que no
interfieren con scripts, imágenes ni conexiones del catálogo.

Estas medidas dificultan la reutilización no autorizada y ayudan a rastrear
copias, pero no pueden impedir por completo que se extraiga el código frontend
que recibe el navegador. Si en el futuro se agrega una firma criptográfica, su
clave privada nunca deberá incluirse en `src`, `public`, `dist` ni Git.

## Rollback

El estado anterior al corte está preservado en el tag:

```text
pre-react-cutover
```

Para inspeccionarlo sin modificar ramas:

```powershell
git switch --detach pre-react-cutover
```

Para preparar una rama de recuperación:

```powershell
git switch -c rollback/pre-react pre-react-cutover
```

Antes de cambiar de estado, confirmar siempre que no existan cambios locales
sin guardar.

## Ejecucion por Consola

C:\Users\santl\OneDrive\Documents\catalogo_head\Catalogo_Head\realstep-head>

npm run react:dev

## Cambios en el Excel
El flujo normal, de ahora en adelante, queda así:

npm run import-products
npm run compare-catalog

Si los cambios son correctos y los aprobás:

npm run update-catalog-baseline
npm run test-importer
npm run test-react
npm run react:build

Como esos archivos aparecen modificados respecto de Git, cuando termines todas las validaciones conviene guardar el estado con un commit
