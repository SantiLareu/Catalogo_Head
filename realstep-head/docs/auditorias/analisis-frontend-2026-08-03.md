# Auditoría técnica del frontend — RealStep HEAD

**Fecha:** 2026-08-03
**Alcance:** análisis de solo lectura sobre `react-app/` con foco en componentes UI, flujo de carrito, estado de estilos y animaciones, y oportunidades de mejora visual sin alterar la lógica funcional.
**Restricciones del análisis:** sin modificar archivos, sin instalar paquetes, sin agregar librerías de animación, sin cambiar lógica de carrito, modelo de datos, importador, ni flujo de pedido.

---

## A. Mapa de componentes y archivos

La aplicación utiliza componentes React con CSS global plano. No se observaron CSS Modules, archivos `.module.css` ni un framework CSS declarado. La entrada global de estilos está en `react-app/src/main.jsx`, que importa los archivos CSS en un orden explícito.

| Sección UI | Archivos JSX principales | CSS asociado | Notas y relaciones observadas |
|---|---|---|---|
| Header y navegación principal | `src/components/layout/Header.jsx` | `src/styles/header.css`, `src/styles/responsive.css`, `src/styles/reset.css`, `src/styles/variables.css` | Header sticky con marca, buscador, contacto, menú de categorías y botón "Pedido". Renderiza condicionalmente `CategoryMenu`, `CartDrawer` y `CheckoutModal`. |
| Marca / logo | `src/components/layout/Header.jsx` | `header.css` | El logo se resuelve con `new URL('../../../../assets/Real_Step_logo.jpeg', import.meta.url)`. |
| Buscador de productos | `src/components/search/ProductSearch.jsx` | `src/styles/search.css`, `responsive.css` | Integrado en el Header y afecta navegación y posible resaltado de productos. |
| Menú de categorías responsive | `src/components/categories/CategoryMenu.jsx` | `header.css`, `category-index.css`, `responsive.css` | Se presenta como diálogo fullscreen con panel lateral. Usa `useBodyScrollLock` y `useFocusTrap`. |
| Hero / portada | `src/components/layout/Hero.jsx` | `src/styles/hero.css`, `responsive.css` | Sección `#inicio`, con texto "REALSTEP PRESENTA", título HEAD e imagen de portada. |
| Índice principal de categorías | `src/components/categories/CategoryIndex.jsx`, `CategoryGroup.jsx`, `CategoryLink.jsx` | `src/styles/category-index.css`, `responsive.css` | Soporta categorías simples y grupos desplegables. `CategoryGroup` controla `aria-expanded`, submenú y cantidad de hijos mediante la custom property `--category-submenu-count`. |
| Secciones del catálogo | `src/components/catalog/CatalogSections.jsx`, `CatalogSection.jsx` | `src/styles/product.css`, `hero.css`, `category-index.css`, `responsive.css` | `CatalogSections` construye las secciones mediante `buildCatalogSections`. Cada sección contiene su encabezado y una lista de `ProductCard`. |
| Tarjeta de producto | `src/components/product/ProductCard.jsx` | `src/styles/product.css`, `responsive.css`, `variables.css` | Es el componente coordinador de selección, galería, lightbox, especificaciones y carrito. |
| Información de producto | `src/components/product/ProductInfo.jsx`, `ProductPrice.jsx`, `Specifications.jsx` | `product.css` | `ProductInfo` recibe los controles mediante la prop `controls`. `Specifications` se muestra dentro de la tarjeta y puede expandirse. |
| Galería principal | `src/components/product/ProductGallery.jsx` | `product.css`, `responsive.css` | Imagen principal, navegación anterior/siguiente y apertura de lightbox. Soporta teclado con flechas izquierda/derecha. |
| Miniaturas | `src/components/product/ThumbnailRail.jsx` | `product.css`, `responsive.css` | Las miniaturas son botones con estado `active`. Al cambiar la imagen ejecutan `scrollIntoView({ behavior: 'smooth' })`. |
| Lightbox | `src/components/lightbox/Lightbox.jsx` | `src/styles/lightbox.css`, `responsive.css` | Se monta mediante `createPortal` en `document.body`. Incluye navegación, cierre, contador, zoom, paneo, gestos táctiles y focus trap. |
| Selector de variante / color | `src/components/product/VariantSelector.jsx` | `product.css` | Renderiza swatches como botones. Usa estilo inline para `backgroundImage` o `backgroundColor`. |
| Selector de talle | `src/components/product/SizeSelector.jsx` | `product.css`, `responsive.css` | Solo aparece cuando `stockMode === 'size'` y existen talles. Los talles sin disponibilidad quedan deshabilitados. |
| Selector de cantidad | `src/components/product/QuantitySelector.jsx` | `product.css`, `responsive.css` | Botones `−` y `+`, con valor dentro de un `<output aria-live="polite">`. |
| Botón "Agregar al pedido" | `src/components/product/ProductActions.jsx`, lógica en `ProductCard.jsx` | `product.css` | `ProductActions` solo presenta el botón; la validación y creación de la línea ocurren en `ProductCard.addToCart`. |
| Acceso flotante al carrito | `src/components/layout/Header.jsx` | `header.css`, `responsive.css` | El botón `.cart` permanece en el Header sticky y muestra `units` como contador. |
| Panel del carrito | `src/components/cart/CartDrawer.jsx` | `src/styles/cart.css`, `responsive.css` | Drawer lateral en portal. Usa bloqueo de scroll, focus trap y retorno del foco al botón de apertura. |
| Ítems del carrito | `src/components/cart/CartItem.jsx` | `cart.css`, `responsive.css` | Renderiza imagen, nombre, variante, talle, SKU, precio unitario, cantidad, total de línea y posibles inconsistencias de reconciliación. |
| Resumen del carrito | `src/components/cart/CartSummary.jsx` | `cart.css`, `product.css` | Muestra unidades, total y botón "CONTINUAR". Bloquea la continuación cuando hay problemas de catálogo o reconciliación. |
| Checkout / confirmación | `src/components/checkout/CheckoutModal.jsx`, `CheckoutForm.jsx`, `CheckoutActions.jsx`, `CheckoutStatus.jsx`, `OrderPreview.jsx` | `src/styles/checkout.css`, `cart.css`, `product.css` | Modal de checkout en portal. La interacción de envío se mantiene en React y `emailService.js`. |
| Avisos al agregar | `src/components/feedback/Toast.jsx` | `cart.css` | Toast global con estado `show`, duración de 2400 ms y `aria-live="polite"`. |
| Footer y contacto | `src/components/layout/Footer.jsx` | `src/styles/footer.css`, `responsive.css` | Incluye enlaces de contacto y leyenda de propiedad. |
| Sistema base visual | — | `src/styles/variables.css`, `reset.css` | Variables de color, sombras y reset global. `reset.css` define además `scroll-behavior: smooth`. |

