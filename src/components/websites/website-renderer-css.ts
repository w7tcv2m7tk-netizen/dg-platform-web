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

/**
 * Full imported marketing / Oxygen HTML pages.
 * body{} rules from source HTML do not apply inside Studio — use .wb-html-island
 * (rewritten at import) and a dark page shell so cream paper does not bleed through.
 */
.wb-root.wb-html-page {
  background: var(--wb-bg, #0a0e17);
  color: #f8fafc;
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
  background: var(--wb-bg, #0a0e17);
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

/* Transparent header over hero (Roe / CVH) — stays visible while scrolling */
.wb-root.wb-chrome-overlay {
  position: relative;
}

.wb-root.wb-chrome-overlay .wb-brand-chrome-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: transparent;
  border-bottom: none;
  box-shadow: none;
  backdrop-filter: none;
}

.wb-root.wb-chrome-overlay .wb-brand-chrome-header .wb-brand-chrome-nav a {
  color: #f8fafc;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

.wb-root.wb-chrome-overlay .wb-brand-chrome-header .wb-brand-chrome-logo {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
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
  gap: 1.25rem;
  flex-wrap: wrap;
  box-sizing: border-box;
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

.wb-brand-chrome-copy {
  margin: 0;
  color: #94a3b8;
  font-size: 0.82rem;
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
`;
