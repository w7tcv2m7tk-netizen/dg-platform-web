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

/* Product subdomain funnels — edge-to-edge chromeless capture shell */
.wb-root.wb-product-funnel {
  min-height: 100dvh;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  background: var(--wb-bg, #0a0e17) !important;
  background-image: none !important;
  color: #f8fafc;
  overflow-x: clip;
}
.wb-root.wb-product-funnel .dg-property-report-funnel,
.wb-root.wb-product-funnel .dg-business-audit-funnel,
.wb-root.wb-product-funnel .dg-cvh-funnel,
.wb-root.wb-product-funnel .dg-ba-funnel {
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;
}
/* DigitalGate audit only — never inherit a photo backdrop */
.wb-root.wb-product-funnel .dg-ba-funnel,
.wb-root.wb-product-funnel .dg-business-audit-funnel {
  background-color: #070b14 !important;
  background-image: none !important;
}
.wb-root.wb-product-funnel .dg-ba-funnel .dg-ba-funnel__glow {
  background-image:
    radial-gradient(ellipse 70% 55% at 12% 18%, rgba(59,130,246,0.22), transparent 60%),
    radial-gradient(ellipse 40% 30% at 78% 12%, rgba(96,165,250,0.12), transparent 50%) !important;
  background-color: #070b14 !important;
}
html:has(.wb-root.wb-product-funnel),
html:has(.wb-root.wb-product-funnel) body {
  height: auto !important;
  min-height: 100%;
  margin: 0;
  background: #0a0e17;
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
  /* Do not set overflow-x: clip on the page root — it can create a
     scroll-containing block and break document scrolling on some browsers. */
  overflow: visible;
}

/* Keep marketing custom-domain pages document-scrollable */
html:has(.wb-root.wb-html-page),
html:has(.wb-root.wb-html-page) body {
  height: auto !important;
  min-height: 100%;
  overflow-x: clip;
  overflow-y: auto !important;
  overscroll-behavior-x: none;
  overscroll-behavior-y: auto;
  touch-action: pan-y;
}

html.wb-menu-scroll-lock,
html.wb-menu-scroll-lock body {
  overflow: hidden !important;
  overscroll-behavior: none;
  touch-action: none;
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

.wb-root.wb-chrome-overlay .wb-brand-chrome-header:not(.wb-brand-chrome-header--stacked) .wb-brand-chrome-logo,
.wb-brand-chrome-header--overlay:not(.wb-brand-chrome-header--stacked) .wb-brand-chrome-logo,
.wb-brand-chrome-header--fade:not(.wb-brand-chrome-header--stacked) .wb-brand-chrome-logo {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
}

.wb-brand-chrome-header--stacked.wb-brand-chrome-header--overlay.is-top,
.wb-brand-chrome-header--stacked.wb-brand-chrome-header--fade.is-top,
.wb-root.wb-chrome-overlay .wb-brand-chrome-header--stacked.is-top {
  background: linear-gradient(
    to bottom,
    rgba(8, 14, 20, 0.72) 0%,
    rgba(8, 14, 20, 0.35) 55%,
    transparent 100%
  );
}

/* Dark page defaults: readable type against dark shells */
.wb-html-island--page:not(.wb-html-island--light) {
  color: #e5e7eb !important;
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
.wb-html-island--page:not(.wb-html-island--light) small,
.wb-html-island--page:not(.wb-html-island--light) figcaption,
.wb-html-island--page:not(.wb-html-island--light) span:not([class*="btn"]):not([class*="badge"]):not([class*="tag"]):not([class*="pill"]):not([class*="chip"]) {
  color: #e2e8f0 !important;
}

/* Lift common slate muted tokens that fail AA on dark shells */
.wb-html-island--page:not(.wb-html-island--light) [style*="color:#94A3B8"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color: #94A3B8"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color:#94a3b8"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color: #94a3b8"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color:#64748B"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color: #64748B"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color:#64748b"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color: #64748b"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color:#AEB8A6"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color: #AEB8A6"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color:#aeb8a6"],
.wb-html-island--page:not(.wb-html-island--light) [style*="color: #aeb8a6"] {
  color: #d1d5db !important;
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
.wb-html-island--light small,
.wb-html-island--light figcaption,
.wb-html-island--light span:not([class*="btn"]):not([class*="badge"]):not([class*="tag"]):not([class*="sold"]):not([class*="status"]),
.wb-html-page .wb-html-island--page:has(.roe-property-grid) p,
.wb-html-page .wb-html-island--page:has(.roe-property-grid) li {
  color: #2f2f2f !important;
}

/* CVH stay unit cards: price / featured pills sit on photos — keep white */
.wb-root .wb-html-island.wb-html-island--light .dg-card-image > span,
.wb-root .wb-html-island.wb-html-island--light .dg-accommodation-card .dg-card-image span {
  color: #ffffff !important;
}

/* RR listing status pills sit on photos — keep white */
.wb-root .wb-html-island.wb-html-island--light .roe-property-card .card-image > span.card-status {
  color: #ffffff !important;
}

/* Cream pages: darken washed secondary greys for AA */
.wb-html-island--light [style*="color:#5A6B67"],
.wb-html-island--light [style*="color: #5A6B67"],
.wb-html-island--light [style*="color:#5a6b67"],
.wb-html-island--light [style*="color: #5a6b67"],
.wb-html-island--light [style*="color:#8A9B98"],
.wb-html-island--light [style*="color: #8A9B98"],
.wb-html-island--light [style*="color:#8a9b98"],
.wb-html-island--light [style*="color: #8a9b98"],
.wb-html-island--light [style*="color:#8FA3A0"],
.wb-html-island--light [style*="color: #8FA3A0"],
.wb-html-island--light [style*="color:#8fa3a0"],
.wb-html-island--light [style*="color: #8fa3a0"],
.wb-html-island--light [style*="color:#6B7280"],
.wb-html-island--light [style*="color: #6B7280"],
.wb-html-island--light [style*="color:#6b7280"],
.wb-html-island--light [style*="color: #6b7280"] {
  color: #3f4a48 !important;
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
.wb-html-island--light .hero-agents,
.wb-html-island--light .rr-insights-hero,
.wb-html-island--light .property-hero,
.wb-html-island--light .roe-prop-detail .property-hero,
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
.wb-html-island--light .hero-subheading,
.wb-html-island--light .property-hero h1,
.wb-html-island--light .property-hero h2,
.wb-html-island--light .property-hero .price-row,
.wb-html-island--light .property-hero .price-row .price,
.wb-html-island--light .property-hero .price-row .status,
.wb-html-island--light .property-hero .address-sub,
.wb-html-island--light .roe-prop-detail .property-hero h1,
.wb-html-island--light .roe-prop-detail .property-hero .price,
.wb-html-island--light .roe-prop-detail .property-hero .address-sub {
  color: #f8fafc !important;
}

.wb-html-island--light .property-hero .price-row .price,
.wb-html-island--light .roe-prop-detail .property-hero .price-row .price,
.wb-root .wb-html-island.wb-html-island--light .property-hero .price,
.wb-root .wb-html-island.wb-html-island--light .roe-prop-detail .price-row .price,
.wb-root .wb-html-island.wb-html-island--light .property-hero .price-row span.price:not([class*="btn"]):not([class*="badge"]):not([class*="tag"]):not([class*="sold"]):not([class*="status"]),
.wb-root .wb-html-island.wb-html-island--light .roe-prop-detail .property-hero .price-row span.price:not([class*="btn"]):not([class*="badge"]):not([class*="tag"]):not([class*="sold"]):not([class*="status"]) {
  color: #c9a46c !important;
}

.wb-root .wb-html-island.wb-html-island--light .property-hero .price-row span.status:not([class*="btn"]),
.wb-root .wb-html-island.wb-html-island--light .roe-prop-detail .property-hero .price-row span.status:not([class*="btn"]) {
  color: #ffffff !important;
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

/*
 * CVH charcoal / image bands sit inside pages marked --light (cream body).
 * Global light-island ink bleaches those sections — force light type.
 * Use .wb-root + .wb-html-island so we beat embedded page !important rules.
 */
.wb-root .wb-html-island.wb-html-island--light :is(
  .experience-section,
  .location-section,
  .policy-section,
  .activities-section,
  .attractions-section,
  .activities-grid-section,
  .local-experiences,
  .sanctuary-section,
  .hideaway-section,
  .about-sanctuary,
  .about-story-dark,
  .region-section,
  .guest-info-section,
  .booking-section,
  .contact-hero,
  .about-hero,
  .experiences-hero,
  .gallery-hero,
  .stay-hero,
  .cvh-hero-stay,
  .cta-dark,
  .dark-section
) {
  color: #f4f1ea !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .experience-section,
  .location-section,
  .policy-section,
  .activities-section,
  .attractions-section,
  .activities-grid-section,
  .local-experiences,
  .sanctuary-section,
  .hideaway-section,
  .about-sanctuary,
  .about-story-dark,
  .region-section,
  .guest-info-section,
  .booking-section,
  .contact-hero,
  .about-hero,
  .experiences-hero,
  .gallery-hero,
  .stay-hero,
  .cvh-hero-stay,
  .cta-dark,
  .dark-section
) :is(h1, h2, h3, h4, h5, h6, .section-headline, .experience-headline, .section-title),
.wb-root .wb-html-island.wb-html-island--light :is(
  .experience-headline,
  .policy-headline,
  .about-hero-headline,
  .experiences-hero-headline,
  .contact-hero-headline,
  .gallery-hero-headline,
  .hero-headline
) {
  color: #faf8f4 !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .experience-section,
  .location-section,
  .policy-section,
  .activities-section,
  .attractions-section,
  .activities-grid-section,
  .local-experiences,
  .sanctuary-section,
  .hideaway-section,
  .about-sanctuary,
  .about-story-dark,
  .region-section,
  .guest-info-section,
  .booking-section,
  .contact-hero,
  .about-hero,
  .experiences-hero,
  .gallery-hero,
  .stay-hero,
  .cvh-hero-stay,
  .cta-dark,
  .dark-section
) :is(p, li, small, figcaption, label, .section-subheadline, .experience-subheadline, .hero-subheadline, .hero-subheading),
.wb-root .wb-html-island.wb-html-island--light :is(
  .experience-section,
  .location-section,
  .policy-section,
  .activities-section,
  .attractions-section,
  .activities-grid-section,
  .local-experiences,
  .sanctuary-section,
  .hideaway-section,
  .about-sanctuary,
  .about-story-dark,
  .region-section,
  .guest-info-section,
  .booking-section,
  .contact-hero,
  .about-hero,
  .experiences-hero,
  .gallery-hero,
  .stay-hero,
  .cvh-hero-stay,
  .cta-dark,
  .dark-section
) span:not([class*="btn"]):not([class*="badge"]):not([class*="tag"]):not([class*="sold"]):not([class*="status"]),
.wb-root .wb-html-island.wb-html-island--light :is(
  .about-hero-subheadline,
  .experiences-hero-subheadline,
  .gallery-hero-subheadline,
  .contact-hero-intro
) {
  color: #e8e4dc !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .experience-section,
  .location-section,
  .policy-section,
  .activities-section,
  .attractions-section,
  .activities-grid-section,
  .local-experiences,
  .sanctuary-section,
  .hideaway-section,
  .about-sanctuary,
  .about-story-dark,
  .region-section,
  .guest-info-section,
  .booking-section,
  .about-hero,
  .experiences-hero,
  .cvh-hero-stay
) .section-label {
  color: #d4b896 !important;
}

/*
 * CVH contact form sits on a charcoal band but the card itself is cream —
 * do not inherit dark-band light type into .form-card.
 */
.wb-root .wb-html-island.wb-html-island--light .contact-form-section .form-card,
.wb-root .wb-html-island.wb-html-island--light .contact-form-section .form-card :is(
  h1, h2, h3, h4, p, li, span, small, label, .required-note
) {
  color: #2f2f2f !important;
}

.wb-root .wb-html-island.wb-html-island--light .contact-form-section .form-card p,
.wb-root .wb-html-island.wb-html-island--light .contact-form-section .form-card .required-note {
  color: #4a5b59 !important;
}

.wb-root .wb-html-island.wb-html-island--light .contact-form-section .form-card :is(input, textarea, select) {
  color: #1c2b2a !important;
  background: #faf9f7 !important;
  border-color: #e0d6cc !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .experience-section,
  .location-section,
  .policy-section,
  .activities-section,
  .sanctuary-section,
  .hideaway-section,
  .about-sanctuary,
  .local-experiences,
  .contact-hero
) a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]) {
  color: #e8d5b5 !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .experience-section,
  .location-section,
  .policy-section,
  .hideaway-section
) a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]):hover {
  color: #f5ebd8 !important;
}

/*
 * Roe Realty charcoal bands sit inside cream --light islands.
 * Global light-island ink (#2f2f2f / #1c2b2a) washes dark heroes & sections —
 * force cream type site-wide (same pattern as CVH / DG navy shells).
 */
.wb-root .wb-html-island.wb-html-island--light :is(
  .hero-section,
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero,
  .services-section,
  .buyer-services,
  .insight-section,
  .lead-magnet-section,
  .faq-section,
  .negotiation-section,
  .selling-approach,
  .values-section-dark,
  .approach-section
) {
  color: #f4f1ea !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .hero-section,
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero,
  .services-section,
  .buyer-services,
  .insight-section,
  .lead-magnet-section,
  .faq-section,
  .negotiation-section,
  .selling-approach,
  .values-section-dark,
  .approach-section
) :is(
  h1, h2, h3, h4, h5, h6,
  .hero-headline,
  .hero-subheading,
  .hero-subheadline,
  .cta-headline,
  .section-title,
  .section-label,
  .benefits-title
) {
  color: #faf8f4 !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .hero-section,
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero,
  .services-section,
  .buyer-services,
  .insight-section,
  .lead-magnet-section,
  .faq-section,
  .negotiation-section,
  .selling-approach,
  .values-section-dark,
  .approach-section
) :is(
  p, li, span, small, figcaption, label, td, th,
  .cta-description,
  .cta-label,
  .section-subheadline,
  .hero-content,
  .service-text,
  .faq-item,
  .insight-card,
  .service-card,
  .approach-card,
  .value-card,
  .negotiation-visual
) {
  color: #e8e4dc !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .hero-section,
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero,
  .services-section,
  .buyer-services,
  .insight-section,
  .lead-magnet-section,
  .faq-section,
  .negotiation-section,
  .selling-approach,
  .values-section-dark,
  .approach-section
) a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]) {
  color: #e8d5a8 !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .hero-section,
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero,
  .services-section,
  .buyer-services,
  .insight-section,
  .lead-magnet-section,
  .faq-section,
  .negotiation-section,
  .selling-approach,
  .values-section-dark,
  .approach-section
) a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]):hover {
  color: #f5ebd8 !important;
}

