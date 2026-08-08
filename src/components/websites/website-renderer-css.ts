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
  min-height: 100vh;
  background:
    radial-gradient(ellipse 90% 60% at 100% -10%, color-mix(in srgb, var(--wb-primary) 22%, transparent), transparent 55%),
    radial-gradient(ellipse 70% 50% at 0% 100%, color-mix(in srgb, var(--wb-accent) 14%, transparent), transparent 50%),
    var(--wb-paper);
  color: var(--wb-ink);
  font-family: "Source Sans 3", "Segoe UI", sans-serif;
}

.wb-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.25rem clamp(1.25rem, 4vw, 3rem);
  border-bottom: 1px solid color-mix(in srgb, var(--wb-primary) 18%, transparent);
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
  gap: 1rem 1.25rem;
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
  padding: clamp(3rem, 10vw, 6.5rem) clamp(1.25rem, 4vw, 3rem);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--wb-primary) 92%, #000) 0%, color-mix(in srgb, var(--wb-bg) 80%, var(--wb-primary)) 100%);
  color: #f8fafc;
}

.wb-hero-inner {
  max-width: 42rem;
}

.wb-hero h1 {
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(2.4rem, 6vw, 4rem);
  line-height: 1.05;
  margin: 0 0 1rem;
  font-weight: 700;
}

.wb-hero p {
  font-size: 1.15rem;
  line-height: 1.55;
  opacity: 0.9;
  margin: 0 0 1.75rem;
  max-width: 36rem;
}

.wb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.8rem 1.4rem;
  border-radius: 0.35rem;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  transition: transform 180ms ease, opacity 180ms ease;
}

.wb-btn:hover {
  transform: translateY(-1px);
  opacity: 0.95;
}

.wb-btn-light {
  background: #fff !important;
  color: var(--wb-ink) !important;
}

.wb-trust {
  padding: 1.25rem clamp(1.25rem, 4vw, 3rem);
  border-bottom: 1px solid color-mix(in srgb, var(--wb-primary) 12%, transparent);
}

.wb-trust ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.75rem;
  color: var(--wb-muted);
  font-weight: 600;
  font-size: 0.95rem;
}

.wb-section {
  padding: clamp(2.5rem, 6vw, 4rem) clamp(1.25rem, 4vw, 3rem);
  max-width: 72rem;
  margin: 0 auto;
}

.wb-section-title {
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  margin: 0 0 1.5rem;
}

.wb-services {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1.5rem;
}

.wb-service h3 {
  font-family: "Fraunces", Georgia, serif;
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.wb-service p {
  margin: 0;
  color: var(--wb-muted);
  line-height: 1.5;
}

.wb-about p {
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 40rem;
  color: var(--wb-muted);
}

.wb-cta {
  margin: 2rem clamp(1.25rem, 4vw, 3rem);
  padding: clamp(2rem, 5vw, 3rem);
  border-radius: 0.5rem;
  color: #fff;
  text-align: center;
}

.wb-cta h2 {
  font-family: "Fraunces", Georgia, serif;
  margin: 0 0 0.75rem;
  font-size: clamp(1.5rem, 3vw, 2rem);
}

.wb-cta p {
  margin: 0 0 1.25rem;
  opacity: 0.9;
}

.wb-testimonials {
  display: grid;
  gap: 1.25rem;
}

.wb-testimonials blockquote {
  margin: 0;
  padding: 1.25rem 0;
  border-top: 1px solid color-mix(in srgb, var(--wb-primary) 15%, transparent);
}

.wb-testimonials cite {
  color: var(--wb-muted);
  font-style: normal;
  font-size: 0.9rem;
}

.wb-faq dt {
  font-weight: 700;
  margin-top: 1rem;
}

.wb-faq dd {
  margin: 0.35rem 0 0;
  color: var(--wb-muted);
}

.wb-form {
  display: grid;
  gap: 0.85rem;
  max-width: 28rem;
}

.wb-form label {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.wb-form input,
.wb-form textarea {
  border: 1px solid color-mix(in srgb, var(--wb-primary) 25%, #cbd5e1);
  border-radius: 0.35rem;
  padding: 0.65rem 0.75rem;
  font: inherit;
  background: #fff;
}

.wb-form button {
  justify-self: start;
  padding: 0.75rem 1.25rem;
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
}

.wb-footer {
  padding: 2rem clamp(1.25rem, 4vw, 3rem) 2.5rem;
  border-top: 1px solid color-mix(in srgb, var(--wb-primary) 14%, transparent);
  color: var(--wb-muted);
  font-size: 0.95rem;
}

.wb-footer-meta {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
}

@media (max-width: 640px) {
  .wb-nav {
    flex-direction: column;
    align-items: flex-start;
  }
}
`;
