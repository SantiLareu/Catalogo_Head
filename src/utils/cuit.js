const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const CUIT_SEPARATORS = /[\s./-]+/g;

export const cuitValidationMessages = {
  format: 'El CUIT solo puede contener números, espacios, puntos, barras o guiones.',
  length: 'El CUIT debe tener exactamente 11 dígitos.',
  checksum: 'El dígito verificador del CUIT no es válido.'
};

export function normalizeCuit(value) {
  return typeof value === 'string'
    ? value.trim().replace(CUIT_SEPARATORS, '')
    : '';
}

export function validateCuit(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    return {
      valid: true,
      normalized: '',
      reason: null,
      message: ''
    };
  }
  if (typeof value !== 'string') {
    return {
      valid: false,
      normalized: '',
      reason: 'format',
      message: cuitValidationMessages.format
    };
  }

  const normalized = normalizeCuit(value);
  if (normalized === '') {
    return {
      valid: false,
      normalized,
      reason: 'length',
      message: cuitValidationMessages.length
    };
  }
  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      reason: 'format',
      message: cuitValidationMessages.format
    };
  }
  if (normalized.length !== 11) {
    return {
      valid: false,
      normalized,
      reason: 'length',
      message: cuitValidationMessages.length
    };
  }

  const digits = [...normalized].map(Number);
  const weightedSum = CUIT_WEIGHTS.reduce(
    (sum, weight, index) => sum + (digits[index] * weight),
    0
  );
  const remainder = weightedSum % 11;
  const expectedCheckDigit = remainder === 0
    ? 0
    : remainder === 1
      ? 9
      : 11 - remainder;

  if (digits[10] !== expectedCheckDigit) {
    return {
      valid: false,
      normalized,
      reason: 'checksum',
      message: cuitValidationMessages.checksum
    };
  }

  return {
    valid: true,
    normalized,
    reason: null,
    message: ''
  };
}
