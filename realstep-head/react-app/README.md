# Frontend React

Aplicación React + Vite del catálogo Real Step. Importa
`../generated/catalog.json` y recursos compartidos desde `../assets/`.

Detalles internos:

- `src/data/catalog.js` es el único punto de entrada del catálogo.
- `vite.config.js` usa `base: './'` para generar rutas relativas.
- `src/config/` contiene la configuración pública usada por el frontend.
- El build publicable se genera en `dist/`.

Los comandos de instalación, validación, desarrollo y publicación están
documentados en el `README.md` de la raíz.
