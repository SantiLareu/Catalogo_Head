import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useBodyScrollLock from '../../hooks/useBodyScrollLock.js';
import useCart from '../../hooks/useCart.js';
import useFocusTrap from '../../hooks/useFocusTrap.js';
import { companyConfig } from '../../config/company.js';
import {
  EXPORT_SCOPES,
  buildExportFileName,
  buildExportTable,
  getExportCategories,
  getExportSubcategories,
  resolveExportFilePrefix
} from '../../services/catalogExport.js';
import { downloadCatalogExport } from '../../services/exportWorkbook.js';

const filePrefix = resolveExportFilePrefix(companyConfig.catalogName);

function ExportCatalogModal({ categories, products, onClose, openerRef }) {
  const { showToast } = useCart();
  const [scope, setScope] = useState(EXPORT_SCOPES.ALL);
  const [categoryValue, setCategoryValue] = useState('');
  const [subcategoryValue, setSubcategoryValue] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const close = useCallback(() => onClose(), [onClose]);

  useBodyScrollLock(true);
  useFocusTrap(modalRef, true, close);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    return () => openerRef.current?.focus({ preventScroll: true });
  }, [openerRef]);

  const catalog = useMemo(
    () => ({ categories, products }),
    [categories, products]
  );
  const categoryOptions = useMemo(
    () => getExportCategories(catalog),
    [catalog]
  );
  const subcategoryOptions = useMemo(
    () => getExportSubcategories(catalog, categoryValue || null),
    [catalog, categoryValue]
  );

  useEffect(() => {
    if (scope === EXPORT_SCOPES.ALL) return;
    if (!categoryOptions.some((option) => option.value === categoryValue)) {
      const fallback = categoryOptions[0]?.value ?? '';
      setCategoryValue(fallback);
      setSubcategoryValue('');
    }
  }, [scope, categoryOptions, categoryValue]);

  useEffect(() => {
    if (scope !== EXPORT_SCOPES.SUBCATEGORY) return;
    if (!subcategoryOptions.some((option) => option.value === subcategoryValue)) {
      setSubcategoryValue(subcategoryOptions[0]?.value ?? '');
    }
  }, [scope, subcategoryOptions, subcategoryValue]);

  const needsCategory = scope !== EXPORT_SCOPES.ALL;
  const needsSubcategory = scope === EXPORT_SCOPES.SUBCATEGORY;
  const canDownload =
    !generating &&
    (!needsCategory || categoryValue !== '') &&
    (!needsSubcategory || subcategoryValue !== '');

  const handleCategoryChange = (event) => {
    setCategoryValue(event.target.value);
    setSubcategoryValue('');
    setError('');
  };

  const handleDownload = async () => {
    if (!canDownload) return;
    setGenerating(true);
    setError('');
    try {
      const selection =
        scope === EXPORT_SCOPES.SUBCATEGORY
          ? { scope, category: categoryValue, subcategory: subcategoryValue }
          : scope === EXPORT_SCOPES.CATEGORY
            ? { scope, category: categoryValue }
            : { scope: EXPORT_SCOPES.ALL };
      const table = buildExportTable(catalog, selection);
      if (table.rows.length === 0) {
        setError('No hay productos publicados para el alcance elegido.');
        return;
      }
      const fileName = buildExportFileName(selection, { prefix: filePrefix });
      await downloadCatalogExport({ ...table, fileName });
      showToast(`Excel generado: ${fileName}`);
      onClose();
    } catch {
      setError('No pudimos generar el Excel. Intentá nuevamente.');
    } finally {
      setGenerating(false);
    }
  };

  return createPortal(
    <div
      className="export-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-catalog-title"
      ref={modalRef}
    >
      <div className="export-modal-card" role="document">
        <div className="export-modal-head">
          <div>
            <p className="ey">CATÁLOGO MAYORISTA</p>
            <h2 id="export-catalog-title">Exportar a Excel</h2>
          </div>
          <button
            className="export-modal-close"
            type="button"
            aria-label="Cancelar y cerrar"
            onClick={onClose}
            ref={closeRef}
          >
            ×
          </button>
        </div>
        <p className="export-modal-description">
          Descargá los productos publicados como planilla (.xlsx), lista para
          importar en tu sistema de gestión, stock o ventas.
        </p>
        <fieldset className="export-scope">
          <legend>Alcance</legend>
          <label className="export-option">
            <input
              type="radio"
              name="export-scope"
              value={EXPORT_SCOPES.ALL}
              checked={scope === EXPORT_SCOPES.ALL}
              onChange={() => setScope(EXPORT_SCOPES.ALL)}
            />
            Catálogo completo
          </label>
          <label className="export-option">
            <input
              type="radio"
              name="export-scope"
              value={EXPORT_SCOPES.CATEGORY}
              checked={scope === EXPORT_SCOPES.CATEGORY}
              onChange={() => setScope(EXPORT_SCOPES.CATEGORY)}
            />
            Categoría
          </label>
          <label className="export-option">
            <input
              type="radio"
              name="export-scope"
              value={EXPORT_SCOPES.SUBCATEGORY}
              checked={scope === EXPORT_SCOPES.SUBCATEGORY}
              onChange={() => setScope(EXPORT_SCOPES.SUBCATEGORY)}
            />
            Subcategoría
          </label>
        </fieldset>
        {needsCategory ? (
          <div className="export-filters">
            <label className="export-field">
              Categoría
              <select value={categoryValue} onChange={handleCategoryChange}>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {needsSubcategory ? (
              <label className="export-field">
                Subcategoría
                <select
                  value={subcategoryValue}
                  onChange={(event) => {
                    setSubcategoryValue(event.target.value);
                    setError('');
                  }}
                  disabled={subcategoryOptions.length === 0}
                >
                  {subcategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {needsSubcategory && subcategoryOptions.length === 0 ? (
              <p className="export-hint" role="status">
                La categoría elegida no tiene subcategorías con productos
                publicados.
              </p>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className="export-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="export-actions">
          <button
            className="export-cancel"
            type="button"
            onClick={onClose}
            disabled={generating}
          >
            Cancelar
          </button>
          <button
            className="export-download"
            type="button"
            onClick={handleDownload}
            disabled={!canDownload}
          >
            {generating ? 'Generando Excel…' : 'Descargar Excel'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ExportCatalogModal;
