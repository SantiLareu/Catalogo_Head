function CheckoutStatus({ status }) {
  if (!status.message) return null;
  return (
    <div
      className={`checkout-status checkout-status--${status.type}`}
      role={status.type === 'error' ? 'alert' : 'status'}
      aria-live="assertive"
    >
      <p>{status.message}</p>
      {status.changes?.length > 0 ? (
        <ul className="checkout-status-changes">
          {status.changes.map((change) => (
            <li key={change.key}>
              <strong>{change.label}:</strong> {change.message}
            </li>
          ))}
        </ul>
      ) : null}
      {status.prompt ? <p className="checkout-status-prompt">{status.prompt}</p> : null}
    </div>
  );
}

export default CheckoutStatus;
