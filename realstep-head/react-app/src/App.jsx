import { useEffect } from 'react';
import CatalogSectionsPlaceholder from './components/catalog/CatalogSectionsPlaceholder.jsx';
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
    <>
      <Header />
      <main>
        <Hero />
        <CategoryIndex categories={categories} />
        <CatalogSectionsPlaceholder categories={categories} />
      </main>
      <Footer />
    </>
  );
}

export default App;
