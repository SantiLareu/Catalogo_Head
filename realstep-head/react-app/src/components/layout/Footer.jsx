import { companyConfig } from '../../config/company.js';

function Footer() {
  const { companyName, catalogName } = companyConfig;
  const {
    owner,
    developer,
    copyrightYear,
    rightsNotice
  } = companyConfig.ownership;
  const { licensedTo } = companyConfig.license;

  return (
    <footer>
      <div className="footer-brand">
        <strong>{companyName.toUpperCase()}</strong>
        <span>{catalogName}</span>
      </div>
      <small className="footer-ownership">
        © {copyrightYear} {owner}. Sistema diseñado y desarrollado por {developer}.{' '}
        Licenciado para uso exclusivo de {licensedTo}. {rightsNotice}
      </small>
    </footer>
  );
}

export default Footer;
