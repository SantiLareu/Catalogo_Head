import assert from 'node:assert/strict';
import test from 'node:test';
import { acknowledgeCurrentPrice, reconcileCart } from '../../src/services/cartReconciliation.js';
import {
  CHECKOUT_CATALOG_UNAVAILABLE_MESSAGE,
  createCheckoutOrderSnapshot,
  validateCheckoutSubmission
} from '../../src/services/checkoutValidation.js';
import { createSubmissionGuard } from '../../src/services/emailService.js';

const variant = (overrides = {}) => ({
  id: 'black',
  colorName: 'Negro',
  code: 'REM-BK',
  price: 120,
  enabled: true,
  sizes: [{ size: 'M', inStock: true, stock: 1 }],
  ...overrides
});
const product = (overrides = {}) => ({
  id: 'shirt',
  name: 'Remera Motion',
  code: null,
  price: 100,
  packDe: 1,
  enabled: true,
  sizes: [],
  variants: [variant()],
  stockMode: 'size',
  ...overrides
});
const catalog = (products = [product()]) => ({
  categories: [],
  products,
  stockIsAvailabilityOnly: true
});
const cartLine = (overrides = {}) => ({
  productId: 'shirt',
  variantId: 'black',
  size: 'M',
  quantity: 2,
  priceSnapshot: 120,
  ...overrides
});

function validationFor(currentCatalog, lines, overrides = {}) {
  return {
    valid: true,
    status: 'current',
    catalog: currentCatalog,
    version: 'sha256-' + 'a'.repeat(64),
    reconciliation: reconcileCart(
      lines,
      currentCatalog.products,
      currentCatalog.stockIsAvailabilityOnly
    ),
    ...overrides
  };
}

async function decide({
  lines = [cartLine()],
  before = catalog(),
  after = before,
  validation = validationFor(after, lines),
  calls = []
} = {}) {
  return validateCheckoutSubmission({
    cart: lines,
    reviewedLines: createCheckoutOrderSnapshot(lines, before.products),
    checkCatalog: async (options) => {
      calls.push(options);
      return validation;
    }
  });
}

test('catálogo vigente permite continuar y exige una consulta final fresca', async () => {
  const calls = [];
  const result = await decide({ calls });
  assert.equal(result.allowSend, true);
  assert.equal(result.orderLines[0].name, 'Remera Motion');
  assert.deepEqual(calls, [{ force: true, fresh: true, notify: false }]);
});

test('versión nueva sin impacto en las líneas permite continuar', async () => {
  const result = await decide({
    validation: validationFor(catalog(), [cartLine()], {
      status: 'changes_detected',
      version: 'sha256-' + 'b'.repeat(64)
    })
  });
  assert.equal(result.allowSend, true);
  assert.equal(result.changes.length, 0);
});

test('cantidad incompatible con pack vigente bloquea checkout', async () => {
  const after = catalog([product({ packDe: 6 })]);
  const result = await decide({ after, lines: [cartLine({ quantity: 5 })] });
  assert.equal(result.allowSend, false);
  assert.ok(result.changes.some(({ kind }) => kind === 'pack_invalid'));
});

test('cambio de packDe entre catálogos deja el carrito en revisión', async () => {
  const before = catalog([product({ packDe: 1 })]);
  const after = catalog([product({ packDe: 6 })]);
  const lines = [cartLine({ quantity: 5 })];
  const result = await decide({ before, after, lines });
  assert.equal(result.allowSend, false);
  assert.equal(result.reason, 'order_changed');
  assert.ok(result.changes.some(({ kind }) => kind === 'pack_invalid'));
});

test('precio cambiado actualiza la línea, muestra anterior y nuevo y bloquea', async () => {
  const after = catalog([product({ variants: [variant({ price: 145 })] })]);
  const result = await decide({ after });
  assert.equal(result.allowSend, false);
  assert.equal(result.reason, 'order_changed');
  assert.equal(result.changes[0].kind, 'price_changed');
  assert.match(result.changes[0].message, /\$\s*120.*→.*\$\s*145/);
});

