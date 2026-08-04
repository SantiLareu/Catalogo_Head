# Mapa operativo de Codex

Este archivo orienta la selección de contexto. No reemplaza `AGENTS.md`,
`PROJECT_CONTEXT.md` ni la documentación técnica del repositorio.

## Fuentes de verdad

- Reglas permanentes: `AGENTS.md`
- Arquitectura, estado y roadmap: `PROJECT_CONTEXT.md`
- Operación general: `README.md`
- Esquema y flujo del catálogo: `catalog/README.md`
- Firma y publicación: `docs/integrity-signing.md`
- Contratos ejecutables: pruebas de `tests/` y `react-app/tests/`

Ante una contradicción, comprobar primero el código y las pruebas actuales.
Actualizar documentación desactualizada sólo cuando la tarea lo incluya.

## Selección de Skills

### `develop-react-frontend`

Usar para cambios en componentes, hooks de interfaz, reducers de selección,
CSS, navegación, responsive, accesibilidad, UX o comportamiento visual dentro
de `react-app/`.

No usar como Skill principal para modificar reglas del carrito o del catálogo.

### `maintain-cart-domain`

Usar para cambios en `CartContext`, reducers o persistencia del carrito,
reconciliación, disponibilidad, líneas legacy, checkout y construcción del pedido.

Puede combinarse con `develop-react-frontend` cuando la tarea también cambia UI.

### `operate-catalog-importer`

Usar para cambios en `catalog/products.xlsx`, validación o importación, scripts
de `scripts/catalog-import/`, `generated/catalog.json`, baseline y relaciones
entre productos, variantes, imágenes, talles y stock.

### `validate-release`

Usar al preparar o revisar una entrega, build firmado o publicación.
Esta Skill valida; no autoriza commit, push, deploy ni rotación de claves.

### `analyze-performance`

Usar para problemas de lentitud, renders innecesarios, bundle, imágenes, layout
shift, Core Web Vitals, Lighthouse, optimización de carga o rendimiento de la
galería y el catálogo.

No usar automáticamente en cada cambio frontend.

Puede combinarse con `develop-react-frontend`, `maintain-cart-domain` y
`validate-release`.

### `review-architecture`

Usar para auditorías, refactors grandes, deuda técnica, evaluación de
responsabilidades, decisiones de estructura y análisis previo a cambios
arquitectónicos.

Trabajar en modo de sólo lectura por defecto. Puede combinarse con cualquier
otra Skill, pero no habilita implementación por sí sola.

### `design-future-backend`

Usar solamente para tareas explícitas de diseño o implementación del backend
futuro. No usar para refactors preventivos del frontend.

## Combinaciones habituales

- UI de carrito: `develop-react-frontend` + `maintain-cart-domain`
- Cambio de stock y su visualización: `operate-catalog-importer` + `maintain-cart-domain`
- Release con cambios de catálogo: `operate-catalog-importer` + `validate-release`
- Release frontend: `develop-react-frontend` + `validate-release`
- Auditoría frontend: `review-architecture` + `develop-react-frontend`
- Rendimiento del catálogo: `analyze-performance` + `develop-react-frontend`
- Rendimiento del carrito: `analyze-performance` + `maintain-cart-domain`
- Refactor del carrito: `review-architecture` + `maintain-cart-domain`
- Evaluación previa al backend: `review-architecture` + `design-future-backend`

Cargar únicamente las Skills necesarias para la tarea.
