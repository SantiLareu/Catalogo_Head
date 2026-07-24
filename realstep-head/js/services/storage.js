window.RealStep = window.RealStep || {};

RealStep.loadCart = function() {
  try {
    return JSON.parse(
      localStorage.getItem(RealStep.companyConfig.storageKey) || '[]'
    );
  } catch (error) {
    return [];
  }
};

RealStep.saveCartToStorage = function(cart) {
  localStorage.setItem(
    RealStep.companyConfig.storageKey,
    JSON.stringify(cart)
  );
};
