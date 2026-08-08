import { useEffect, useRef, useState } from 'react';
import useCart from './useCart.js';
import { useCartPulse } from './useCartPulse.js';

const PULSE_DURATION_FIRST = 240;
const PULSE_DURATION_NORMAL = 320;
const FADE_OUT_DURATION = 220;
const HIDE_DELAY = PULSE_DURATION_NORMAL + FADE_OUT_DURATION;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useCartBadgeAnimation() {
  const { units } = useCart();
  const pulseId = useCartPulse();

  const [pulseState, setPulseState] = useState({ active: false, kind: null });
  const [visibility, setVisibility] = useState({ shown: false, rendered: false });

  const hasHydratedRef = useRef(false);
  const isFirstPulseRef = useRef(true);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    if (!hasHydratedRef.current) {
      setVisibility({ shown: units > 0, rendered: true });
      hasHydratedRef.current = true;
      return;
    }
    if (units === 0) {
      const tFade = setTimeout(() => {
        setVisibility((v) => ({ ...v, shown: false }));
      }, PULSE_DURATION_NORMAL);
      const tHide = setTimeout(() => {
        setVisibility((v) => ({ ...v, rendered: false }));
      }, HIDE_DELAY);
      timersRef.current.push(tFade, tHide);
    } else {
      setVisibility({ shown: true, rendered: true });
    }
  }, [units]);

  useEffect(() => {
    if (pulseId === 0) return;
    if (prefersReducedMotion()) return;

    const isFirst = isFirstPulseRef.current;
    isFirstPulseRef.current = false;

    const duration = isFirst ? PULSE_DURATION_FIRST : PULSE_DURATION_NORMAL;
    setPulseState({ active: true, kind: isFirst ? 'first' : 'normal' });

    const t = setTimeout(() => {
      setPulseState({ active: false, kind: null });
    }, duration);
    timersRef.current.push(t);

    return clearTimers;
  }, [pulseId]);

  const classes = ['cart-badge'];
  if (pulseState.active) classes.push('cart-badge--pulse');
  if (pulseState.active && pulseState.kind === 'first') {
    classes.push('cart-badge--pulse-first');
  }
  if (!visibility.shown) classes.push('cart-badge--hidden');

  return {
    className: classes.filter(Boolean).join(' '),
    rendered: visibility.rendered
  };
}
