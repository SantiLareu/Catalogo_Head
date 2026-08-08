---
name: operate-catalog-importer
description: Analizar, validar y mantener el pipeline de catálogo RealStep desde Excel hasta JSON y baseline. Usar ante tareas sobre catalog/products.xlsx, scripts/import-products.mjs, scripts/catalog-import/, generated/catalog.json, tests/fixtures/catalog-baseline.json, validaciones, determinismo o relaciones de categorías, productos, variantes, imágenes, talles, stock y características.
---

# Operar el importador del catálogo

## Fuentes y artefactos

- Tratar `catalog/products.xlsx` como la única fuente manual.
- Tratar `generated/catalog.json` como salida generada.
- Tratar `tests/fixtures/catalog-baseline.json` como snapshot comercial aprobado.
- No editar JSON generado ni baseline manualmente.
- Leer `catalog/README.md` antes de operar el pipeline.

## Contrato del workbook

Preservar las hojas `Categorias`, `Productos`, `Variantes`, `Imagenes`, `Stock`,
`Caracteristicas` y `Listas`.

- Rechazar fórmulas.
- Preservar valores literales e IDs exactos.
- Validar claves foráneas antes de construir el catálogo.
- Detectar duplicados y relaciones huérfanas.
- Validar rutas de imágenes contra archivos existentes.
- Mantener orden estable y salida determinista.
- No inventar códigos, precios, stock, imágenes ni relaciones faltantes.
- No convertir advertencias en datos supuestos.

## Modelo generado

- Preservar `schemaVersion`, `stockIsAvailabilityOnly`, categorías jerárquicas,
  productos, variantes, imágenes, talles, disponibilidad y características.
- Mantener la relación producto/variante/imagen/stock.
- Mantener fallos de validación antes de cualquier escritura.
- Escribir de forma segura sólo después de validar el catálogo completo.
- Mantener equivalencia entre importación real y comprobación en memoria.

## Flujo sin escritura

```powershell
npm run check-products
npm run compare-catalog
npm run test-importer
```

`compare-catalog` devuelve error cuando existen diferencias; interpretar ese
resultado como señal de revisión, no como fallo técnico automático.

## Flujo autorizado de actualización

Sólo cuando la tarea autorice cambiar datos:

```powershell
npm run check-products
npm run import-products
npm run check-products
npm run compare-catalog
npm run test-importer
npm run test-react
npm run react:build
git diff --check
```

Revisar el diff completo de Excel, JSON y resultados del comparador. Ejecutar
`npm run update-catalog-baseline` únicamente después de aprobación consciente
del cambio comercial.

## Riesgos

- No interpretar disponibilidad como inventario cuantitativo cuando
  `stockIsAvailabilityOnly` sea `true`.
- No corregir IDs con espacios finales sin una migración aprobada.
- No aprobar cambios masivos de orden como si fueran irrelevantes.
- No ejecutar importación, baseline o build firmado durante una auditoría de sólo lectura.
- No modificar imágenes o datos comerciales fuera del alcance solicitado.
