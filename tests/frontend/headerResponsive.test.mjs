import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const headerCssUrl = new URL(
  '../../src/styles/header.css',
  import.meta.url
);
const exportCssUrl = new URL(
  '../../src/styles/export.css',
  import.meta.url
);
const searchCssUrl = new URL(
  '../../src/styles/search.css',
  import.meta.url
);
const resetCssUrl = new URL('../../src/styles/reset.css', import.meta.url);
const responsiveCssUrl = new URL(
  '../../src/styles/responsive.css',
  import.meta.url
);
const headerJsxUrl = new URL(
  '../../src/components/layout/Header.jsx',
  import.meta.url
);

const headerCss = await readFile(headerCssUrl, 'utf8');
const exportCss = await readFile(exportCssUrl, 'utf8');
const searchCss = await readFile(searchCssUrl, 'utf8');
const resetCss = await readFile(resetCssUrl, 'utf8');
const responsiveCss = await readFile(responsiveCssUrl, 'utf8');
const headerJsx = await readFile(headerJsxUrl, 'utf8');

test('la columna de marca puede encogerse en mobile sin forzar overflow', () => {
  assert.match(
    headerCss,
    /grid-template-columns:minmax\(0,1fr\) auto/,
    'la grilla mobile del header debe usar minmax(0,1fr) para que brand ceda'
  );
  assert.match(
    headerCss,
    /\.top > \*\{min-width:0\}/,
    'los items de la grilla deben poder encogerse'
  );
});

test('el texto de marca trunca con ellipsis en vez de ensanchar la página', () => {
  assert.ok(
    headerCss.includes('text-overflow:ellipsis'),
    'brand-text debe truncar con ellipsis en mobile'
  );
});

test('exportar colapsa a solo icono en mobile chico y conserva texto en desktop', () => {
  assert.match(
    exportCss,
    /@media\(max-width:480px\)/,
    'debe existir breakpoint mobile chico para el botón export'
  );
  assert.match(
    exportCss,
    /\.export-button\{\s*width:44px/,
    'en mobile chico el botón export debe ser cuadrado táctil de 44px'
  );
  assert.match(
    exportCss,
    /\.export-button-short\{\s*display:none/,
    'en mobile chico se oculta el texto corto y queda solo el icono'
  );
  assert.ok(
    headerJsx.includes('className="export-button-full"'),
    'desktop debe conservar el texto completo Exportar a Excel'
  );
  assert.ok(
    headerJsx.includes('className="export-button-short"'),
    'tablet debe conservar el texto corto Excel'
  );
});

test('el botón export icon-only conserva su nombre accesible', () => {
  assert.ok(
    headerJsx.includes('aria-label="Exportar catálogo a Excel"'),
    'sin texto visible el botón necesita aria-label'
  );
});

test('el header mobile conserva hamburguesa, pedido y buscador', () => {
  assert.ok(headerJsx.includes('menu-toggle'), 'falta botón hamburguesa');
  assert.ok(headerJsx.includes('className="cart"'), 'falta botón Pedido');
  assert.ok(headerJsx.includes('<ProductSearch'), 'falta el buscador');
});

test('el buscador ocupa la segunda fila completa en mobile', () => {
  assert.match(
    searchCss,
    /grid-column:1 \/ -1/,
    'el buscador debe extenderse a todo el ancho en la segunda fila'
  );
});

test('el overflow se corrige en origen, sin ocultarlo globalmente', () => {
  assert.doesNotMatch(
    resetCss,
    /overflow-x\s*:\s*hidden/,
    'reset.css no debe ocultar overflow horizontal global'
  );
  assert.doesNotMatch(
    responsiveCss,
    /overflow-x\s*:\s*hidden/,
    'responsive.css no debe ocultar overflow horizontal global'
  );
  assert.doesNotMatch(
    exportCss,
    /overflow-x\s*:\s*hidden/,
    'export.css no debe ocultar overflow horizontal global'
  );
  const headerOverflowX = headerCss.match(/overflow-x/g) ?? [];
  assert.equal(
    headerOverflowX.length,
    1,
    'header.css solo admite el overflow-x del panel del menú de categorías'
  );
  assert.ok(
    headerCss.includes('.category-menu-panel'),
    'el único overflow-x debe pertenecer al panel del menú'
  );
});
