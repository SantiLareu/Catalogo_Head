const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2
});

export function formatMoney(value) {
  return money.format(value);
}

