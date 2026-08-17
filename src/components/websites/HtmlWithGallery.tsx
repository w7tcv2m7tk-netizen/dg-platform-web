"use client";

import { useEffect, useRef, useState } from "react";

type GalleryItem = { src: string; alt: string };

function collectGalleryItems(root: HTMLElement): GalleryItem[] {
  const mosaic = root.querySelector<HTMLElement>("[data-wb-gallery]");
  if (mosaic) {
    try {
      const parsed = JSON.parse(mosaic.getAttribute("data-wb-gallery") || "[]") as unknown;
      if (Array.isArray(parsed) && parsed.length) {
        return parsed
          .map(String)
          .filter(Boolean)
          .map((src) => ({ src, alt: "" }));
      }
    } catch {
      /* fall through */
    }
  }

  const images = Array.from(
    root.querySelectorAll<HTMLImageElement>(
      ".wb-mosaic-gallery .gallery-item img, .gallery-hidden .gallery-item img, .gallery-grid .gallery-item img, .gallery-grid img",
    ),
  );
  const seen = new Set<string>();
  const collected: GalleryItem[] = [];
  for (const img of images) {
    const src = img.currentSrc || img.src;
    if (!src || seen.has(src)) continue;
    seen.add(src);
    collected.push({ src, alt: img.alt || "" });
  }
  return collected;
}

/**
 * Hydrates gallery grids / mosaics: click-to-open lightbox with prev/next.
 */
export function HtmlWithGallery({ html }: { html: string }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const collected = collectGalleryItems(root);
    setItems(collected);

    const onClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const item = target.closest(".gallery-item") as HTMLElement | null;
      if (!item || !root.contains(item)) return;
      if (item.classList.contains("gallery-hidden")) return;
      event.preventDefault();

      const dataIndex = item.getAttribute("data-index");
      if (dataIndex != null && collected.length) {
        const i = Number(dataIndex);
        if (Number.isFinite(i) && i >= 0 && i < collected.length) {
          setIndex(i);
          setOpen(true);
          return;
        }
      }

      const img = item.querySelector("img") || (target.closest("img") as HTMLImageElement | null);
      if (!img) return;
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