/* Cream Roe / CVH body copy stays dark (intro / why / light CTA strips / gallery).
   final-cta is a dark band — light text handled separately below. */
.wb-root .wb-html-island.wb-html-island--light :is(
  .intro-section,
  .why-choose-section,
  .direct-cta-section-light,
  .gallery-section,
  .cvh-circle-home-cta
) :is(
  h1, h2, h3, h4,
  .intro-headline,
  .section-title,
  .section-headline,
  .direct-cta-heading-light,
  .cta-headline
) {
  color: #14201f !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .intro-section,
  .why-choose-section,
  .direct-cta-section-light,
  .gallery-section,
  .cvh-circle-home-cta
) :is(
  .section-label,
  .badge,
  .cta-label
) {
  color: #8a7358 !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .intro-section,
  .why-choose-section,
  .direct-cta-section-light,
  .gallery-section,
  .cvh-circle-home-cta
) :is(
  p, li, span, small,
  .intro-description,
  .why-description,
  .section-subheadline,
  .direct-cta-text-light,
  .cta-description,
  .direct-cta,
  .trust-badge
) {
  color: #243533 !important;
}

/* Dark charcoal / photo CTAs — light type (beats blanket span:not(…) ink). */
.wb-root .wb-html-island.wb-html-island--light :is(
  .final-cta,
  .final-cta-section,
  .location-section,
  .experience-section,
  .policy-section,
  .hero-section
) span:not([class*="btn"]):not([class*="badge"]):not([class*="tag"]):not([class*="sold"]):not([class*="status"]),
.wb-root .wb-html-island.wb-html-island--light :is(
  .final-cta,
  .final-cta-section
) :is(h1, h2, h3, h4, p, li, small, .cta-headline, .cta-description, .cta-label, .direct-cta, .trust-badge) {
  color: #e8e4dc !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .final-cta,
  .final-cta-section
) :is(h1, h2, h3, .cta-headline) {
  color: #faf8f4 !important;
}

.wb-root .wb-html-island.wb-html-island--light :is(
  .final-cta,
  .final-cta-section
) :is(.cta-label, .section-label) {
  color: #c9a46c !important;
}

/* Home hero trust pills — pure white (must follow cream-island / section ink rules above) */
.wb-root .wb-html-island.wb-html-island--light .hero-section .trust-badge,
.wb-root .wb-html-island.wb-html-island--light .hero-section .trust-badge .trust-item,
.wb-root .wb-html-island.wb-html-island--light .hero-section .trust-badge .trust-item span {
  color: #ffffff !important;
}

/*
 * DigitalGate Founding (.dg-fc) is a navy shell that can sit inside
 * wb-html-island--light (cream island ink). Force light type on dark bands;
 * keep the white application form dark.
 * Verified selectors from /founding-customers/ live markup.
 */