### Estructura observada de una tarjeta

`ProductCard.jsx` compone cada tarjeta en esta secuencia:

1. `<article className="product">`
2. `ProductGallery`
3. `ProductInfo`
   - categoría
   - código
   - nombre
   - descripción
   - precio
   - `VariantSelector`
   - `SizeSelector`
   - `QuantitySelector`
   - `ProductActions`
4. `Specifications`
5. `Lightbox`, renderizado condicionalmente cuando `lightboxOpen` es verdadero.

La tarjeta mantiene selección local mediante `useProductSelection`, mientras que el carrito se obtiene desde `useCart`.

---

## B. Flujo actual para agregar un producto al carrito

### 1. Selección previa del producto

`ProductCard.jsx` invoca:

```js
useProductSelection(product, resetVersion)
```

El hook administra un estado local con esta forma:

```js
{
  variantId,
  size,
  quantity,
  imageIndex
}
```

El reducer correspondiente está en `react-app/src/hooks/productSelectionReducer.js`.

Acciones observadas:

- `SELECT_VARIANT`
- `SELECT_SIZE`
- `SET_IMAGE`
- `NEXT_IMAGE`
- `PREVIOUS_IMAGE`
- `INCREMENT_QUANTITY`
- `DECREMENT_QUANTITY`
- `RESET_SELECTION`

Cambiar la variante reinicia talle, cantidad e imagen. Cambiar el talle reinicia la cantidad a `1`.

### 2. Click en "AGREGAR AL PEDIDO"

El botón se renderiza en `react-app/src/components/product/ProductActions.jsx`. El componente recibe `onAdd={addToCart}` desde `ProductCard.jsx`.

`addToCart` ejecuta validaciones en este orden:

