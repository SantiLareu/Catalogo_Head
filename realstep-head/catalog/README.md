# Catálogo de productos

`products.xlsx` será la fuente manual de productos para la futura
aplicación React. Durante la Etapa 1 la aplicación clásica sigue leyendo
los archivos JavaScript de `js/data`.

## Hojas

- `Categorias`: jerarquía, estado, targets y filtros.
- `Productos`: datos generales y orden global.
- `Variantes`: colores, códigos y precios opcionales.
- `Imagenes`: imágenes de producto o variante.
- `Stock`: disponibilidad por talle.
- `Caracteristicas`: ficha técnica normalizada por filas.
- `Listas`: valores permitidos para validaciones; permanece oculta.

## Stock inicial

La fuente JavaScript actual solo informa disponibilidad:

- `inStock: true` se migró como `stock: 1`.
- `inStock: false` se migró como `stock: 0`.

Esto no significa que exista una sola unidad. El JSON generado incluye
`"stockIsAvailabilityOnly": true`; una interfaz futura debe interpretar
el stock únicamente como disponible/no disponible hasta que se carguen
cantidades reales.

## Comandos

```text
npm run import-products
npm run check-products
npm run compare-products
npm run test-importer
```

El importador rechaza fórmulas. Todos los valores del workbook deben ser
literales.

`seed-products-workbook` existe únicamente para reproducir el bootstrap
inicial desde los JavaScript legacy. Por seguridad no sobrescribe un
`products.xlsx` existente; `--force` debe reservarse para reconstruir
deliberadamente ese bootstrap y descartaría cambios manuales del Excel.