.wb-root .wb-html-island.wb-html-island--light:has(.dg-fc),
.wb-root .wb-html-island.wb-html-island--light .dg-fc {
  background: #0a0e17 !important;
  color: #f9fafb !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-fc :is(
  .fc-hero,
  .fc-cta,
  section:not(#application),
  .benefit-card,
  .cohort-card,
  .standard-box,
  .build-item,
  .step,
  .scarcity-box,
  .terms-box,
  .compare-wrap
) {
  color: #f9fafb !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-fc :is(
  .fc-hero,
  .fc-cta,
  section:not(#application),
  .benefit-card,
  .cohort-card,
  .standard-box,
  .build-item,
  .step,
  .scarcity-box,
  .terms-box
) :is(h1, h2, h3, h4, h5, h6) {
  color: #faf8f4 !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-fc :is(
  .fc-hero,
  .fc-cta,
  section:not(#application),
  .benefit-card,
  .cohort-card,
  .standard-box,
  .build-item,
  .step,
  .scarcity-box,
  .terms-box,
  .compare-table
) :is(
  p,
  li,
  td,
  th,
  span,
  small,
  strong,
  figcaption,
  .lead,
  .programme-line,
  .cohort-lead,
  .tier-note,
  .compare-note,
  .footnote,
  .legal-note
) {
  color: #e2e8f0 !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-fc .fc-hero h1 .accent,
.wb-root .wb-html-island.wb-html-island--light .dg-fc .build-item h3,
.wb-root .wb-html-island.wb-html-island--light .dg-fc .compare-table th {
  color: #bfdbfe !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-fc .sub-label {
  color: #93c5fd !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-fc :is(
  .benefit-card .num,
  .step-num,
  .cohort-card .badge
) {
  color: #93c5fd !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-fc :is(
  .open-now,
  .scarcity-box .status,
  .cohort-card.featured .badge
) {
  color: #34d399 !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-fc a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]) {
  color: #bfdbfe !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-fc a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]):hover {
  color: #eff6ff !important;
}

/* White Founding application card — restore dark ink (with or without --light) */
.wb-root .wb-html-island .dg-fc .form-wrapper {
  color: #0f172a !important;
  background: #ffffff !important;
}

.wb-root .wb-html-island .dg-fc .form-wrapper :is(h1, h2, h3, h4) {
  color: #0f172a !important;
}

.wb-root .wb-html-island .dg-fc .form-wrapper :is(
  p,
  li,
  span,
  small,
  label,
  .checkbox-label,
  .form-note,
  .form-header p
) {
  color: #334155 !important;
}

.wb-root .wb-html-island .dg-fc .form-wrapper .sub-label {
  color: #2563eb !important;
}

.wb-root .wb-html-island .dg-fc .form-wrapper :is(input, textarea, select) {
  color: #0f172a !important;
  background: #ffffff !important;
}

/*
 * DigitalGate About (.dg-about) — same navy-shell / cream-type pattern as .dg-fc.
 * Apply with or without wb-html-island--light (live /about/ is often --page only;
 * Studio / older seeds may still carry --light and cream-island dark ink).
 * Class names verified from /about/ live markup + marketing/pages/about-page.html.
 * Scope under .dg-about so CVH .about-hero rules stay untouched.
 */
.wb-root .wb-html-island:has(.dg-about),
.wb-root .wb-html-island .dg-about {
  background: #0a0e17 !important;
  color: #f9fafb !important;
}

.wb-root .wb-html-island .dg-about :is(
  .about-hero,
  .about-cta,
  section,
  .pillar,
  .biz-card,
  .diff-card,
  .arch-module,
  .arch-ai-layer,
  .founder-content,
  .prose,
  .sys-chip,
  .ind-list span,
  .not-a span
) {
  color: #f9fafb !important;
}

.wb-root .wb-html-island .dg-about :is(
  .about-hero,
  .about-cta,
  section,
  .pillar,
  .biz-card,
  .diff-card,
  .founder-content
) :is(h1, h2, h3, h4, h5, h6) {
  color: #faf8f4 !important;
}

.wb-root .wb-html-island .dg-about :is(
  .about-hero,
  .about-cta,
  section,
  .pillar,
  .biz-card,
  .diff-card,
  .arch-module,
  .arch-ai-layer,
  .founder-content,
  .prose
) :is(
  p,
  li,
  span,
  small,
  strong,
  em,
  figcaption,
  .lead,
  .lead-sm,
  .tagline,
  .one-liner,
  .role,
  .vision-quote,
  .arch-across,
  .arch-module-label
) {
  color: #e2e8f0 !important;
}

.wb-root .wb-html-island .dg-about .about-hero h1 .accent,
.wb-root .wb-html-island .dg-about .biz-card h4,
.wb-root .wb-html-island .dg-about .arch-module.highlight {
  color: #bfdbfe !important;
}

.wb-root .wb-html-island .dg-about .sub-label,
.wb-root .wb-html-island .dg-about .about-hero .tagline,
.wb-root .wb-html-island .dg-about .founder-content .role,
.wb-root .wb-html-island .dg-about .vision-quote em {
  color: #93c5fd !important;
}

.wb-root .wb-html-island .dg-about .is-a {
  color: #34d399 !important;
}

.wb-root .wb-html-island .dg-about .sys-chip,
.wb-root .wb-html-island .dg-about .ind-list span {
  color: #e2e8f0 !important;
}

.wb-root .wb-html-island .dg-about .not-a span {
  color: #fca5a5 !important;
}

.wb-root .wb-html-island .dg-about a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]) {
  color: #bfdbfe !important;
}

.wb-root .wb-html-island .dg-about a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]):hover {
  color: #eff6ff !important;
}

/*
 * DigitalGate Contact (.dg-contact) — navy shell + cream type.
 * Imported HTML often ships wb-html-island--light; cream-island ink (#2f2f2f)
 * wins over weaker selectors — mirror Founding (.dg-fc) specificity.
 */
.wb-root .wb-html-island.wb-html-island--light:has(.dg-contact),
.wb-root .wb-html-island.wb-html-island--light .dg-contact,
.wb-root .wb-html-island:has(.dg-contact),
.wb-root .wb-html-island .dg-contact {
  background: #0a0e17 !important;
  color: #f9fafb !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-contact :is(
  h1, h2, h3, h4, h5, h6
),
.wb-root .wb-html-island .dg-contact :is(h1, h2, h3, h4, h5, h6) {
  color: #faf8f4 !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-contact :is(
  p, li, span, small, strong, em, figcaption, label, td, th, .lead, .lead-sm, .sub-label, .accent
),
.wb-root .wb-html-island .dg-contact :is(
  p, li, span, small, strong, em, figcaption, label, td, th, .lead, .lead-sm, .sub-label, .accent
) {
  color: #e8e4dc !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-contact .sub-label,
.wb-root .wb-html-island .dg-contact .sub-label {
  color: #93c5fd !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-contact .accent,
.wb-root .wb-html-island .dg-contact .accent {
  color: #60a5fa !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-contact a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]),
.wb-root .wb-html-island .dg-contact a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]) {
  color: #bfdbfe !important;
}

.wb-root .wb-html-island.wb-html-island--light .dg-contact a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]):hover,
.wb-root .wb-html-island .dg-contact a:not([class*="btn"]):not([class*="cta"]):not([class*="button"]):hover {
  color: #eff6ff !important;
}

/* White enquiry card stays dark ink */
.wb-root .wb-html-island .dg-contact .form-wrapper,
.wb-root .wb-html-island.wb-html-island--light .dg-contact .form-wrapper {
  color: #1c2b2a !important;
  background: #ffffff !important;
}

.wb-root .wb-html-island .dg-contact .form-wrapper :is(h1, h2, h3, h4),
.wb-root .wb-html-island.wb-html-island--light .dg-contact .form-wrapper :is(h1, h2, h3, h4) {
  color: #0f172a !important;
}

.wb-root .wb-html-island .dg-contact .form-wrapper :is(
  p, li, span, small, label, .form-header, .sub-label, .accent
),
.wb-root .wb-html-island.wb-html-island--light .dg-contact .form-wrapper :is(
  p, li, span, small, label, .form-header, .sub-label, .accent
) {
  color: #243533 !important;
}

.wb-root .wb-html-island .dg-contact .form-wrapper :is(input, textarea, select),
.wb-root .wb-html-island.wb-html-island--light .dg-contact .form-wrapper :is(input, textarea, select) {
  color: #0f172a !important;
  background: #ffffff !important;
}

/*
 * RR inner-page heroes — uniform overlay shell.
 * Home (.hero-section / .hero) stays full-viewport and is intentionally excluded.
 */
.wb-html-page .wb-html-island--page :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
),
.wb-root .wb-html-island :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) {
  position: relative !important;
  width: 100% !important;
  min-height: 75vh !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  overflow: hidden !important;
  text-align: left !important;
  box-sizing: border-box !important;
  padding: 5.5rem 0 3rem !important;
  background: #1c2b2a !important;
  color: #f8fafc !important;
}

/* Home heroes — true full viewport (RR + CVH). Use svh to avoid mobile UI chrome gap. */
.wb-root .wb-html-island .hero-section,
.wb-root .wb-html-island section.hero,
.wb-root .wb-html-island .hero:not([class*="hero-"]),
.wb-html-page .wb-html-island .hero-section,
.wb-html-page .wb-html-island section.hero,
.wb-html-page .wb-html-island .hero:not([class*="hero-"]),
.wb-root.wb-chrome-overlay .wb-html-island .hero-section,
.wb-root.wb-chrome-overlay .wb-html-island section.hero,
.wb-root.wb-chrome-overlay .wb-html-island .hero:not([class*="hero-"]) {
  position: relative !important;
  width: 100% !important;
  min-height: 100svh !important;
  min-height: 100dvh !important;
  height: 100svh !important;
  height: 100dvh !important;
  max-height: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  margin: 0 !important;
}

