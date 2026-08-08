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
