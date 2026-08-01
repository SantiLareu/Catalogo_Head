import { useEffect, useMemo, useRef, useState } from 'react';
import { getCategoryLabel, normalizeSpecifications } from '../../data/catalogSelectors.js';
import { resolveProductImage } from '../../data/productImages.js';
import { productSelectionActions } from '../../hooks/productSelectionReducer.js';
import useProductSelection from '../../hooks/useProductSelection.js';
import useCart from '../../hooks/useCart.js';
import Lightbox from '../lightbox/Lightbox.jsx';
import ProductActions from './ProductActions.jsx';
import ProductGallery from './ProductGallery.jsx';
import ProductInfo from './ProductInfo.jsx';
import QuantitySelector from './QuantitySelector.jsx';
import SizeSelector from './SizeSelector.jsx';
import VariantSelector from './VariantSelector.jsx';

function ProductCard({ categories, product }) {
  const { addLine, resetVersion, showToast } = useCart();
  const { state, dispatch, variant, images: imagePaths, sizes, code, price } =
    useProductSelection(product, resetVersion);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const openerRef = useRef(null);
  const variantControlRef = useRef(null);
  const sizeControlRef = useRef(null);
  const images = useMemo(
    () => imagePaths.map(resolveProductImage).filter(Boolean),
    [imagePaths]
  );
  const specifications = useMemo(
    () => normalizeSpecifications(product.specifications),
    [product.specifications]
  );
  const variants = useMemo(
    () => [...(product.variants || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [product.variants]
  );
  const imageCount = images.length;

  useEffect(() => {
    setLightboxOpen(false);
  }, [resetVersion]);

  const selectImage = (imageIndex) =>
    dispatch({ type: productSelectionActions.SET_IMAGE, imageIndex, imageCount });
  const nextImage = () =>
    dispatch({ type: productSelectionActions.NEXT_IMAGE, imageCount });
  const previousImage = () =>
    dispatch({ type: productSelectionActions.PREVIOUS_IMAGE, imageCount });
  const selectVariant = (variantId) => {
    setLightboxOpen(false);
    dispatch({ type: productSelectionActions.SELECT_VARIANT, variantId });
  };
  const addToCart = () => {
    if (variants.length > 0 && !variant) {
      showToast('Seleccioná un color');
      variantControlRef.current?.querySelector('button')?.focus();
      return;
    }

    const requiresSize = product.stockMode === 'size' && sizes.length > 0;
    if (requiresSize && !state.size) {
      showToast('Seleccioná un talle');
      sizeControlRef.current?.querySelector('button:not(:disabled)')?.focus();
      return;
    }

    const selectedSize = sizes.find((item) => item.size === state.size);
    if (requiresSize && !(selectedSize?.inStock === true || selectedSize?.stock > 0)) {
      showToast('El talle seleccionado no está disponible');
      sizeControlRef.current?.querySelector('button:not(:disabled)')?.focus();
      return;
    }

    if (!Number.isInteger(state.quantity) || state.quantity < 1) {
      showToast('La cantidad debe ser al menos 1');
      return;
    }

    const line = { productId: product.id };
    if (variant) line.variantId = variant.id;
    if (requiresSize) line.size = state.size;
    line.quantity = state.quantity;
    line.priceSnapshot = price;
    addLine(line);
    showToast(
      `${product.name}${variant?.colorName ? ` color ${variant.colorName}` : ''}` +
      `${requiresSize ? ` talle ${state.size}` : ''} agregado`
    );
  };

  return (
    <article className={`product product--${product.category || 'general'}`} data-product-id={product.id}>
      <ProductGallery
        images={images}
        imageIndex={state.imageIndex}
        name={product.name}
        onNext={nextImage}
        onOpen={() => setLightboxOpen(true)}
        onPrevious={previousImage}
        onSelect={selectImage}
        openerRef={openerRef}
      />

      <ProductInfo
        categoryLabel={getCategoryLabel(categories, product)}
        code={code}
        description={product.description}
        name={product.name}
        price={price}
        specifications={specifications}
        controls={
          <>
            <VariantSelector
              activeVariant={variant}
              onSelect={selectVariant}
              variants={variants}
              controlRef={variantControlRef}
            />
            <SizeSelector
              onSelect={(size) =>
                dispatch({ type: productSelectionActions.SELECT_SIZE, size })
              }
              selectedSize={state.size}
              sizes={sizes}
              stockMode={product.stockMode}
              controlRef={sizeControlRef}
            />
            <QuantitySelector
              onDecrease={() =>
                dispatch({ type: productSelectionActions.DECREMENT_QUANTITY })
              }
              onIncrease={() =>
                dispatch({ type: productSelectionActions.INCREMENT_QUANTITY })
              }
              quantity={state.quantity}
            />
            <ProductActions onAdd={addToCart} />
          </>
        }
      />

      {lightboxOpen && images.length > 0 ? (
        <Lightbox
          imageIndex={state.imageIndex}
          images={images}
          name={product.name}
          onClose={() => setLightboxOpen(false)}
          onNext={nextImage}
          onPrevious={previousImage}
          originRef={openerRef}
        />
      ) : null}
    </article>
  );
}

export default ProductCard;