.wb-html-page .wb-html-island--page :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) .hero-bg-img,
.wb-root .wb-html-island :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) .hero-bg-img {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  object-fit: cover !important;
  object-position: center 55% !important;
  border-radius: 0 !important;
  z-index: 0 !important;
}

.wb-html-page .wb-html-island--page :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
)::before,
.wb-root .wb-html-island :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
)::before {
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  background: linear-gradient(
    105deg,
    rgba(28, 43, 42, 0.68) 0%,
    rgba(28, 43, 42, 0.45) 55%,
    rgba(0, 0, 0, 0.25) 100%
  ) !important;
  z-index: 1 !important;
  pointer-events: none !important;
}

.wb-html-page .wb-html-island--page :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) :is(.hero-container, .rr-insights-hero-inner),
.wb-root .wb-html-island :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) :is(.hero-container, .rr-insights-hero-inner) {
  position: relative !important;
  z-index: 2 !important;
  max-width: 1280px !important;
  margin: 0 auto !important;
  padding: 0 2rem !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.wb-html-page .wb-html-island--page :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) .hero-content,
.wb-root .wb-html-island :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) .hero-content {
  max-width: 700px !important;
}

.wb-html-page .wb-html-island--page :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) :is(.hero-headline, h1),
.wb-root .wb-html-island :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) :is(.hero-headline, h1) {
  font-family: "Sora", "Inter", system-ui, sans-serif !important;
  font-size: clamp(2.2rem, 4vw, 3.5rem) !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  letter-spacing: -0.02em !important;
  color: #ffffff !important;
  margin: 0 0 1.5rem !important;
  max-width: none !important;
  text-align: left !important;
}

.wb-html-page .wb-html-island--page :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) :is(.hero-subheading, .lead),
.wb-root .wb-html-island :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) :is(.hero-subheading, .lead) {
  font-family: "Inter", "Source Sans 3", system-ui, sans-serif !important;
  font-size: 1.2rem !important;
  line-height: 1.5 !important;
  color: rgba(255, 250, 240, 0.92) !important;
  margin: 0 0 2rem !important;
  max-width: 580px !important;
  text-align: left !important;
}

.wb-html-page .wb-html-island--page :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) :is(.hero-cta, a.hero-cta),
.wb-root .wb-html-island :is(
  .hero-sell,
  .hero-buy,
  .hero-about,
  .hero-contact,
  .hero-property,
  .hero-agents,
  .rr-insights-hero
) :is(.hero-cta, a.hero-cta) {
  display: inline-flex !important;
  align-items: center !important;
  gap: 12px !important;
  background: #c9a46c !important;
  color: #ffffff !important;
  font-family: "Inter", "Source Sans 3", system-ui, sans-serif !important;
  font-weight: 700 !important;
  font-size: 1rem !important;
  padding: 1rem 2rem !important;
  border-radius: 56px !important;
  text-decoration: none !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.wb-html-page .wb-html-island--page .rr-insights-hero .sub,
.wb-root .wb-html-island .rr-insights-hero .sub {
  display: inline-block !important;
  font-family: "Source Sans 3", system-ui, sans-serif !important;
  font-size: 0.72rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase !important;
  color: #c9a46c !important;
  margin: 0 0 0.85rem !important;
}

@media (max-width: 768px) {
  .wb-html-page .wb-html-island--page :is(
    .hero-sell,
    .hero-buy,
    .hero-about,
    .hero-contact,
    .hero-property,
    .hero-agents,
    .rr-insights-hero
  ),
  .wb-root .wb-html-island :is(
    .hero-sell,
    .hero-buy,
    .hero-about,
    .hero-contact,
    .hero-property,
    .hero-agents,
    .rr-insights-hero
  ) {
    min-height: 70vh !important;
    padding: 4.75rem 0 2.5rem !important;
  }
  .wb-html-page .wb-html-island--page :is(
    .hero-sell,
    .hero-buy,
    .hero-about,
    .hero-contact,
    .hero-property,
    .hero-agents,
    .rr-insights-hero
  ) :is(.hero-container, .rr-insights-hero-inner),
  .wb-root .wb-html-island :is(
    .hero-sell,
    .hero-buy,
    .hero-about,
    .hero-contact,
    .hero-property,
    .hero-agents,
    .rr-insights-hero
  ) :is(.hero-container, .rr-insights-hero-inner) {
    padding: 0 1.5rem !important;
  }
}

.wb-html-page .wb-html-island--page .roe-property-grid,
.wb-root .wb-html-island .roe-property-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
  gap: 30px !important;
  max-width: 1280px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding: 40px 20px !important;
  background: #f5f2ef !important;
  box-sizing: border-box !important;
}

.wb-html-page .wb-html-island--page .roe-property-grid .roe-property-card,
.wb-html-page .wb-html-island--page .roe-property-card,
.wb-root .wb-html-island .roe-property-card {
  background: #ffffff !important;
  border: 1px solid #e0d6cc !important;
  border-radius: 16px !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  color: #1c2b2a !important;
  transition: transform 0.2s, box-shadow 0.2s;
}

.wb-html-page .wb-html-island--page .roe-property-card:hover,
.wb-root .wb-html-island .roe-property-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.wb-html-page .wb-html-island--page .roe-property-card .card-link,
.wb-root .wb-html-island .roe-property-card .card-link,
.wb-root .wb-html-island .roe-property-card a.card-link {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 !important;
  color: inherit !important;
  text-decoration: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  border-top: none !important;
  text-align: left !important;
}

.wb-html-page .wb-html-island--page .roe-property-card .card-image,
.wb-root .wb-html-island .roe-property-card .card-image {
  position: relative !important;
  height: 220px !important;
  background: #f0edea !important;
  overflow: hidden !important;
  flex-shrink: 0 !important;
}

.wb-html-page .wb-html-island--page .roe-property-card .card-image img,
.wb-root .wb-html-island .roe-property-card .card-image img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
  border-radius: 0 !important;
  transition: transform 0.3s ease;
}

.wb-html-page .wb-html-island--page .roe-property-card:hover .card-image img,
.wb-root .wb-html-island .roe-property-card:hover .card-image img {
  transform: scale(1.02);
}

.wb-html-page .wb-html-island--page .roe-property-card .card-content,
.wb-root .wb-html-island .roe-property-card .card-content {
  padding: 18px 20px 20px !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
}

.wb-html-page .wb-html-island--page .roe-property-card h3,
.wb-html-page .wb-html-island--page .roe-property-card .card-title,
.wb-html-page .wb-html-island--page .roe-property-card p,
.wb-html-page .wb-html-island--page .roe-property-card a,
.wb-root .wb-html-island .roe-property-card h3,
.wb-root .wb-html-island .roe-property-card .card-title,
.wb-root .wb-html-island .roe-property-card p,
.wb-root .wb-html-island .roe-property-card a {
  color: #1c2b2a !important;
}

.wb-html-page .wb-html-island--page .roe-property-card .card-title,
.wb-root .wb-html-island .roe-property-card .card-title {
  font-size: 1.1rem !important;
  font-weight: 700 !important;
  margin: 0 0 4px !important;
  font-family: "Sora", "Plus Jakarta Sans", system-ui, sans-serif !important;
}

.wb-html-page .wb-html-island--page .roe-property-card .card-address,
.wb-root .wb-html-island .roe-property-card .card-address {
  font-size: 0.85rem !important;
  color: #6b7a78 !important;
  margin: 0 0 8px !important;
}

.wb-html-page .wb-html-island--page .roe-property-card .card-price,
.wb-root .wb-html-island .roe-property-card .card-price {
  font-size: 1.3rem !important;
  font-weight: 700 !important;
  color: #c9a46c !important;
  margin: 0 0 12px !important;
}

.wb-html-page .wb-html-island--page .roe-property-card .card-specs,
.wb-root .wb-html-island .roe-property-card .card-specs {
  font-size: 0.85rem !important;
  color: #4a5b59 !important;
  border-top: 1px solid #e0d6cc !important;
  padding-top: 12px !important;
  margin-top: auto !important;
}

.wb-html-page .wb-html-island--page .roe-property-card .card-status,
.wb-html-page .wb-html-island--page .roe-property-card span.card-status,
.wb-root .wb-html-island .roe-property-card .card-status,
.wb-root .wb-html-island.wb-html-island--light .roe-property-card span.card-status {
  position: absolute !important;
  top: 12px !important;
  left: 12px !important;
  display: inline-block !important;
  padding: 4px 14px !important;
  border-radius: 40px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  color: #ffffff !important;
  background: #c62828 !important;
  z-index: 2 !important;
}

@media (max-width: 768px) {
  .wb-html-page .wb-html-island--page .roe-property-grid,
  .wb-root .wb-html-island .roe-property-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 20px !important;
    padding: 20px 15px !important;
  }
  .wb-html-page .wb-html-island--page .roe-property-card .card-image,
  .wb-root .wb-html-island .roe-property-card .card-image {
    height: 180px !important;
  }
}

