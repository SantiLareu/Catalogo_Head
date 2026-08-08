import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { companyConfig } from '../../src/config/company.js';
import {
  buildFooterCopy,
  buildWhatsappUrl,
  normalizeInstagramUrl
} from '../../src/config/contactLinks.js';
import { normalizeSpecifications } from '../../src/data/catalogSelectors.js';
import {
  assertEditorialCoverMode,
  categoryEditorialCovers,
  getCategoryEditorialCover,
  resolveEditorialImageUrl
} from '../../src/config/categoryEditorialCovers.js';

test('normaliza ficha con campos textiles y lista de características', () => {
  const specifications = normalizeSpecifications({
    mainFabric: '100% algodón',
    secondFabric: 'Poliéster',
    features: ['Secado rápido', 'Protección UV']
  });
  assert.deepEqual(specifications.map(({ label }) => label), [
    'MAIN FABRIC', '2ND FABRIC', 'FEATURES'
  ]);
  assert.deepEqual(specifications[2].values, ['Secado rápido', 'Protección UV']);
  assert.deepEqual(normalizeSpecifications(null), []);
});

test('configura portadas para todas las categorías principales previstas', () => {
  assert.deepEqual(Object.keys(categoryEditorialCovers).sort(), [
    'accesorios-medias',
    'bolsos-mochilas',
    'calzado',
    'indumentaria-dama',
    'indumentaria-hombre',
    'paletas-padel',
    'pelotas',
    'pelotas-squash',
    'pop',
    'raquetas-squash',
    'raquetas-tenis',
    'ski',
    'snowboard'
  ]);
  assert.equal(categoryEditorialCovers['accesorios-medias'].mode, 'prepend');
  assert.ok(Object.entries(categoryEditorialCovers).every(([id, cover]) =>
    id === 'accesorios-medias' || cover.mode === 'replace'
  ));
  assert.ok(Object.values(categoryEditorialCovers).every((cover) =>
    cover.image === null || cover.image.startsWith('editorial/')
  ));
});

test('resuelve imágenes editoriales contra la base de publicación', () => {
  assert.equal(
    resolveEditorialImageUrl(
      'editorial/calzado.jpg',
      'https://catalog.example/realstep/'
    ),
    'https://catalog.example/realstep/editorial/calzado.jpg'
  );
  assert.equal(resolveEditorialImageUrl(null, 'https://catalog.example/realstep/'), null);
  assert.throws(
    () => resolveEditorialImageUrl('/editorial/calzado.jpg', 'https://catalog.example/realstep/'),
    /relativa a la base/
  );
});

test('rechaza modos editoriales inválidos sin degradación silenciosa', () => {
  assert.equal(assertEditorialCoverMode('replace', 'calzado'), 'replace');
  assert.equal(assertEditorialCoverMode('prepend', 'accesorios-medias'), 'prepend');
  assert.throws(
    () => assertEditorialCoverMode('otro', 'calzado'),
    /Modo de portada editorial inválido/
  );
});

