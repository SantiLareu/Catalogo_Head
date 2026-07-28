function SizeSelector({ onSelect, selectedSize, sizes, stockMode, controlRef }) {
  if (stockMode !== 'size' || sizes.length === 0) return null;

  return (
    <>
      <span className="label">Elegí el talle</span>
      <div className="sizes" role="group" aria-label="Talles disponibles" ref={controlRef}>
        {sizes.map((size) => {
          const available = size.inStock === true || size.stock > 0;
          return (
            <button
              className={`size ${selectedSize === size.size ? 'sel' : ''}`}
              type="button"
              aria-pressed={selectedSize === size.size}
              data-size={size.size}
              disabled={!available}
              key={size.size}
              onClick={() => available && onSelect(size.size)}
            >
              {size.size}
              {available ? null : <small>Sin stock</small>}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default SizeSelector;