1. Si el producto tiene variantes pero no hay una variante activa → muestra "Seleccioná un color" y enfoca el primer botón de variante.
2. Si el producto requiere talle → verifica `product.stockMode === 'size'`, valida disponibilidad, muestra el aviso y devuelve el foco al control.
3. Valida que la cantidad sea un entero ≥ 1.
4. Construye la línea del carrito:

```js
const line = { productId: product.id };
if (variant) line.variantId = variant.id;
if (requiresSize) line.size = state.size;
line.quantity = state.quantity;
line.priceSnapshot = price;
```

La línea conserva identificadores, talle, cantidad y snapshot de precio. El nombre, imagen, código y precio mostrado se resuelven posteriormente a partir del catálogo activo.

### 3. Dispatch al reducer del carrito

`ProductCard.jsx` obtiene `addLine` desde `useCart.js` / `CartContext.jsx`. En `CartContext.jsx`, `addLine` ejecuta:

```js
dispatch({ type: cartActions.ADD_LINE, line })
```

El reducer está en `react-app/src/reducers/cartReducer.js`. La acción `ADD_LINE` calcula la clave mediante:

```js
createLineKey(line) // [productId, variantId || null, size || null]
```

Si no existe una línea equivalente, agrega la nueva línea. Si ya existe, suma la cantidad a la línea existente. Dos líneas con el mismo producto, variante y talle se consolidan en una sola entrada.

### 4. Estado que cambia

Estado principal modificado: `CartProvider` → `usePersistentCart` → `lines`.

A partir de `lines` se calculan mediante reconciliación:

- `reconciliation`
- `units`
- `total`
- `checkoutBlocked`
- posibles cambios de precio o disponibilidad

Además, el contexto mantiene: `toast`, `resetVersion`, `catalogStatus`, `activeCatalog`.

Al agregar un producto normalmente cambian:

- `lines` (dispatch `ADD_LINE`)
- valores derivados `units` y `total`
- `toast` mediante `showToast`

### 5. Persistencia

`usePersistentCart.js` escribe las líneas en `localStorage` cuando cambia `lines`. Servicios asociados:

- `react-app/src/hooks/usePersistentCart.js`
- `react-app/src/services/cartStorage.js`

La persistencia es local y transitoria. La arquitectura documentada en `PROJECT_CONTEXT.md` aclara que `localStorage` no es una autoridad confiable y que la validación server-side futura todavía no está implementada.

### 6. Render del contador

`Header.jsx` obtiene `units` desde `useCart()` y muestra:

```jsx
<span aria-hidden="true">{units}</span>
```

La etiqueta accesible del botón se actualiza a `Abrir pedido, N unidades`. El contador se actualiza por render de React cuando cambia el valor derivado `units`. No se observó un estado independiente específico para animar el contador.

### 7. Aviso visual

Después de ejecutar `addLine`, `ProductCard.jsx` llama a `showToast(...)`. `CartContext.jsx` limpia el temporizador anterior, actualiza `toast` y programa su limpieza después de 2400 ms. `Toast.jsx` aplica la clase `toast show`. El componente se monta globalmente desde `App.jsx`.

### 8. Cómo se muestra actualmente el carrito

El carrito no es una página independiente. Se muestra como un drawer lateral:

```
Header.jsx
  └── CartDrawer.jsx
        ├── CartItem.jsx
        └── CartSummary.jsx
```

Se monta mediante `createPortal(..., document.body)`. Antes de abrirlo, `Header.openCart` ejecuta `checkCatalog()`. El drawer:

- ocupa toda la pantalla con un fondo oscuro;
- desplaza un panel desde la derecha;
- bloquea el scroll del body;
- mantiene el foco dentro del diálogo;
- devuelve el foco al botón que lo abrió al desmontarse.

---

## C. Estado actual de estilos y animaciones

### Inventario de estilos

CSS plano global. Archivos:

```
react-app/src/styles/variables.css
react-app/src/styles/reset.css
react-app/src/styles/header.css
react-app/src/styles/search.css
react-app/src/styles/hero.css
react-app/src/styles/category-index.css
react-app/src/styles/product.css
react-app/src/styles/lightbox.css
react-app/src/styles/cart.css
react-app/src/styles/checkout.css
react-app/src/styles/footer.css
react-app/src/styles/responsive.css
```

La importación se realiza desde `src/main.jsx`.

