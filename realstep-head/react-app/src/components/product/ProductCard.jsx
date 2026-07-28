import {
  getCategoryLabel,
  getEffectiveCode,
  getEffectivePrice,
  getFirstVariant,
  getPrimaryImagePath,
  normalizeSpecifications
} from '../../data/catalogSelectors.js';
import { resolveProductImage } from '../../data/productImages.js';
import ProductInfo from './ProductInfo.jsx';

function ProductCard({ categories, product }) {
  const variant = getFirstVariant(product);
  const imagePath = getPrimaryImagePath(product, variant);
  const imageUrl = resolveProductImage(imagePath);
  const code = getEffectiveCode(product, variant);
  const price = getEffectivePrice(product, variant);
  const specifications = normalizeSpecifications(product.specifications);
  const categoryLabel = getCategoryLabel(categories, product);

  return (
    <article
      className={`product product--${product.category || 'general'}`}
      data-product-id={product.id}
    >
      <div className="gallery" aria-label={`Imagen de ${product.name}`}>
        <div className="mainimg">
          {imageUrl ? (
            <div className="mainimg-open">
              <img src={imageUrl} alt={product.name || 'Producto HEAD'} />
            </div>
          ) : null}
        </div>
      </div>

      <ProductInfo
        categoryLabel={categoryLabel}
        code={code}
        description={product.description}
        name={product.name}
        price={price}
        specifications={specifications}
      />
    </article>
  );
}

export default ProductCard;
