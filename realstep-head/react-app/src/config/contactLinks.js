export function normalizeInstagramUrl(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const instagramHost =
      url.hostname === 'instagram.com' || url.hostname.endsWith('.instagram.com');
    return url.protocol === 'https:' && instagramHost ? url.href : null;
  } catch {
    return null;
  }
}

export function buildFooterCopy(config) {
  return {
    primary: `${config.companyName} Catalog — Powered by ${config.ownership.developer}`,
    legal: `© ${config.ownership.copyrightYear} ${config.ownership.owner}. ` +
      `Licenciado para uso de ${config.license.licensedTo}.`
  };
}

export function buildWhatsappUrl(number, message = '') {
  const candidate = String(number || '').trim();
  if (!/^\d+$/.test(candidate)) return null;
  const url = new URL(`https://wa.me/${candidate}`);
  const normalizedMessage = String(message || '').trim();
  if (normalizedMessage) url.searchParams.set('text', normalizedMessage);
  return url.href;
}
