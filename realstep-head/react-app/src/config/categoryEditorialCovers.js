const validCoverModes = new Set(['replace', 'prepend']);

export const categoryEditorialCovers = {
  'paletas-padel': {
    title: 'Paletas',
    subtitle: null,
    image: 'editorial/portada-paletas.png',
    imageAlt: '',
    mode: 'replace'
  },
  calzado: {
    title: 'Calzado',
    subtitle: null,
    image: 'editorial/zapatilla-head-motion-pro-padel-273614-7.jpg',
    imageAlt: '',
    mode: 'replace'
  },
  'indumentaria-hombre': {
    title: 'Indumentaria Hombre',
    subtitle: null,
    image: 'editorial/indumentaria-hombre.jpeg',
    imageAlt: '',
    mode: 'replace'
  },
  'indumentaria-dama': {
    title: 'Indumentaria Dama',
    subtitle: null,
    image: 'editorial/Screenshot 2026-08-05 110753.png',
    imageAlt: '',
    mode: 'replace'
  },
  'raquetas-squash': {
    title: 'Raquetas Squash',
    subtitle: null,
    image: null,
    imageAlt: '',
    mode: 'replace'
  },
  'raquetas-tenis': {
    title: 'Raquetas Tenis',
    subtitle: null,
    image: 'editorial/portada-tenis.png',
    imageAlt: '',
    mode: 'replace'
  },
  'bolsos-mochilas': {
    title: 'Bolsos',
    subtitle: null,
    image: 'editorial/portada-bolsos.png',
    imageAlt: '',
    mode: 'replace'
  },
  pelotas: {
    title: 'Pelotas',
    subtitle: null,
    image: 'editorial/portada-pelotas.png',
    imageAlt: '',
    mode: 'replace'
  },
  'pelotas-squash': {
    title: 'Pelotas Squash',
    subtitle: null,
    image: null,
    imageAlt: '',
    mode: 'replace'
  },
  ski: {
    title: 'Ski',
    subtitle: null,
    image: null,
    imageAlt: '',
    mode: 'replace'
  },
  pop: {
    title: 'Pop',
    subtitle: null,
    image: null,
    imageAlt: '',
    mode: 'replace'
  },
  snowboard: {
    title: 'Snowboard',
    subtitle: null,
    image: null,
    imageAlt: '',
    mode: 'replace'
  },
  'accesorios-medias': {
    title: 'Accesorios',
    subtitle: null,
    image: 'editorial/portada-accesorios.png',
    imageAlt: '',
    mode: 'prepend'
  }
};

export function resolveEditorialImageUrl(image, baseUrl = document.baseURI) {
  if (image == null) return null;
  if (typeof image !== 'string' || image.trim() === '') {
    throw new TypeError('La imagen editorial debe ser una ruta pública relativa.');
  }
  if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(image)) {
    throw new TypeError('La imagen editorial debe ser relativa a la base de publicación.');
  }
  return new URL(image, baseUrl).href;
}

export function assertEditorialCoverMode(mode, categoryId = 'desconocida') {
  if (!validCoverModes.has(mode)) {
    throw new TypeError(
      `Modo de portada editorial inválido para "${categoryId}": ${mode}`
    );
  }
  return mode;
}

export function getCategoryEditorialCover(categoryId, baseUrl) {
  const cover = categoryEditorialCovers[categoryId] || null;
  if (!cover) return null;
  assertEditorialCoverMode(cover.mode, categoryId);
  return {
    ...cover,
    image: resolveEditorialImageUrl(cover.image, baseUrl)
  };
}
