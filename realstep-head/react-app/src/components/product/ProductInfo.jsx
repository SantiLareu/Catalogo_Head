import ProductPrice from './ProductPrice.jsx';
import Specifications from './Specifications.jsx';

function ProductInfo({ categoryLabel, code, description, name, price, specifications }) {
  return (
    <div className="panel">
      <p className="ey">{categoryLabel}</p>
      <h2>{name}</h2>
      <p className="code">SKU {code || '-'}</p>

      <ProductPrice price={price} />

      {description ? <p className="product-description">{description}</p> : null}
      <Specifications specifications={specifications} />
    </div>
  );
}

export default ProductInfo;
