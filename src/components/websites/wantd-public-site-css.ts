/** Scoped Wantd public-site skin — warm paper, one accent, editorial grotesk. */
export const wantdPublicSiteCss = `
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Syne:wght@700;800&display=swap");

.wb-root.wb-wantd .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.wb-root.wb-wantd {
  --wb-ink: #121212;
  --wb-muted: #6B6762;
  --wb-paper: #F7F5F1;
  --wb-surface: #FFFFFF;
  --wb-primary: #121212;
  --wb-accent: #C6F04A;
  --wb-line: #E8E4DC;
  --wantd-black: #121212;
  --wantd-charcoal: #1C1C1C;
  --wantd-cream: #F7F5F1;
  --wantd-antique: #FFFFFF;
  --wantd-tan: #6B6762;
  --wantd-gold: #C6F04A;
  --wantd-red: #C6F04A;
  --wantd-red-hover: #D4FF5C;
  --wantd-ink: #121212;
  --wantd-ink-muted: #6B6762;
  --wantd-border: #E8E4DC;
  --wantd-cta: #C6F04A;
  --wantd-cta-hover: #D4FF5C;
  --font-wantd-display: "Syne", "Outfit", system-ui, sans-serif;
  --font-wantd-sans: "Outfit", system-ui, sans-serif;
  background: var(--wb-paper);
  color: var(--wb-ink);
  font-family: var(--font-wantd-sans);
}

.wb-root.wb-wantd .wb-brand-chrome,
.wb-root.wb-wantd .wb-nav {
  display: none !important;
}

.wb-wantd-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.15rem;
  padding: 1.75rem 1.25rem 1.25rem;
  background: transparent;
  text-align: center;
}

.wb-wantd-header-brand {
  display: flex;
  justify-content: center;
  align-items: center;
}

.wb-wantd-header-logo,
.wb-wantd-header-brand .wb-wantd-wordmark {
  display: block;
  height: clamp(3.6rem, 11vw, 6.25rem);
  width: auto;
  max-width: min(28rem, 88vw);
}

.wb-wantd-header-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem 1.4rem;
}

.wb-wantd-header-nav a {
  color: #121212;
  font-size: 0.92rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  text-decoration: none;
}

.wb-wantd-header-nav a:hover,
.wb-wantd-header-nav a:focus-visible {
  color: #121212;
  text-decoration: underline;
  text-underline-offset: 0.28em;
}

.wb-root.wb-wantd .wb-hero {
  background: transparent;
  color: #121212;
  padding: clamp(2.5rem, 8vw, 6.5rem) 1.25rem 4.5rem;
  text-align: center;
  min-height: min(78vh, 46rem);
  display: flex;
  align-items: center;
}

.wb-root.wb-wantd .wb-hero::after {
  display: none;
}

.wb-root.wb-wantd .wb-hero-inner {
  margin: 0 auto;
  max-width: 44rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.wb-root.wb-wantd .wb-hero h1 {
  margin: 0;
  color: #121212;
  font-family: "Syne", "Outfit", system-ui, sans-serif;
  font-size: clamp(2.6rem, 8vw, 5.4rem);
  font-weight: 800;
  letter-spacing: -0.055em;
  line-height: 0.95;
  text-shadow: none;
}

.wb-root.wb-wantd .wb-hero p {
  max-width: 28rem;
  margin: 1.15rem auto 0;
  color: #6B6762;
  opacity: 1;
  font-size: 1.05rem;
  line-height: 1.5;
}

.wb-wantd-want {
  width: min(42rem, 100%);
  margin-top: 2rem;
}

.wb-wantd-want-shell {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.7rem;
  background: #fff;
  border: 1px solid #E8E4DC;
  border-radius: 1.35rem;
  box-shadow: 0 18px 50px rgba(18, 18, 18, 0.06);
}

.wb-wantd-want textarea {
  width: 100%;
  min-height: 5.5rem;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  color: #121212;
  font-family: inherit;
  font-size: 1.05rem;
  line-height: 1.45;
  padding: 0.85rem 0.95rem 0.35rem;
}

.wb-wantd-want textarea::placeholder {
  color: #9A958D;
}

.wb-wantd-want-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0 0.35rem 0.2rem 0.85rem;
}

.wb-wantd-want-hint {
  color: #6B6762;
  font-size: 0.8rem;
}

.wb-wantd-want button,
.wb-root.wb-wantd .wb-btn,
.wb-root.wb-wantd .wantd-btn-wanted {
  border: 0;
  border-radius: 999px;
  padding: 0.9rem 1.45rem;
  background: #C6F04A !important;
  color: #121212 !important;
  box-shadow: none;
  text-transform: none;
  letter-spacing: -0.02em;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.wb-wantd-want button:hover,
.wb-root.wb-wantd .wb-btn:hover,
.wb-root.wb-wantd .wantd-btn-wanted:hover {
  background: #D4FF5C !important;
  transform: none;
}

.wb-wantd-hero-secondary {
  margin-top: 1.25rem;
  color: #6B6762;
  font-size: 0.95rem;
}

.wb-wantd-hero-secondary a {
  color: #121212;
  font-weight: 600;
  text-underline-offset: 0.2em;
}

.wb-root.wb-wantd .wb-trust,
.wb-root.wb-wantd .wb-section,
.wb-root.wb-wantd .wb-cta,
.wb-root.wb-wantd .wb-about,
.wb-root.wb-wantd .wb-faq,
.wb-root.wb-wantd .wb-footer {
  text-align: center;
}

.wb-root.wb-wantd .wb-section-title,
.wb-root.wb-wantd .wb-cta h2,
.wb-root.wb-wantd .wb-about h2,
.wb-root.wb-wantd .wb-heading {
  font-family: "Syne", "Outfit", system-ui, sans-serif;
  letter-spacing: -0.04em;
}

.wb-root.wb-wantd .wb-trust ul,
.wb-root.wb-wantd .wb-services,
.wb-root.wb-wantd .wb-faq,
.wb-root.wb-wantd .wb-about,
.wb-root.wb-wantd .wb-cta > * {
  margin-left: auto;
  margin-right: auto;
}

.wb-root.wb-wantd .wb-trust ul {
  justify-content: center;
  gap: 1rem 1.75rem;
}

.wb-root.wb-wantd .wb-trust li {
  color: #6B6762;
}

.wb-root.wb-wantd .wb-services {
  justify-content: center;
}

.wb-root.wb-wantd .wb-service {
  text-align: left;
  background: #fff;
  border: 1px solid #E8E4DC;
  border-radius: 1.25rem;
  box-shadow: none;
}

.wb-root.wb-wantd .wb-service:hover {
  transform: none;
  border-color: #121212;
}

.wb-root.wb-wantd .wb-service h3 {
  color: #121212 !important;
}

.wb-root.wb-wantd .wb-about p {
  margin-left: auto;
  margin-right: auto;
  max-width: 38rem;
}

.wb-root.wb-wantd .wb-cta {
  background: #121212 !important;
  color: #F7F5F1;
  border-radius: 1.75rem;
  margin: 1.5rem auto 2rem;
  max-width: 48rem;
}

.wb-root.wb-wantd .wb-cta .wb-btn {
  display: inline-flex;
  background: #C6F04A !important;
  color: #121212 !important;
}

.wb-root.wb-wantd .wb-footer {
  display: none;
}

.wb-wantd-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  padding: 3.5rem 1.25rem 2.75rem;
  border-top: 1px solid #E8E4DC;
  margin-top: auto;
}

.wb-wantd-footer-icon,
.wb-wantd-footer-icon img,
.wb-wantd-footer-icon svg {
  display: block;
  width: 2.75rem;
  height: 2.75rem;
  margin: 0 auto;
  object-fit: contain;
}

.wb-wantd-footer-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem 1.15rem;
}

.wb-wantd-footer-nav a,
.wb-wantd-footer p,
.wb-wantd-footer a {
  color: #6B6762;
  font-size: 0.88rem;
  text-decoration: none;
}

.wb-wantd-footer-nav a:hover {
  color: #121212;
}

.wb-root.wb-wantd .wantd-input,
.wb-root.wb-wantd input,
.wb-root.wb-wantd textarea,
.wb-root.wb-wantd select {
  background: #fff;
  border: 1px solid #E8E4DC;
  color: #121212;
}

.wb-root.wb-wantd .wantd-card {
  background: #fff;
  border: 1px solid #E8E4DC;
}

@media (min-width: 720px) {
  .wb-wantd-want-shell {
    padding: 0.85rem 0.85rem 0.75rem;
  }
}
`;