@media (max-width: 480px) {
  .wb-html-page .wb-html-island--page .roe-property-grid,
  .wb-root .wb-html-island .roe-property-grid {
    grid-template-columns: 1fr !important;
  }
  .wb-html-page .wb-html-island--page .roe-property-card .card-image,
  .wb-root .wb-html-island .roe-property-card .card-image {
    height: 200px !important;
  }
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

/* Business slogan directly under footer icon/logo */
.wb-site-chrome-footer .wb-footer-slogan,
.wb-site-chrome-footer .footer-description,
.wb-brand-chrome-footer .wb-footer-slogan {
  display: block !important;
  margin: 0.55rem 0 0.85rem !important;
  max-width: 22rem !important;
  font-size: 0.92rem !important;
  line-height: 1.45 !important;
  font-weight: 500 !important;
  color: #d6d3d1 !important;
}

.wb-brand-chrome-brand-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  min-width: 0;
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
.wb-html-page .nav-cta,
.wb-html-page .hero-cta,
.wb-html-page .cta-button,
.wb-html-page .intro-cta,
.wb-html-page .direct-cta-button-light,
.wb-html-page .plan-cta,
.wb-html-page .btn-primary,
.wb-html-page a.btn-primary,
.wb-html-page .wb-brand-chrome-cta,
.wb-root .wb-brand-chrome-cta,
.wb-brand-chrome-cta,
.wb-brand-chrome-cta:link,
.wb-brand-chrome-cta:visited,
.wb-brand-chrome-cta:active,
.wb-brand-chrome-cta:focus,
.wb-brand-chrome-cta--desktop,
.wb-brand-chrome-cta--mobile,
a.wb-brand-chrome-cta {
  color: #ffffff !important;
}

.wb-html-page .book-btn:hover,
.wb-html-page .hero-btn:hover,
.wb-html-page .cta-btn:hover,
.wb-html-page .submit-btn:hover,
.wb-html-page .btn-cvh:hover,
.wb-html-page .cvh-unit-actions .primary:hover,
.wb-html-page .nav-cta:hover,
.wb-html-page .hero-cta:hover,
.wb-html-page .cta-button:hover,
.wb-html-page .intro-cta:hover,
.wb-html-page .plan-cta:hover,
.wb-html-page .btn-primary:hover,
.wb-root .wb-brand-chrome-cta:hover,
.wb-brand-chrome-cta:hover,
.wb-brand-chrome-cta:focus-visible,
a.wb-brand-chrome-cta:hover {
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

/* Bar layout: children sit in one row (logo | nav | CTA) */
.wb-brand-chrome-below {
  display: contents;
}

.wb-brand-chrome-header .wb-brand-chrome-nav {
  flex: 1 1 auto;
  justify-content: center;
}

.wb-brand-chrome-header .wb-brand-chrome-cta {
  flex: 0 0 auto;
  color: #ffffff !important;
}

/* CVH / stacked: logo centered large, pages + CTA underneath */
.wb-brand-chrome-header--stacked .wb-brand-chrome-inner {
  position: relative;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 1.25rem;
  padding-bottom: 1.1rem;
}

.wb-brand-chrome-header--stacked .wb-brand-chrome-brand {
  position: relative;
  order: 0;
  justify-content: center;
  isolation: isolate;
}

/* Soft disc so the gold mark reads on bright canopy / sky */
.wb-brand-chrome-header--stacked.is-top .wb-brand-chrome-brand::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 132%;
  height: 132%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(8, 14, 20, 0.42) 0%,
    rgba(8, 14, 20, 0.22) 38%,
    rgba(8, 14, 20, 0.08) 58%,
    transparent 74%
  );
  z-index: -1;
  pointer-events: none;
}

.wb-brand-chrome-header--stacked .wb-brand-chrome-name {
  text-align: center;
  font-size: 1.35rem;
}

/* True center: nav in middle column; CTA balances in the right rail */
.wb-brand-chrome-header--stacked .wb-brand-chrome-below {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  order: 1;
  width: 100%;
  align-items: center;
  column-gap: 1rem;
  row-gap: 0.65rem;
}

.wb-brand-chrome-header--stacked .wb-brand-chrome-nav {
  grid-column: 2;
  justify-self: center;
  justify-content: center;
}

.wb-brand-chrome-header--stacked .wb-brand-chrome-cta {
  grid-column: 3;
  justify-self: end;
  margin-left: 0;
  color: #ffffff !important;
}

.wb-brand-chrome-header--stacked .wb-brand-chrome-menu-btn {
  position: absolute;
  top: 1rem;
  right: clamp(0.75rem, 3vw, 1.5rem);
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

/* Stacked logo size/contrast must follow base logo rules (same !important cascade) */
.wb-brand-chrome-header--stacked .wb-brand-chrome-logo {
  height: 104px !important;
  max-height: 104px !important;
  max-width: min(380px, 78vw) !important;
  object-position: center center !important;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.55))
    drop-shadow(0 2px 8px rgba(0, 0, 0, 0.45))
    drop-shadow(0 10px 22px rgba(0, 0, 0, 0.35)) !important;
}

.wb-root.wb-chrome-overlay .wb-brand-chrome-header--stacked .wb-brand-chrome-logo,
.wb-brand-chrome-header--stacked.wb-brand-chrome-header--overlay .wb-brand-chrome-logo,
.wb-brand-chrome-header--stacked.wb-brand-chrome-header--fade .wb-brand-chrome-logo {
  filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.35))
    drop-shadow(0 2px 6px rgba(0, 0, 0, 0.55))
    drop-shadow(0 8px 18px rgba(0, 0, 0, 0.4)) !important;
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
  color: #ffffff !important;
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

  .wb-brand-chrome-header--stacked .wb-brand-chrome-inner {
    flex-wrap: nowrap;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1rem;
  }

  .wb-brand-chrome-header--stacked .wb-brand-chrome-logo {
    height: 72px !important;
    max-height: 72px !important;
    max-width: min(260px, 68vw) !important;
  }

  .wb-brand-chrome-header--stacked .wb-brand-chrome-below {
    display: none;
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
  .wb-root.wb-html-page,
  .wb-root.wb-full-bleed {
    overflow-x: clip;
    max-width: 100%;
  }

  .wb-html-island--page,
  .wb-html-island--light {
    overflow-x: clip;
    max-width: 100%;
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
    max-width: 100%;
  }

  /* Prevent long CTA labels from forcing horizontal page pan */
  .wb-html-page .nav-cta,
  .wb-html-page .hero-cta,
  .wb-html-page .cta-button,
  .wb-html-island .nav-cta,
  .wb-html-island .hero-cta,
  .wb-html-island .cta-button {
    white-space: normal;
    max-width: 100%;
  }

  .wb-brand-chrome-panel:not(.is-open) {
    visibility: hidden;
    pointer-events: none;
  }

  .wb-root .container,
  .wb-html-island--page .container {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }

  .roe-prop-hero-wrap .wb-mosaic-grid {
    min-height: 0;
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

.wb-post-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem 1.25rem;
  margin-top: 2rem;
  padding-top: 0.25rem;
}

.wb-post-pager-status {
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

.wb-post-pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.55rem 1.15rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.55);
  color: #f8fafc !important;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.wb-post-pager-btn:hover {
  background: rgba(30, 41, 59, 0.9);
  border-color: rgba(148, 163, 184, 0.55);
  transform: translateY(-1px);
}

.wb-post-pager-btn.is-disabled {
  opacity: 0.35;
  pointer-events: none;
  cursor: default;
}

.wb-root.wb-surface-light .wb-post-pager-btn {
  background: #ffffff;
  border-color: rgba(28, 43, 42, 0.18);
  color: #1c2b2a !important;
}

.wb-root.wb-surface-light .wb-post-pager-btn:hover {
  background: #f7f4ee;
  border-color: rgba(28, 43, 42, 0.32);
}

.wb-root.wb-surface-light .wb-post-pager-status {
  color: #243533;
}

/* CVH Insights: stacked overlay header is tall — drop hero copy below it */
.wb-root .cvh-insights-hero {
  padding-top: clamp(10.5rem, 18vw, 13.5rem) !important;
}

@media (max-width: 900px) {
  .wb-root .cvh-insights-hero {
    padding-top: clamp(9.5rem, 28vw, 12rem) !important;
  }
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
  /* Prefer 100% over 100vw — 100vw + safe-area padding causes horizontal slide on iOS */
  width: 100% !important;
  max-width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
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

/* WP-style mosaic: 1 large + 2–3 thumbs (CVH units + RR properties) */
.wb-mosaic-gallery,
.dg-acc-gallery,
.property-gallery.wb-mosaic-gallery {
  margin: 0 0 1.5rem;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
}

.wb-mosaic-grid,
.dg-acc-gallery .gallery-grid,
.property-gallery .gallery-grid {
  display: grid !important;
  grid-template-columns: 2fr 1fr;
  gap: 2px;
  background: #000;
  max-height: 500px;
  overflow: hidden;
  margin: 0 !important;
}

.wb-mosaic-grid:not(:has(.gallery-thumbs)) {
  grid-template-columns: 1fr;
}

.wb-mosaic-grid .gallery-item,
.dg-acc-gallery .gallery-item,
.property-gallery .gallery-item {
  display: block;
  border: 0;
  padding: 0;
  margin: 0;
  background: #1a1a1a;
  cursor: zoom-in;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
}

.wb-mosaic-grid .gallery-item img,
.dg-acc-gallery .gallery-item img,
.property-gallery .gallery-item img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block;
  transition: transform 0.3s ease;
}