No se observaron CSS Modules. Sí existen estilos inline en `VariantSelector.jsx` (background de swatches), en `CategoryGroup.jsx` (custom property `--category-submenu-count`) y en `Lightbox.jsx` (transformaciones inline para zoom y paneo interactivos, no declaradas mediante librería).

### Keyframes existentes

Dos animaciones con `@keyframes`:

- `product-search-highlight` en `product.css` — destaca un producto posiblemente alcanzado desde el buscador.
- `category-menu-in` en `header.css` — entrada del panel del menú con desplazamiento horizontal y opacidad.

### Transiciones existentes

- Apertura del drawer (`.drawer`, `.dpanel`)
- Aparición del toast (`.toast`)
- Modal de checkout (`.modal`)
- Navegación de galería (`.gallery-nav`)
- Controles del lightbox (`.lightbox-close`, `.lightbox-nav`)
- Índice de categorías (padding, color, fondo, rotación de flecha, apertura de submenús)
- Estados de hover y foco del índice
- Resultados del buscador
- Botones de navegación y swatches

### Estados hover existentes

Hay hover definido en:

- Enlaces de contacto del Header
- Botones de navegación de galería
- Swatches de variante
- Toggle de especificaciones
- Ítems del índice de categorías
- Subítems de categorías
- Enlace de contacto del menú lateral
- Resultados del buscador
- Botones de navegación y cierre del lightbox

No se observó un hover específico sobre `.product` que eleve, desplace o modifique visualmente toda la tarjeta. Tampoco se observó un efecto dedicado para el botón `.primary`, salvo estados de foco y disabled.

### `prefers-reduced-motion`

Soporte parcial. Se observaron dos bloques:

1. En `product.css`: desactiva la animación de resaltado de producto.
2. En `header.css`: desactiva la animación de entrada del menú de categorías.

No se observó una regla global. Siguen sin cubrirse explícitamente:

- Drawer del carrito
- Toast
- Modal de checkout
- Apertura de submenús
- Navegación de galería
- Controles del lightbox
- `scroll-behavior: smooth` global
- `scrollIntoView({ behavior: 'smooth' })` de miniaturas

### Librerías de animación

`package.json` declara únicamente, entre sus dependencias relevantes:

```
react
react-dom
@emailjs/browser
```

Entre las devDependencies se observan Vite y el plugin de React.

No se observó ninguna librería de animaciones declarada o importada (Framer Motion, Motion, React Spring, GSAP o equivalente). Las animaciones actuales se implementan con CSS transitions, CSS keyframes, clases condicionales de React y transformaciones inline en el lightbox.

---

## D. Oportunidades de mejora visual

Las siguientes oportunidades preservan el modelo actual del carrito y la selección de producto. Se priorizan intervenciones de bajo riesgo y con una dirección visual coherente con la interfaz existente: base editorial, monocromática, tipografía de alto contraste y acento rojo definido por `--a`.

### Prioridad 1 — Aparición progresiva de tarjetas y secciones

- **Dónde:** `.catalog-section`, `.list`, `.product` en `product.css` y `responsive.css`.
- **Cambio:** entrada discreta basada en `opacity` y `transform`, con cadencia corta y opcionalmente escalonada por tarjeta.
- **Tipo:** CSS-only si se aplica al render inicial general; React o mixto si se requiere activar la animación al entrar al viewport.
- **Riesgo:** bajo para carga inicial; medio para Intersection Observer.
- **Observación:** una animación global de entrada puede ser suficiente para aportar jerarquía sin animar cada control individualmente. Conviene evitar grandes desplazamientos porque las tarjetas son voluminosas y contienen imágenes.

### Prioridad 2 — Hover refinado de tarjeta

- **Dónde:** `.product` en `product.css`.
- **Cambio:** transición sutil de sombra, borde o elevación; opcionalmente un cambio mínimo de fondo en la imagen principal.
- **Tipo:** CSS-only.
- **Riesgo:** bajo.
- **Observación:** debe evitar modificar el flujo del documento con `margin` o cambios de tamaño. Preferir `transform: translateY(...)` de baja magnitud y `box-shadow`, cuidando el rendimiento en catálogos largos.

### Prioridad 3 — Cambio de imagen más perceptible

