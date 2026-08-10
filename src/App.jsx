import { useEffect, useMemo, useRef } from 'react';
import { CartProvider } from './context/CartContext.jsx';
import useCart from './hooks/useCart.js';
import Toast from './components/feedback/Toast.jsx';
import CatalogSections from './components/catalog/CatalogSections.jsx';
import CategoryIndex from './components/categories/CategoryIndex.jsx';
import Footer from './components/layout/Footer.jsx';
import Header from './components/layout/Header.jsx';
import Hero from './components/layout/Hero.jsx';
import catalog, { catalogVersion } from './data/catalog.js';
import {
  getCatalogTargetIds,
  resolveCatalogHash,
  scrollToHashTarget
} from './utils/navigation.js';

function CatalogApplication() {
  const { activeCatalog, activeVersion } = useCart();
  const categories = Array.isArray(activeCatalog.categories)
    ? activeCatalog.categories
    : [];
  const products = Array.isArray(activeCatalog.products)
    ? activeCatalog.products
    : [];
  const validTargetIds = useMemo(
    () => getCatalogTargetIds(categories, products),
    [categories, products]
  );
  const validTargetIdsRef = useRef(validTargetIds);
  useEffect(() => {
    validTargetIdsRef.current = validTargetIds;
  }, [validTargetIds]);

  useEffect(() => {

    const navigateToCurrentHash = (behavior = 'smooth') => {
      const resolvedHash = resolveCatalogHash(
        window.location.hash,
        validTargetIdsRef.current
      );
      if (window.location.hash !== resolvedHash) {
        window.history.replaceState(null, '', resolvedHash);
      }
      window.requestAnimationFrame(() => {
        scrollToHashTarget(resolvedHash, false, behavior);
      });
    };
    const handleHashNavigation = () => {
      navigateToCurrentHash('smooth');
    };

    navigateToCurrentHash('instant');
    window.addEventListener('hashchange', handleHashNavigation);

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
    };
  }, []);

  return (
    <>
      <Header categories={categories} products={products} />
      <main>
        <Hero />
        <CategoryIndex categories={categories} />
        <CatalogSections categories={categories} products={products} />
      </main>
      <Footer catalogVersion={activeVersion} />
      <Toast />
    </>
  );
}

function App() {
  return (
    <CartProvider
      initialCatalog={catalog}
      initialVersion={catalogVersion.version}
    >
      <CatalogApplication />
    </CartProvider>
  );
}

export default App;
