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
} from '../../src/services/emailService.js';
import { escapeHtml } from '../../src/utils/html.js';
import {
  cuitValidationMessages,
  normalizeCuit,
  validateCuit
} from '../../src/utils/cuit.js';
import {
  productSelectionActions,
  productSelectionReducer
} from '../../src/hooks/productSelectionReducer.js';

const companyConfig = {
  companyName: 'RealStep',
  catalogName: 'HEAD Calzado',
  orderEmail: 'owner@example.com',
  orderEmailBcc: 'owner-bcc@example.com'
};
const emailConfig = {
  serviceId: 'service',
  templateId: 'template',
  publicKey: 'public'
};
const customer = {
  name: 'Ana <Cliente>',
  company: 'Razón Social & Cía.',
  cuit: '20-00000000-1',
  phone: '111',
  email: 'ana@example.com',
  province: 'Buenos Aires',
  city: 'La Plata',
  address: 'Calle "Uno"',
  notes: '<script>alert(1)</script>'
};
const minimalCustomer = {
  name: 'Cliente recurrente',
  company: 'Razón Social Sintética',
  cuit: '',
  phone: '',
  email: 'recurrente@example.com',
  province: '',
  city: '',
  address: '',
  notes: ''
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

test('pedido mínimo acepta solamente nombre, razón social y email', () => {
  const required = ['name', 'company', 'email'];
  const optional = ['cuit', 'phone', 'province', 'city', 'address', 'notes'];
  assert.ok(required.every((field) => minimalCustomer[field].trim()));
  assert.ok(optional.every((field) => minimalCustomer[field] === ''));
  assert.match(minimalCustomer.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
});

test('CheckoutForm marca como obligatorios solamente los tres campos requeridos', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(
    new URL('../../src/components/checkout/CheckoutForm.jsx', import.meta.url),
    'utf8'
  );
  for (const field of ['name', 'company', 'email']) {
    assert.match(source, new RegExp(`name: '${field}'[^\\n]+required: true`));
  }
  for (const field of ['cuit', 'phone', 'province', 'city', 'address']) {
    assert.doesNotMatch(source, new RegExp(`name: '${field}'[^\\n]+required: true`));
  }
});

test('valida CUIT sintético con y sin guiones sin alterar el valor visible', () => {
  assert.deepEqual(validateCuit('20-00000000-1'), {
    valid: true,
    normalized: '20000000001',
    reason: null,
    message: ''
  });
  assert.equal(validateCuit('20000000001').valid, true);
  assert.equal(normalizeCuit('20-00000000-1'), '20000000001');
});

test('CUIT vacío es válido pero separadores sin dígitos no cuentan como vacío', () => {
  assert.deepEqual(validateCuit(''), {
    valid: true,
    normalized: '',
    reason: null,
    message: ''
  });
  assert.equal(validateCuit('   ').valid, true);
  assert.equal(validateCuit(undefined).valid, true);
  assert.equal(validateCuit('---').message, cuitValidationMessages.length);
  assert.equal(validateCuit(20000000001).message, cuitValidationMessages.format);
});

test('normaliza espacios, puntos y barras admitidos para validar el CUIT', () => {
  assert.equal(validateCuit('20.000.000/00-1').valid, true);
  assert.equal(validateCuit(' 20 00000000 1 ').normalized, '20000000001');
});

test('rechaza CUIT informado con longitud incorrecta o caracteres no admitidos', () => {
  assert.equal(validateCuit('20-0000000-1').message, cuitValidationMessages.length);
  assert.equal(validateCuit('20-000000000-1').message, cuitValidationMessages.length);
  assert.equal(validateCuit('20_00000000_1').message, cuitValidationMessages.format);
});

test('rechaza CUIT con dígito verificador incorrecto', () => {
  assert.deepEqual(validateCuit('20-00000000-2'), {
    valid: false,
    normalized: '20000000002',
    reason: 'checksum',
    message: cuitValidationMessages.checksum
  });
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
  assert.equal(lines[1].code, 'REM-1');
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
  assert.equal(params.bcc_email, 'owner-bcc@example.com');
  assert.equal(params.reply_to, 'ana@example.com');
  assert.equal(params.subject, 'Nuevo pedido HEAD Calzado - Razón Social & Cía.');
  assert.equal(params.customer_name, 'Ana <Cliente>');
  assert.equal(params.customer_cuit, '20-00000000-1');
  assert.match(params.email_html, /Datos del cliente/);
  assert.match(params.email_html, /Razón Social:/);
  assert.match(params.email_html, /20-00000000-1/);
  assert.match(params.email_html, /Teléfono:/);
  assert.match(params.email_html, /Ubicación:<\/strong> La Plata, Buenos Aires/);
  assert.match(params.email_html, /Dirección:/);
  assert.match(params.email_html, /Observaciones/);
});

test('payload del cliente coincide con el contrato clásico', () => {
  const params = buildCustomerParams({
    customer,
    lines: buildOrderLines(cart, products),
    companyConfig
  });
  assert.equal(params.to_email, 'ana@example.com');
  assert.equal(Object.hasOwn(params, 'bcc_email'), false);
  assert.equal(params.reply_to, 'owner@example.com');
  assert.equal(params.subject, 'Recibimos tu pedido HEAD Calzado - RealStep');
  assert.equal(params.customer_name, 'Ana <Cliente>');
  assert.equal(params.customer_cuit, '20-00000000-1');
  assert.match(params.email_html, /¡Recibimos tu pedido!/);
  assert.match(params.email_html, /Razón Social:/);
  assert.match(params.email_html, /<strong>CUIT:<\/strong> 20-00000000-1/);
  assert.match(params.email_html, /Teléfono:/);
  assert.match(params.email_html, /Ubicación:<\/strong> La Plata, Buenos Aires/);
  assert.match(params.email_html, /Dirección:/);
  assert.match(params.email_html, /Observaciones/);
  assert.doesNotMatch(params.email_html, /<h2>Datos del cliente<\/h2>/);
});

test('payloads con campos opcionales vacíos conservan customer_cuit y omiten filas vacías', () => {
  const lines = buildOrderLines(cart, products);
  const ownerParams = buildOwnerParams({ customer: minimalCustomer, lines, companyConfig });
  const customerParams = buildCustomerParams({ customer: minimalCustomer, lines, companyConfig });

  assert.equal(ownerParams.customer_cuit, '');
  assert.equal(customerParams.customer_cuit, '');
  for (const html of [ownerParams.email_html, customerParams.email_html]) {
    assert.match(html, /Razón Social:/);
    assert.doesNotMatch(html, /<strong>CUIT:/);
    assert.doesNotMatch(html, /<strong>Teléfono:/);
    assert.doesNotMatch(html, /<strong>Ubicación:/);
    assert.doesNotMatch(html, /<strong>Dirección:/);
    assert.doesNotMatch(html, /<strong>Observaciones/);
  }
});

test('pedido con sólo los tres campos obligatorios completa ambos envíos', async () => {
  const events = [];
  const result = await sendOrderEmails({
    customer: minimalCustomer,
    lines: buildOrderLines(cart, products),
    client: { send: async (_service, _template, params) => events.push(params.to_email) },
    emailConfig,
    companyConfig,
    delay: async () => {}
  });
  assert.deepEqual(events, ['owner@example.com', 'recurrente@example.com']);
  assert.deepEqual(result, { ownerSent: true, customerSent: true });
});

test('CUIT inválido informado bloquea el servicio antes de llamar a EmailJS', async () => {
  let calls = 0;
  await assert.rejects(sendOrderEmails({
    customer: { ...minimalCustomer, cuit: '20-00000000-2' },
    lines: buildOrderLines(cart, products),
    client: { send: async () => { calls += 1; } },
    emailConfig,
    companyConfig,
    delay: async () => {}
  }), (error) => (
    error instanceof CheckoutEmailError &&
    error.stage === 'validation' &&
    error.code === 'invalid_cuit'
  ));
  assert.equal(calls, 0);
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

test('error de checkout conserva carrito y selección temporal', async () => {
  const selection = { variantId: 'black ', size: 'M', quantity: 2, imageIndex: 1 };
  const persistedCart = structuredClone(cart);
  let clearCount = 0;

  await assert.rejects(runCheckoutTransaction({
    send: async () => { throw new Error('customer'); },
    clearCart: () => { clearCount += 1; }
  }));

  assert.equal(clearCount, 0);
  assert.deepEqual(cart, persistedCart);
  assert.equal(productSelectionReducer(selection, { type: 'NO_ACTION' }), selection);
});

test('reset de éxito conserva literalmente la primera variante legacy', () => {
  const changed = { variantId: 'white', size: 'M', quantity: 2, imageIndex: 1 };
  assert.deepEqual(productSelectionReducer(changed, {
    type: productSelectionActions.RESET_SELECTION,
    variantId: 'black '
  }), {
    variantId: 'black ',
    size: null,
    quantity: 0,
    imageIndex: 0
  });
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
