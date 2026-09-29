import { useState } from 'react';
import { validateCuit } from '../../utils/cuit.js';
import CheckoutActions from './CheckoutActions.jsx';
import CheckoutStatus from './CheckoutStatus.jsx';
import OrderPreview from './OrderPreview.jsx';

const fields = [
  { name: 'name', label: 'Nombre y apellido', required: true },
  { name: 'company', label: 'Razón Social', required: true },
  { name: 'cuit', label: 'CUIT', placeholder: '20-12345678-3', newCustomer: true },
  { name: 'phone', label: 'Teléfono', newCustomer: true },
  { name: 'email', label: 'Correo electrónico', required: true, type: 'email' },
  { name: 'province', label: 'Provincia', newCustomer: true },
  { name: 'city', label: 'Localidad', newCustomer: true },
  { name: 'address', label: 'Dirección', newCustomer: true }
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
  const [cuitError, setCuitError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'cuit') {
      const validation = validateCuit(value);
      event.target.setCustomValidity(validation.message);
      if (cuitError) setCuitError(validation.message);
    }
    onChange((current) => ({ ...current, [name]: value }));
  };

  const handleCuitBlur = (event) => {
    const validation = validateCuit(event.currentTarget.value);
    event.currentTarget.setCustomValidity(validation.message);
    setCuitError(validation.message);
  };

  const handleCuitInvalid = (event) => {
    const validation = validateCuit(event.currentTarget.value);
    event.currentTarget.setCustomValidity(validation.message);
    setCuitError(validation.message);
  };

  return (
    <form className="form" onSubmit={onSubmit} ref={formRef} noValidate={false}>
      <div className="grid">
        {fields.map((field) => {
          const isCuit = field.name === 'cuit';
          return (
            <label className={field.wide ? 'wide' : undefined} key={field.name}>
              <span className="checkout-field-label">
                <span>{field.label}{field.required ? '*' : ''}</span>
                {field.newCustomer ? (
                  <small className="checkout-field-hint">(Si sos cliente nuevo, completar)</small>
                ) : null}
              </span>
              <input
                aria-describedby={isCuit && cuitError ? 'checkout-cuit-error' : undefined}
                aria-invalid={isCuit && cuitError ? 'true' : undefined}
                autoComplete={field.name === 'email' ? 'email' : field.name === 'phone' ? 'tel' : 'on'}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                type={field.type || 'text'}
                value={customer[field.name]}
                onBlur={isCuit ? handleCuitBlur : undefined}
                onChange={handleChange}
                onInvalid={isCuit ? handleCuitInvalid : undefined}
                disabled={sending}
              />
              {isCuit && cuitError ? (
                <span className="field-error" id="checkout-cuit-error" role="alert">
                  {cuitError}
                </span>
              ) : null}
            </label>
          );
        })}
        <label className="wide">
          <span className="checkout-field-label">
            <span>Observaciones</span>
            <small className="checkout-field-hint">(Opcional)</small>
          </span>
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
