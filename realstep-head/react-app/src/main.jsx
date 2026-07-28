import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Orden deliberado: variables compartidas, reset compartido y estilos de la shell.
import '../../css/base/variables.css';
import '../../css/base/reset.css';
import './styles/shell.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