- **Dónde:** `.mainimg img`, `.thumb`, `.gallery-nav` en `product.css`.
- **Cambio:** transición de opacidad o crossfade visual al cambiar de índice.
- **Tipo:** CSS-only si la imagen actual se mantiene en el mismo elemento; React/mixto si se busca crossfade entre imagen anterior y nueva.
- **Riesgo:** bajo para fade simple; medio para crossfade con dos imágenes simultáneas.
- **Observación:** `ProductGallery` ya cambia `imageIndex` mediante React. No se debe alterar la lógica del reducer de selección. El cambio visual debería tolerar imágenes con distinta relación de aspecto sin causar layout shift.

### Prioridad 4 — Feedback de selección de variante

- **Dónde:** `.variant-swatch`, `.variant-swatch.selected` en `product.css`.
- **Cambio:** transición de borde, outline y posiblemente un pequeño indicador interno para diferenciar el estado seleccionado.
- **Tipo:** CSS-only.
- **Riesgo:** bajo.
- **Observación:** el estado ya está expresado mediante la clase `selected` y `aria-pressed`, por lo que no se requiere modificar React para una mejora visual básica.

### Prioridad 5 — Feedback de selección de talle

- **Dónde:** `.size`, `.size.sel`, `.size:disabled` en `product.css`.
- **Cambio:** transición de borde, fondo y color; diferenciación más clara entre seleccionado, disponible y sin stock.
- **Tipo:** CSS-only.
- **Riesgo:** bajo.
- **Observación:** no se debe cambiar la lógica de disponibilidad ni eliminar el texto "Sin stock". El estado accesible actual debe permanecer en `aria-pressed` y `disabled`.

### Prioridad 6 — Interacción de botones

- **Dónde:** `.primary`, `.qty button`, `.cart`, `.menu-toggle`, controles del lightbox.
- **Cambio:** estados `:hover`, `:active` y transiciones de color, sombra u opacidad. Puede incluirse una respuesta táctil visual breve con `transform: scale(...)` muy limitado.
- **Tipo:** CSS-only.
- **Riesgo:** bajo.
- **Observación:** mantener siempre un foco visible. No usar transformaciones que reduzcan el área efectiva de controles pequeños en móvil.

### Prioridad 7 — Confirmación al agregar un producto

- **Dónde:** `Toast.jsx`, `cart.css`.
- **Cambio:** mejorar jerarquía visual del toast, añadir indicador lateral con el color de acento, sombra más definida o una entrada desde abajo.
- **Tipo:** CSS-only para la transición actual; React/mixto si se desea contenido adicional, iconografía o una variante semántica específica.
- **Riesgo:** bajo.
- **Observación:** el toast ya tiene clase condicional `show` y duración gestionada en React. No es necesario tocar el flujo funcional para una mejora de presentación.

### Prioridad 8 — Apertura y cierre del carrito

- **Dónde:** `cart.css` (`.drawer`, `.back`, `.dpanel`).
- **Cambio:** suavizar la relación entre opacidad del backdrop y desplazamiento del panel; añadir una transición diferenciada para el fondo y el panel.
- **Tipo:** CSS-only.
- **Riesgo:** bajo.
- **Observación:** el drawer actualmente ya tiene la estructura necesaria: clase `open`, panel desplazado, portal y focus trap. El cierre ocurre por desmontaje del componente, por lo que una animación de salida visible podría requerir React.

### Prioridad 9 — Animación de salida del carrito

- **Dónde:** `Header.jsx`, `CartDrawer.jsx`, `cart.css`.
- **Cambio:** mantener montado el drawer durante la transición de cierre y aplicar una clase de salida antes de desmontarlo.
- **Tipo:** React / mixto.
- **Riesgo:** medio.
- **Motivo:** actualmente `CartDrawer` solo existe mientras `cartOpen` es verdadero. Al cerrar, se desmonta inmediatamente, por lo que CSS por sí solo no puede garantizar una animación de salida completa.

### Prioridad 10 — Cambio del contador del carrito

- **Dónde:** `Header.jsx`, `header.css`.
- **Cambio:** resaltar brevemente el círculo del contador cuando cambie `units`.
- **Tipo:** CSS-only si existe una clase o atributo que cambie; React si se necesita detectar explícitamente el valor anterior y activar una clase temporal.
- **Riesgo:** bajo para una clase derivada simple; medio para lógica de detección y temporización.
- **Observación:** `units` ya se actualiza correctamente, pero no existe un estado visual específico para distinguir un cambio de contador de un render normal.

