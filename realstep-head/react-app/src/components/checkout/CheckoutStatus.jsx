function CheckoutStatus({ status }) {
  if (!status.message) return null;
  return (
    <div
      className={`checkout-status checkout-status--${status.type}`}
      role={status.type === 'error' ? 'alert' : 'status'}
      aria-live="assertive"
    >
      {status.message}
    </div>
  );
}

export default CheckoutStatus;

