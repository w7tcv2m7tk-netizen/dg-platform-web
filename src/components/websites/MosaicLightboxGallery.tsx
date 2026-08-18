"use client";

/**
 * WP-style mosaic: one large image + exactly two equal thumbs on the right.
 * Extra photos open via lightbox (+N on the second thumb when needed).
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
  const thumbA = images[1] ?? null;
  const thumbB = images[2] ?? null;
  const extraCount = Math.max(0, images.length - 3);

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

        {thumbA ? (
          <div className="gallery-thumbs">
            <button
              type="button"
              className="gallery-item gallery-thumb"
              role="listitem"
              aria-label={`${alt} — photo 2`}
              data-index={1}
              onClick={() => onOpen(1)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbA} alt={`${alt} — photo 2`} loading="eager" />
            </button>
            {thumbB ? (
              <button
                type="button"
                className={`gallery-item gallery-thumb${extraCount > 0 ? " gallery-more" : ""}`}
                role="listitem"
                aria-label={
                  extraCount > 0
                    ? `View ${extraCount + 1} more photos`
                    : `${alt} — photo 3`
                }
                data-index={2}
                onClick={() => onOpen(2)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbB}
                  alt={`${alt} — photo 3`}
                  loading="lazy"
                />
                {extraCount > 0 ? (
                  <span className="more-overlay">+{extraCount + 1}</span>
                ) : null}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
