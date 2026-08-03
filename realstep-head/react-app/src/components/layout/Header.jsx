import { useRef, useState } from 'react';
import CartDrawer from '../cart/CartDrawer.jsx';
import CategoryMenu, { MenuIcon } from '../categories/CategoryMenu.jsx';
import CheckoutModal, {
  createEmptyCheckoutForm
} from '../checkout/CheckoutModal.jsx';
import ProductSearch from '../search/ProductSearch.jsx';
import { companyConfig } from '../../config/company.js';
import useCart from '../../hooks/useCart.js';
import { useCartBadgeAnimation } from '../../hooks/useCartBadgeAnimation.js';
import { scrollToHashTarget } from '../../utils/navigation.js';

const logoUrl = new URL('../../../../assets/Real_Step_logo.jpeg', import.meta.url).href;

function Header({ categories, products }) {
  const { catalogValidation, checkCatalog, showToast, units } = useCart();
  const cartBadge = useCartBadgeAnimation();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState(createEmptyCheckoutForm);
  const cartButtonRef = useRef(null);
  const categoryMenuButtonRef = useRef(null);
  const continueButtonRef = useRef(null);
  const handleHomeClick = (event) => {
    event.preventDefault();
    scrollToHashTarget('#inicio');
  };
  const openCart = async () => {
    if (catalogValidation.checking) return;
    await checkCatalog();
    setCartOpen(true);
  };
  const continueToCheckout = async () => {
    if (catalogValidation.checking) return;
    const validation = await checkCatalog();
    if (!validation.valid) {
      showToast('No pudimos comprobar la disponibilidad actual. Intentá nuevamente.');
      return;
    }
    if (validation.reconciliation.checkoutBlocked) {
      showToast('Revisá los artículos señalados antes de continuar');
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <header className="top">
      <a className="brand" href="#inicio" aria-label="Ir al inicio" onClick={handleHomeClick}>
        <img src={logoUrl} alt={companyConfig.companyName} className="brand-logo" />
        <span className="brand-text">
          <strong>{companyConfig.companyName.toUpperCase()}</strong>
          <small>{companyConfig.catalogName}</small>
        </span>
      </a>

      <ProductSearch categories={categories} products={products} />

      <div className="actions">
        <a className="contact-link contact-link--desktop" href="#contacto">
          Contacto
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label="Abrir menú de categorías"
          aria-expanded={categoryMenuOpen}
          aria-controls="header-category-menu"
          onClick={() => setCategoryMenuOpen((open) => !open)}
          ref={categoryMenuButtonRef}
        >
          <MenuIcon />
        </button>
        <button
          className="cart"
          type="button"
          aria-label={`Abrir pedido, ${units} ${units === 1 ? 'unidad' : 'unidades'}`}
          aria-haspopup="dialog"
          disabled={catalogValidation.checking}
          onClick={openCart}
          ref={cartButtonRef}
        >
          {catalogValidation.checking ? 'Comprobando catálogo…' : 'Pedido'}
          <span
            aria-hidden="true"
            className={cartBadge.className}
            style={!cartBadge.rendered ? { display: 'none' } : undefined}
          >
            {units}
          </span>
        </button>
      </div>
      {categoryMenuOpen ? (
        <CategoryMenu
          categories={categories}
          onClose={() => setCategoryMenuOpen(false)}
          openerRef={categoryMenuButtonRef}
        />
      ) : null}
      {cartOpen ? (
        <CartDrawer
          continueRef={continueButtonRef}
          onClose={() => setCartOpen(false)}
          onContinue={continueToCheckout}
          openerRef={cartButtonRef}
        />
      ) : null}
      {checkoutOpen ? (
        <CheckoutModal
          customer={checkoutForm}
          onCustomerChange={setCheckoutForm}
          onClose={() => {
            setCheckoutOpen(false);
            setCartOpen(true);
          }}
          onSuccess={() => {
            setCheckoutForm(createEmptyCheckoutForm());
            setCheckoutOpen(false);
          }}
          openerRef={continueButtonRef}
        />
      ) : null}
    </header>
  );
}

export default Header;
