window.RealStep = window.RealStep || {};

RealStep.money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2
});

RealStep.formatMoney = function(value) {
  return RealStep.money.format(value);
};