.wb-mosaic-grid .gallery-item:hover img,
.dg-acc-gallery .gallery-item:hover img,
.property-gallery .gallery-item:hover img {
  transform: scale(1.02);
}

.wb-mosaic-grid .gallery-main,
.dg-acc-gallery .gallery-main,
.property-gallery .gallery-main {
  grid-column: 1 !important;
  grid-row: 1 / span 2 !important;
  min-height: 400px;
  max-height: 500px;
}

.wb-mosaic-grid:has(.gallery-thumbs > :only-child) .gallery-main,
.dg-acc-gallery:has(.gallery-thumbs > :only-child) .gallery-main,
.property-gallery:has(.gallery-thumbs > :only-child) .gallery-main {
  grid-row: 1 / span 1 !important;
}

.wb-mosaic-grid .gallery-main img,
.dg-acc-gallery .gallery-main img,
.property-gallery .gallery-main img {
  min-height: 400px;
  max-height: 500px;
}

.wb-mosaic-grid .gallery-main--empty {
  min-height: 400px;
  background: #1a2e2b;
  cursor: default;
}

.wb-mosaic-grid .gallery-thumbs,
.dg-acc-gallery .gallery-thumbs,
.property-gallery .gallery-thumbs {
  display: grid !important;
  grid-column: 2 !important;
  grid-row: 1 / span 2 !important;
  grid-template-columns: 1fr !important;
  grid-template-rows: 1fr 1fr !important;
  gap: 2px;
  background: #000;
  min-height: 0;
  height: 100%;
  align-self: stretch;
}

.wb-mosaic-grid .gallery-thumbs:has(> :only-child),
.dg-acc-gallery .gallery-thumbs:has(> :only-child),
.property-gallery .gallery-thumbs:has(> :only-child) {
  grid-template-rows: 1fr !important;
  grid-row: 1 / span 1 !important;
}

.wb-mosaic-grid .gallery-thumb,
.dg-acc-gallery .gallery-thumb,
.property-gallery .gallery-thumb {
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.wb-mosaic-grid .gallery-thumb img,
.dg-acc-gallery .gallery-thumb img,
.property-gallery .gallery-thumb img {
  min-height: 0;
  height: 100%;
}

.wb-mosaic-grid .gallery-more .more-overlay,
.dg-acc-gallery .gallery-more .more-overlay,
.property-gallery .gallery-more .more-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 2.5rem;
  font-weight: 700;
  font-family: Georgia, "Times New Roman", serif;
  pointer-events: none;
}

.gallery-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.roe-prop-hero-wrap {
  position: relative;
  background: #000;
  border-radius: 0;
  margin: 0;
}

.roe-prop-hero-wrap .wb-mosaic-gallery,
.roe-prop-hero-wrap .property-gallery {
  margin: 0;
  border-radius: 0;
}

.roe-prop-hero-wrap .roe-prop-badge {
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  z-index: 2;
}

.cvh-stay-mosaic-wrap {
  margin-bottom: 0.5rem;
}

.cvh-stay-mosaic-wrap .wb-mosaic-gallery {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .wb-mosaic-grid,
  .dg-acc-gallery .gallery-grid,
  .property-gallery .gallery-grid {
    grid-template-columns: 1fr 1fr;
    max-height: none;
  }

  .wb-mosaic-grid .gallery-main,
  .dg-acc-gallery .gallery-main,
  .property-gallery .gallery-main {
    grid-column: 1 / -1 !important;
    grid-row: auto !important;
    min-height: 250px;
    max-height: 350px;
  }

  .wb-mosaic-grid .gallery-main img,
  .dg-acc-gallery .gallery-main img,
  .property-gallery .gallery-main img {
    min-height: 250px;
    max-height: 350px;
  }

  .wb-mosaic-grid .gallery-thumbs,
  .dg-acc-gallery .gallery-thumbs,
  .property-gallery .gallery-thumbs {
    grid-column: 1 / -1 !important;
    grid-row: auto !important;
    grid-template-columns: 1fr 1fr !important;
    grid-template-rows: auto !important;
  }

  .wb-mosaic-grid .gallery-thumb,
  .wb-mosaic-grid .gallery-thumb img,
  .dg-acc-gallery .gallery-thumb,
  .dg-acc-gallery .gallery-thumb img,
  .property-gallery .gallery-thumb,
  .property-gallery .gallery-thumb img {
    min-height: 120px;
    max-height: 180px;
  }

  .wb-mosaic-grid .gallery-more .more-overlay,
  .dg-acc-gallery .gallery-more .more-overlay,
  .property-gallery .gallery-more .more-overlay {
    font-size: 1.75rem;
  }
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

/* Prefer readable text if page CSS leaves fade-ins at opacity 0 */
@media (prefers-reduced-motion: reduce) {
  .wb-html-page .hero-badge,
  .wb-html-page .hero-container > *,
  .wb-html-page [class*="fade-up"],
  .wb-html-page [class*="FadeUp"] {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
  }
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

/* CVH Gen 2 stay unit booking (replicates WP dg-single / book-now) */
.cvh-stay-unit {
  background: #f5f2ef;
  color: #1c2b2a;
  font-family: Inter, system-ui, sans-serif;
}
.cvh-stay-hero {
  position: relative;
  min-height: min(52vh, 520px);
  background: #2c4137;
  overflow: hidden;
}
.cvh-stay-hero img,
.cvh-stay-hero-fallback {
  width: 100%;
  height: min(52vh, 520px);
  object-fit: cover;
  display: block;
}
.cvh-stay-hero-fallback {
  background: linear-gradient(135deg, #2c4137, #1c2b2a);
}
.cvh-stay-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(15, 23, 22, 0.15) 0%,
    rgba(15, 23, 22, 0.72) 100%
  );
}
.cvh-stay-hero-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 2rem 1.25rem 2.25rem;
  max-width: 1100px;
  margin: 0 auto;
  color: #f8fafc;
}
.cvh-stay-badge {
  display: inline-block;
  margin: 0 0 0.65rem;
  padding: 0.25rem 0.9rem;
  border-radius: 999px;
  background: rgba(185, 164, 138, 0.22);
  color: #e8d7b8;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.cvh-stay-hero-content h1 {
  margin: 0 0 0.4rem;
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 600;
  line-height: 1.1;
  color: #fff;
}
.cvh-stay-price {
  margin: 0 0 0.85rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #f0e2c8;
}
.cvh-stay-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.cvh-stay-meta span {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 0.8rem;
}
.cvh-stay-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  padding: 1.25rem 1rem 0;
}
.cvh-stay-tab {
  padding: 0.55rem 1.2rem;
  border-radius: 999px;
  border: 1px solid #e8dfd3;
  background: #fff;
  color: #4a5b59;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
}
.cvh-stay-tab.is-active,
.cvh-stay-tab:hover {
  background: #b9a48a;
  border-color: #b9a48a;
  color: #fff !important;
}
.cvh-stay-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 2rem;
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.75rem 1.25rem 3.5rem;
  align-items: start;
}
.cvh-stay-section {
  background: #fff;
  border: 1px solid #e8dfd3;
  border-radius: 16px;
  padding: 1.35rem 1.35rem 1.5rem;
  margin-bottom: 1.25rem;
}
.cvh-stay-section h2,
.cvh-stay-section h3,
.cvh-stay-card h3 {
  margin: 0 0 0.85rem;
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: 1.35rem;
  color: #1c2b2a;
}
.cvh-stay-copy p {
  margin: 0 0 0.85rem;
  color: #2f2f2f;
  line-height: 1.65;
}
.cvh-stay-hint {
  margin: 0 0 1rem;
  color: #5a6b67;
  font-size: 0.92rem;
  line-height: 1.5;
}
.cvh-cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.cvh-cal-nav button {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  border: 1px solid #e8dfd3;
  background: #fff;
  cursor: pointer;
  font-size: 1.1rem;
}
.cvh-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
}
.cvh-cal-head span {
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: #6b7280;
  padding: 0.25rem 0;
}
.cvh-cal-day {
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1px solid transparent;
  background: #f7f4ee;
  color: #1c2b2a;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.cvh-cal-day:disabled {
  cursor: default;
  opacity: 0.55;
}
.cvh-cal-day.is-empty {
  background: transparent;
  border: none;
}
.cvh-cal-day.is-past {
  color: #9ca3af;
  background: #f3f4f6;
}
.cvh-cal-day.is-blocked {
  background: #efe4e1;
  color: #9a6b63;
  text-decoration: line-through;
}
.cvh-cal-day.is-saturday {
  background: #f5f0e4;
  color: #8a7a55;
}
.cvh-cal-day.is-open:hover {
  border-color: #b9a48a;
}
.cvh-cal-day.is-selected,
.cvh-cal-day.is-in-range {
  background: #b9a48a;
  color: #fff;
}
.cvh-cal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-top: 0.9rem;
  font-size: 0.75rem;
  color: #5a6b67;
}
.cvh-cal-legend i {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 3px;
  margin-right: 0.35rem;
  vertical-align: -1px;
}
.cvh-cal-legend .is-open {
  background: #f7f4ee;
  border: 1px solid #d7cbb8;
}
.cvh-cal-legend .is-blocked {
  background: #efe4e1;
}
.cvh-cal-legend .is-saturday {
  background: #f5f0e4;
}
.cvh-cal-legend .is-selected {
  background: #b9a48a;
}
.cvh-stay-side {
  display: grid;
  gap: 1rem;
}
.cvh-stay-card {
  background: #fff;
  border: 1px solid #e8dfd3;
  border-radius: 16px;
  padding: 1.15rem 1.2rem;
}
.cvh-stay-card ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}
.cvh-stay-card li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.92rem;
  color: #2f2f2f;
}
.cvh-stay-features li {
  display: block;
}
.cvh-stay-rules {
  background: #fef8e7;
  border-left: 4px solid #f39c12;
  border-radius: 4px;
  padding: 1rem 1.15rem;
  font-size: 0.9rem;
  color: #4a5b59;
}
.cvh-stay-rules ul {
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
}
.cvh-stay-form {
  display: grid;
  gap: 0.75rem;
}
.cvh-stay-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}
.cvh-stay-form label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #4a5b59;
}
.cvh-stay-form input,
.cvh-stay-form textarea {
  border: 1px solid #e8dfd3;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  font: inherit;
  color: #1c2b2a;
  background: #fff;
}
.cvh-stay-form button {
  margin-top: 0.25rem;
  border: none;
  border-radius: 999px;
  padding: 0.8rem 1.1rem;
  background: #b9a48a;
  color: #fff !important;
  font-weight: 700;
  cursor: pointer;
}
.cvh-stay-form button:disabled {
  opacity: 0.7;
  cursor: wait;
}
.cvh-stay-discount span,
.cvh-stay-discount strong {
  color: #166534 !important;
}
.cvh-stay-pay-actions {
  display: grid;
  gap: 0.55rem;
}
.cvh-stay-form .cvh-btn-payid {
  background: #1c2b2a;
}
.cvh-stay-form .cvh-btn-card {
  background: #6b5428;
}
.cvh-stay-form .cvh-btn-enquire {
  background: transparent;
  color: #6b5428 !important;
  border: 1px solid #d4c4b0;
}
.cvh-stay-payid {
  border: 1px solid #e8dfd3;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  background: #faf7f2;
  font-size: 0.9rem;
  color: #1c2b2a;
}
.cvh-stay-payid p {
  margin: 0 0 0.45rem;
}
.cvh-stay-payid p:last-child {
  margin-bottom: 0;
}
.cvh-stay-circle-cta {
  margin: 0.85rem 0 0;
  padding: 0.9rem 1rem;
  border: 1px solid #e8dfd3;
  border-radius: 12px;
  background: #f5f2ef;
  color: #1c2b2a;
  font-size: 0.9rem;
}
.cvh-stay-circle-cta p {
  margin: 0 0 0.4rem;
  line-height: 1.45;
}
.cvh-stay-circle-cta a.cvh-btn-enquire {
  display: inline-block;
  margin-top: 0.55rem;
  text-decoration: none;
}
.cvh-stay-error {
  color: #b91c1c;
  font-size: 0.85rem;
  margin: 0;
}
.cvh-stay-success {
  color: #166534;
  font-size: 0.85rem;
  margin: 0;
}
.cvh-stay-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin: 0;
  font-size: 0.85rem;
}
.cvh-stay-links a {
  color: #6b5428;
  font-weight: 600;
}
.cvh-stay-return {
  display: flex;
  justify-content: center;
  padding: 1.5rem 1.25rem 2.75rem;
  background: #f5f2ef;
}
.cvh-stay-return-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  padding: 0.75rem 1.6rem;
  border-radius: 999px;
  background: #b9a48a;
  color: #ffffff !important;
  font-family: Georgia, "Iowan Old Style", Palatino, serif;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s ease, transform 0.2s ease;
}
.cvh-stay-return-btn:hover {
  background: #a89278;
  color: #ffffff !important;
  transform: translateY(-1px);
}

