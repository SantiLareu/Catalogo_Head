import CheckoutActions from './CheckoutActions.jsx';
import CheckoutStatus from './CheckoutStatus.jsx';
import OrderPreview from './OrderPreview.jsx';

const fields = [
  { name: 'name', label: 'Nombre y apellido', required: true },
  { name: 'company', label: 'Comercio', required: true },
  { name: 'phone', label: 'Teléfono', required: true },
  { name: 'email', label: 'Correo electrónico', required: true, type: 'email' },
  { name: 'province', label: 'Provincia', required: true },
  { name: 'city', label: 'Localidad', required: true },
  { name: 'address', label: 'Dirección', wide: true }
];

function CheckoutForm({
  cart,
  customer,
  formRef,
  onChange,
  onSubmit,
  products,
  sending,
  status
}) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange((current) => ({ ...current, [name]: value }));
  };

  return (
    <form className="form" onSubmit={onSubmit} ref={formRef} noValidate={false}>
      <div className="grid">
        {fields.map((field) => (
          <label className={field.wide ? 'wide' : undefined} key={field.name}>
            {field.label}{field.required ? '*' : ''}
            <input
              autoComplete={field.name === 'email' ? 'email' : field.name === 'phone' ? 'tel' : 'on'}
              name={field.name}
              required={field.required}
              type={field.type || 'text'}
              value={customer[field.name]}
              onChange={handleChange}
              disabled={sending}
            />
          </label>
        ))}
        <label className="wide">
          Observaciones
          <textarea
            name="notes"
            rows="4"
            value={customer.notes}
            onChange={handleChange}
            disabled={sending}
          />
        </label>
      </div>
      <OrderPreview cart={cart} products={products} />
      <p className="note">
        Esta solicitud no procesa pagos ni confirma stock de manera definitiva.
      </p>
      <CheckoutStatus status={status} />
      <CheckoutActions checkingCatalog={status.type === 'checking'} sending={sending} />
    </form>
  );
}

export default CheckoutForm;
