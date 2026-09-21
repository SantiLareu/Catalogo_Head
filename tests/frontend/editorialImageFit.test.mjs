import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  assertEditorialCoverImageFit,
  getCategoryEditorialCover
} from '../../src/config/categoryEditorialCovers.js';

const baseUrl = 'https://catalog.example/realstep/';

test('imageFit admite cover y contain', () => {
  assert.equal(assertEditorialCoverImageFit('cover', 'ejemplo'), 'cover');
  assert.equal(assertEditorialCoverImageFit('contain', 'ejemplo'), 'contain');
});

test('imageFit ausente se conserva tal cual', () => {
  assert.equal(assertEditorialCoverImageFit(undefined, 'ejemplo'), undefined);
  assert.equal(assertEditorialCoverImageFit(null, 'ejemplo'), null);
});

test('imageFit inválido se rechaza sin degradación silenciosa', () => {
  assert.throws(
    () => assertEditorialCoverImageFit('fill', 'ejemplo'),
    /Ajuste de imagen editorial inválido/
  );
  assert.throws(
    () => assertEditorialCoverImageFit('', 'ejemplo'),
    /Ajuste de imagen editorial inválido/
  );
});

test('la portada de preventa usa el comportamiento cover por defecto', () => {
  const cover = getCategoryEditorialCover(
    'paletas-padel-preventa-2026',
    baseUrl
  );

  assert.equal(cover.imageFit, undefined);
  assert.ok(cover.image.startsWith(baseUrl));
});

test('las portadas existentes sin imageFit conservan su comportamiento', () => {
  const cover = getCategoryEditorialCover('calzado', baseUrl);

  assert.equal(cover.imageFit, undefined);
  assert.equal(cover.mode, 'replace');
});

test('el componente aplica object-fit solo cuando hay imageFit', async () => {
  const source = await readFile(
    new URL(
      '../../src/components/catalog/CategoryEditorialCover.jsx',
      import.meta.url
    ),
    'utf8'
  );

  assert.match(source, /imageFit/);
  assert.match(source, /objectFit: imageFit/);
  assert.match(source, /style=\{imageStyle\}/);
  assert.match(source, /imageFit \? \{ objectFit: imageFit \} : undefined/);
  assert.match(source, /loading="lazy"/);
  assert.match(source, /decoding="async"/);
});
