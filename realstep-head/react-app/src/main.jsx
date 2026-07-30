import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { companyConfig } from './config/company.js';

// Orden deliberado: base compartida, componentes y ajustes responsive al final.
import './styles/variables.css';
import './styles/reset.css';
import './styles/header.css';
import './styles/hero.css';
import './styles/category-index.css';
import './styles/product.css';
import './styles/lightbox.css';
import './styles/cart.css';
import './styles/checkout.css';
import './styles/footer.css';
import './styles/responsive.css';

const rootElement = document.getElementById('root');
const { owner, developer, licensedTo, projectId } = companyConfig.ownership;

rootElement.dataset.catalogOrigin = projectId;
rootElement.dataset.catalogOwner = owner;
rootElement.dataset.catalogDeveloper = developer;
rootElement.dataset.catalogLicensedTo = licensedTo;

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