test('portada omite imagen nula y aplica src y alt cuando están configurados', async () => {
  const cover = await readFile(
    new URL('../../src/components/catalog/CategoryEditorialCover.jsx', import.meta.url),
    'utf8'
  );
  assert.match(cover, /\{image \? \(/);
  assert.match(cover, /<img alt=\{imageAlt\} src=\{image\} \/>/);
  assert.match(cover, /category-editorial-cover--without-image/);
});

test('composición replace y prepend conserva sección, ancla y productos', async () => {
  const section = await readFile(
    new URL('../../src/components/catalog/CatalogSection.jsx', import.meta.url),
    'utf8'
  );
  assert.match(section, /editorialCover\?\.mode === 'replace'/);
  assert.match(section, /\{editorialCover \? <CategoryEditorialCover/);
  assert.match(section, /\{replacesHeading \? null : <CategoryHeading/);
  assert.match(section, /id=\{category\.target\}/);
  assert.match(section, /data-catalog-category=\{category\.id\}/);
  assert.match(section, /tabIndex="-1"/);
  assert.match(section, /products\.map/);
  assert.match(section, /<ProductCard/);
});

test('no agrega portadas a subcategorías no solicitadas', () => {
  assert.equal(
    getCategoryEditorialCover('accesorios-antivibrador', 'https://catalog.example/realstep/'),
    null
  );
});

test('la ficha queda cerrada por defecto y como hermana posterior del panel', async () => {
  const card = await readFile(
    new URL('../../src/components/product/ProductCard.jsx', import.meta.url),
    'utf8'
  );
  const info = await readFile(
    new URL('../../src/components/product/ProductInfo.jsx', import.meta.url),
    'utf8'
  );
  const specifications = await readFile(
    new URL('../../src/components/product/Specifications.jsx', import.meta.url),
    'utf8'
  );
  assert.ok(card.indexOf('<ProductInfo') < card.indexOf('<Specifications'));
  assert.doesNotMatch(info, /Specifications/);
  assert.match(card, /useState\(false\)/);
  assert.match(card, /expanded=\{specificationsOpen\}/);
  assert.match(card, /setSpecificationsOpen\(\(open\) => !open\)/);
  assert.match(card, /product--specifications-open/);
});

test('usa botón accesible, contenido condicional y conserva listas completas', async () => {
  const specifications = await readFile(
    new URL('../../src/components/product/Specifications.jsx', import.meta.url),
    'utf8'
  );
  assert.match(specifications, /return null/);
  assert.match(specifications, /<button/);
  assert.match(specifications, /type="button"/);
  assert.match(specifications, /aria-expanded=\{expanded\}/);
  assert.match(specifications, /aria-controls=\{contentId\}/);
  assert.match(specifications, /expanded \? 'Ocultar ficha técnica' : 'Ver ficha técnica'/);
  assert.match(specifications, /\{expanded \? \(/);
  assert.match(specifications, /<section/);
  assert.match(specifications, /<ul>/);
  assert.match(specifications, /<li key=/);
});

test('cambio de producto y foco en otra tarjeta cierran la ficha abierta', async () => {
  const card = await readFile(
    new URL('../../src/components/product/ProductCard.jsx', import.meta.url),
    'utf8'
  );
  assert.match(card, /\[product\.id\]/);
  assert.match(card, /document\.addEventListener\('focusin'/);
  assert.match(card, /focusedProduct !== productRef\.current/);
  assert.match(card, /setSpecificationsOpen\(false\)/);
});

test('cada producto genera un ID único para el contenido controlado', async () => {
  const { getProductTargetId } = await import('../../src/utils/navigation.js');
  const first = `${getProductTargetId('producto uno')}-specifications`;
  const second = `${getProductTargetId('producto dos')}-specifications`;
  assert.notEqual(first, second);
  assert.match(first, /^producto-.+-specifications$/);
});

test('contactos vacíos permanecen ocultables y no generan enlaces', () => {
  assert.equal(normalizeInstagramUrl(''), null);
  assert.equal(buildWhatsappUrl(''), null);
  if (companyConfig.contact.instagramUrl) {
    assert.ok(normalizeInstagramUrl(companyConfig.contact.instagramUrl));
  }
  if (companyConfig.contact.whatsappNumber) {
    assert.ok(buildWhatsappUrl(
      companyConfig.contact.whatsappNumber,
      companyConfig.contact.whatsappMessage
    ));
  }
});

test('Instagram solo acepta una URL HTTPS explícita', () => {
  assert.equal(
    normalizeInstagramUrl(' https://www.instagram.com/ejemplo '),
    'https://www.instagram.com/ejemplo'
  );
  assert.equal(normalizeInstagramUrl('http://www.instagram.com/ejemplo'), null);
  assert.equal(normalizeInstagramUrl('https://example.com/ejemplo'), null);
  assert.equal(normalizeInstagramUrl('@ejemplo'), null);
});

test('texto principal y aviso legal se construyen desde configuración', () => {
  assert.deepEqual(buildFooterCopy({
    companyName: 'Empresa Demo',
    ownership: { developer: 'Dev Demo', owner: 'Titular Demo', copyrightYear: 2030 },
    license: { licensedTo: 'Cliente Demo' }
  }), {
    primary: 'Empresa Demo Catalog — Powered by Dev Demo',
    legal: '© 2030 Titular Demo. Licenciado para uso de Cliente Demo.'
  });
});

test('WhatsApp exige dígitos y codifica el mensaje en el enlace oficial', () => {
  const url = buildWhatsappUrl('5491112345678', 'Hola, catálogo & stock');
  assert.equal(
    url,
    'https://wa.me/5491112345678?text=Hola%2C+cat%C3%A1logo+%26+stock'
  );
  assert.equal(buildWhatsappUrl('+54 9 11 1234-5678', 'Hola'), null);
});

test('footer usa configuración, conserva aviso legal y asegura enlaces externos', async () => {
  const source = await readFile(
    new URL('../../src/components/layout/Footer.jsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /buildFooterCopy\(companyConfig\)/);
  assert.match(source, /instagramUrl \|\| whatsappUrl/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /<footer id="contacto">/);
  assert.match(source, /function InstagramIcon/);
  assert.match(source, /function WhatsappIcon/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /focusable="false"/);
  assert.match(source, /<InstagramIcon \/>\s*<span>Instagram<\/span>/);
  assert.match(source, /<WhatsappIcon \/>\s*<span>WhatsApp<\/span>/);
  assert.doesNotMatch(source, />RealStep</);
  assert.doesNotMatch(source, /href=""/);
});

test('contactos e iconos se omiten juntos cuando falta su destino', async () => {
  const source = await readFile(
    new URL('../../src/components/layout/Footer.jsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /\{instagramUrl \? \([\s\S]*?<InstagramIcon \/>[\s\S]*?\) : null\}/);
  assert.match(source, /\{whatsappUrl \? \([\s\S]*?<WhatsappIcon \/>[\s\S]*?\) : null\}/);
});

test('Header y menú móvil ofrecen un enlace real al footer', async () => {
  const header = await readFile(
    new URL('../../src/components/layout/Header.jsx', import.meta.url),
    'utf8'
  );
  const menu = await readFile(
    new URL('../../src/components/categories/CategoryMenu.jsx', import.meta.url),
    'utf8'
  );
  assert.match(header, /<a className="contact-link contact-link--desktop" href="#contacto">/);
  assert.match(menu, /<a className="category-menu-contact" href="#contacto" onClick=\{close\}>/);
});

test('estilos mantienen contacto e iconos adaptables sin clases huérfanas', async () => {
  const headerCss = await readFile(
    new URL('../../src/styles/header.css', import.meta.url),
    'utf8'
  );
  const footerCss = await readFile(
    new URL('../../src/styles/footer.css', import.meta.url),
    'utf8'
  );
  assert.match(headerCss, /\.contact-link--desktop\{display:none\}/);
  assert.match(headerCss, /\.category-menu-contact:focus-visible/);
  assert.match(footerCss, /\.footer-contact svg\{/);
  assert.match(footerCss, /fill:currentColor/);
  assert.match(footerCss, /scroll-margin-top:88px/);
});

test('CSS ubica la ficha a ancho completo y desactiva sticky al abrir', async () => {
  const css = await readFile(
    new URL('../../src/styles/product.css', import.meta.url),
    'utf8'
  );
  assert.match(css, /\.product-specifications\{\s*grid-column:1 \/ -1/);
  assert.doesNotMatch(css, /\.product-specifications\{[^}]*\bheight:/s);
  assert.match(css, /\.product--specifications-open \.panel\{position:static\}/);
  assert.match(css, /\.product-specifications-toggle:focus-visible/);
});
