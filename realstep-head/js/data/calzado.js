window.RealStep = window.RealStep || {};

/*
 * Cómo administrar el catálogo de calzado:
 *
 * - Para agregar un modelo nuevo, copiá uno de los objetos completos dentro de
 *   RealStep.calzado, pegalo al final del arreglo separado por una coma y
 *   reemplazá sus datos. El valor de "id" debe ser único.
 * - Para cambiar un precio, modificá el número de la propiedad "price" del
 *   modelo correspondiente (sin puntos, comas ni símbolo de moneda).
 * - Para marcar un talle sin stock, cambiá su valor a:
 *   { size: '7', inStock: false }
 * - Para agregar imágenes, copiá los archivos a assets/products y sumá sus
 *   rutas entre comillas dentro del arreglo "images", separadas por comas.
 */
RealStep.calzado = [
  {
    id: 'ace-m1',
    category: 'calzado',
    name: 'ACE-M1 GREY / BLACK / RED',
    code: '06/1-0157',
    price: 52000,
    images: [
      'assets/products/calzado/ace-m1-1.webp',
      'assets/products/calzado/ace-m1-2.webp',
      'assets/products/calzado/ace-m1-3.webp'
    ],
    sizes: [
      { size: '7', inStock: true },
      { size: '8', inStock: true },
      { size: '9', inStock: true },
      { size: '10', inStock: true },
      { size: '11', inStock: true },
      { size: '12', inStock: true }
    ]
  },

  {
    id: 'ace-m2',
    category: 'calzado',
    name: 'ACE-M2 WHITE / ORANGE / NAVY',
    code: 'PENDIENTE',
    price: 52000,
    images: [
      'assets/products/calzado/ace-m2-1.webp',
      'assets/products/calzado/ace-m2-2.webp',
      'assets/products/calzado/ace-m2-3.webp'
    ],
    sizes: [
      { size: '7', inStock: true },
      { size: '8', inStock: true },
      { size: '9', inStock: true },
      { size: '10', inStock: true },
      { size: '11', inStock: true },
      { size: '12', inStock: true }
    ]
  },

  {
    id: 'deuce-m2',
    category: 'calzado',
    name: 'DEUCE-M2 GREY / BLACK / ORANGE',
    code: 'PENDIENTE',
    price: 54000,
    images: [
      'assets/products/calzado/deuce-m2.webp'
    ],
    sizes: [
      { size: '7', inStock: true },
      { size: '8', inStock: true },
      { size: '9', inStock: true },
      { size: '10', inStock: true },
      { size: '11', inStock: true },
      { size: '12', inStock: true }
    ]
  },

  {
    id: 'deuce-m1',
    category: 'calzado',
    name: 'DEUCE-M1 BLUE / NAVY / RED',
    code: 'PENDIENTE',
    price: 54000,
    images: [
      'assets/products/calzado/deuce-m1.webp',
      'assets/products/calzado/deuce-m1-2.webp',
      'assets/products/calzado/deuce-m1-3.webp'
    ],
    sizes: [
      { size: '7', inStock: true },
      { size: '8', inStock: true },
      { size: '9', inStock: false },
      { size: '10', inStock: false },
      { size: '11', inStock: false },
      { size: '12', inStock: false }
    ]
  },

  {
    id: 'smash-m1',
    category: 'calzado',
    name: 'SMASH-M1 BLACK / GREY / WHITE',
    code: 'PENDIENTE',
    price: 54000,
    images: [
      'assets/products/calzado/smash-m1-a.webp',
      'assets/products/calzado/smash-m1-b.webp',
      'assets/products/calzado/smash-m1-c.webp'
    ],
    sizes: [
      { size: '7', inStock: true },
      { size: '8', inStock: true },
      { size: '9', inStock: true },
      { size: '10', inStock: true },
      { size: '11', inStock: false },
      { size: '12', inStock: true }
    ]
  },

  {
    id: 'smash-m2',
    category: 'calzado',
    name: 'SMASH-M2 NAVY / GREY',
    code: 'PENDIENTE',
    price: 54000,
    images: [
      'assets/products/calzado/smash-m2-a.webp',
      'assets/products/calzado/smash-m2-b.webp',
      'assets/products/calzado/smash-m2-c.webp'
    ],
    sizes: [
      { size: '7', inStock: true },
      { size: '8', inStock: true },
      { size: '9', inStock: true },
      { size: '10', inStock: false },
      { size: '11', inStock: false },
      { size: '12', inStock: true }
    ]
  },

  {
    id: 'drop-w1',
    category: 'calzado',
    name: 'DROP-W1 PINK/ORANGE/LIME',
    code: 'PENDIENTE',
    price: 52000,
    images: [
      'assets/products/calzado/drop-w1-c.webp',
    ],
    sizes: [
      { size: '5', inStock: true },
      { size: '6', inStock: true },
      { size: '7', inStock: false },
      { size: '8', inStock: true },
      { size: '9', inStock: true },
      { size: '10', inStock: true },
    ]
  },  

  {
    id: 'drop-w2',
    category: 'calzado',
    name: 'DROP-W2 WHITE/BLUE',
    code: 'PENDIENTE',
    price: 52000,
    images: [
      'assets/products/calzado/drop-w2-a.webp',
      'assets/products/calzado/drop-w2-b.webp',
      'assets/products/calzado/drop-w2-c.webp'
    ],
    sizes: [
      { size: '5', inStock: false },
      { size: '6', inStock: false },
      { size: '7', inStock: true },
      { size: '8', inStock: true },
      { size: '9', inStock: true },
      { size: '10', inStock: true },
    ]
  },  

  {
    id: 'slice-w1',
    category: 'calzado',
    name: 'SLICE-W1 NAVY/BLUE',
    code: 'PENDIENTE',
    price: 52000,
    images: [
      'assets/products/calzado/slice-w1-a.webp',
      'assets/products/calzado/slice-w1-b.webp',
      'assets/products/calzado/slice-w1-c.webp'
    ],
    sizes: [
      { size: '5', inStock: false },
      { size: '6', inStock: true },
      { size: '7', inStock: false },
      { size: '8', inStock: false },
      { size: '9', inStock: true },
      { size: '10', inStock: true },
    ]
  }, 

  {
    id: 'slice-w2',
    category: 'calzado',
    name: 'SLICE-W2 BLACK / PINK',
    code: 'PENDIENTE',
    price: 52000,
    images: [
      'assets/products/calzado/slice-w2-a.webp',
      'assets/products/calzado/slice-w2-b.webp',
      'assets/products/calzado/slice-w2-c.webp'
    ],
    sizes: [
      { size: '5', inStock: false },
      { size: '6', inStock: true },
      { size: '7', inStock: false },
      { size: '8', inStock: false },
      { size: '9', inStock: true },
      { size: '10', inStock: true },
    ]
  },

];