test('producto, variante, talle e indisponibilidad bloquean el envío', async (t) => {
  const cases = [
    ['producto', catalog([]), 'product_removed'],
    ['variante', catalog([product({ variants: [variant({ id: 'white' })] })]), 'variant_removed'],
    ['talle eliminado', catalog([product({ variants: [variant({ sizes: [] })] })]), 'size_unavailable'],
    ['sin disponibilidad', catalog([product({ variants: [variant({ sizes: [{ size: 'M', inStock: false, stock: 0 }] })] })]), 'size_unavailable']
  ];
  for (const [name, after, issue] of cases) {
    await t.test(name, async () => {
      const result = await decide({ after });
      assert.equal(result.allowSend, false);
      assert.ok(result.changes.some(({ kind }) => kind === issue));
    });
  }
});

test('nombre, SKU y color cambiados bloquean el primer intento', async () => {
  const after = catalog([product({
    name: 'Remera Motion Pro',
    variants: [variant({ colorName: 'Carbón', code: 'REM-CB' })]
  })]);
  const result = await decide({ after });
  assert.equal(result.allowSend, false);
  assert.deepEqual(
    new Set(result.changes.map(({ kind }) => kind)),
    new Set(['name_changed', 'code_changed', 'variantName_changed'])
  );
});

test('segundo click permite enviar después de revisar cambios descriptivos', async () => {
  const lines = [cartLine()];
  const before = catalog();
  const after = catalog([product({ name: 'Remera Motion Pro' })]);
  const first = await decide({ lines, before, after });
  assert.equal(first.allowSend, false);

  const second = await validateCheckoutSubmission({
    cart: lines,
    reviewedLines: first.reviewedLines,
    checkCatalog: async () => validationFor(after, lines)
  });
  assert.equal(second.allowSend, true);
  assert.equal(second.orderLines[0].name, 'Remera Motion Pro');
});

test('precio aceptado permite enviar luego de una nueva validación', async () => {
  const after = catalog([product({ variants: [variant({ price: 145 })] })]);
  const original = cartLine();
  const first = await decide({ lines: [original], after });
  assert.equal(first.allowSend, false);

  const accepted = acknowledgeCurrentPrice(original, after.products, true);
  const second = await validateCheckoutSubmission({
    cart: [accepted],
    reviewedLines: first.reviewedLines,
    checkCatalog: async () => validationFor(after, [accepted])
  });
  assert.equal(second.allowSend, true);
  assert.equal(second.orderLines[0].unitPrice, 145);
});

test('error de red, SHA o JSON inválido bloquean antes de EmailJS', async (t) => {
  for (const status of ['unavailable', 'error']) {
    await t.test(status, async () => {
      const lines = [cartLine()];
      const result = await decide({
        lines,
        validation: {
          ...validationFor(catalog(), lines),
          valid: false,
          status
        }
      });
      assert.equal(result.allowSend, false);
      assert.equal(result.reason, 'catalog_unavailable');
      assert.equal(result.message, CHECKOUT_CATALOG_UNAVAILABLE_MESSAGE);
    });
  }
});

test('bloqueo no modifica carrito ni datos del formulario', async () => {
  const lines = [cartLine()];
  const customer = { name: 'Ana', notes: 'Conservar' };
  const savedLines = structuredClone(lines);
  const savedCustomer = structuredClone(customer);
  await decide({ lines, after: catalog([]) });
  assert.deepEqual(lines, savedLines);
  assert.deepEqual(customer, savedCustomer);
});

test('doble click ejecuta una sola validación y un solo envío', async () => {
  const guard = createSubmissionGuard();
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  let validations = 0;
  let sends = 0;
  const submit = () => guard.run(async () => {
    validations += 1;
    const decision = await decide();
    await waiting;
    if (decision.allowSend) sends += 1;
  });

  const first = submit();
  const second = await submit();
  assert.deepEqual(second, { skipped: true });
  release();
  await first;
  assert.equal(validations, 1);
  assert.equal(sends, 1);
});

test('CheckoutModal retorna antes de alcanzar EmailJS cuando la decisión bloquea', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(
    new URL('../../src/components/checkout/CheckoutModal.jsx', import.meta.url),
    'utf8'
  );
  const blockedGuard = source.indexOf('if (!decision.allowSend)');
  const blockedReturn = source.indexOf('return;', blockedGuard);
  const emailSend = source.indexOf('sendOrderEmails', blockedGuard);
  assert.ok(blockedGuard >= 0 && blockedReturn > blockedGuard && emailSend > blockedReturn);
  assert.match(source, /if \(submittingRef\.current \|\| cart\.length === 0\) return/);
});
