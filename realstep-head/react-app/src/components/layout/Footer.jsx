import { companyConfig } from '../../config/company.js';
import {
  buildFooterCopy,
  buildWhatsappUrl,
  normalizeInstagramUrl
} from '../../config/contactLinks.js';

function InstagramIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm11.5 1.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M12 2a9.5 9.5 0 0 0-8.18 14.34L2.5 21.5l5.28-1.26A9.5 9.5 0 1 0 12 2Zm0 2a7.5 7.5 0 1 1-3.86 13.93l-.35-.21-2.46.59.61-2.39-.23-.36A7.5 7.5 0 0 1 12 4Zm-3.1 3.7c-.2 0-.5.08-.76.37-.26.28-1 1-.98 2.42.03 1.42 1.04 2.78 1.18 2.97.14.19 1.98 3.16 4.9 4.25 2.43.91 2.93.72 3.46.67.53-.05 1.7-.68 1.94-1.35.24-.67.24-1.25.18-1.37-.07-.12-.27-.2-.56-.35l-1.97-.96c-.26-.13-.45-.2-.64.1-.19.28-.74.94-.91 1.13-.17.2-.34.22-.63.08-.29-.14-1.22-.45-2.32-1.43-.86-.76-1.44-1.7-1.61-1.99-.17-.29-.02-.44.12-.59l.43-.5c.14-.17.19-.29.28-.48.1-.2.05-.37-.02-.52l-.88-2.1c-.22-.54-.47-.55-.73-.56H8.9Z" />
    </svg>
  );
}

function Footer() {
  const { contact } = companyConfig;
  const copy = buildFooterCopy(companyConfig);
  const instagramUrl = normalizeInstagramUrl(contact.instagramUrl);
  const whatsappUrl = buildWhatsappUrl(contact.whatsappNumber, contact.whatsappMessage);

  return (
    <footer id="contacto">
      <div className="footer-content">
        <p className="footer-title">
          {copy.primary}
        </p>
        {instagramUrl || whatsappUrl ? (
          <nav className="footer-contact" aria-label="Canales de contacto">
            {instagramUrl ? (
              <a href={instagramUrl} rel="noopener noreferrer" target="_blank">
                <InstagramIcon />
                <span>Instagram</span>
              </a>
            ) : null}
            {whatsappUrl ? (
              <a href={whatsappUrl} rel="noopener noreferrer" target="_blank">
                <WhatsappIcon />
                <span>WhatsApp</span>
              </a>
            ) : null}
          </nav>
        ) : null}
      </div>
      <small className="footer-ownership">
        {copy.legal}
      </small>
    </footer>
  );
}

export default Footer;
