REAL STEP · HEAD · VERSIÓN MODULAR COMPATIBLE

Esta versión funciona abriendo index.html con doble clic.

NO usa import/export ni requiere Live Server.

PARA MODIFICAR UNA ZAPATILLA
- js/data/calzado/ace-m1.js
- js/data/calzado/ace-m2.js

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
1. Crear un archivo en js/data/calzado/
2. Usar RealStep.calzado.push({...})
3. Agregar su <script> en index.html antes de js/data/products.js

IMPORTANTE
Los scripts se cargan en un orden específico dentro de index.html.
