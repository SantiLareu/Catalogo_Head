import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCustomerParams,
  buildEmailHtml,
  buildOrderLines,
  buildOrderTotals,
  buildOwnerParams,
  CheckoutEmailError,
  createSubmissionGuard,
  OWNER_TO_CUSTOMER_DELAY_MS,
  runCheckoutTransaction,
  sendOrderEmails,
  validateEmailConfig
} from '../src/services/emailService.js';
import { escapeHtml } from '../src/utils/html.js';

const companyConfig = {
  companyName: 'Real Step',
  catalogName: 'HEAD Calzado',
  orderEmail: 'owner@example.com'
};
const emailConfig = {
  serviceId: 'service',
  templateId: 'template',
  publicKey: 'public'
};
const customer = {
  name: 'Ana <Cliente>',
  company: 'Comercio & Cía.',
  phone: '111',
  email: 'ana@example.com',
  province: 'Buenos Aires',
  city: 'La Plata',
  address: 'Calle "Uno"',
  notes: '<script>alert(1)</script>'
};
const products = [
  {
    id: 'plain',
    name: 'Paleta',
    code: 'PAL-1',
    price: 100,
    sizes: [],
    variants: []
  },
  {
    id: 'shirt',
    name: 'Remera',
    code: null,
    price: 200,
    sizes: [],
    variants: [{
      id: 'black ',
      colorName: 'Black & White',
      code: 'REM-1',
      price: 250,
      sizes: [{ size: 'M', inStock: true }]
    }]
  },
  {
    id: 'free',
    name: 'Sin cargo',
    code: 'FREE',
    price: 0,
    sizes: [],
    variants: []
  }
];
const cart = [
  { productId: 'plain', quantity: 2 },
  { productId: 'shirt', variantId: 'black ', size: 'M', quantity: 3 },
  { productId: 'free', quantity: 1 }
];

