import { useRef, useState } from 'react';
import CartDrawer from '../cart/CartDrawer.jsx';
import CategoryMenu, { MenuIcon } from '../categories/CategoryMenu.jsx';
import CheckoutModal, {
  createEmptyCheckoutForm
} from '../checkout/CheckoutModal.jsx';
import catalog from '../../data/catalog.js';
import useCart from '../../hooks/useCart.js';
import { scrollToHashTarget } from '../../utils/navigation.js';

const logoUrl = new URL('../../../../assets/Real_Step_logo.jpeg', import.meta.url).href;

function Header({ categories }) {
  const { units } = useCart();
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

  return (
    <header className="top">
      <a className="brand" href="#inicio" aria-label="Ir al inicio" onClick={handleHomeClick}>
        <img src={logoUrl} alt="Real Step" className="brand-logo" />
        <span className="brand-text">
          <strong>REAL STEP</strong>
          <small>Catálogo Mayorista</small>
        </span>
      </a>

      <div className="actions">
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
          onClick={() => setCartOpen(true)}
          ref={cartButtonRef}
        >
          Pedido
          <span aria-hidden="true">{units}</span>
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
          onContinue={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
          openerRef={cartButtonRef}
          products={catalog.products}
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
          products={catalog.products}
        />
      ) : null}
    </header>
  );
}

export default Header;
