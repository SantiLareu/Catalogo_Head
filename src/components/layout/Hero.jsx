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
        <img
          src={heroImageUrl}
          alt=""
          width="1920"
          height="1080"
          decoding="async"
          fetchPriority="high"
        />
      </div>
    </section>
  );
}

export default Hero;
