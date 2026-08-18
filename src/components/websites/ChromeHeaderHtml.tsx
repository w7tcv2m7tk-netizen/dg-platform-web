"use client";

import { useEffect, useId, useState } from "react";

import { rewriteProductFunnelHref } from "@/lib/product-funnel-links";

/**
 * Hydrates imported / custom site chrome headers with a mobile drawer.
 * Works with Aëtherra-style markup (.nav-links) without rewriting page HTML.
 */
export function ChromeHeaderHtml({ html }: { html: string }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<Array<{ href: string; label: string }>>([]);

  useEffect(() => {
    const root = document.createElement("div");
    root.innerHTML = html;
    const collected = Array.from(
      root.querySelectorAll<HTMLAnchorElement>(
        ".nav-links a, .wb-aetherra-header .nav-links a, nav a",
      ),
    )
      .map((a) => ({
        href: rewriteProductFunnelHref(a.getAttribute("href") || ""),
        label: (a.textContent || "").trim(),
      }))
      .filter((l) => l.href && l.label);
    // de-dupe
    const seen = new Set<string>();
    setLinks(
      collected.filter((l) => {
        const key = `${l.href}|${l.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    );
  }, [html]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const html = document.documentElement;
    html.classList.add("wb-menu-scroll-lock");
    window.addEventListener("keydown", onKey);
    return () => {
      html.classList.remove("wb-menu-scroll-lock");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("wb-menu-scroll-lock");
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia("(min-width: 901px)").matches) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className={["wb-chrome-html", open ? "is-menu-open" : ""].filter(Boolean).join(" ")}>
      <section
        className="wb-section wb-html-block wb-site-chrome wb-site-chrome-header"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {links.length > 0 ? (
        <>
          <button
            type="button"
            className="wb-chrome-html-menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="wb-brand-chrome-menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <div
            className={["wb-brand-chrome-backdrop", open ? "is-open" : ""]
              .filter(Boolean)
              .join(" ")}
            hidden={!open}
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            className={["wb-brand-chrome-panel", open ? "is-open" : ""]
              .filter(Boolean)
              .join(" ")}
            hidden={!open}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <nav className="wb-brand-chrome-nav wb-brand-chrome-nav--mobile" aria-label="Mobile">
              {links.map((link) => (
                <a
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