### Prioridad 11 — Apertura y cierre del lightbox

- **Dónde:** `lightbox.css`, `ProductCard.jsx`, `Lightbox.jsx`.
- **Cambio:** entrada suave del backdrop y escala ligera de la imagen al abrir.
- **Tipo:** CSS-only para entrada; React/mixto para salida.
- **Riesgo:** bajo para entrada; medio para salida.
- **Observación:** el lightbox ya tiene `className="lightbox open"` y se monta con portal. La salida requiere mantenerlo montado durante la transición.

### Prioridad 12 — Alineación de reduced motion

- **Dónde:** principalmente `reset.css`, `product.css`, `category-index.css`, `cart.css`, `checkout.css`, `lightbox.css`, `header.css`.
- **Cambio:** centralizar una política de reducción de movimiento que desactive transiciones, keyframes y scroll suave cuando corresponda.
- **Tipo:** CSS-only para transiciones y animaciones CSS; React/JavaScript para `scrollIntoView` y navegación suave.
- **Riesgo:** bajo, con posible impacto transversal.
- **Observación:** actualmente el soporte es parcial. Se debe revisar que una regla global no interfiera con el feedback indispensable de foco o estados de error.

### Clasificación CSS-only vs React/JS

| Cambio | Tipo |
|---|---|
| Aparición de tarjetas (carga inicial) | CSS-only |
| Aparición de tarjetas (viewport) | React / mixto |
| Hover de tarjeta | CSS-only |
| Fade de imagen | CSS-only / mixto |
| Crossfade de imagen | React / mixto |
| Feedback de variante y talle | CSS-only |
| Hover/active de botones | CSS-only |
| Toast: entrada y jerarquía | CSS-only |
| Toast: variantes semánticas | React / mixto |
| Drawer: entrada | CSS-only |
| Drawer: salida animada | React / mixto |
| Contador: highlight | CSS-only / mixto |
| Lightbox: entrada | CSS-only |
| Lightbox: salida animada | React / mixto |
| Reduced motion CSS | CSS-only |
| Reduced motion scroll | React / JavaScript |

---

## E. Riesgos detectados

1. **Layout shift por animaciones de tamaño:** las tarjetas contienen imágenes, controles y paneles de distinta altura. No conviene animar `height: auto`, `padding` de bloques estructurales, cambios de grid, dimensiones de imagen ni aparición de especificaciones modificando abruptamente el flujo. `.mainimg` ya tiene alturas responsive definidas que deben respetarse.
2. **Desmontaje inmediato de overlays:** `CartDrawer`, `Lightbox`, `CategoryMenu` y `CheckoutModal` se renderizan condicionalmente. Esto permite animar fácilmente la entrada, pero no necesariamente la salida. Una transición de cierre completa requiere introducir clase de salida, esperar el fin de la transición y recién después desmontar el componente. Ese cambio sí tocaría React y debe preservar focus trap, bloqueo de scroll y restauración de foco.
3. **Accesibilidad y movimiento reducido:** el proyecto tiene focus traps y etiquetas ARIA en los diálogos. Una animación no debe ocultar visualmente un diálogo mientras sigue siendo navegable, modificar el orden de foco, eliminar `aria-live`, quitar `outline` de `:focus-visible`, producir desplazamientos excesivos ni ignorar `prefers-reduced-motion`. La política actual de reduced motion no es global. Además, `scrollIntoView({ behavior: 'smooth' })` requiere intervención JavaScript.
4. **Animación de tarjetas en catálogos largos:** aplicar animaciones a todas las tarjetas al mismo tiempo puede generar coste inicial de composición, parpadeo o distracción, tiempos largos de espera percibida y problemas en dispositivos móviles de gama baja. Conviene preferir una entrada breve y limitada, sin múltiples efectos simultáneos por tarjeta.
5. **Imágenes y rendimiento:** la galería utiliza `will-change: transform` (justificado para zoom y paneo). No conviene extender `will-change` a todas las tarjetas o imágenes del catálogo. También debe evitarse animar propiedades costosas como `width`, `height`, `top`, `left` o `box-shadow` de forma masiva.
6. **Cambio de variante y reinicio de selección:** en `productSelectionReducer.js`, `SELECT_VARIANT` reinicia talle, cantidad e índice de imagen. La mejora visual puede acompañar el cambio, pero no debe asumir que solo cambió la imagen. Un efecto de transición no debe reintroducir valores anteriores ni modificar el dispatch.
7. **Estado del contador:** el contador deriva de la reconciliación del carrito. No es un estado independiente. Si se introduce una animación React para detectar cambios, se debe distinguir entre incremento por `ADD_LINE`, suma de cantidad a una línea existente, hidratación desde `localStorage`, reconciliación del catálogo y limpieza al completar checkout. Animar cualquier cambio de `units` puede generar feedback inesperado durante la hidratación o una actualización de catálogo.
8. **Toast compartido:** el toast se utiliza para más situaciones que agregar productos: variante faltante, talle faltante, talle sin disponibilidad, cantidad inválida, errores de validación del catálogo y confirmación de pedido enviado. Una animación o estilo especializado para "producto agregado" podría requerir introducir una variante semántica en el estado, lo que sería un cambio React, no solo visual.
9. **Scroll y navegación por hash:** `App.jsx` navega a destinos mediante hash y scroll suave. Las tarjetas y secciones tienen `scroll-margin-top` para compensar el Header sticky. Cambios de entrada por scroll deben respetar la navegación directa a hashes, el foco programático de productos, la altura variable del Header en móvil y los márgenes de scroll existentes.
10. **Contraste y estética:** la interfaz actual usa negro, blanco, grises y un acento rojo (`--a`). Las mejoras deberían mantener esa dirección visual editorial y deportiva. No sería coherente introducir gradientes genéricos, colores decorativos arbitrarios o efectos excesivamente brillantes que contradigan el carácter monocromático de la aplicación.

