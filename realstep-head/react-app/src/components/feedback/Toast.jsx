import useCart from '../../hooks/useCart.js';

function Toast() {
  const { toast } = useCart();
  return (
    <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
      {toast}
    </div>
  );
}

export default Toast;

