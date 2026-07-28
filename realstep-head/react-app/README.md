# Shell React · Etapa 2

Esta carpeta contiene una aplicación React + Vite aislada de la versión clásica.
Eliminar `react-app/` no afecta `index.html`, `js/`, `css/` ni los datos clásicos.

## Fuente de datos

La aplicación importa estáticamente `../generated/catalog.json`. No mantiene una
copia propia: primero se ejecuta el importador de la raíz y luego React consume el
resultado generado.

```powershell
npm run import-products
npm run react:dev
npm run react:build
npm run react:preview
```

También se pueden ejecutar `npm run dev`, `npm run build` y `npm run preview`
desde esta carpeta.

No hay hooks `predev` ni `prebuild`: la importación es explícita durante esta
etapa.

## Orden de estilos

`src/main.jsx` carga las hojas en este orden:

1. `css/base/variables.css`, compartida con la aplicación clásica.
2. `css/base/reset.css`, compartida con la aplicación clásica.
3. `src/styles/shell.css`, layout mínimo y exclusivo de la shell.

Vite permite estos imports compartidos mediante `server.fs.allow` y genera rutas
relativas gracias a `base: './'`.
