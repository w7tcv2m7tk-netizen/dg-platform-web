"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hydrates imported WP gallery grids: click-to-open lightbox with prev/next.
 */
export function HtmlWithGallery({ html }: { html: string }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [items, setItems] = useState<Array<{ src: string; alt: string }>>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const images = Array.from(
      root.querySelectorAll<HTMLImageElement>(
        ".gallery-grid .gallery-item img, .gallery-grid img",
      ),
    );
    const collected = images
      .map((img) => ({
        src: img.currentSrc || img.src,
        alt: img.alt || "",
      }))
      .filter((x) => Boolean(x.src));
    setItems(collected);

    const onClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const img = target.closest("img");
      if (!img || !root.contains(img)) return;
      if (!img.closest(".gallery-grid, .gallery-item")) return;
      event.preventDefault();
      const src = img.currentSrc || img.src;
      const i = collected.findIndex((x) => x.src === src);
      if (i < 0) return;
      setIndex(i);
      setOpen(true);
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [html]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") {
        setIndex((i) => (items.length ? (i + 1) % items.length : i));
      }
      if (e.key === "ArrowLeft") {
        setIndex((i) =>
          items.length ? (i - 1 + items.length) % items.length : i,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, items.length]);

  const current = items[index];

  return (
    <>
      <section
        ref={rootRef}
        className="wb-section wb-html-block wb-html-gallery"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {open && current ? (
        <div
          className="wb-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            className="wb-lightbox-close"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
          {items.length > 1 ? (
            <>
              <button
                type="button"
                className="wb-lightbox-nav wb-lightbox-prev"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + items.length) % items.length);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="wb-lightbox-nav wb-lightbox-next"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % items.length);
                }}
              >
                ›
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="wb-lightbox-image"
            src={current.src}
            alt={current.alt}
            onClick={(e) => e.stopPropagation()}
          />
          <p className="wb-lightbox-meta">
            {index + 1} / {items.length}
            {current.alt ? ` · ${current.alt}` : ""}
          </p>
        </div>
      ) : null}
    </>
  );
}
