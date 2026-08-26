const validCoverModes = new Set(['replace', 'prepend']);

export const categoryEditorialCovers = {
  'paletas-padel': {
    title: 'Paletas',
    subtitle: null,
    image: 'editorial/portada-paletas.webp',
    imageWidth: 1828,
    imageHeight: 860,
    imageAlt: '',
    mode: 'replace'
  },
  calzado: {
    title: 'Calzado',
    subtitle: null,
    image: 'editorial/zapatilla-head-motion-pro-padel-273614-7.jpg',
    imageWidth: 1000,
    imageHeight: 1000,
    imageAlt: '',
    mode: 'replace'
  },
  'indumentaria-hombre': {
    title: 'Indumentaria Hombre',
    subtitle: null,
    image: 'editorial/indumentaria-hombre.jpeg',
    imageWidth: 1084,
    imageHeight: 916,
    imageAlt: '',
    mode: 'replace'
  },
  'indumentaria-dama': {
    title: 'Indumentaria Dama',
    subtitle: null,
    image: 'editorial/Screenshot 2026-08-05 110753.webp',
    imageWidth: 1007,
    imageHeight: 862,
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
    image: 'editorial/portada-tenis.webp',
    imageWidth: 1679,
    imageHeight: 937,
    imageAlt: '',
    mode: 'replace'
  },
  'bolsos-mochilas': {
    title: 'Bolsos',
    subtitle: null,
    image: 'editorial/portada-bolsos.webp',
    imageWidth: 1672,
    imageHeight: 941,
    imageAlt: '',
    mode: 'replace'
  },
  pelotas: {
    title: 'Pelotas',
    subtitle: null,
    image: 'editorial/portada-pelotas.webp',
    imageWidth: 1774,
    imageHeight: 887,
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
    image: 'editorial/portada-accesorios.webp',
    imageWidth: 1959,
    imageHeight: 803,
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
