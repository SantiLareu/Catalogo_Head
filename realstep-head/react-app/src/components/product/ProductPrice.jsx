const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2
});

function ProductPrice({ price }) {
  return (
    <div className="price">
      <span>Precio por unidad</span>
      <strong>{moneyFormatter.format(price ?? 0)}</strong>
    </div>
  );
}

export default ProductPrice;
