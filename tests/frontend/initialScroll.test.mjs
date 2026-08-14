import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const mainPath = path.join(repoRoot, 'src/main.jsx');
const appPath = path.join(repoRoot, 'src/App.jsx');
const heroPath = path.join(repoRoot, 'src/components/layout/Hero.jsx');
const navigationPath = path.join(repoRoot, 'src/utils/navigation.js');
const thumbRailPath = path.join(repoRoot, 'src/components/product/ThumbnailRail.jsx');
const responsiveCssPath = path.join(repoRoot, 'src/styles/responsive.css');
const generatedCatalogPath = path.join(repoRoot, 'generated/catalog.json');
const baselineCatalogPath = path.join(repoRoot, 'tests/fixtures/catalog-baseline.json');

async function safeReadFile(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

const searchableExtensions = new Set(['.jsx', '.js', '.json', '.css']);

async function textHits(pattern, directory) {
  const hits = [];

  try {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        hits.push(...await textHits(pattern, entryPath));
        continue;
      }
      if (!entry.isFile() || !searchableExtensions.has(path.extname(entry.name))) continue;
      const lines = (await readFile(entryPath, 'utf8')).split(/\r?\n/);
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          hits.push(`${entryPath}:${index + 1}:${line}`);
        }
      });
    }
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  return hits;
}

