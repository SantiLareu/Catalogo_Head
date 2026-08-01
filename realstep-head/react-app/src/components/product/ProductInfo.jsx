import ProductPrice from './ProductPrice.jsx';
function ProductInfo({
  categoryLabel,
  code,
  controls,
  description,
  name,
  price
}) {
  return (
    <div className="panel">
      <p className="ey">{categoryLabel}</p>
      <h2>{name}</h2>
      <p className="code">SKU {code || '-'}</p>

      <ProductPrice price={price} />

      {description ? <p className="product-description">{description}</p> : null}
      {controls}
    </div>
  );
}

export default ProductInfo;
