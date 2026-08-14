function QuantitySelector({ onDecrease, onIncrease, packDe, quantity }) {
  return (
    <>
      <span className="label">Cantidad</span>
      <div className="qty">
        <button
          type="button"
          aria-label="Disminuir cantidad"
          disabled={quantity === 0}
          onClick={onDecrease}
        >−</button>
        <output className="qval" aria-live="polite">{quantity}</output>
        <button type="button" aria-label="Aumentar cantidad" onClick={onIncrease}>+</button>
      </div>
      {packDe > 1 ? (
        <p className="pack-note">Venta por pack de {packDe} unidades</p>
      ) : null}
    </>
  );
}

export default QuantitySelector;
