import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Orden deliberado: base compartida, componentes y ajustes responsive al final.
import './styles/variables.css';
import './styles/reset.css';
import './styles/header.css';
import './styles/hero.css';
import './styles/category-index.css';
import './styles/product.css';
import './styles/lightbox.css';
import './styles/cart.css';
import './styles/footer.css';
import './styles/responsive.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
