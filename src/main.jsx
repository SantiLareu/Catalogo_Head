import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { companyConfig } from './config/company.js';
import { verifyPublishedIntegrity } from './security/integrityVerifier.js';

// Orden deliberado: base compartida, componentes y ajustes responsive al final.
import './styles/variables.css';
import './styles/reset.css';
import './styles/header.css';
import './styles/search.css';
import './styles/hero.css';
import './styles/category-index.css';
import './styles/category-editorial-cover.css';
import './styles/product.css';
import './styles/lightbox.css';
import './styles/cart.css';
import './styles/checkout.css';
import './styles/footer.css';
import './styles/responsive.css';

const rootElement = document.getElementById('root');
const { softwareId } = companyConfig.software;
const { owner, developer, projectId } = companyConfig.ownership;
const { licenseId, licensedTo } = companyConfig.license;

rootElement.dataset.catalogOrigin = projectId;
rootElement.dataset.catalogSoftwareId = softwareId;
rootElement.dataset.catalogOwner = owner;
rootElement.dataset.catalogDeveloper = developer;
rootElement.dataset.catalogLicensedTo = licensedTo;
rootElement.dataset.catalogLicenseId = licenseId;
rootElement.dataset.integrityStatus = 'unavailable';

void verifyPublishedIntegrity(companyConfig).then((status) => {
  rootElement.dataset.integrityStatus = status;
});

// Desactivar la restauración automática de scroll antes del primer paint
// para que la posición inicial la controle React sin competir con el historial.
window.history.scrollRestoration = 'manual';

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
