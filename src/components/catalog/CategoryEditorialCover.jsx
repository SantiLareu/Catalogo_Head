function CategoryEditorialCover({ image, imageAlt = '', imageHeight, imageWidth, subtitle, title }) {
  const className = image
    ? 'category-editorial-cover category-editorial-cover--with-image'
    : 'category-editorial-cover category-editorial-cover--without-image';

  return (
    <header className={className}>
      <div className="category-editorial-cover-copy">
        <p className="ey">COLECCIÓN</p>
        <h2>{title}</h2>
        {subtitle ? <p className="category-editorial-cover-subtitle">{subtitle}</p> : null}
      </div>

      {image ? (
        <figure className="category-editorial-cover-media">
          <img
            alt={imageAlt}
            src={image}
            width={imageWidth}
            height={imageHeight}
            loading="lazy"
            decoding="async"
          />
        </figure>
      ) : null}
    </header>
  );
}

export default CategoryEditorialCover;
