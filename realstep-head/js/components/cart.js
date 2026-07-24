window.RealStep = window.RealStep || {};

RealStep.getTotals = function() {
  return RealStep.state.cart.reduce(function(totals, item) {
    var product = RealStep.findProduct(item.productId);

    if (!product) {
      return totals;
    }

    totals.units += item.quantity;
    totals.total += product.price * item.quantity;

    return totals;
  }, { units: 0, total: 0 });
};

RealStep.renderCart = function() {
  var list = document.getElementById('items');

  if (!RealStep.state.cart.length) {
    list.innerHTML = `
      <div class="empty">
        <strong>Tu pedido está vacío.</strong>
        <p>Elegí un modelo, talle y cantidad para continuar.</p>
      </div>
    `;
  } else {
    list.innerHTML = RealStep.state.cart.map(function(item) {
      var product = RealStep.findProduct(item.productId);

      return `
        <article class="item">
          <div class="itemtop">
            <div>
              <h3>${product.name}</h3>
              <p>Talle ${item.size} · ${product.code}</p>
            </div>

            <button
              class="remove"
              data-remove-product="${item.productId}"
              data-remove-size="${item.size}"
            >
              Eliminar
            </button>
          </div>

          <p>${item.quantity} unidad${item.quantity > 1 ? 'es' : ''}</p>
          <strong>${RealStep.formatMoney(product.price * item.quantity)}</strong>
        </article>
      `;
    }).join('');
  }

  var totals = RealStep.getTotals();

  document.getElementById('count').textContent = totals.units;
  document.getElementById('units').textContent = totals.units;
  document.getElementById('total').textContent =
    RealStep.formatMoney(totals.total);
};