test('#inicio apunta al Hero correcto', async () => {
  const heroSource = await readFile(heroPath, 'utf8');
  assert.match(
    heroSource,
    /<section className="hero" id="inicio">/,
    'Hero.jsx debe exportar un <section className="hero" id="inicio">'
  );

  const navigationSource = await readFile(navigationPath, 'utf8');
  assert.match(
    navigationSource,
    /getCatalogTargetIds[\s\S]*new Set\(\[?\s*['"]inicio['"]/,
    'getCatalogTargetIds debe incluir "inicio" en el set inicial'
  );

  const dataCatalog = await safeReadFile(path.join(repoRoot, 'src/data/catalog.js'));
  if (dataCatalog !== null) {
    assert.doesNotMatch(
      dataCatalog,
      /["']id["']\s*:\s*["']inicio["']/,
      'src/data/catalog.js no debe contener un id "inicio" en datos'
    );
    assert.doesNotMatch(
      dataCatalog,
      /["']target["']\s*:\s*["']inicio["']/,
      'src/data/catalog.js no debe contener un target "inicio" en datos'
    );
  }

  const heroHitLines = await textHits(/id=["']inicio["']/, path.join(repoRoot, 'src'));
  assert.equal(
    heroHitLines.length,
    1,
    `Debe existir exactamente un id="inicio" en src/; hits encontrados:\n${heroHitLines.join('\n')}`
  );
  assert.match(
    heroHitLines[0],
    /Hero\.jsx/,
    `El único id="inicio" debe estar en Hero.jsx; hit: ${heroHitLines[0]}`
  );
});

test('No hay IDs inicio duplicados en el repositorio', async () => {
  const directories = [
    path.join(repoRoot, 'src'),
    path.join(repoRoot, 'generated'),
    path.join(repoRoot, 'tests/fixtures'),
    path.join(repoRoot, 'public')
  ];

  const allHits = [];
  for (const directory of directories) {
    try {
      allHits.push(...await textHits(/id=["']inicio["']/, directory));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  assert.equal(
    allHits.length,
    1,
    `Debe existir exactamente un id="inicio" en src/, generated/, tests/fixtures/ y public/; hits:\n${allHits.join('\n')}`
  );
  assert.match(allHits[0], /Hero\.jsx/);

  const generatedCatalog = await safeReadFile(generatedCatalogPath);
  if (generatedCatalog !== null) {
    assert.doesNotMatch(
      generatedCatalog,
      /"id"\s*:\s*"inicio"/,
      'generated/catalog.json no debe contener un id "inicio"'
    );
    assert.doesNotMatch(
      generatedCatalog,
      /"target"\s*:\s*"inicio"/,
      'generated/catalog.json no debe contener un target "inicio"'
    );
  }

  const baselineCatalog = await safeReadFile(baselineCatalogPath);
  if (baselineCatalog !== null) {
    assert.doesNotMatch(
      baselineCatalog,
      /"id"\s*:\s*"inicio"/,
      'tests/fixtures/catalog-baseline.json no debe contener un id "inicio"'
    );
    assert.doesNotMatch(
      baselineCatalog,
      /"target"\s*:\s*"inicio"/,
      'tests/fixtures/catalog-baseline.json no debe contener un target "inicio"'
    );
  }
});

test('URL base inicia arriba: scrollRestoration manual y scroll instantáneo en mount', async () => {
  const mainSource = await readFile(mainPath, 'utf8');
  const manualIndex = mainSource.indexOf("window.history.scrollRestoration = 'manual'");
  const createRootIndex = mainSource.indexOf('createRoot(rootElement).render(');

  assert.notEqual(
    manualIndex,
    -1,
    'src/main.jsx debe setear window.history.scrollRestoration = \'manual\' antes del render'
  );
  assert.notEqual(
    createRootIndex,
    -1,
    'src/main.jsx debe mantener el createRoot(rootElement).render(...)'
  );
  assert.ok(
    manualIndex < createRootIndex,
    'window.history.scrollRestoration = \'manual\' debe aparecer ANTES de createRoot(...) en main.jsx'
  );

  const appSource = await readFile(appPath, 'utf8');

  assert.match(
    appSource,
    /navigateToCurrentHash\(\s*'instant'\s*\)/,
    'App.jsx debe invocar navigateToCurrentHash con \'instant\' en el mount del effect'
  );
  assert.doesNotMatch(
    appSource,
    /navigateToCurrentHash\(\s*'auto'\s*\)/,
    'App.jsx no debe invocar navigateToCurrentHash con \'auto\' en el mount'
  );

  const effectMatch = appSource.match(
    /useEffect\(\(\)\s*=>\s*\{[\s\S]*?navigateToCurrentHash\(['"]instant['"]\)[\s\S]*?\}\s*,\s*\[([^\]]*)\]\s*\);/
  );
  assert.ok(
    effectMatch,
    'App.jsx debe tener un useEffect que ejecute navigateToCurrentHash(\'instant\') con array de dependencias explícito'
  );
  const deps = effectMatch[1].trim();
  assert.equal(
    deps,
    '',
    `El useEffect de CatalogApplication debe tener dependencias []; se encontró [${deps}]`
  );

  assert.doesNotMatch(
    appSource,
    /window\.history\.scrollRestoration\s*=/,
    'App.jsx no debe asignar window.history.scrollRestoration (responsabilidad migrada a main.jsx)'
  );

  assert.match(
    appSource,
    /validTargetIdsRef\.current/,
    'App.jsx debe exponer validTargetIds actualizado vía validTargetIdsRef.current'
  );
  assert.match(
    appSource,
    /useRef\(validTargetIds\)/,
    'App.jsx debe inicializar validTargetIdsRef con useRef(validTargetIds)'
  );
});

test('Navegación interna a #inicio desde otra sección vuelve correctamente al Hero', async () => {
  const navigationSource = await readFile(navigationPath, 'utf8');

  assert.match(
    navigationSource,
    /scrollToHashTarget\([\s\S]*?scrollIntoView\(\s*\{\s*behavior\s*\}\s*\)/,
    'navigation.js debe invocar scrollIntoView con { behavior }'
  );

  const pushStateConditional = navigationSource.match(
    /if\s*\(\s*updateHash\s*&&[\s\S]*?window\.history\.pushState/
  );
  assert.ok(
    pushStateConditional,
    'navigation.js debe condicionar pushState a updateHash === true'
  );

  const appSource = await readFile(appPath, 'utf8');
  assert.match(
    appSource,
    /addEventListener\(\s*['"]hashchange['"]\s*,\s*handleHashNavigation\s*\)/,
    'App.jsx debe registrar el listener hashchange contra handleHashNavigation'
  );
  assert.match(
    appSource,
    /handleHashNavigation[^}]*navigateToCurrentHash\(\s*['"]smooth['"]\s*\)/s,
    'App.jsx debe hacer que handleHashNavigation invoque navigateToCurrentHash(\'smooth\')'
  );

  const heroSource = await readFile(heroPath, 'utf8');
  assert.match(
    heroSource,
    /<section[^>]*id="inicio"/,
    'Hero.jsx debe seguir exportando un <section id="inicio">'
  );

  const responsiveCss = await readFile(responsiveCssPath, 'utf8');
  assert.match(
    responsiveCss,
    /\.hero\s*\{\s*scroll-margin-top:\s*calc\(var\(--header-height,\s*72px\)\s*\+\s*8px\)\s*;?\s*\}/,
    'responsive.css debe definir .hero{ scroll-margin-top: calc(var(--header-height, 72px) + 8px); }'
  );
});


test('ThumbnailRail no desplaza la ventana vertical al montar o cambiar imagen', async () => {
  const source = await readFile(thumbRailPath, 'utf8');

  assert.doesNotMatch(
    source,
    /scrollIntoView/,
    'ThumbnailRail.jsx no debe usar scrollIntoView (puede arrastrar la ventana vertical)'
  );

  assert.doesNotMatch(
    source,
    /window\.scrollTo|window\.scroll\b/,
    'ThumbnailRail.jsx no debe llamar window.scrollTo/scroll'
  );

  assert.match(
    source,
    /container\.scrollLeft\s*=/,
    'ThumbnailRail.jsx debe centrar el thumbnail activo usando container.scrollLeft'
  );

  assert.match(
    source,
    /containerRef\s*=\s*useRef/,
    'ThumbnailRail.jsx debe declarar containerRef con useRef'
  );

  assert.match(
    source,
    /<div[^>]*className="thumbs"[^>]*ref=\{containerRef\}/,
    'ThumbnailRail.jsx debe asignar containerRef al contenedor .thumbs'
  );

  assert.match(
        source,
        /\[imageIndex\]\s*\)/,
        'ThumbnailRail.jsx debe tener el useEffect con deps [imageIndex]'
      );
});

test('No queda instrumentación temporal en src/', async () => {
  const srcDir = path.join(repoRoot, 'src');
  const hits = await textHits(
    /TEMP SCROLL DEBUG|scroll-debug|ENABLE_THUMB_SCROLL/,
    srcDir
  );
  assert.equal(
    hits.length,
    0,
    `No debe quedar instrumentación temporal en src/. Hits:\n${hits.join('\n')}`
  );
});