/* HTML unit detail pages (domes / shed stubs) */
.wb-html-page .cvh-unit-return,
.wb-root .wb-html-island .cvh-unit-return {
  display: flex;
  justify-content: center;
  padding: 1.75rem 1.25rem 2.5rem;
}
.wb-html-page .cvh-unit-return-btn,
.wb-root .wb-html-island .cvh-unit-return-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  padding: 0.75rem 1.6rem;
  border-radius: 999px;
  background: #b9a48a !important;
  color: #ffffff !important;
  font-family: Georgia, "Iowan Old Style", Palatino, serif;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none !important;
}
.wb-html-page .cvh-unit-return-btn:hover,
.wb-root .wb-html-island .cvh-unit-return-btn:hover {
  background: #a89278 !important;
  color: #ffffff !important;
}

@media (max-width: 900px) {
  .cvh-stay-layout {
    grid-template-columns: 1fr;
  }
}

/* CVH Hideaway Circle join page — cream/charcoal site language (no floating card) */
.wb-root .cvh-circle-page {
  background: #f5f2ef !important;
  color: #2c241c !important;
  font-family: Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif;
}
.wb-root .cvh-circle-page__hero {
  max-width: 40rem;
  margin: 0 auto;
  padding: 3.25rem 1.25rem 1.75rem;
  text-align: center;
}
.wb-root .cvh-circle-page__eyebrow {
  margin: 0 0 0.65rem !important;
  font-size: 0.72rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.16em !important;
  text-transform: uppercase !important;
  color: #6b5c4c !important;
  font-family: "Segoe UI", system-ui, sans-serif !important;
}
.wb-root .cvh-circle-page__title {
  margin: 0 0 0.85rem !important;
  font-size: clamp(1.65rem, 3.2vw, 2.35rem) !important;
  font-weight: 500 !important;
  line-height: 1.2 !important;
  color: #2c241c !important;
}
.wb-root .cvh-circle-page__lead {
  margin: 0 auto 1rem !important;
  max-width: 34rem;
  font-size: 1.02rem !important;
  line-height: 1.6 !important;
  color: #5c4f42 !important;
}
.wb-root .cvh-circle-page__lead--tight {
  margin-bottom: 0 !important;
}
.wb-root .cvh-circle-page__form-wrap {
  max-width: 36rem;
  margin: 0 auto;
  padding: 0 1.25rem 4rem;
}
.wb-root .cvh-circle-page__form {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(107, 92, 76, 0.14);
}
.wb-root .cvh-circle-page__section {
  margin: 1.5rem 0 0.75rem !important;
  font-size: 0.78rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: #6b5c4c !important;
  font-family: "Segoe UI", system-ui, sans-serif !important;
}
.wb-root .cvh-circle-page__label {
  display: block;
  margin: 0 0 0.35rem !important;
  font-size: 0.9rem !important;
  color: #5c4f42 !important;
  font-family: "Segoe UI", system-ui, sans-serif !important;
}
.wb-root .cvh-circle-page__optional {
  font-weight: 400;
  font-size: 0.75rem;
  color: #9a8b7a;
  text-transform: none;
  letter-spacing: 0;
}
.wb-root .cvh-circle-page__field {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0.85rem;
  padding: 0.75rem 0.9rem;
  border-radius: 0;
  border: 1px solid rgba(107, 92, 76, 0.28);
  background: #faf7f2 !important;
  color: #2c241c !important;
  font-size: 1rem;
  font-family: inherit;
}
.wb-root .cvh-circle-page__row {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 560px) {
  .wb-root .cvh-circle-page__row {
    grid-template-columns: 1fr;
  }
}
.wb-root .cvh-circle-page__checks {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}
.wb-root .cvh-circle-page__check {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.95rem;
  color: #3d342b !important;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.wb-root .cvh-circle-page__btn {
  display: inline-block;
  margin-top: 1.35rem;
  padding: 0.9rem 1.5rem;
  border-radius: 0;
  border: none;
  background: #3d342b !important;
  color: #faf7f2 !important;
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.wb-root .cvh-circle-page__btn:disabled {
  opacity: 0.7;
  cursor: wait;
}
.wb-root .cvh-circle-page__fine {
  margin: 0.9rem 0 0 !important;
  font-size: 0.8rem !important;
  line-height: 1.45 !important;
  color: #7a6b5c !important;
  font-family: "Segoe UI", system-ui, sans-serif !important;
}
.wb-root .cvh-circle-page__status {
  margin: 0.75rem 0 0 !important;
  font-size: 0.9rem !important;
  color: #3f6212 !important;
  font-family: "Segoe UI", system-ui, sans-serif !important;
}
.wb-root .cvh-circle-page__status--error {
  color: #9a3412 !important;
}
.wb-root .cvh-circle-page__hp {
  position: absolute;
  left: -9999px;
  opacity: 0;
  height: 0;
}

/*
 * Roe Realty contrast locks — beat cream-island ink / nested-band bleed
 * (multi-document HTML islands can nest sections after browser repair).
 */
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .lead-content,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .report-benefits {
  color: #f4f1ea !important;
}

.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .lead-headline,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .benefits-title,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .benefits-title span,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section h2 {
  color: #ffffff !important;
}

.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .lead-label {
  color: #c9a46c !important;
}

.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .lead-description,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .benefits-list,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .benefits-list li,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .benefits-list li span,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .badge-item,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .report-badge,
.wb-root .wb-html-island.wb-html-island--light section.lead-magnet-section .report-badge span {
  color: #ffffff !important;
}

.wb-root .wb-html-island.wb-html-island--light section.final-cta,
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section,
.wb-root .wb-html-island.wb-html-island--light section.final-cta .cta-container,
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section .cta-container {
  color: #f4f1ea !important;
}

.wb-root .wb-html-island.wb-html-island--light section.final-cta .cta-label,
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section .cta-label {
  color: #c9a46c !important;
}

.wb-root .wb-html-island.wb-html-island--light section.final-cta .cta-headline,
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section .cta-headline,
.wb-root .wb-html-island.wb-html-island--light section.final-cta h2,
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section h2 {
  color: #faf8f4 !important;
}

.wb-root .wb-html-island.wb-html-island--light section.final-cta .cta-description,
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section .cta-description,
.wb-root .wb-html-island.wb-html-island--light section.final-cta .direct-cta,
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section .direct-cta,
.wb-root .wb-html-island.wb-html-island--light section.final-cta .trust-badge,
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section .trust-badge,
.wb-root .wb-html-island.wb-html-island--light section.final-cta p,
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section p,
.wb-root .wb-html-island.wb-html-island--light section.final-cta span:not([class*="btn"]):not([class*="badge"]):not([class*="tag"]):not([class*="sold"]):not([class*="status"]),
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section span:not([class*="btn"]):not([class*="badge"]):not([class*="tag"]):not([class*="sold"]):not([class*="status"]) {
  color: #e8e4dc !important;
}

.wb-root .wb-html-island.wb-html-island--light section.final-cta .trust-badge i,
.wb-root .wb-html-island.wb-html-island--light section.final-cta-section .trust-badge i {
  color: #c9a46c !important;
}

/* Roe Realty contact — WP card form (centred, cream fields, gold pill CTA) */
.wb-root.wb-html-page .wb-section:has(> .wb-form),
.wb-root.wb-html-page .wb-section:has(.wb-form),
.wb-root.wb-html-page.wb-surface-light .wb-section:has(> .wb-form),
.wb-root.wb-html-page.wb-surface-light .wb-section:has(.wb-form) {
  display: flex !important;
  justify-content: center !important;
  padding: 2.5rem clamp(1rem, 3vw, 2rem) 4rem !important;
  background: #f5f2ef !important;
  max-width: none !important;
}

.wb-root .wb-form.wb-form--roe,
.wb-root.wb-html-page .wb-section .wb-form,
.wb-root.wb-html-page.wb-surface-light .wb-section .wb-form {
  width: 100% !important;
  max-width: 640px !important;
  margin: 0 auto !important;
  background: #ffffff !important;
  border: 1px solid #e0d6cc !important;
  border-radius: 24px !important;
  padding: 2.5rem !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04) !important;
  color: #1c2b2a !important;
  gap: 0 !important;
}

