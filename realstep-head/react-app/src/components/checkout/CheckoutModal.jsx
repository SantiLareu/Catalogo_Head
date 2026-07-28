import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useBodyScrollLock from '../../hooks/useBodyScrollLock.js';
import useCart from '../../hooks/useCart.js';
import useFocusTrap from '../../hooks/useFocusTrap.js';
import {
  buildOrderLines,
  CheckoutEmailError,
  runCheckoutTransaction,
  sendOrderEmails
} from '../../services/emailService.js';
import CheckoutForm from './CheckoutForm.jsx';

export function createEmptyCheckoutForm() {
  return {
    name: '',
    company: '',
    phone: '',
    email: '',
    province: '',
    city: '',
    address: '',
    notes: ''
  };
}

function errorMessage(error) {
  if (error?.stage === 'configuration') {
    return 'No se puede enviar el pedido: la configuración de EmailJS está incompleta.';
  }
  if (error?.ownerSent && error?.stage === 'customer') {
    return 'El pedido pudo haber llegado al negocio, pero falló la confirmación al cliente. Reintentá para enviar solamente la confirmación.';
  }
  if (error?.code === 'network') {
    return 'No pudimos completar el envío por un problema de red. Verificá tu conexión e intentá nuevamente.';
  }
  if (error?.stage === 'owner') {
    return 'No pudimos enviar el pedido al negocio. Intentá nuevamente.';
  }
  return 'No pudimos enviar la confirmación al cliente. Intentá nuevamente.';
}

function CheckoutModal({
  customer,
  onClose,
  onCustomerChange,
  onSuccess,
  openerRef,
  products
}) {
  const { completeCheckout, lines: cart, showToast } = useCart();
  const [sending, setSending] = useState(false);
  const [ownerSent, setOwnerSent] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const formRef = useRef(null);
  const submittingRef = useRef(false);
  const close = useCallback(() => {
    if (!submittingRef.current) onClose();
  }, [onClose]);

  useBodyScrollLock(true);
  useFocusTrap(modalRef, true, close);

  useEffect(() => {
    formRef.current?.elements.name?.focus({ preventScroll: true });
    return () => openerRef.current?.focus({ preventScroll: true });
  }, [openerRef]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = formRef.current;
    if (!form?.checkValidity()) {
      form?.reportValidity();
      return;
    }
    if (submittingRef.current || cart.length === 0) return;

    submittingRef.current = true;
    setSending(true);
    setStatus({ type: 'progress', message: 'Enviando pedido…' });

    try {
      const orderLines = buildOrderLines(cart, products);
      await runCheckoutTransaction({
        send: () => sendOrderEmails({
          customer,
          lines: orderLines,
          ownerAlreadySent: ownerSent
        }),
        clearCart: completeCheckout
      });
      onSuccess();
      showToast('Pedido enviado correctamente. Revisá tu correo.');
    } catch (error) {
      if (error instanceof CheckoutEmailError && error.ownerSent) {
        setOwnerSent(true);
      }
      console.error('Error de checkout EmailJS', {
        stage: error?.stage || 'unknown',
        code: error?.code || 'unknown',
        status: error?.cause?.status
      });
      setStatus({ type: 'error', message: errorMessage(error) });
    } finally {
      submittingRef.current = false;
      setSending(false);
    }
  };

  return createPortal(
    <section
      className="modal open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      ref={modalRef}
      tabIndex="-1"
    >
      <div
        className="back"
        aria-hidden="true"
        onClick={() => !sending && close()}
      />
      <div className="mcard">
        <div className="dhead">
          <div><p className="ey">CONFIRMACIÓN</p><h2 id="checkout-title">Datos del cliente</h2></div>
          <button
            className="close"
            type="button"
            aria-label="Cerrar checkout"
            disabled={sending}
            onClick={close}
            ref={closeRef}
          >×</button>
        </div>
        <CheckoutForm
          cart={cart}
          customer={customer}
          formRef={formRef}
          onChange={onCustomerChange}
          onSubmit={handleSubmit}
          products={products}
          sending={sending}
          status={status}
        />
      </div>
    </section>,
    document.body
  );
}

export default CheckoutModal;
