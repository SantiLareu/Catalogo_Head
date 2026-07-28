function QuantitySelector({ onDecrease, onIncrease, quantity }) {
  return (
    <>
      <span className="label">Cantidad</span>
      <div className="qty">
        <button type="button" aria-label="Disminuir cantidad" onClick={onDecrease}>−</button>
        <output className="qval" aria-live="polite">{quantity}</output>
        <button type="button" aria-label="Aumentar cantidad" onClick={onIncrease}>+</button>
      </div>
    </>
  );
}

export default QuantitySelector;
