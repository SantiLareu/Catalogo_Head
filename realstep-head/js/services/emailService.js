window.RealStep = window.RealStep || {};

emailjs.init({
  publicKey: RealStep.emailConfig.publicKey
});

RealStep.buildProductRows = function() {
  return RealStep.state.cart.map(function(item) {
    var product = RealStep.findProduct(item.productId);

    return `
      <tr>
        <td style="padding:16px 12px;border-bottom:1px solid #ddd;">
          <strong>${RealStep.escapeHtml(product.name)}</strong><br>
          <span style="font-size:12px;color:#666;">
            Talle ${RealStep.escapeHtml(item.size)}
            · SKU ${RealStep.escapeHtml(product.code)}
          </span>
        </td>
        <td style="padding:16px 12px;border-bottom:1px solid #ddd;text-align:center;">
          ${item.quantity}
        </td>
        <td style="padding:16px 12px;border-bottom:1px solid #ddd;text-align:right;font-weight:700;">
          ${RealStep.formatMoney(product.price * item.quantity)}
        </td>
      </tr>
    `;
  }).join('');
};

RealStep.buildEmailHtml = function(form, recipient) {
  var totals = RealStep.getTotals();
  var customerName = RealStep.escapeHtml(form.get('name'));
  var customerEmail = RealStep.escapeHtml(form.get('email'));
  var isOwner = recipient === 'owner';

  var title = isOwner
    ? 'Nuevo pedido ' + RealStep.companyConfig.catalogName
    : '¡Recibimos tu pedido!';

  var intro = isOwner
    ? 'Se registró un nuevo pedido desde el catálogo ' +
      RealStep.companyConfig.catalogName + '.'
    : 'Hola ' + customerName +
      ', recibimos correctamente tu pedido. Un asesor de ' +
      RealStep.companyConfig.companyName +
      ' se comunicará con vos.';

  var customerBlock = isOwner ? `
    <div style="margin:24px 0;padding:18px;background:#f5f5f5;">
      <h2>Datos del cliente</h2>
      <p><strong>Nombre:</strong> ${customerName}</p>
      <p><strong>Comercio:</strong> ${RealStep.escapeHtml(form.get('company'))}</p>
      <p><strong>Teléfono:</strong> ${RealStep.escapeHtml(form.get('phone'))}</p>
      <p><strong>Correo:</strong> ${customerEmail}</p>
      <p><strong>Ubicación:</strong>
        ${RealStep.escapeHtml(form.get('city'))},
        ${RealStep.escapeHtml(form.get('province'))}
      </p>
      <p><strong>Dirección:</strong>
        ${RealStep.escapeHtml(form.get('address') || '-')}
      </p>
    </div>
  ` : '';

  return `
    <!doctype html>
    <html lang="es">
      <body style="margin:0;background:#efefef;font-family:Arial,sans-serif;color:#222;">
        <div style="max-width:760px;margin:0 auto;padding:24px 12px;">
          <div style="background:#0a0a0a;padding:22px 26px;color:white;">
            <div style="font-size:28px;font-weight:900;">HEAD</div>
            <div style="font-size:12px;letter-spacing:1.5px;color:#bbb;">
              REAL STEP · CATÁLOGO MAYORISTA
            </div>
          </div>

          <div style="background:white;padding:28px 26px;">
            <h1>${title}</h1>
            <p>${intro}</p>
            ${customerBlock}

            <h2>Detalle del pedido</h2>

            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#111;color:white;">
                  <th style="padding:12px;text-align:left;">Producto</th>
                  <th style="padding:12px;text-align:center;">Unidades</th>
                  <th style="padding:12px;text-align:right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>${RealStep.buildProductRows()}</tbody>
            </table>

            <div style="margin:22px 0 0 auto;max-width:330px;background:#f5f5f5;padding:18px;">
              <p>Total de unidades: <strong>${totals.units}</strong></p>
              <p>Total estimado:
                <strong>${RealStep.formatMoney(totals.total)}</strong>
              </p>
            </div>

            <div style="margin-top:22px;padding:16px;border-left:4px solid #111;background:#f7f7f7;">
              <strong>Observaciones</strong><br>
              ${RealStep.escapeHtml(form.get('notes') || 'Sin observaciones.')}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

RealStep.delay = function(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
};

RealStep.sendOrderEmails = async function(form) {
  var customerEmail = String(form.get('email')).trim();
  var company = String(form.get('company')).trim();
  var customerName = String(form.get('name')).trim();

  await emailjs.send(
    RealStep.emailConfig.serviceId,
    RealStep.emailConfig.templateId,
    {
      to_email: RealStep.companyConfig.orderEmail,
      reply_to: customerEmail,
      subject: 'Nuevo pedido ' +
        RealStep.companyConfig.catalogName +
        ' - ' + company,
      email_html: RealStep.buildEmailHtml(form, 'owner'),
      customer_name: customerName
    }
  );

  await RealStep.delay(1150);

  await emailjs.send(
    RealStep.emailConfig.serviceId,
    RealStep.emailConfig.templateId,
    {
      to_email: customerEmail,
      reply_to: RealStep.companyConfig.orderEmail,
      subject: 'Recibimos tu pedido ' +
        RealStep.companyConfig.catalogName +
        ' - ' + RealStep.companyConfig.companyName,
      email_html: RealStep.buildEmailHtml(form, 'customer'),
      customer_name: customerName
    }
  );
};
