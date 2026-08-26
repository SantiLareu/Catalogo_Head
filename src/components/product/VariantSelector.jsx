import { resolveProductImageSources } from '../../data/productImages.js';

function VariantSelector({ activeVariant, onSelect, variants, controlRef }) {
  if (!variants.length) return null;

  return (
    <div className="variant-selector">
      <span className="label">
        Elegí el color
        <strong className="variant-current">{activeVariant?.colorName || ''}</strong>
      </span>
      <div className="variant-swatches" role="group" aria-label="Colores disponibles" ref={controlRef}>
        {variants.map((variant) => {
          const thumbnail = resolveProductImageSources(variant.thumbnail)?.thumbnail;
          const selected = variant.id === activeVariant?.id;
          const style = thumbnail
            ? { backgroundImage: `url("${thumbnail}")` }
            : { backgroundColor: variant.colorHex || '#d8d8d8' };

          return (
            <button
              className={`variant-swatch ${selected ? 'selected' : ''} ${
                thumbnail ? 'has-thumbnail' : ''
              }`}
              style={style}
              type="button"
              aria-label={`Elegir color ${variant.colorName}`}
              aria-pressed={selected}
              data-variant-id={variant.id}
              key={variant.id}
              onClick={() => onSelect(variant.id)}
              title={variant.colorName}
            >
              <span className="sr-only">{variant.colorName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default VariantSelector;
