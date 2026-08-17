"use client";

/**
 * Original WP-style mosaic: one large image + 2–3 thumbs on the right.
 * Click opens a lightbox that can scroll through the full image set.
 */
export function MosaicLightboxGallery({
  images,
  alt,
  onOpen,
  className = "",
}: {
  images: string[];
  alt: string;
  onOpen: (index: number) => void;
  className?: string;
}) {
  if (!images.length) return null;

  const main = images[0]!;
  const rest = images.slice(1);
  const sideThumbs = rest.slice(0, 2);
  const remainingAfterTwo = rest.length - 2;
  const moreSrc = remainingAfterTwo > 0 ? rest[2] : null;

  return (
    <div
      className={["wb-mosaic-gallery", "dg-acc-gallery", className]
        .filter(Boolean)
        .join(" ")}
      data-wb-gallery={JSON.stringify(images)}
    >
      <div className="gallery-grid wb-mosaic-grid" role="list">
        <button
          type="button"
          className="gallery-item gallery-main"
          role="listitem"
          aria-label={`${alt} — photo 1`}
          data-index={0}
          onClick={() => onOpen(0)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={main} alt={`${alt} — photo 1`} loading="eager" />
        </button>

        {sideThumbs.length > 0 || moreSrc ? (
          <div className="gallery-thumbs">
            {sideThumbs.map((src, i) => {
              const index = i + 1;
              return (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  className="gallery-item gallery-thumb"
                  role="listitem"
                  aria-label={`${alt} — photo ${index + 1}`}
                  data-index={index}
                  onClick={() => onOpen(index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${alt} — photo ${index + 1}`}
                    loading={index < 2 ? "eager" : "lazy"}
                  />
                </button>
              );
            })}
            {moreSrc ? (
              <button
                type="button"
                className="gallery-item gallery-thumb gallery-more"
                role="listitem"
                aria-label={`View ${remainingAfterTwo} more photos`}
                data-index={3}
                onClick={() => onOpen(3)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={moreSrc} alt={`${alt} — more photos`} loading="lazy" />
                <span className="more-overlay">+{remainingAfterTwo}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
