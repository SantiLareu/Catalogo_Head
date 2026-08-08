import { useEffect, useState } from 'react';
import useCart from './useCart.js';

export function useCartPulse() {
  const { subscribePulse } = useCart();
  const [pulseId, setPulseId] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribePulse(() => {
      setPulseId((p) => p + 1);
    });
    return unsubscribe;
  }, [subscribePulse]);

  return pulseId;
}
