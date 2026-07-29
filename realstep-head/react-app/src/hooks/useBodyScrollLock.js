import { useLayoutEffect } from 'react';

function useBodyScrollLock(active, { inertRoot = true } = {}) {
  useLayoutEffect(() => {
    if (!active) return undefined;

    const scrollY = window.scrollY;
    const root = document.getElementById('root');
    const previousAriaHidden = root?.getAttribute('aria-hidden');
    const previousInert = root?.hasAttribute('inert');
    const styles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      scrollBehavior: document.documentElement.style.scrollBehavior
    };

    if (inertRoot) {
      root?.setAttribute('inert', '');
      root?.setAttribute('aria-hidden', 'true');
    }
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      if (inertRoot) {
        if (!previousInert) root?.removeAttribute('inert');
        if (previousAriaHidden == null) root?.removeAttribute('aria-hidden');
        else root?.setAttribute('aria-hidden', previousAriaHidden);
      }
      Object.assign(document.body.style, {
        position: styles.position,
        top: styles.top,
        left: styles.left,
        right: styles.right,
        width: styles.width,
        overflow: styles.overflow
      });
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, scrollY);
      document.documentElement.style.scrollBehavior = styles.scrollBehavior;
    };
  }, [active, inertRoot]);
}

export default useBodyScrollLock;