.wb-root .wb-form.wb-form--roe .wb-section-title,
.wb-root.wb-html-page .wb-section .wb-form .wb-section-title {
  text-align: center !important;
  color: #1c2b2a !important;
  font-family: "Sora", "Plus Jakarta Sans", system-ui, sans-serif !important;
  font-size: 1.8rem !important;
  font-weight: 700 !important;
  letter-spacing: -0.02em !important;
  margin: 0 0 0.5rem !important;
}

.wb-root .wb-form.wb-form--roe .wb-form-sub {
  text-align: center !important;
  color: #4a5b59 !important;
  font-size: 1rem !important;
  line-height: 1.6 !important;
  max-width: 500px !important;
  margin: 0 auto 2rem !important;
}

.wb-root .wb-form.wb-form--roe .wb-form-row {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 1.25rem !important;
}

.wb-root .wb-form.wb-form--roe label,
.wb-root.wb-html-page .wb-section .wb-form label {
  display: grid !important;
  gap: 0.4rem !important;
  color: #1c2b2a !important;
  font-family: "Plus Jakarta Sans", "Inter", system-ui, sans-serif !important;
  font-size: 0.85rem !important;
  font-weight: 600 !important;
  margin-bottom: 1.25rem !important;
}

.wb-root .wb-form.wb-form--roe input,
.wb-root .wb-form.wb-form--roe textarea,
.wb-root.wb-html-page .wb-section .wb-form input,
.wb-root.wb-html-page .wb-section .wb-form textarea {
  width: 100% !important;
  box-sizing: border-box !important;
  background: #faf9f7 !important;
  border: 1.5px solid #e0d6cc !important;
  border-radius: 12px !important;
  color: #1c2b2a !important;
  padding: 12px 16px !important;
  font-family: Inter, system-ui, sans-serif !important;
  font-size: 0.95rem !important;
  font-weight: 400 !important;
}

.wb-root .wb-form.wb-form--roe input:focus,
.wb-root .wb-form.wb-form--roe textarea:focus,
.wb-root.wb-html-page .wb-section .wb-form input:focus,
.wb-root.wb-html-page .wb-section .wb-form textarea:focus {
  border-color: #c9a46c !important;
  box-shadow: 0 0 0 3px rgba(201, 164, 108, 0.15) !important;
  outline: none !important;
  background: #ffffff !important;
}

.wb-root .wb-form.wb-form--roe input::placeholder,
.wb-root .wb-form.wb-form--roe textarea::placeholder {
  color: #a8b5b3 !important;
}

.wb-root .wb-form.wb-form--roe button,
.wb-root.wb-html-page .wb-section .wb-form button {
  width: 100% !important;
  justify-self: stretch !important;
  margin-top: 0.25rem !important;
  background: #c9a46c !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 999px !important;
  font-family: "Sora", "Plus Jakarta Sans", system-ui, sans-serif !important;
  font-weight: 600 !important;
  font-size: 1rem !important;
  padding: 16px 32px !important;
  cursor: pointer !important;
  transition: background 0.2s ease, transform 0.2s ease !important;
}

.wb-root .wb-form.wb-form--roe button:hover,
.wb-root.wb-html-page .wb-section .wb-form button:hover {
  background: #b8935a !important;
  transform: translateY(-2px);
}

.wb-root .wb-form-success--roe,
.wb-root.wb-html-page .wb-section .wb-form-success {
  max-width: 640px !important;
  margin: 0 auto !important;
  text-align: center !important;
  background: #e8f5e9 !important;
  color: #2e7d32 !important;
  border-radius: 12px !important;
  padding: 16px 20px !important;
}

@media (max-width: 640px) {
  .wb-root .wb-form.wb-form--roe {
    padding: 1.5rem !important;
    border-radius: 16px !important;
  }
  .wb-root .wb-form.wb-form--roe .wb-form-row {
    grid-template-columns: 1fr !important;
    gap: 0 !important;
  }
  .wb-root .wb-form.wb-form--roe .wb-section-title {
    font-size: 1.4rem !important;
  }
}

/* CVH home — Hideaway Circle CTA matches site final-cta language */
.wb-root .cvh-circle-home-cta {
  padding: 100px 1.25rem !important;
  background: linear-gradient(135deg, #f7f4ee 0%, #ede8e0 100%) !important;
  border-top: 1px solid #e0d6cc !important;
  border-bottom: 1px solid #e0d6cc !important;
  text-align: center;
  color: #2f2f2f !important;
}

.wb-root .cvh-circle-home-cta__inner {
  max-width: 800px;
  margin: 0 auto;
}

.wb-root .cvh-circle-home-cta__badge {
  display: inline-block !important;
  margin: 0 0 1rem !important;
  padding: 0.35rem 0.85rem !important;
  border-radius: 999px !important;
  background: rgba(185, 164, 138, 0.18) !important;
  color: #8a7358 !important;
  font-family: "Segoe UI", system-ui, sans-serif !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase !important;
}

.wb-root .cvh-circle-home-cta__headline {
  margin: 0 0 1rem !important;
  font-family: "Cormorant Garamond", Georgia, "Times New Roman", serif !important;
  font-size: clamp(1.8rem, 3.5vw, 2.5rem) !important;
  font-weight: 600 !important;
  line-height: 1.2 !important;
  letter-spacing: -0.02em !important;
  color: #2f2f2f !important;
}

.wb-root .cvh-circle-home-cta__copy {
  margin: 0 auto 2rem !important;
  max-width: 550px;
  font-family: "Segoe UI", system-ui, sans-serif !important;
  font-size: 1rem !important;
  line-height: 1.6 !important;
  color: #4a5b59 !important;
}

.wb-root .cvh-circle-home-cta__btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 1rem 2rem !important;
  border-radius: 56px !important;
  background: #b9a48a !important;
  color: #ffffff !important;
  font-family: "Segoe UI", system-ui, sans-serif !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  text-decoration: none !important;
  transition: background 0.25s ease, transform 0.25s ease, gap 0.2s ease;
}

.wb-root .cvh-circle-home-cta__btn:hover {
  background: #a89377 !important;
  color: #ffffff !important;
  transform: translateY(-2px);
  gap: 16px !important;
}

@media (max-width: 768px) {
  .wb-root .cvh-circle-home-cta {
    padding: 60px 1.25rem !important;
  }
  .wb-root .cvh-circle-home-cta__headline {
    font-size: 1.8rem !important;
  }
  .wb-root .cvh-circle-home-cta__copy {
    font-size: 0.9rem !important;
  }
}
`;
