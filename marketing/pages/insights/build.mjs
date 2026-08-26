#!/usr/bin/env node
/**
 * Build migrated Insight articles (Gen 2 HTML) from insights/articles.mjs
 * Run: node build.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MIGRATED_ARTICLES, SITE } from "./articles.mjs";
import {
  EDITORIAL_CSS,
  articleMeta,
  authorBlock,
  definitionBlock,
  exploreBlock,
  faqBlock,
  faqJsonLd,
  relatedBlock,
} from "./partials.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "html");

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const ARTICLE_CSS = `
.dg-article * { margin: 0; padding: 0; box-sizing: border-box; }
.dg-article {
  font-family: Inter, system-ui, sans-serif;
  background: #0A0E17;
  color: #F9FAFB;
  line-height: 1.75;
}
.dg-article a { color: #93C5FD; text-decoration: none; }
.dg-article a:hover { color: #BFDBFE; }
.dg-article .container { max-width: 720px; margin: 0 auto; padding: 0 2rem; }
.dg-article h1, .dg-article h2, .dg-article h3 {
  font-family: Sora, Inter, sans-serif;
  color: #F9FAFB;
}
.dg-article section { padding: 3.5rem 0; border-top: 1px solid #1E293B; }
.dg-article section.alt { background: #111827; }
.dg-article .hero {
  padding: 7rem 0 3.5rem;
  background: linear-gradient(180deg, #05070A 0%, #0A0E17 100%);
  border-top: none;
}
.dg-article .crumbs { font-size: 0.82rem; color: #64748B; margin-bottom: 1rem; }
.dg-article .kicker {
  display: inline-block; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.12em;
  text-transform: uppercase; color: #93C5FD; margin-bottom: 0.75rem;
}
.dg-article h1 {
  font-size: clamp(1.85rem, 4vw, 2.65rem); font-weight: 800; line-height: 1.12;
  letter-spacing: -0.03em; margin-bottom: 0.85rem;
}
.dg-article .subtitle { color: #94A3B8; font-size: 1.05rem; max-width: 38rem; line-height: 1.6; }
.dg-article .takeaway {
  margin-top: 1.5rem; padding: 1.15rem 1.25rem; border-radius: 14px;
  border: 1px solid rgba(59,130,246,0.35); background: rgba(59,130,246,0.08);
}
.dg-article .takeaway .k { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #93C5FD; }
.dg-article .takeaway p { color: #E2E8F0; font-weight: 600; font-size: 0.98rem; line-height: 1.55; margin-top: 0.35rem; }
.dg-article .prose p { color: #94A3B8; margin-bottom: 1.1rem; font-size: 1.02rem; }
.dg-article .prose p.lead { color: #CBD5E1; font-size: 1.1rem; line-height: 1.65; }
.dg-article .prose h2 {
  font-size: clamp(1.25rem, 2.5vw, 1.55rem); font-weight: 800;
  margin: 0 0 0.85rem; line-height: 1.25;
}
.dg-article .prose h3 {
  font-size: 0.92rem; font-weight: 800; margin: 1.5rem 0 0.5rem;
  color: #93C5FD; letter-spacing: 0.04em; text-transform: uppercase;
}
.dg-article .prose ul { list-style: none; margin: 0 0 1.15rem; }
.dg-article .prose ul li {
  position: relative; padding: 0.3rem 0 0.3rem 1.2rem; color: #94A3B8; font-size: 0.98rem;
}
.dg-article .prose ul li::before {
  content: ""; position: absolute; left: 0; top: 0.75rem; width: 6px; height: 6px;
  border-radius: 999px; background: #3B82F6;
}
.dg-article .pullquote {
  margin: 1.5rem 0; padding: 1.15rem 1.25rem; border-left: 3px solid #3B82F6;
  background: rgba(59,130,246,0.06); border-radius: 0 12px 12px 0;
}
.dg-article .pullquote p { color: #E2E8F0 !important; font-weight: 600; font-size: 1.02rem; margin: 0 !important; }
.dg-article .pullquote cite { display: block; font-size: 0.78rem; color: #64748B; margin-top: 0.5rem; font-style: normal; }
.dg-article .compare {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 1.25rem 0;
}
.dg-article .compare-card {
  padding: 1rem 1.1rem; border-radius: 12px; border: 1px solid #334155; background: #111827;
}
.dg-article .compare-card h4 { font-size: 0.82rem; font-weight: 800; color: #93C5FD; margin-bottom: 0.5rem; }
.dg-article .compare-card ul { list-style: none; }
.dg-article .compare-card li { font-size: 0.86rem; color: #94A3B8; padding: 0.2rem 0; }
.dg-article .back { font-size: 0.88rem; font-weight: 600; color: #64748B; }
.dg-article .back:hover { color: #93C5FD; }
@media (max-width: 640px) {
  .dg-article .hero { padding-top: 6rem; }
  .dg-article .compare { grid-template-columns: 1fr; }
}
${EDITORIAL_CSS}
`;

function renderSection(s) {
  switch (s.type) {
    case "lead":
      return `<p class="lead">${s.text}</p>`;
    case "h2":
      return `<h2>${esc(s.text)}</h2>`;
    case "h3":
      return `<h3>${esc(s.text)}</h3>`;
    case "p":
      return `<p>${s.text}</p>`;
    case "ul":
      return `<ul>${s.items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
    case "pullquote":
      return `<blockquote class="pullquote"><p>${esc(s.text)}</p>${s.cite ? `<cite>— ${esc(s.cite)}</cite>` : ""}</blockquote>`;
    case "compare":
      return `<div class="compare">
        <div class="compare-card"><h4>${esc(s.left.title)}</h4><ul>${s.left.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>
        <div class="compare-card"><h4>${esc(s.right.title)}</h4><ul>${s.right.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>
      </div>`;
    default:
      return "";
  }
}

function buildArticle(A) {
  const canonical = `${SITE}/${A.slug}/`;
  const relatedIds = A.related || [];
  const body = A.sections.map(renderSection).join("\n");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: A.h1,
      description: A.metaDescription,
      author: { "@type": "Person", name: "Ben Roe" },
      publisher: { "@type": "Organization", name: "DigitalGate", url: SITE },
      datePublished: A.published,
      dateModified: A.updated || A.published,
      mainEntityOfPage: canonical,
    },
    ...(A.faq?.length >= 2
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: A.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]
      : []),
  ];

  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(A.seoTitle)}</title>
<meta name="description" content="${esc(A.metaDescription)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(A.seoTitle)}">
<meta property="og:description" content="${esc(A.metaDescription)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:type" content="article">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&amp;family=Inter:wght@400;600;700;800&amp;display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&amp;family=Inter:wght@400;600;700;800&amp;display=swap"></noscript>
<style>${ARTICLE_CSS}</style>
${jsonLd.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n")}
<div class="dg-article" data-dg-motion-root>
  <section class="hero">
    <div class="container">
      <p class="crumbs"><a href="${SITE}/">DigitalGate</a> · <a href="/insights/">Insights</a> · ${esc(A.category)}</p>
      <span class="kicker">${esc(A.category)}</span>
      <h1>${esc(A.h1)}</h1>
      <p class="subtitle">${esc(A.subtitle)}</p>
      ${articleMeta({ published: A.published, updated: A.updated, readMinutes: A.readMinutes })}
      ${A.keyTakeaway ? `<aside class="takeaway"><p class="k">Key takeaway</p><p>${esc(A.keyTakeaway)}</p></aside>` : ""}
    </div>
  </section>

  <section>
    <div class="container prose">
      ${A.definition ? definitionBlock(A.definition) : ""}
      ${body}
    </div>
  </section>

  ${A.faq?.length ? `<section class="alt"><div class="container prose"><h2>Common questions</h2>${faqBlock(A.faq)}</div></section>` : ""}

  <section class="alt">
    <div class="container">
      ${A.explore ? exploreBlock(A.explore) : ""}
      ${authorBlock()}
      ${relatedBlock(relatedIds)}
      <p style="margin-top:1.5rem;"><a class="back" href="/insights/">← Back to Insights</a></p>
    </div>
  </section>
</div>
`;
}

mkdirSync(OUT, { recursive: true });
for (const A of MIGRATED_ARTICLES) {
  writeFileSync(join(OUT, `${A.slug}.html`), buildArticle(A));
}
console.log(`Wrote ${MIGRATED_ARTICLES.length} migrated Insight articles to ${OUT}`);