---

## F. Plan sugerido en tareas pequeñas y verificables

### 1. Inventariar y normalizar tokens de movimiento

- **Objetivo:** definir duraciones y curvas coherentes para microinteracciones sin modificar la lógica funcional.
- **Archivos:** `src/styles/variables.css`, posiblemente `src/styles/reset.css`.
- **Tipo:** CSS-only.
- **Verificación:** las transiciones existentes siguen funcionando y utilizan una escala consistente de duración; no cambia el layout.
- **Riesgo:** bajo.

### 2. Mejorar hover, focus y active de controles existentes

- **Objetivo:** dar feedback visual consistente a botones, swatches, talles, selector de cantidad y botón principal.
- **Archivos:** `src/styles/product.css`, `src/styles/header.css`, `src/styles/cart.css`, `src/styles/lightbox.css`.
- **Tipo:** CSS-only.
- **Verificación:** todos los controles mantienen foco visible, hover claro y estado disabled legible en desktop y móvil.
- **Riesgo:** bajo.

### 3. Añadir una elevación sutil a la tarjeta de producto

- **Objetivo:** mejorar la jerarquía de cada tarjeta sin alterar sus dimensiones.
- **Archivos:** `src/styles/product.css`.
- **Tipo:** CSS-only.
- **Verificación:** el producto no cambia de posición en el flujo ni produce desplazamiento de otras tarjetas; el efecto se limita a `transform`, sombra o borde.
- **Riesgo:** bajo.

### 4. Mejorar la transición de selección de imágenes

- **Objetivo:** hacer más claro el cambio entre miniatura e imagen principal.
- **Archivos:** `src/styles/product.css`.
- **Tipo:** CSS-only en la primera iteración.
- **Verificación:** seleccionar una miniatura actualiza inmediatamente la imagen correcta; no se altera `imageIndex`, el teclado ni el lightbox.
- **Riesgo:** bajo.

### 5. Mejorar la selección de variante y talle

- **Objetivo:** reforzar visualmente los estados seleccionado, disponible, no disponible y foco.
- **Archivos:** `src/styles/product.css`, opcionalmente `responsive.css`.
- **Tipo:** CSS-only.
- **Verificación:** `aria-pressed`, `disabled`, color y talle seleccionado continúan coincidiendo; no se reinicia ni modifica lógica de selección.
- **Riesgo:** bajo.

### 6. Refinar toast de confirmación

- **Objetivo:** mejorar la presencia visual del aviso sin cambiar su duración ni su semántica.
- **Archivos:** `src/styles/cart.css`.
- **Tipo:** CSS-only.
- **Verificación:** el toast aparece y desaparece mediante la clase existente `.show`, conserva `role="status"` y no bloquea interacción.
- **Riesgo:** bajo.

