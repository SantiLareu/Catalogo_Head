import { scrollToHashTarget } from '../../utils/navigation.js';

const logoUrl = new URL('../../../../assets/Real_Step_logo.jpeg', import.meta.url).href;

function Header() {
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
          className="cart"
          type="button"
          disabled
          aria-label="Pedido, disponible en una etapa posterior"
          title="El carrito se migrará en una etapa posterior"
        >
          Pedido
          <span aria-hidden="true">0</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
