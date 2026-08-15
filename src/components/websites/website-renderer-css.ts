/** Public site renderer styles — brand-driven, not purple AI defaults */
export const websiteRendererCss = `
@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;600;700&display=swap");

.wb-root {
  --wb-primary: #1e3a5f;
  --wb-accent: #c4a35a;
  --wb-bg: #0c1222;
  --wb-ink: #0f172a;
  --wb-muted: #475569;
  --wb-paper: #f7f4ef;
  --wb-surface: #ffffff;
  min-height: 100vh;
  background:
    radial-gradient(ellipse 90% 60% at 100% -10%, color-mix(in srgb, var(--wb-primary) 18%, transparent), transparent 55%),
    radial-gradient(ellipse 70% 50% at 0% 100%, color-mix(in srgb, var(--wb-accent) 12%, transparent), transparent 50%),
    var(--wb-paper);
  color: var(--wb-ink);
  font-family: "Source Sans 3", "Segoe UI", sans-serif;
  line-height: 1.5;
}

.wb-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.1rem clamp(1.25rem, 4vw, 3rem);
  border-bottom: 1px solid color-mix(in srgb, var(--wb-primary) 14%, transparent);
  background: color-mix(in srgb, var(--wb-paper) 88%, #fff);
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(8px);
}

.wb-nav-brand {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--wb-ink);
  text-decoration: none;
}

.wb-nav-logo {
  height: 2rem;
  width: auto;
  max-width: 10rem;
  object-fit: contain;
}

.wb-nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem 1.25rem;
}

.wb-nav-links a {
  color: var(--wb-muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
}

.wb-nav-links a:hover {
  color: var(--wb-primary);
}

.wb-hero {
  padding: clamp(3.25rem, 11vw, 7rem) clamp(1.25rem, 4vw, 3rem);
  background:
    linear-gradient(145deg,
      color-mix(in srgb, var(--wb-primary) 94%, #000) 0%,
      color-mix(in srgb, var(--wb-bg) 70%, var(--wb-primary)) 55%,
      color-mix(in srgb, var(--wb-primary) 75%, var(--wb-accent)) 100%);
  color: #f8fafc;
  position: relative;
  overflow: hidden;
}

.wb-hero::after {
  content: "";
  position: absolute;
  inset: auto -10% -40% 40%;
  height: 70%;
  background: radial-gradient(circle, color-mix(in srgb, var(--wb-accent) 35%, transparent), transparent 70%);
  pointer-events: none;
}

.wb-hero-inner {
  max-width: 42rem;
  position: relative;
  z-index: 1;
}

.wb-hero h1 {
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(2.35rem, 6vw, 3.85rem);
  line-height: 1.05;
  margin: 0 0 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.wb-hero p {
  font-size: clamp(1.05rem, 2.2vw, 1.2rem);
  line-height: 1.55;
  opacity: 0.92;
  margin: 0 0 1.75rem;
  max-width: 36rem;
}

.wb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.45rem;
  border-radius: 0.35rem;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  transition: transform 180ms ease, opacity 180ms ease, box-shadow 180ms ease;
  box-shadow: 0 8px 24px color-mix(in srgb, #000 18%, transparent);
}

.wb-btn:hover {
  transform: translateY(-1px);
  opacity: 0.96;
}

.wb-btn-light {
  background: #fff !important;
  color: var(--wb-ink) !important;
}

.wb-trust {
  padding: 1.15rem clamp(1.25rem, 4vw, 3rem);
  border-bottom: 1px solid color-mix(in srgb, var(--wb-primary) 10%, transparent);
  background: color-mix(in srgb, var(--wb-surface) 70%, var(--wb-paper));
}

.wb-trust ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1.75rem;
  color: var(--wb-muted);
  font-weight: 600;
  font-size: 0.95rem;
}

.wb-trust li::before {
  content: "";
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: var(--wb-accent);
  margin-right: 0.55rem;
  vertical-align: middle;
}

.wb-section {
  padding: clamp(2.5rem, 6vw, 4.25rem) clamp(1.25rem, 4vw, 3rem);
  max-width: 72rem;
  margin: 0 auto;
}

.wb-section-title {
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(1.55rem, 3vw, 2.15rem);
  margin: 0 0 1.5rem;
  letter-spacing: -0.01em;
}

.wb-services {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1.15rem;
}

.wb-service {
  background: var(--wb-surface);
  border: 1px solid color-mix(in srgb, var(--wb-primary) 10%, transparent);
  border-radius: 0.45rem;
  padding: 1.25rem 1.2rem;
  box-shadow: 0 10px 30px color-mix(in srgb, var(--wb-primary) 4%, transparent);
}

.wb-service h3 {
  font-family: "Fraunces", Georgia, serif;
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
}

.wb-service p {
  margin: 0;
  color: var(--wb-muted);
  line-height: 1.55;
  font-size: 0.98rem;
}

.wb-about p {
  font-size: 1.12rem;
  line-height: 1.75;
  max-width: 40rem;
  color: var(--wb-muted);
}

.wb-cta {
  margin: 2rem clamp(1.25rem, 4vw, 3rem);
  padding: clamp(2.1rem, 5vw, 3.1rem);
  border-radius: 0.55rem;
  color: #fff;
  text-align: center;
  box-shadow: 0 16px 40px color-mix(in srgb, var(--wb-primary) 22%, transparent);
}

.wb-cta h2 {
  font-family: "Fraunces", Georgia, serif;
  margin: 0 0 0.75rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
}

.wb-cta p {
  margin: 0 auto 1.35rem;
  opacity: 0.92;
  max-width: 34rem;
}

.wb-testimonials {
  display: grid;
  gap: 0.25rem;
}

.wb-testimonials blockquote {
  margin: 0;
  padding: 1.35rem 0;
  border-top: 1px solid color-mix(in srgb, var(--wb-primary) 12%, transparent);
}

.wb-testimonials blockquote p {
  font-size: 1.08rem;
  line-height: 1.6;
  margin: 0 0 0.65rem;
}

.wb-testimonials cite {
  color: var(--wb-muted);
  font-style: normal;
  font-size: 0.9rem;
  font-weight: 600;
}

.wb-faq {
  display: grid;
  gap: 0.35rem;
  max-width: 42rem;
}

.wb-faq dt {
  font-weight: 700;
  margin-top: 1rem;
  color: var(--wb-ink);
}

.wb-faq dd {
  margin: 0.4rem 0 0;
  color: var(--wb-muted);
  line-height: 1.55;
}

.wb-form {
  display: grid;
  gap: 0.85rem;
  max-width: 28rem;
  background: var(--wb-surface);
  border: 1px solid color-mix(in srgb, var(--wb-primary) 12%, transparent);
  border-radius: 0.5rem;
  padding: 1.35rem;
}

.wb-form label {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.wb-form input,
.wb-form textarea {
  border: 1px solid color-mix(in srgb, var(--wb-primary) 22%, #cbd5e1);
  border-radius: 0.35rem;
  padding: 0.7rem 0.8rem;
  font: inherit;
  background: #fff;
}

.wb-form input:focus,
.wb-form textarea:focus {
  outline: 2px solid color-mix(in srgb, var(--wb-primary) 35%, transparent);
  outline-offset: 1px;
}

.wb-form button {
  justify-self: start;
  padding: 0.8rem 1.3rem;
  border: none;
  border-radius: 0.35rem;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  font: inherit;
}

.wb-form-error {
  color: #b91c1c;
  margin: 0;
}

.wb-form-success {
  color: #166534;
  font-weight: 600;
  padding: 1rem;
  background: #ecfdf5;
  border-radius: 0.4rem;
}

.wb-heading-block {
  padding-bottom: 0;
}

.wb-heading {
  font-family: "Fraunces", Georgia, serif;
  margin: 0 0 0.5rem;
  color: var(--wb-ink);
  line-height: 1.2;
}

.wb-paragraph-block {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.wb-paragraph {
  margin: 0;
  max-width: 42rem;
  color: var(--wb-muted);
  line-height: 1.65;
  font-size: 1.05rem;
}

.wb-image-block {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.wb-content-image {
  display: block;
  width: 100%;
  max-width: 48rem;
  height: auto;
  border-radius: 0.35rem;
  object-fit: cover;
}

.wb-content-list {
  max-width: 42rem;
  margin: 0;
  padding-left: 1.25rem;
  color: var(--wb-muted);
  line-height: 1.6;
}

.wb-content-list li + li {
  margin-top: 0.35rem;
}

/* Default: constrained leftover WP fragments inside structured pages */
.wb-html-block {
  max-width: 48rem;
  color: var(--wb-muted);
  line-height: 1.65;
}

.wb-html-block img {
  max-width: 100%;
  height: auto;
  border-radius: 0.35rem;
}

/* ============================================================
   Sitewide contrast system (dark shell + light surfaces)
   ============================================================ */
.wb-root.wb-html-page {
  --wb-fg: #f8fafc;
  --wb-fg-muted: #d1d5db;
  --wb-fg-subtle: #9ca3af;
  --wb-link: #93c5fd;
  --wb-link-hover: #bfdbfe;
  --wb-surface-bg: var(--wb-bg, #0a0e17);
  background: var(--wb-surface-bg);
  color: var(--wb-fg);
}

.wb-root.wb-html-page .wb-section.wb-html-block {
  max-width: none;
  width: 100%;
  margin: 0;
  padding: 0;
  color: inherit;
  line-height: inherit;
}

.wb-html-island {
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  color: inherit;
}

.wb-html-island.wb-html-island--page {
  min-height: 60vh;
  width: 100%;
  max-width: none !important;
  padding: 0 !important;
  margin: 0 !important;
  background: var(--wb-surface-bg);
  color: var(--wb-fg);
}

.wb-root.wb-full-bleed,
.wb-root.wb-html-page.wb-full-bleed {
  width: 100%;
  max-width: none;
  overflow-x: clip;
}

.wb-root.wb-full-bleed .wb-section,
.wb-root.wb-html-page.wb-full-bleed .wb-section.wb-html-block {
  max-width: none !important;
  width: 100%;
  margin: 0;
  padding-left: 0;
  padding-right: 0;
}

.wb-root.wb-full-bleed .wb-html-island--page .container,
.wb-root.wb-full-bleed .wb-html-island--page .ct-section-inner-wrap,
.wb-root.wb-full-bleed .wb-html-island--page .oxy-header-container,
.wb-root.wb-full-bleed .wb-html-island--page .dg-header-container,
.wb-root.wb-full-bleed .wb-html-island--page .dg-footer-container {
  max-width: min(1400px, 100%) !important;
  width: 100% !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding-left: clamp(1rem, 3vw, 2rem) !important;
  padding-right: clamp(1rem, 3vw, 2rem) !important;
  box-sizing: border-box !important;
}

.wb-brand-chrome-header {
  position: sticky;
  top: 0;
  z-index: 60;
}

.wb-brand-chrome {
  width: 100%;
  background: color-mix(in srgb, var(--wb-bg, #0a0e17) 92%, #000);
  border-bottom: 1px solid color-mix(in srgb, var(--wb-primary) 28%, transparent);
}

/* Full transparency at page top; solid bar only after scroll */
.wb-brand-chrome.wb-brand-chrome-header.is-top,
.wb-root.wb-chrome-overlay .wb-brand-chrome.wb-brand-chrome-header.is-top,
.wb-root .wb-brand-chrome.wb-brand-chrome-header--overlay.is-top,
.wb-root .wb-brand-chrome.wb-brand-chrome-header--fade.is-top {
  background: transparent !important;
  background-color: transparent !important;
  border-bottom-color: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.wb-brand-chrome.wb-brand-chrome-header.is-scrolled,
.wb-root.wb-chrome-overlay .wb-brand-chrome.wb-brand-chrome-header.is-scrolled,
.wb-root .wb-brand-chrome.wb-brand-chrome-header--overlay.is-scrolled,
.wb-root .wb-brand-chrome.wb-brand-chrome-header--fade.is-scrolled {
  background: rgba(12, 18, 24, 0.94) !important;
  background-color: rgba(12, 18, 24, 0.94) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}

.wb-brand-chrome-header--overlay,
.wb-brand-chrome-header--fade,
.wb-root.wb-chrome-overlay .wb-brand-chrome-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    backdrop-filter 0.2s ease;
}

.wb-root.wb-chrome-overlay {
  position: relative;
}

.wb-root.wb-chrome-overlay .wb-brand-chrome-header .wb-brand-chrome-nav a,
.wb-brand-chrome-header--overlay .wb-brand-chrome-nav a,
.wb-brand-chrome-header--fade .wb-brand-chrome-nav a {
  color: #f8fafc;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

.wb-brand-chrome-header.is-scrolled .wb-brand-chrome-nav a {
  text-shadow: none;
}

.wb-root.wb-chrome-overlay .wb-brand-chrome-header .wb-brand-chrome-nav a:hover,
.wb-brand-chrome-header--overlay .wb-brand-chrome-nav a:hover,
.wb-brand-chrome-header--fade .wb-brand-chrome-nav a:hover {
  color: #fff;
}

.wb-root.wb-chrome-overlay .wb-brand-chrome-header .wb-brand-chrome-logo,
.wb-brand-chrome-header--overlay .wb-brand-chrome-logo,
.wb-brand-chrome-header--fade .wb-brand-chrome-logo {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
}

/* Dark page defaults: readable type against dark shells */
.wb-html-island--page:not(.wb-html-island--light) {
  color: #f8fafc !important;
}

.wb-html-island--page:not(.wb-html-island--light) h1,
.wb-html-island--page:not(.wb-html-island--light) h2,
.wb-html-island--page:not(.wb-html-island--light) h3,
.wb-html-island--page:not(.wb-html-island--light) h4,
.wb-html-island--page:not(.wb-html-island--light) h5,
.wb-html-island--page:not(.wb-html-island--light) h6 {
  color: #f8fafc !important;
}

.wb-html-island--page:not(.wb-html-island--light) p,
.wb-html-island--page:not(.wb-html-island--light) li,
.wb-html-island--page:not(.wb-html-island--light) td,
.wb-html-island--page:not(.wb-html-island--light) th,
.wb-html-island--page:not(.wb-html-island--light) label,
.wb-html-island--page:not(.wb-html-island--light) span:not([class*="btn"]):not([class*="badge"]):not([class*="tag"]) {
  color: #e5e7eb !important;
}

.wb-html-island--page:not(.wb-html-island--light) a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]) {
  color: #93c5fd !important;
}

.wb-html-island--page:not(.wb-html-island--light) a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]):hover {
  color: #bfdbfe !important;
}

/* Light surfaces (cream listings, Insights, sell/buy/about) */
.wb-root.wb-surface-light {
  --wb-fg: #1c2b2a;
  --wb-fg-muted: #3f4a48;
  --wb-fg-subtle: #6b7280;
  --wb-link: #6b5428;
  --wb-link-hover: #8a6a3a;
  --wb-surface-bg: #f5f2ef;
  background: #f5f2ef;
  color: #1c2b2a;
}

.wb-root.wb-surface-light .wb-section-title {
  color: #1c2b2a !important;
}

.wb-root.wb-html-page .wb-section-title {
  color: var(--wb-fg);
}

.wb-root.wb-surface-light .wb-post-grid-wrap {
  background: transparent;
}

.wb-root.wb-surface-light .wb-post-card {
  background: #ffffff;
  border-color: #e0d6cc;
  color: #1c2b2a;
  box-shadow: 0 8px 22px rgba(28, 43, 42, 0.08);
}

.wb-root.wb-surface-light .wb-post-card:hover {
  border-color: color-mix(in srgb, var(--wb-primary) 45%, #c9a46c);
  box-shadow: 0 12px 28px rgba(28, 43, 42, 0.14);
}

.wb-root.wb-surface-light .wb-post-card-meta {
  color: #6b7280;
}

.wb-root.wb-surface-light .wb-post-card-title {
  color: #1c2b2a;
}

.wb-root.wb-surface-light .wb-post-card-excerpt {
  color: #3f4a48;
}

.wb-root.wb-surface-light .wb-post-card-cta {
  color: #8a6a3a;
}

.wb-root.wb-surface-light .wb-post-card-image {
  background: #e8e2db;
}

/* Light HTML islands: cream content edge-to-edge + dark ink */
.wb-html-island.wb-html-island--light,
.wb-html-page .wb-html-island--page:has(.roe-property-grid),
.wb-html-page .wb-html-island--page:has(.hero-property) {
  --wb-fg: #1c2b2a;
  --wb-fg-muted: #3f4a48;
  --wb-link: #6b5428;
  background: #f5f2ef !important;
  color: #1c2b2a !important;
  padding: 0 !important;
  max-width: none !important;
}

.wb-html-island--light h1,
.wb-html-island--light h2,
.wb-html-island--light h3,
.wb-html-island--light h4,
.wb-html-island--light h5,
.wb-html-island--light h6,
.wb-html-page .wb-html-island--page:has(.roe-property-grid) h1,
.wb-html-page .wb-html-island--page:has(.roe-property-grid) h2,
.wb-html-page .wb-html-island--page:has(.roe-property-grid) h3 {
  color: #1c2b2a !important;
}

.wb-html-island--light p,
.wb-html-island--light li,
.wb-html-island--light td,
.wb-html-island--light th,
.wb-html-island--light label,
.wb-html-island--light span:not([class*="btn"]):not([class*="badge"]):not([class*="tag"]):not([class*="sold"]),
.wb-html-page .wb-html-island--page:has(.roe-property-grid) p,
.wb-html-page .wb-html-island--page:has(.roe-property-grid) li {
  color: #2f2f2f !important;
}

.wb-html-island--light a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]),
.wb-html-page .wb-html-island--page:has(.roe-property-grid) a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]) {
  color: #6b5428 !important;
}

.wb-html-island--light a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]):hover {
  color: #8a6a3a !important;
}

/* Hero / dark bands inside light pages keep light text.
   Scope tightly — [class*="hero"] alone was bleaching cream body copy. */
.wb-html-island--light .hero-sell,
.wb-html-island--light .hero-buy,
.wb-html-island--light .hero-about,
.wb-html-island--light .hero-contact,
.wb-html-island--light .hero-property,
.wb-html-island--light [class^="hero-"][class*="section"],
.wb-html-island--light [class*="hero-banner"],
.wb-html-island--light [class*="fullscreen-hero"] {
  color: #f8fafc;
}

.wb-html-island--light .hero-sell h1,
.wb-html-island--light .hero-sell h2,
.wb-html-island--light .hero-sell h3,
.wb-html-island--light .hero-sell p,
.wb-html-island--light .hero-sell span,
.wb-html-island--light .hero-sell a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]),
.wb-html-island--light .hero-buy h1,
.wb-html-island--light .hero-buy h2,
.wb-html-island--light .hero-buy h3,
.wb-html-island--light .hero-buy p,
.wb-html-island--light .hero-buy span,
.wb-html-island--light .hero-buy a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]),
.wb-html-island--light .hero-about h1,
.wb-html-island--light .hero-about h2,
.wb-html-island--light .hero-about h3,
.wb-html-island--light .hero-about p,
.wb-html-island--light .hero-about span,
.wb-html-island--light .hero-contact h1,
.wb-html-island--light .hero-contact h2,
.wb-html-island--light .hero-contact h3,
.wb-html-island--light .hero-contact p,
.wb-html-island--light .hero-contact span,
.wb-html-island--light .hero-property h1,
.wb-html-island--light .hero-property h2,
.wb-html-island--light .hero-property p,
.wb-html-island--light .hero-property span,
.wb-html-island--light .hero-property a:not([class*="btn"]):not([class*="cta"]),
.wb-html-island--light .hero-content h1,
.wb-html-island--light .hero-content h2,
.wb-html-island--light .hero-content h3,
.wb-html-island--light .hero-content p,
.wb-html-island--light .hero-content span,
.wb-html-island--light .hero-headline,
.wb-html-island--light .hero-subheading {
  color: #f8fafc !important;
}

/* Cream / light body copy: prefer dark ink over washed greys */
.wb-root.wb-surface-light,
.wb-html-island--light {
  color: #1c2b2a;
}

.wb-html-island--light .exposure-headline,
.wb-html-island--light .core-headline,
.wb-html-island--light .cta-headline,
.wb-html-island--light .intro-headline,
.wb-html-island--light .contact-heading,
.wb-html-island--light .benefits-section .section-title,
.wb-html-island--light .benefits-section h3,
.wb-html-island--light .exposure-section .section-title {
  color: #14201f !important;
}

.wb-html-island--light .exposure-text,
.wb-html-island--light .core-text,
.wb-html-island--light .cta-description,
.wb-html-island--light .intro-description,
.wb-html-island--light .intro-text,
.wb-html-island--light .service-text,
.wb-html-island--light .why-description,
.wb-html-island--light .ben-experience,
.wb-html-island--light .ben-title,
.wb-html-island--light .benefits-section p {
  color: #243533 !important;
}

.wb-html-page .wb-html-island--page .roe-property-grid {
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 2.5rem clamp(1rem, 3vw, 2.5rem) !important;
  background: #f5f2ef !important;
  box-sizing: border-box;
}

.wb-html-page .wb-html-island--page .roe-property-grid .roe-property-card,
.wb-html-page .wb-html-island--page .roe-property-card {
  color: #1c2b2a !important;
}

.wb-html-page .wb-html-island--page .roe-property-card h3,
.wb-html-page .wb-html-island--page .roe-property-card p,
.wb-html-page .wb-html-island--page .roe-property-card span,
.wb-html-page .wb-html-island--page .roe-property-card a {
  color: #1c2b2a !important;
}

/* Footer chrome contrast */
.wb-site-chrome-footer,
.wb-site-chrome-footer p,
.wb-site-chrome-footer li,
.wb-site-chrome-footer span,
.wb-site-chrome-footer h4,
.wb-site-chrome-footer a {
  color: #e5e7eb;
}

.wb-site-chrome-footer a:hover {
  color: #fff;
}

/* Keep in-page / leftover logos from exploding when island img rules win */
.wb-html-page .wb-html-island--page img.rr-logo,
.wb-html-page .wb-html-island--page .rr-logo,
.wb-html-page .wb-html-island--page .logo-wrapper img,
.wb-html-page .wb-html-island--page header img,
.wb-html-page .wb-html-island--page .rr-icon,
.wb-html-page .wb-html-island--page .footer-logo img {
  max-height: 56px !important;
  width: auto !important;
  max-width: min(240px, 55vw) !important;
  height: auto !important;
  object-fit: contain !important;
}

.wb-html-page .wb-html-island--page .nav-cta,
.wb-html-page .wb-html-island--page .hero-cta,
.wb-html-page .wb-html-island--page .cta-button,
.wb-html-page .wb-html-island--page .intro-cta,
.wb-html-page .wb-html-island--page .direct-cta-button-light {
  display: inline-flex !important;
  align-items: center !important;
  width: auto !important;
  max-width: 100%;
  white-space: nowrap;
  box-sizing: border-box;
}

/* CVH / shared filled CTAs: light label on sandstone/gold fills */
.wb-html-page .book-btn,
.wb-html-page .hero-btn,
.wb-html-page .cta-btn,
.wb-html-page .submit-btn,
.wb-html-page .btn-cvh,
.wb-html-page .coming-soon-badge,
.wb-html-page .cvh-unit-actions .primary,
.wb-html-page .cvh-unit-actions a.primary,
.wb-html-page a.book-btn,
.wb-html-page a.hero-btn,
.wb-html-page a.cta-btn,
.wb-html-page button.submit-btn,
.wb-html-page .wb-brand-chrome-cta,
.wb-root .wb-brand-chrome-cta {
  color: #f8fafc !important;
}

.wb-html-page .book-btn:hover,
.wb-html-page .hero-btn:hover,
.wb-html-page .cta-btn:hover,
.wb-html-page .submit-btn:hover,
.wb-html-page .btn-cvh:hover,
.wb-html-page .cvh-unit-actions .primary:hover,
.wb-root .wb-brand-chrome-cta:hover {
  color: #ffffff !important;
}

.wb-brand-chrome-footer {
  border-bottom: 0;
  border-top: 1px solid color-mix(in srgb, var(--wb-primary) 28%, transparent);
  margin-top: auto;
}

.wb-brand-chrome-inner {
  width: 100%;
  max-width: min(1400px, 100%);
  margin: 0 auto;
  padding: 0.85rem clamp(1rem, 3vw, 2rem);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  box-sizing: border-box;
}

.wb-brand-chrome-header .wb-brand-chrome-nav {
  flex: 1 1 auto;
  justify-content: center;
}

.wb-brand-chrome-header .wb-brand-chrome-cta {
  flex: 0 0 auto;
}

.wb-brand-chrome-footer .wb-brand-chrome-inner {
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  padding-top: 1.5rem;
  padding-bottom: 1.75rem;
}

.wb-brand-chrome-brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: #f8fafc;
  flex-shrink: 0;
}

.wb-brand-chrome-logo {
  display: block;
  height: 40px !important;
  width: auto !important;
  max-height: 40px !important;
  max-width: min(220px, 55vw) !important;
  object-fit: contain !important;
  object-position: left center;
}

.wb-brand-chrome-name {
  font-weight: 750;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}

.wb-brand-chrome-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1.1rem;
  align-items: center;
}

.wb-brand-chrome-nav a {
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
}

.wb-brand-chrome-nav a:hover {
  color: #fff;
}

.wb-brand-chrome-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  background: var(--wb-accent, #c4a35a);
  color: #f8fafc !important;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  transition: transform 0.15s ease, filter 0.15s ease;
}

.wb-brand-chrome-cta:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
  color: #ffffff !important;
}

.wb-brand-chrome-header.is-top .wb-brand-chrome-cta {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
}

/* Mobile menu control — hidden on desktop */
.wb-brand-chrome-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 2.6rem;
  height: 2.6rem;
  margin-left: auto;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0.7rem;
  background: rgba(15, 23, 42, 0.35);
  color: #f8fafc;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wb-brand-chrome-menu-icon {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 1.15rem;
}

.wb-brand-chrome-menu-icon span {
  display: block;
  height: 2px;
  width: 100%;
  border-radius: 999px;
  background: currentColor;
  transition: transform 0.2s ease, opacity 0.2s ease;
  transform-origin: center;
}

.wb-brand-chrome-header.is-menu-open .wb-brand-chrome-menu-icon span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.wb-brand-chrome-header.is-menu-open .wb-brand-chrome-menu-icon span:nth-child(2) {
  opacity: 0;
}

.wb-brand-chrome-header.is-menu-open .wb-brand-chrome-menu-icon span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.wb-brand-chrome-backdrop {
  display: none;
}

.wb-brand-chrome-panel {
  display: none;
}

.wb-brand-chrome-cta--mobile {
  margin-left: 0;
  width: 100%;
  white-space: normal;
  text-align: center;
  padding: 0.85rem 1.1rem;
  font-size: 0.92rem;
  line-height: 1.25;
}

.wb-brand-chrome-copy {
  margin: 0;
  color: #94a3b8;
  font-size: 0.82rem;
}

@media (max-width: 900px) {
  .wb-brand-chrome-header .wb-brand-chrome-inner {
    flex-wrap: nowrap;
    gap: 0.75rem;
    padding: 0.7rem 1rem;
  }

  .wb-brand-chrome-logo {
    height: 34px !important;
    max-height: 34px !important;
    max-width: min(180px, 58vw) !important;
  }

  .wb-brand-chrome-nav--desktop,
  .wb-brand-chrome-cta--desktop {
    display: none !important;
  }

  .wb-brand-chrome-menu-btn {
    display: inline-flex;
  }

  .wb-brand-chrome-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 70;
    background: rgba(2, 6, 23, 0.55);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .wb-brand-chrome-backdrop.is-open {
    opacity: 1;
    pointer-events: auto;
  }

  .wb-brand-chrome-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    position: fixed;
    top: 0;
    right: 0;
    z-index: 80;
    width: min(22rem, 88vw);
    height: 100dvh;
    padding: 5rem 1.25rem 1.75rem;
    box-sizing: border-box;
    background: #0b1220;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: -18px 0 48px rgba(0, 0, 0, 0.35);
    transform: translateX(104%);
    transition: transform 0.22s ease;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .wb-brand-chrome-panel.is-open {
    transform: translateX(0);
  }

  .wb-brand-chrome-panel[hidden],
  .wb-brand-chrome-backdrop[hidden] {
    display: none !important;
  }

  .wb-brand-chrome-panel.is-open[hidden],
  .wb-brand-chrome-backdrop.is-open[hidden] {
    display: flex !important;
  }

  .wb-brand-chrome-backdrop.is-open[hidden] {
    display: block !important;
  }

  .wb-brand-chrome-nav--mobile {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.15rem;
    flex-wrap: nowrap;
  }

  .wb-brand-chrome-nav--mobile a {
    display: block;
    padding: 0.85rem 0.35rem;
    color: #e2e8f0 !important;
    font-size: 1.05rem;
    font-weight: 650;
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    text-shadow: none !important;
  }

  .wb-brand-chrome-nav--mobile a:hover {
    color: #fff !important;
  }

  .wb-brand-chrome-footer .wb-brand-chrome-inner {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .wb-brand-chrome-footer .wb-brand-chrome-nav {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem 1rem;
    width: 100%;
  }
}

/* Sitewide mobile content polish */
@media (max-width: 900px) {
  .wb-html-page,
  .wb-root.wb-html-page {
    overflow-x: clip;
  }

  .wb-html-island--page,
  .wb-html-island--light {
    overflow-x: clip;
  }

  .wb-html-page img,
  .wb-html-island img {
    max-width: 100%;
    height: auto;
  }

  .wb-html-page table {
    display: block;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .wb-html-page iframe,
  .wb-html-page video {
    max-width: 100%;
  }

  .wb-section.wb-html-block {
    overflow-x: clip;
  }

  .wb-root .container,
  .wb-html-island--page .container {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }

  .roe-prop-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .roe-prop-hero img {
    height: 42vh !important;
    min-height: 220px;
  }

  .roe-prop-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .roe-prop-actions a {
    justify-content: center;
  }
}

.wb-post-grid-wrap {
  padding: clamp(2rem, 5vw, 3.5rem) clamp(1rem, 3vw, 2rem);
  max-width: min(1400px, 100%);
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.wb-site-chrome-header {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
}

/* Aëtherra WP-style centered header — match site charcoal #0F1419 */
.wb-site-chrome-header .wb-aetherra-header {
  width: 100%;
  background: #0f1419;
  border-bottom: 1px solid #1d2a24;
}

.wb-site-chrome-header .wb-aetherra-header .header {
  padding: 1.2rem 2rem 1rem;
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  border-bottom: 0;
  background: #0f1419;
}

.wb-site-chrome-header .wb-aetherra-header .logo {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.wb-site-chrome-header .wb-aetherra-header .logo img {
  height: 32px !important;
  width: auto !important;
  max-width: 220px !important;
  object-fit: contain !important;
}

.wb-site-chrome-header .wb-aetherra-header .logo:hover img {
  opacity: 0.8;
}

.wb-site-chrome-header .wb-aetherra-header .header-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  width: 100%;
  flex-wrap: wrap;
}

.wb-site-chrome-header .wb-aetherra-header .nav-links {
  display: flex;
  gap: 2.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
  justify-content: center;
  flex-wrap: wrap;
}

.wb-site-chrome-header .wb-aetherra-header .nav-links a {
  color: #aeb8a6 !important;
  text-decoration: none;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  transition: color 0.2s ease;
  position: relative;
}

.wb-site-chrome-header .wb-aetherra-header .nav-links a::after {
  content: "";
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 1px;
  background: #b88952;
  transition: width 0.3s ease;
}

.wb-site-chrome-header .wb-aetherra-header .nav-links a:hover {
  color: #c9b38c !important;
}

.wb-site-chrome-header .wb-aetherra-header .nav-links a:hover::after {
  width: 100%;
}

.wb-site-chrome-header .wb-aetherra-header .nav-divider {
  width: 1px;
  height: 20px;
  background: #1d2a24;
}

.wb-site-chrome-header .wb-aetherra-header .social-icons {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.wb-site-chrome-header .wb-aetherra-header .social-icons a {
  color: #aeb8a6 !important;
  font-size: 1rem;
  transition: color 0.2s ease, transform 0.2s ease;
  text-decoration: none;
}

.wb-site-chrome-header .wb-aetherra-header .social-icons a:hover {
  color: #c9b38c !important;
  transform: translateY(-2px);
}

@media (max-width: 720px) {
  .wb-site-chrome-header .wb-aetherra-header .header {
    padding: 0.8rem 1rem;
    gap: 0.8rem;
  }
  .wb-site-chrome-header .wb-aetherra-header .logo img {
    height: 28px !important;
  }
  .wb-site-chrome-header .wb-aetherra-header .header-bottom {
    display: none !important;
  }
}

/* Custom HTML chrome (Aëtherra): floating hamburger + shared drawer */
.wb-chrome-html {
  position: relative;
  z-index: 60;
}

.wb-chrome-html-menu-btn {
  display: none;
}

@media (max-width: 900px) {
  .wb-chrome-html-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0.7rem;
    right: 0.85rem;
    z-index: 90;
    width: 2.6rem;
    height: 2.6rem;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 0.7rem;
    background: rgba(15, 20, 25, 0.72);
    color: #f8fafc;
    cursor: pointer;
  }

  .wb-chrome-html.is-menu-open .wb-brand-chrome-menu-icon span:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }
  .wb-chrome-html.is-menu-open .wb-brand-chrome-menu-icon span:nth-child(2) {
    opacity: 0;
  }
  .wb-chrome-html.is-menu-open .wb-brand-chrome-menu-icon span:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }

  .wb-site-chrome-header .wb-aetherra-header .header-bottom,
  .wb-site-chrome-header .header .nav-links {
    display: none !important;
  }

  /* Aëtherra mobile drawer matches site charcoal, not blue shell */
  .wb-chrome-html .wb-brand-chrome-panel {
    background: #0f1419;
    border-left: 1px solid #1d2a24;
  }
}

.wb-site-chrome-footer {
  margin-top: auto;
  z-index: 5;
}

/* Never let shared img rules blow up logos/nav icons in chrome */
.wb-site-chrome img,
.wb-site-chrome .wb-html-block img {
  max-width: none;
  width: auto;
  height: auto;
  border-radius: 0;
}

.wb-site-chrome .dg-gate-icon,
.wb-site-chrome img.dg-gate-icon {
  width: 32px !important;
  height: 32px !important;
  max-width: 32px !important;
  object-fit: contain;
}

.wb-site-chrome .dg-full-logo,
.wb-site-chrome img.dg-full-logo {
  height: 28px !important;
  width: auto !important;
  max-width: 11rem !important;
  object-fit: contain;
}

.wb-site-chrome .dg-header {
  position: sticky !important;
  top: 0 !important;
}

.wb-post-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.35rem;
}

.wb-post-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--wb-primary) 28%, #334155);
  background: color-mix(in srgb, var(--wb-bg) 88%, #111827);
  color: inherit;
  text-decoration: none;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.wb-post-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--wb-primary) 55%, #64748b);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
}

.wb-post-card-image {
  aspect-ratio: 16 / 10;
  width: 100%;
  object-fit: cover;
  background: #0f172a;
}

.wb-post-card-body {
  padding: 1.1rem 1.15rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1;
}

.wb-post-card-meta {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 600;
}

.wb-post-card-title {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.3;
  font-weight: 750;
  color: #f8fafc;
}

.wb-post-card-excerpt {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: #cbd5e1;
}

.wb-post-card-cta {
  margin-top: auto;
  padding-top: 0.65rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #93c5fd;
}

@media (max-width: 720px) {
  .wb-post-grid {
    grid-template-columns: 1fr;
  }
}

.wb-footer {
  padding: 2.25rem clamp(1.25rem, 4vw, 3rem) 2.75rem;
  border-top: 1px solid color-mix(in srgb, var(--wb-primary) 12%, transparent);
  color: var(--wb-muted);
  font-size: 0.95rem;
  background: color-mix(in srgb, var(--wb-paper) 70%, #e8e4dc);
}

.wb-footer a {
  color: var(--wb-primary);
  text-decoration: none;
  font-weight: 600;
}

.wb-footer-meta {
  margin-top: 0.65rem;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
}

@media (max-width: 720px) {
  .wb-nav {
    flex-direction: column;
    align-items: flex-start;
    position: static;
  }

  .wb-nav-links {
    width: 100%;
    gap: 0.65rem 1rem;
  }

  .wb-cta {
    margin-left: 1rem;
    margin-right: 1rem;
  }

  .wb-form {
    padding: 1.1rem;
  }
}

/* CVH / accommodation gallery — full-bleed hero + lightbox */
.wb-html-gallery .gallery-hero,
.wb-html-page .gallery-hero {
  position: relative !important;
  width: 100vw !important;
  max-width: 100vw !important;
  margin-left: calc(50% - 50vw) !important;
  margin-right: calc(50% - 50vw) !important;
  min-height: min(78vh, 720px) !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-attachment: scroll !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
}

.wb-html-gallery .gallery-grid .gallery-item,
.wb-html-page .gallery-grid .gallery-item {
  cursor: zoom-in;
}

.wb-html-gallery .gallery-grid .gallery-item img,
.wb-html-page .gallery-grid .gallery-item img {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: cover !important;
  border-radius: 0 !important;
}

.wb-lightbox {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.94);
  box-sizing: border-box;
}

.wb-lightbox-image {
  max-width: min(1100px, 92vw);
  max-height: min(78vh, 900px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 0.5rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

.wb-lightbox-close,
.wb-lightbox-nav {
  position: absolute;
  border: 0;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.wb-lightbox-close:hover,
.wb-lightbox-nav:hover {
  background: rgba(185, 164, 138, 0.35);
  color: #fff;
}

.wb-lightbox-close {
  top: 1rem;
  right: 1rem;
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.75rem;
  line-height: 1;
}

.wb-lightbox-nav {
  top: 50%;
  transform: translateY(-50%);
  width: 3rem;
  height: 3rem;
  font-size: 2rem;
  line-height: 1;
}

.wb-lightbox-prev {
  left: 1rem;
}

.wb-lightbox-next {
  right: 1rem;
}

.wb-lightbox-meta {
  margin: 0;
  color: #d1d5db;
  font-size: 0.85rem;
  text-align: center;
  max-width: min(720px, 90vw);
}

@media (max-width: 720px) {
  .wb-lightbox-nav {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.6rem;
  }
  .wb-lightbox-prev {
    left: 0.5rem;
  }
  .wb-lightbox-next {
    right: 0.5rem;
  }
}
`;