### 7. Refinar la apertura del drawer del carrito

- **Objetivo:** mejorar la entrada combinada del backdrop y el panel lateral.
- **Archivos:** `src/styles/cart.css`.
- **Tipo:** CSS-only.
- **Verificación:** el drawer conserva `role="dialog"`, focus trap, bloqueo de scroll, botón de cierre y retorno de foco.
- **Riesgo:** bajo.

### 8. Alinear reduced motion para CSS

- **Objetivo:** cubrir globalmente las animaciones y transiciones CSS más relevantes.
- **Archivos:** `reset.css`, `header.css`, `category-index.css`, `product.css`, `cart.css`, `checkout.css`, `lightbox.css`.
- **Tipo:** CSS-only.
- **Verificación:** con `prefers-reduced-motion: reduce`, no se ejecutan keyframes ni transiciones decorativas; los estados de foco, error y selección siguen siendo perceptibles.
- **Riesgo:** bajo a medio por el alcance transversal.

### 9. Adaptar scroll suave a reduced motion

- **Objetivo:** evitar scroll animado cuando el usuario solicita reducir movimiento.
- **Archivos:** `src/App.jsx`, `src/components/product/ThumbnailRail.jsx`, posiblemente `src/utils/navigation.js`.
- **Tipo:** React / JavaScript.
- **Verificación:** navegación por hash y desplazamiento de miniaturas funcionan, usando comportamiento instantáneo cuando corresponde y suave en el resto.
- **Riesgo:** medio.

### 10. Añadir resaltado visual del contador

- **Objetivo:** comunicar que el pedido cambió después de agregar o modificar una unidad.
- **Archivos:** `src/components/layout/Header.jsx`, `src/styles/header.css`.
- **Tipo:** mixto.
- **Verificación:** el número y la etiqueta accesible siguen siendo correctos; la animación no se dispara de forma molesta durante hidratación o reconciliación.
- **Riesgo:** medio.

### 11. Evaluar animación de salida del drawer

- **Objetivo:** permitir que el cierre del carrito tenga una salida visual completa.
- **Archivos:** `src/components/layout/Header.jsx`, `src/components/cart/CartDrawer.jsx`, `src/styles/cart.css`.
- **Tipo:** mixto.
- **Verificación:** el panel termina su transición antes de desmontarse; el body recupera scroll y el foco vuelve al botón de apertura sin quedar atrapado.
- **Riesgo:** medio.

### 12. Evaluar entrada y salida del lightbox

- **Objetivo:** hacer más refinada la apertura de la vista ampliada.
- **Archivos:** `src/components/product/ProductCard.jsx`, `src/components/lightbox/Lightbox.jsx`, `src/styles/lightbox.css`.
- **Tipo:** mixto si se requiere salida animada; CSS-only para una entrada básica.
- **Verificación:** zoom, paneo, navegación por teclado, gestos táctiles, focus trap y retorno de foco permanecen funcionales.
- **Riesgo:** medio.

### 13. Añadir aparición progresiva de tarjetas solo después de estabilizar microinteracciones

- **Objetivo:** mejorar la percepción de carga y jerarquía del catálogo.
- **Archivos:** inicialmente `src/styles/product.css` y `responsive.css`; opcionalmente `CatalogSection.jsx` o un hook específico si se implementa por viewport.
- **Tipo:** CSS-only en una primera variante; React/mixto para Intersection Observer.
- **Verificación:** el catálogo sigue siendo usable sin esperar la animación, no hay layout shift significativo y el comportamiento es correcto al navegar por hash.
- **Riesgo:** bajo para carga inicial; medio para activación por viewport.

### 14. Revisión manual responsive y de accesibilidad

- **Objetivo:** validar las mejoras en los puntos donde el CSS ya cambia estructuralmente el layout.
- **Archivos:** ninguno necesariamente; es una tarea de verificación.
- **Tipo:** verificación visual y manual.
- **Verificación:** revisar al menos desktop, tablet y móvil; comprobar teclado, foco, reduced motion, drawer, lightbox, checkout, selector de talle, toast y contador.
- **Riesgo:** bajo como tarea de análisis, pero indispensable antes de aceptar cambios visuales.
