function ProductActions({ onAdd }) {
  return (
    <button
      className="primary"
      type="button"
      onClick={onAdd}
    >
      AGREGAR AL PEDIDO
    </button>
  );
}

export default ProductActions;
