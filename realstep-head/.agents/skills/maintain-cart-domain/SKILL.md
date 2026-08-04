---
name: maintain-cart-domain
description: Mantener el dominio de carrito, reconciliación, disponibilidad y checkout de RealStep. Usar ante cambios en CartContext, cartReducer, cartStorage, cartReconciliation, selección comprable, líneas legacy, stockIsAvailabilityOnly, validaciones de checkout, precios, totales o construcción y envío transitorio del pedido.
---

# Mantener carrito y dominio comercial

## Preparación

1. Leer `AGENTS.md`.
2. Leer las secciones de reconciliación, datos y seguridad de `PROJECT_CONTEXT.md`.
3. Inspeccionar `cartReducer.js`, `cartStorage.js`, `cartReconciliation.js`,
   `CartContext.jsx` y las pruebas relacionadas.
4. Tratar las pruebas de carrito y checkout como contratos de compatibilidad.

## Invariantes de líneas

- Identificar una línea por producto, variante literal y talle literal.
- Preservar `productId`, `variantId`, `size`, `quantity` y `priceSnapshot`.
- Preservar espacios y valores legacy en identificadores.
- No persistir nombres, imágenes, precios vigentes o totales como autoridad.
- Resolver datos comerciales desde el catálogo activo.
- Normalizar sólo aquello que el contrato existente normaliza.
- No eliminar silenciosamente líneas que dejaron de ser válidas.

## Reconciliación

Conservar los estados `available`, `product_removed`, `variant_removed`,
`size_unavailable`, `unavailable` y `price_changed`.

- Marcar problemas y bloquear checkout cuando una línea requiere revisión.
- Recalcular totales con precios vigentes resolubles.
- Exigir reconocimiento ante cambios de precio.
- Mantener la reconciliación determinista e idempotente.
- Conservar el último catálogo válido ante fallos de red o contenido inválido.

## Disponibilidad y stock

- Leer `stockIsAvailabilityOnly` desde el catálogo activo.
- Cuando sea `true`, interpretar stock positivo como disponibilidad binaria.
- No limitar la cantidad solicitada al número de stock en ese modo.
- Bloquear cualquier cantidad cuando el talle esté agotado o no disponible.
- Aplicar validación cuantitativa sólo cuando `stockIsAvailabilityOnly` sea `false`.
- Respetar `stockMode: "none"` y `stockMode: "size"`.

## Checkout

- Forzar una comprobación vigente del catálogo antes del envío.
- Bloquear el envío ante catálogo no verificable o reconciliación pendiente.
- Construir líneas y totales desde el catálogo vigente.
- Escapar datos incorporados al HTML del correo.
- Evitar doble envío concurrente.
- No vaciar carrito ni reiniciar selección ante error.
- Vaciar y reiniciar únicamente después de éxito completo.
- Preservar la recuperación del envío parcial al propietario y cliente.
- Mantener explícito que el pedido no confirma stock ni procesa pagos.

## Seguridad y compatibilidad

- No tratar `localStorage` ni datos del navegador como confiables.
- No presentar reconciliación frontend como seguridad server-side.
- Mantener compatibilidad con carritos guardados sin `priceSnapshot`.
- Agregar casos de regresión para cualquier cambio de contrato.
- No preparar estructuras de backend dentro del frontend.

## Verificación

Ejecutar:

```powershell
npm run test-react
npm run react:build
git diff --check
```

Incluir pruebas para producto, variante o talle removido; precio cambiado;
disponibilidad binaria; stock cuantitativo si se modifica ese modo; líneas
legacy; fallo y éxito de checkout; y reconciliación repetida.
