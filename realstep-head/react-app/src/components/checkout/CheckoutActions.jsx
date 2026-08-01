function CheckoutActions({ checkingCatalog, sending }) {
  return (
    <div className="checkout-actions">
      <button className="primary" type="submit" disabled={sending || checkingCatalog}>
        {checkingCatalog
          ? 'COMPROBANDO CATÁLOGO…'
          : sending
            ? 'ENVIANDO PEDIDO...'
            : 'CONFIRMAR Y ENVIAR PEDIDO'}
      </button>
    </div>
  );
}

export default CheckoutActions;
