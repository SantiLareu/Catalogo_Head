window.RealStep = window.RealStep || {};

RealStep.categories = [
  {
    id: 'calzado',
    label: 'CALZADO',
    target: 'categoria-calzado',
    enabled: true,
    productCategory: 'calzado',
    title: 'Calzado HEAD',
    subtitle: 'Stock independiente por talle.'
  },
  {
    id: 'indumentaria',
    label: 'INDUMENTARIA',
    target: 'categoria-indumentaria',
    enabled: true,
    productCategory: 'indumentaria',
    title: 'Indumentaria HEAD',
    subtitle: '',
    children: [
      {
        id: 'indumentaria-hombre',
        label: 'HOMBRE',
        target: 'categoria-indumentaria-hombre',
        enabled: true,
        dataSource: 'indumentariaHombre',
        title: 'INDUMENTARIA HOMBRE',
        subtitle: ''
      },
      {
        id: 'indumentaria-dama',
        label: 'DAMA',
        target: 'categoria-indumentaria-dama',
        enabled: true,
        dataSource: 'indumentariaDama',
        title: 'INDUMENTARIA DAMA',
        subtitle: ''
      }
    ]
  },
  {
    id: 'accesorios',
    label: 'ACCESORIOS',
    target: 'categoria-accesorios',
    enabled: true,
    productCategory: 'accesorios',
    title: 'Accesorios HEAD',
    subtitle: '',
    children: [
      {
        id: 'accesorios-medias',
        label: 'MEDIAS',
        target: 'categoria-accesorios-medias',
        enabled: true,
        dataSource: 'accesoriosMedias',
        title: 'MEDIAS',
        subtitle: ''
      },
      {
        id: 'accesorios-antivibrador',
        label: 'ANTIVIBRADOR',
        target: 'categoria-accesorios-antivibrador',
        enabled: true,
        dataSource: 'accesoriosAntivibradores',
        title: 'ANTIVIBRADOR',
        subtitle: ''
      },
      {
        id: 'accesorios-cubre-grips',
        label: 'CUBRE GRIPS',
        target: 'categoria-accesorios-cubre-grips',
        enabled: true,
        dataSource: 'accesoriosCubreGrips',
        title: 'CUBRE GRIPS',
        subtitle: ''
      },
      {
        id: 'accesorios-munequeras',
        label: 'MUÑEQUERAS',
        target: 'categoria-accesorios-munequeras',
        enabled: true,
        dataSource: 'accesoriosMunequeras',
        title: 'MUÑEQUERAS',
        subtitle: ''
      },
      {
        id: 'accesorios-grips',
        label: 'GRIPS',
        target: 'categoria-accesorios-grips',
        enabled: true,
        dataSource: 'accesoriosGrips',
        title: 'GRIPS',
        subtitle: ''
      },
      {
        id: 'accesorios-cuerdas-tenis',
        label: 'CUERDAS TENIS',
        target: 'categoria-accesorios-cuerdas-tenis',
        enabled: true,
        dataSource: 'accesoriosCuerdasTenis',
        title: 'CUERDAS TENIS',
        subtitle: ''
      },
      {
        id: 'accesorios-gorras',
        label: 'GORRAS',
        target: 'categoria-accesorios-gorras',
        enabled: true,
        dataSource: 'accesoriosGorras',
        title: 'GORRAS',
        subtitle: ''
      }
    ]
  },
  {
    id: 'raquetas-squash',
    label: 'RAQUETAS SQUASH',
    target: 'categoria-raquetas-squash',
    enabled: false,
    productCategory: 'raquetas-squash',
    title: 'Raquetas de Squash HEAD',
    subtitle: ''
  },
  {
    id: 'raquetas-tenis',
    label: 'RAQUETAS TENIS',
    target: 'categoria-raquetas-tenis',
    enabled: false,
    productCategory: 'raquetas-tenis',
    title: 'Raquetas de Tenis HEAD',
    subtitle: ''
  },
  {
    id: 'bolsos-mochilas',
    label: 'BOLSOS / MOCHILAS',
    target: 'categoria-bolsos-mochilas',
    enabled: false,
    productCategory: 'bolsos-mochilas',
    title: 'Bolsos / Mochilas HEAD',
    subtitle: ''
  },
  {
    id: 'pelotas',
    label: 'PELOTAS',
    target: 'categoria-pelotas',
    enabled: true,
    productCategory: 'pelotas',
    title: 'Pelotas HEAD',
    subtitle: ''
  },
  {
    id: 'pelotas-squash',
    label: 'PELOTAS SQUASH',
    target: 'categoria-pelotas-squash',
    enabled: false,
    productCategory: 'pelotas-squash',
    title: 'Pelotas de Squash HEAD',
    subtitle: ''
  },
  {
    id: 'ski',
    label: 'SKI',
    target: 'categoria-ski',
    enabled: false,
    productCategory: 'ski',
    title: 'Ski HEAD',
    subtitle: ''
  },
  {
    id: 'pop',
    label: 'POP',
    target: 'categoria-pop',
    enabled: false,
    productCategory: 'pop',
    title: 'POP HEAD',
    subtitle: ''
  },
  {
    id: 'snowboard',
    label: 'SNOWBOARD',
    target: 'categoria-snowboard',
    enabled: false,
    productCategory: 'snowboard',
    title: 'Snowboard HEAD',
    subtitle: ''
  },
  {
    id: 'paletas-padel',
    label: 'PALETAS PADEL',
    target: 'categoria-paletas-padel',
    enabled: true,
    productCategory: 'paletas-padel',
    title: 'Paletas de Padel HEAD',
    subtitle: ''
  }
];
