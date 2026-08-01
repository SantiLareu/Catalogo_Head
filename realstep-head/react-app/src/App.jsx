import { useEffect, useMemo } from 'react';
import { CartProvider } from './context/CartContext.jsx';
import Toast from './components/feedback/Toast.jsx';
import CatalogSections from './components/catalog/CatalogSections.jsx';
import CategoryIndex from './components/categories/CategoryIndex.jsx';
import Footer from './components/layout/Footer.jsx';
import Header from './components/layout/Header.jsx';
import Hero from './components/layout/Hero.jsx';
import catalog from './data/catalog.js';
import {
  getCatalogTargetIds,
  resolveCatalogHash,
  scrollToHashTarget
} from './utils/navigation.js';

function App() {
  const categories = Array.isArray(catalog.categories) ? catalog.categories : [];
  const validTargetIds = useMemo(
    () => getCatalogTargetIds(categories, catalog.products),
    [categories]
  );

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const navigateToCurrentHash = (behavior = 'smooth') => {
      const resolvedHash = resolveCatalogHash(window.location.hash, validTargetIds);
      if (window.location.hash !== resolvedHash) {
        window.history.replaceState(null, '', resolvedHash);
      }
      window.requestAnimationFrame(() => {
        scrollToHashTarget(resolvedHash, false, behavior);
      });
    };
    const handleHashNavigation = () => navigateToCurrentHash('smooth');

    navigateToCurrentHash('auto');
    window.addEventListener('hashchange', handleHashNavigation);

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [validTargetIds]);

  return (
    <CartProvider products={catalog.products}>
      <Header categories={categories} products={catalog.products} />
      <main>
        <Hero />
        <CategoryIndex categories={categories} />
        <CatalogSections categories={categories} products={catalog.products} />
      </main>
      <Footer />
      <Toast />
    </CartProvider>
  );
}

export default App;
