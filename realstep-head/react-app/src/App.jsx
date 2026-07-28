import { useEffect } from 'react';
import { CartProvider } from './context/CartContext.jsx';
import Toast from './components/feedback/Toast.jsx';
import CatalogSections from './components/catalog/CatalogSections.jsx';
import CategoryIndex from './components/categories/CategoryIndex.jsx';
import Footer from './components/layout/Footer.jsx';
import Header from './components/layout/Header.jsx';
import Hero from './components/layout/Hero.jsx';
import catalog from './data/catalog.js';
import { scrollToHashTarget } from './utils/navigation.js';

function App() {
  const categories = Array.isArray(catalog.categories) ? catalog.categories : [];

  useEffect(() => {
    const handleHashNavigation = () => {
      window.requestAnimationFrame(() => {
        scrollToHashTarget(window.location.hash, false);
      });
    };

    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
    };
  }, []);

  return (
    <CartProvider products={catalog.products}>
      <Header />
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
