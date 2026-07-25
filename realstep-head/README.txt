REAL STEP · HEAD · VERSIÓN MODULAR COMPATIBLE

Esta versión funciona abriendo index.html con doble clic.

NO usa import/export ni requiere Live Server.

PARA MODIFICAR UNA ZAPATILLA
- js/data/calzado.js

PARA DEJAR UN TALLE SIN STOCK
Cambiar:
{ size: '9', inStock: true }

por:
{ size: '9', inStock: false }

PARA CAMBIAR EL CSS DEL CALZADO
- css/categories/calzado.css

PARA CAMBIAR EL CORREO RECEPTOR
- js/config/company.js

PARA AGREGAR OTRO MODELO
1. Copiar las imágenes a assets/products/
2. Copiar un objeto de producto dentro de RealStep.calzado en js/data/calzado.js
3. Cambiar id, category, name, code, price, images y sizes
4. Verificar que el id sea único y separar el nuevo objeto con una coma

IMPORTANTE
Los scripts se cargan en un orden específico dentro de index.html.