test('formulario válido conserva los campos clásicos requeridos y email', () => {
  const required = ['name', 'company', 'phone', 'email', 'province', 'city'];
  assert.ok(required.every((field) => customer[field].trim()));
  assert.match(customer.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  assert.ok(Object.hasOwn(customer, 'address'));
  assert.ok(Object.hasOwn(customer, 'notes'));
});

test('construye líneas sin variante y con variante+talle, preservando ID literal', () => {
  const lines = buildOrderLines(cart, products);
  assert.deepEqual(lines[0], {
    productId: 'plain',
    variantId: undefined,
    size: undefined,
    name: 'Paleta',
    variantName: null,
    code: 'PAL-1',
    quantity: 2,
    unitPrice: 100,
    subtotal: 200
  });
  assert.equal(lines[1].variantId, 'black ');
  assert.equal(lines[1].variantName, 'Black & White');
  assert.equal(lines[1].size, 'M');
  assert.equal(lines[1].unitPrice, 250);
});

test('calcula unidades, subtotales, total y conserva precio cero', () => {
  const lines = buildOrderLines(cart, products);
  assert.deepEqual(buildOrderTotals(lines), { units: 6, total: 950 });
  assert.equal(lines[2].unitPrice, 0);
  assert.equal(lines[2].subtotal, 0);
});

test('payload del propietario coincide con el contrato clásico', () => {
  const params = buildOwnerParams({
    customer,
    lines: buildOrderLines(cart, products),
    companyConfig
  });
  assert.equal(params.to_email, 'owner@example.com');
  assert.equal(params.reply_to, 'ana@example.com');
  assert.equal(params.subject, 'Nuevo pedido HEAD Calzado - Comercio & Cía.');
  assert.equal(params.customer_name, 'Ana <Cliente>');
  assert.match(params.email_html, /Datos del cliente/);
});

test('payload del cliente coincide con el contrato clásico', () => {
  const params = buildCustomerParams({
    customer,
    lines: buildOrderLines(cart, products),
    companyConfig
  });
  assert.equal(params.to_email, 'ana@example.com');
  assert.equal(params.reply_to, 'owner@example.com');
  assert.equal(params.subject, 'Recibimos tu pedido HEAD Calzado - Real Step');
  assert.equal(params.customer_name, 'Ana <Cliente>');
  assert.match(params.email_html, /¡Recibimos tu pedido!/);
  assert.doesNotMatch(params.email_html, /<h2>Datos del cliente<\/h2>/);
});

test('escapa HTML del usuario y del catálogo en el correo manual', () => {
  assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#039;');
  const html = buildEmailHtml({
    customer,
    lines: buildOrderLines(cart, products),
    recipient: 'owner',
    companyConfig
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Black &amp; White/);
  assert.match(html, /Ana &lt;Cliente&gt;/);
});

test('detecta configuración incompleta sin enviar', async () => {
  assert.deepEqual(
    validateEmailConfig({ serviceId: '', templateId: '', publicKey: '' }, companyConfig),
    { valid: false, missing: ['serviceId', 'templateId', 'publicKey'] }
  );
  let calls = 0;
  await assert.rejects(
    sendOrderEmails({
      customer,
      lines: buildOrderLines(cart, products),
      client: { send: async () => { calls += 1; } },
      emailConfig: {},
      companyConfig,
      delay: async () => {}
    }),
    (error) => error instanceof CheckoutEmailError && error.stage === 'configuration'
  );
  assert.equal(calls, 0);
});

test('envía propietario, espera 1150 ms y luego cliente', async () => {
  const events = [];
  const result = await sendOrderEmails({
    customer,
    lines: buildOrderLines(cart, products),
    client: { send: async (_service, _template, params) => events.push(`send:${params.to_email}`) },
    delay: async (ms) => events.push(`delay:${ms}`),
    emailConfig,
    companyConfig
  });
  assert.deepEqual(events, [
    'send:owner@example.com',
    `delay:${OWNER_TO_CUSTOMER_DELAY_MS}`,
    'send:ana@example.com'
  ]);
  assert.deepEqual(result, { ownerSent: true, customerSent: true });
});

test('fallo del propietario detiene la secuencia', async () => {
  let calls = 0;
  await assert.rejects(sendOrderEmails({
    customer,
    lines: buildOrderLines(cart, products),
    client: { send: async () => { calls += 1; throw new Error('owner'); } },
    delay: async () => {},
    emailConfig,
    companyConfig
  }), (error) => error.stage === 'owner' && error.ownerSent === false);
  assert.equal(calls, 1);
});

test('fallo del cliente conserva marca y reintento no duplica propietario', async () => {
  const recipients = [];
  let failCustomer = true;
  const client = {
    send: async (_service, _template, params) => {
      recipients.push(params.to_email);
      if (params.to_email === customer.email && failCustomer) throw new Error('customer');
    }
  };
  let partialError;
  try {
    await sendOrderEmails({
      customer,
      lines: buildOrderLines(cart, products),
      client,
      delay: async () => {},
      emailConfig,
      companyConfig
    });
  } catch (error) {
    partialError = error;
  }
  assert.equal(partialError.stage, 'customer');
  assert.equal(partialError.ownerSent, true);

  failCustomer = false;
  await sendOrderEmails({
    customer,
    lines: buildOrderLines(cart, products),
    ownerAlreadySent: partialError.ownerSent,
    client,
    delay: async () => {},
    emailConfig,
    companyConfig
  });
  assert.deepEqual(recipients, ['owner@example.com', 'ana@example.com', 'ana@example.com']);
});

test('carrito se vacía únicamente ante éxito total', async () => {
  let clearCount = 0;
  await assert.rejects(runCheckoutTransaction({
    send: async () => { throw new Error('fail'); },
    clearCart: () => { clearCount += 1; }
  }));
  assert.equal(clearCount, 0);
  await runCheckoutTransaction({
    send: async () => ({ ownerSent: true, customerSent: true }),
    clearCart: () => { clearCount += 1; }
  });
  assert.equal(clearCount, 1);
});

test('guard bloquea doble envío mientras el primero está activo', async () => {
  const guard = createSubmissionGuard();
  let release;
  let calls = 0;
  const waiting = new Promise((resolve) => { release = resolve; });
  const first = guard.run(async () => {
    calls += 1;
    await waiting;
    return 'done';
  });
  const second = await guard.run(async () => {
    calls += 1;
  });
  assert.deepEqual(second, { skipped: true });
  assert.equal(calls, 1);
  release();
  assert.equal(await first, 'done');
});
