import { companyConfig } from '../../config/company.js';

const heroImageUrl = new URL(
  '../../../assets/2026-padel-coello-heroHeader.jpg',
  import.meta.url
).href;

function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-copy">
        <p className="ey">{companyConfig.companyName.toUpperCase()} PRESENTA</p>
        <h1>HEAD</h1>
      </div>
      <div className="hero-img">
        <img src={heroImageUrl} alt="" />
      </div>
    </section>
  );
}

export default Hero;
