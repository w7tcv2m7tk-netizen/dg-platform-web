"use client";

import { useEffect, useId, useRef, useState } from "react";

import { rewriteProductFunnelHref } from "@/lib/product-funnel-links";

const DG_MOBILE_MAX = 880;

function hasDigitalGateMenu(html: string) {
  return /id=["']dgMobileBtn["']|dg-mobile-menu-btn/.test(html);
}

function collectNavLinks(html: string): Array<{ href: string; label: string }> {
  const root = document.createElement("div");
  root.innerHTML = html;
  const collected = Array.from(
    root.querySelectorAll<HTMLAnchorElement>(
      ".nav-links a, .wb-aetherra-header .nav-links a, .dg-nav-links > li > a, nav a",
    ),
  )
    .map((a) => ({
      href: rewriteProductFunnelHref(a.getAttribute("href") || ""),
      label: (a.textContent || "").trim(),
    }))
    .filter((l) => l.href && l.label && l.href !== "#");
  const seen = new Set<string>();
  return collected.filter((l) => {
    const key = `${l.href}|${l.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Header HTML is injected without executing inline <script>.
 * DigitalGate’s #dgMobileBtn therefore does nothing until we re-bind it.
 */
function hydrateDigitalGateHeader(root: HTMLElement): (() => void) | null {
  const mobileBtn = root.querySelector<HTMLElement>("#dgMobileBtn, .dg-mobile-menu-btn");
  const navMenu = root.querySelector<HTMLElement>("#dgNavLinks, .dg-nav-links");
  if (!mobileBtn || !navMenu) return null;

  const body = document.body;
  const toggles = Array.from(root.querySelectorAll<HTMLElement>(".dg-dropdown-toggle"));
  body.classList.add("dg-has-fixed-header");

  const closeAllDropdowns = () => {
    root.querySelectorAll(".dg-dropdown").forEach((dd) => dd.classList.remove("open"));
    toggles.forEach((t) => t.classList.remove("open"));
  };

  const setMenuOpen = (isOpen: boolean) => {
    navMenu.classList.toggle("open", isOpen);
    body.classList.toggle("menu-open", isOpen);
    mobileBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    const icon = mobileBtn.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-times", isOpen);
      icon.classList.toggle("fa-bars", !isOpen);
    }
    if (!isOpen) closeAllDropdowns();
  };

  const closeMobileMenu = () => setMenuOpen(false);

  const onMenuClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(!navMenu.classList.contains("open"));
  };

  mobileBtn.addEventListener("click", onMenuClick);

  const toggleCleanups = toggles.map((toggle) => {
    const dropdownId = toggle.getAttribute("data-dg-dropdown");
    const dropdown = dropdownId
      ? root.querySelector<HTMLElement>(`#${CSS.escape(dropdownId)}`)
      : null;
    if (!dropdown) return () => {};
    const onToggle = (e: Event) => {
      if (window.innerWidth > DG_MOBILE_MAX) return;
      e.preventDefault();
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("open");
      closeAllDropdowns();
      if (!isOpen) {
        dropdown.classList.add("open");
        toggle.classList.add("open");
      }
    };
    toggle.addEventListener("click", onToggle);
    return () => toggle.removeEventListener("click", onToggle);
  });

  const navLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>(".dg-nav-links a"));
  const linkCleanups = navLinks.map((link) => {
    const onLink = () => {
      if (window.innerWidth > DG_MOBILE_MAX) return;
      const isToggle = link.classList.contains("dg-dropdown-toggle");
      const isInDropdown = Boolean(link.closest(".dg-dropdown"));
      if (!isToggle && !isInDropdown) closeMobileMenu();
    };
    link.addEventListener("click", onLink);
    return () => link.removeEventListener("click", onLink);
  });

  const onResize = () => {
    if (window.innerWidth > DG_MOBILE_MAX) closeMobileMenu();
  };
  window.addEventListener("resize", onResize);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeMobileMenu();
  };
  window.addEventListener("keydown", onKey);

  return () => {
    mobileBtn.removeEventListener("click", onMenuClick);
    toggleCleanups.forEach((fn) => fn());
    linkCleanups.forEach((fn) => fn());
    window.removeEventListener("resize", onResize);
    window.removeEventListener("keydown", onKey);
    closeMobileMenu();
    body.classList.remove("dg-has-fixed-header");
  };
}

/**
 * Hydrates imported / custom site chrome headers with a mobile drawer.
 * Works with Aëtherra-style markup (.nav-links) without rewriting page HTML.
 * DigitalGate chrome uses its own #dgMobileBtn — bind that instead of a second hamburger.
 */
export function ChromeHeaderHtml({ html }: { html: string }) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<Array<{ href: string; label: string }>>([]);
  const [nativeDgMenu, setNativeDgMenu] = useState(() => hasDigitalGateMenu(html));

  useEffect(() => {
    setLinks(collectNavLinks(html));
  }, [html]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const unbind = hydrateDigitalGateHeader(root);
    setNativeDgMenu(Boolean(unbind));
    return () => unbind?.();
  }, [html]);

  useEffect(() => {
    if (!open || nativeDgMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const htmlEl = document.documentElement;
    htmlEl.classList.add("wb-menu-scroll-lock");
    window.addEventListener("keydown", onKey);
    return () => {
      htmlEl.classList.remove("wb-menu-scroll-lock");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, nativeDgMenu]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("wb-menu-scroll-lock");
      document.body.style.overflow = "";
      document.body.classList.remove("menu-open");
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia("(min-width: 901px)").matches) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const showFallbackDrawer = !nativeDgMenu && links.length > 0;

  return (
    <div
      ref={rootRef}
      className={["wb-chrome-html", open ? "is-menu-open" : ""].filter(Boolean).join(" ")}
    >
      <section
        className="wb-section wb-html-block wb-site-chrome wb-site-chrome-header"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {showFallbackDrawer ? (
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
