import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  buildProductSearchIndex,
  getNextSearchResultIndex,
  searchProducts
} from '../../data/productSearch.js';
import { scrollToHashTarget } from '../../utils/navigation.js';

const RESULT_LIMIT = 8;
const HIGHLIGHT_DURATION_MS = 1800;

function ProductSearch({ categories, products }) {
  const listboxId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const index = useMemo(
    () => buildProductSearchIndex(products, categories),
    [products, categories]
  );
  const matches = useMemo(() => searchProducts(index, query), [index, query]);
  const results = matches.slice(0, RESULT_LIMIT);

  useEffect(() => {
    const closeOnOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);

  const selectResult = (result) => {
    setOpen(false);
    setActiveIndex(-1);
    scrollToHashTarget(`#${result.targetId}`);
    window.requestAnimationFrame(() => {
      const target = document.getElementById(result.targetId);
      if (!target) return;
      target.focus({ preventScroll: true });
      target.classList.add('product--search-highlight');
      window.setTimeout(
        () => target.classList.remove('product--search-highlight'),
        HIGHLIGHT_DURATION_MS
      );
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) =>
        getNextSearchResultIndex(current, event.key, results.length)
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        getNextSearchResultIndex(current, event.key, results.length)
      );
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    }
  };

  const hasQuery = query.trim().length > 0;
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div className="product-search" ref={rootRef}>
      <label className="sr-only" htmlFor={`${listboxId}-input`}>Buscar productos</label>
      <div className="product-search-field">
        <input
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open && hasQuery}
          autoComplete="off"
          id={`${listboxId}-input`}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => hasQuery && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar producto, código o categoría"
          ref={inputRef}
          role="combobox"
          type="search"
          value={query}
        />
        {hasQuery ? (
          <button
            className="product-search-clear"
            type="button"
            onClick={() => {
              setQuery('');
              setOpen(false);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {open && hasQuery ? (
        <div className="product-search-results" id={listboxId} role="listbox">
          {results.length > 0 ? (
            <>
              <p className="product-search-count" aria-live="polite">
                {matches.length > RESULT_LIMIT
                  ? `${RESULT_LIMIT} de ${matches.length} resultados`
                  : `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}`}
              </p>
              {results.map((result, resultIndex) => (
                <button
                  aria-selected={activeIndex === resultIndex}
                  className="product-search-result"
                  id={`${listboxId}-option-${resultIndex}`}
                  key={result.productId}
                  onClick={() => selectResult(result)}
                  onMouseEnter={() => setActiveIndex(resultIndex)}
                  role="option"
                  type="button"
                >
                  <strong>{result.name}</strong>
                  <span>{result.categoryLabel}</span>
                  {result.code ? <small>Código {result.code}</small> : null}
                </button>
              ))}
            </>
          ) : (
            <p className="product-search-empty" aria-live="polite">
              No se encontraron productos
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ProductSearch;
