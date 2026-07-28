function CheckoutActions({ sending }) {
  return (
    <div className="checkout-actions">
      <button className="primary" type="submit" disabled={sending}>
        {sending ? 'ENVIANDO PEDIDO...' : 'CONFIRMAR Y ENVIAR PEDIDO'}
      </button>
    </div>
  );
}

export default CheckoutActions;

