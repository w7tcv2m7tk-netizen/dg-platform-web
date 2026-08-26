/**
 * Shared HTML partials for DigitalGate Insight articles.
 * Import in build scripts or paste generated blocks into Gen 2 HTML SoT.
 */
import { AUTHOR, relatedInsights } from "./catalog.mjs";

export const EDITORIAL_CSS = `
.dg-ed-meta {
  display: flex; flex-wrap: wrap; gap: 0.65rem 1.25rem; align-items: center;
  font-size: 0.82rem; color: #64748B; margin: 1.25rem 0 0; padding-top: 1rem;
  border-top: 1px solid #1E293B;
}
.dg-ed-meta strong { color: #94A3B8; font-weight: 600; }
.dg-ed-author {
  display: grid; grid-template-columns: auto 1fr; gap: 0.85rem 1rem; align-items: start;
  margin: 2.5rem 0 0; padding: 1.25rem 1.35rem; border-radius: 16px;
  border: 1px solid #334155; background: #111827;
}
.dg-ed-author .avatar {
  width: 2.75rem; height: 2.75rem; border-radius: 999px;
  background: linear-gradient(135deg, rgba(59,130,246,0.35), rgba(16,185,129,0.2));
  display: grid; place-items: center; font-weight: 800; font-size: 0.75rem; color: #BFDBFE;
}
.dg-ed-author .name { font-weight: 800; color: #F9FAFB; font-size: 0.95rem; }
.dg-ed-author .role { font-size: 0.78rem; color: #93C5FD; margin-bottom: 0.35rem; }
.dg-ed-author .bio { font-size: 0.88rem; color: #94A3B8; line-height: 1.55; margin: 0; }
.dg-ed-def {
  margin: 1.75rem 0; padding: 1.25rem 1.35rem; border-radius: 14px;
  border: 1px solid rgba(59,130,246,0.35); background: rgba(59,130,246,0.06);
}
.dg-ed-def .k {
  font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  color: #93C5FD; margin-bottom: 0.35rem;
}
.dg-ed-def h3 { font-size: 1rem !important; font-weight: 800; margin: 0 0 0.5rem !important; color: #F9FAFB !important; }
.dg-ed-def p { font-size: 0.95rem; color: #CBD5E1; line-height: 1.6; margin: 0; }
.dg-ed-related { margin: 0; padding: 3rem 0; border-top: 1px solid #1E293B; }
.dg-ed-related h2 {
  font-size: 1.15rem; font-weight: 800; margin-bottom: 0.35rem; color: #F9FAFB;
}
.dg-ed-related .sub { font-size: 0.88rem; color: #64748B; margin-bottom: 1.1rem; }
.dg-ed-related-grid { display: grid; gap: 0.65rem; }
.dg-ed-related a {
  display: block; padding: 1rem 1.1rem; border-radius: 14px;
  border: 1px solid #334155; background: #0A0E17; text-decoration: none;
}
.dg-ed-related a:hover { border-color: #3B82F6; }
.dg-ed-related .k { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748B; }
.dg-ed-related .t { font-weight: 700; color: #E2E8F0; margin: 0.2rem 0 0.25rem; font-size: 0.95rem; }
.dg-ed-related .d { font-size: 0.84rem; color: #94A3B8; line-height: 1.45; margin: 0; }
.dg-ed-explore {
  margin-top: 1.5rem; padding: 1.15rem 1.25rem; border-radius: 14px;
  border: 1px solid rgba(16,185,129,0.25); background: rgba(16,185,129,0.06);
}
.dg-ed-explore .k {
  font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #6EE7B7;
}
.dg-ed-explore h3 { font-size: 0.98rem !important; font-weight: 800; margin: 0.35rem 0 !important; color: #F9FAFB !important; }
.dg-ed-explore p { font-size: 0.88rem; color: #94A3B8; margin: 0 0 0.65rem; line-height: 1.5; }
.dg-ed-explore a { font-size: 0.88rem; font-weight: 700; color: #93C5FD !important; }
.dg-ed-faq { margin: 1.5rem 0; }
.dg-ed-faq-item {
  border: 1px solid #334155; border-radius: 12px; padding: 1rem 1.15rem; margin-bottom: 0.6rem; background: #111827;
}
.dg-ed-faq-item h3 { font-size: 0.92rem !important; font-weight: 700; margin: 0 0 0.4rem !important; color: #E2E8F0 !important; }
.dg-ed-faq-item p { font-size: 0.88rem; color: #94A3B8; line-height: 1.55; margin: 0; }
`;

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function articleMeta({ published, updated, readMinutes }) {
  const parts = [];
  if (published) parts.push(`<span><strong>Published</strong> ${esc(published)}</span>`);
  if (updated && updated !== published) parts.push(`<span><strong>Updated</strong> ${esc(updated)}</span>`);
  if (readMinutes) parts.push(`<span><strong>Reading time</strong> ${readMinutes} min</span>`);
  return `<div class="dg-ed-meta">${parts.join("")}</div>`;
}

export function authorBlock() {
  const initials = AUTHOR.name
    .split(" ")
    .map((w) => w[0])
    .join("");
  return `<aside class="dg-ed-author" aria-label="Author">
  <div class="avatar" aria-hidden="true">${esc(initials)}</div>
  <div>
    <p class="name">${esc(AUTHOR.name)}</p>
    <p class="role">${esc(AUTHOR.role)}</p>
    <p class="bio">${esc(AUTHOR.bio)}</p>
  </div>
</aside>`;
}

export function definitionBlock({ term, body }) {
  return `<aside class="dg-ed-def" aria-label="Definition">
  <p class="k">Definition</p>
  <h3>${esc(term)}</h3>
  <p>${esc(body)}</p>
</aside>`;
}

export function relatedBlock(relatedIds, heading = "Continue exploring") {
  const items = relatedInsights(relatedIds);
  if (!items.length) return "";
  return `<section class="dg-ed-related" aria-label="Related insights">
  <h2>${esc(heading)}</h2>
  <p class="sub">Relevant reading — not just the latest posts.</p>
  <div class="dg-ed-related-grid">
    ${items
      .map(
        (i) =>
          `<a href="${esc(i.url)}"><span class="k">${esc(i.category || i.primaryTopic || "Insight")}</span><p class="t">${esc(i.title)}</p><p class="d">${esc(i.metaDescription || i.productBlurb || i.actionNotes || "")}</p></a>`,
      )
      .join("")}
  </div>
</section>`;
}

export function exploreBlock({ href, label, blurb }) {
  if (!href || !label) return "";
  return `<aside class="dg-ed-explore" aria-label="Explore DigitalGate">
  <p class="k">See this in action</p>
  <h3>${esc(label)}</h3>
  <p>${esc(blurb || "")}</p>
  <a href="${esc(href)}">Explore ${esc(label.replace(/^DigitalGate\s+/i, ""))} →</a>
</aside>`;
}

export function faqBlock(faqs) {
  if (!faqs?.length) return "";
  return `<div class="dg-ed-faq">
    ${faqs
      .map(
        (f) =>
          `<div class="dg-ed-faq-item"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`,
      )
      .join("")}
  </div>`;
}

export function faqJsonLd(faqs) {
  if (!faqs?.length || faqs.length < 2) return "";
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

export function articleFooter({ relatedIds, explore, faqs }) {
  return [
    explore ? exploreBlock(explore) : "",
    authorBlock(),
    faqs?.length ? `<section class="alt"><div class="container prose"><h2>Common questions</h2>${faqBlock(faqs)}</div></section>` : "",
    relatedBlock(relatedIds),
  ].join("\n");
}
