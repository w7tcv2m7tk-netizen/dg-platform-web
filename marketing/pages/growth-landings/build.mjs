#!/usr/bin/env node
/**
 * Build Growth SEO landing pages (/growth, /seo, …) from growth-landings/catalog.mjs
 * Run: node build.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GROWTH_HUB,
  GROWTH_LANDINGS,
  INSIGHT_LINKS,
  SITE,
  growthAppTiles,
} from "./catalog.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "html");

const FOUNDING = `${SITE}/founding-customers/`;
const CONTACT = `${SITE}/contact/#platform-consultation`;
const PRICING = `${SITE}/pricing/`;

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const CSS = `
.dg-growth * { margin: 0; padding: 0; box-sizing: border-box; }
.dg-growth {
  font-family: Inter, system-ui, sans-serif;
  background: #0A0E17;
  color: #F9FAFB;
  line-height: 1.65;
}
.dg-growth a { color: #93C5FD; text-decoration: none; }
.dg-growth a:hover { color: #BFDBFE; }
.dg-growth .wrap { max-width: 1080px; margin: 0 auto; padding: 0 2rem; }
.dg-growth h1, .dg-growth h2, .dg-growth h3 { color: #F9FAFB !important; font-family: Inter, system-ui, sans-serif; }
.dg-growth section { padding: 4rem 0; border-top: 1px solid #1E293B; }
.dg-growth section.alt { background: #111827; }
.dg-growth .sub {
  display: inline-block; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.12em;
  text-transform: uppercase; color: #93C5FD; margin-bottom: 0.65rem;
}
.dg-growth .hero {
  padding: 7rem 0 4rem;
  background: linear-gradient(180deg, #05070A 0%, #0A0E17 55%, #0A0E17 100%);
  border-top: none;
}
.dg-growth .crumbs { font-size: 0.82rem; color: #64748B; margin-bottom: 1rem; }
.dg-growth .badge-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
.dg-growth .badge {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 0.3rem 0.7rem; border-radius: 999px; border: 1px solid #334155; color: #CBD5E1;
}
.dg-growth .badge.growth { border-color: rgba(59,130,246,0.45); color: #BFDBFE; background: rgba(59,130,246,0.12); }
.dg-growth .badge.price { border-color: rgba(16,185,129,0.35); color: #99F6E4; }
.dg-growth h1 {
  font-size: clamp(1.9rem, 4vw, 2.85rem); font-weight: 800; line-height: 1.12;
  letter-spacing: -0.03em; margin-bottom: 1rem; max-width: 22ch;
}
.dg-growth .lead { color: #CBD5E1; font-size: 1.08rem; max-width: 720px; margin-bottom: 0.85rem; }
.dg-growth .positioning { color: #94A3B8; font-size: 0.98rem; max-width: 680px; }
.dg-growth .ctas { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.75rem; }
.dg-growth .btn {
  display: inline-flex; align-items: center; padding: 0.85rem 1.35rem;
  border-radius: 999px; font-weight: 700; font-size: 0.92rem;
}
.dg-growth .btn-primary { background: linear-gradient(105deg, #3B82F6, #2563EB); color: #fff !important; }
.dg-growth .btn-secondary { border: 1px solid #334155; color: #E2E8F0 !important; }
.dg-growth h2.section-title {
  font-size: clamp(1.3rem, 2.5vw, 1.65rem); font-weight: 800; margin-bottom: 0.85rem;
}
.dg-growth .body { color: #94A3B8; font-size: 1.02rem; max-width: 720px; margin-bottom: 1rem; }
.dg-growth .body strong { color: #E2E8F0; }
.dg-growth .bullets { list-style: none; max-width: 680px; }
.dg-growth .bullets li {
  position: relative; padding: 0.35rem 0 0.35rem 1.2rem; color: #94A3B8; font-size: 0.96rem;
}
.dg-growth .bullets li::before {
  content: ""; position: absolute; left: 0; top: 0.85rem; width: 6px; height: 6px;
  border-radius: 999px; background: #3B82F6;
}
.dg-growth .cap-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.85rem; margin-top: 1.25rem;
}
.dg-growth .cap-card {
  background: #0A0E17; border: 1px solid #334155; border-radius: 14px; padding: 1.15rem 1.2rem;
}
.dg-growth .cap-card h3 { font-size: 0.95rem; font-weight: 800; margin-bottom: 0.4rem; }
.dg-growth .cap-card p { font-size: 0.88rem; color: #94A3B8; line-height: 1.5; }
.dg-growth .flow {
  display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; margin-top: 1rem;
}
.dg-growth .flow span {
  background: #111827; border: 1px solid #334155; border-radius: 10px;
  padding: 0.5rem 0.75rem; font-size: 0.82rem; font-weight: 600; color: #CBD5E1;
}
.dg-growth .flow em { color: #3B82F6; font-style: normal; font-weight: 700; }
.dg-growth .workflow { list-style: none; max-width: 720px; margin-top: 1rem; }
.dg-growth .workflow li {
  display: grid; grid-template-columns: auto 1fr; gap: 0.85rem; align-items: start;
  padding: 0.75rem 0; border-bottom: 1px solid #1E293B; color: #CBD5E1; font-size: 0.94rem;
}
.dg-growth .workflow li:last-child { border-bottom: none; }
.dg-growth .workflow .n {
  width: 1.5rem; height: 1.5rem; border-radius: 999px; display: grid; place-items: center;
  font-size: 0.65rem; font-weight: 800; color: #BFDBFE;
  background: rgba(59,130,246,0.18); border: 1px solid rgba(59,130,246,0.35);
}
.dg-growth .faq-item {
  border: 1px solid #334155; border-radius: 12px; padding: 1rem 1.15rem; margin-bottom: 0.65rem;
  background: #111827;
}
.dg-growth .faq-item h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.45rem; color: #E2E8F0 !important; }
.dg-growth .faq-item p { font-size: 0.9rem; color: #94A3B8; line-height: 1.55; }
.dg-growth .link-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.65rem; margin-top: 1rem;
}
.dg-growth .link-grid a {
  display: block; padding: 0.85rem 1rem; border: 1px solid #334155; border-radius: 12px;
  background: #0A0E17; font-weight: 600; font-size: 0.88rem; color: #E2E8F0 !important;
}
.dg-growth .link-grid a:hover { border-color: #3B82F6; }
.dg-growth .insight-card {
  display: block; padding: 1rem 1.15rem; border: 1px solid rgba(59,130,246,0.3);
  border-radius: 14px; background: rgba(59,130,246,0.06); margin-bottom: 0.65rem;
}
.dg-growth .insight-card .k { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #93C5FD; }
.dg-growth .insight-card .t { font-weight: 700; color: #F9FAFB; margin-top: 0.25rem; }
.dg-growth .arch-band {
  text-align: center; padding: 1.25rem; border-radius: 14px;
  border: 1px solid rgba(59,130,246,0.25); background: rgba(59,130,246,0.08);
  font-size: 0.78rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #93C5FD;
}
.dg-growth .hub-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.85rem; margin-top: 1.5rem;
}
.dg-growth .hub-tile {
  display: block; padding: 1.15rem; border: 1px solid #334155; border-radius: 16px; background: #0A0E17;
}
.dg-growth .hub-tile:hover { border-color: #3B82F6; }
.dg-growth .hub-tile .meta { font-size: 0.72rem; color: #64748B; margin-bottom: 0.35rem; }
.dg-growth .hub-tile .name { font-weight: 800; font-size: 1rem; color: #F9FAFB; margin-bottom: 0.35rem; }
.dg-growth .hub-tile .blurb { font-size: 0.84rem; color: #94A3B8; line-height: 1.45; }
.dg-growth .cta-band { text-align: center; }
.dg-growth .cta-band h2 { font-size: 1.55rem; font-weight: 800; margin-bottom: 0.65rem; }
.dg-growth .cta-band p { color: #94A3B8; max-width: 620px; margin: 0 auto 1.35rem; }
@media (max-width: 720px) {
  .dg-growth .cap-grid { grid-template-columns: 1fr; }
  .dg-growth .hero { padding-top: 6.5rem; }
}
`;

function jsonLd(objects) {
  return objects
    .filter(Boolean)
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join("\n");
}

function shell({ title, description, canonical, keywords, jsonLdHtml, inner }) {
  const kw = keywords?.length
    ? `<meta name="keywords" content="${esc(keywords.join(", "))}">`
    : "";
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:type" content="website">
${kw}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap"></noscript>
<style>${CSS}</style>
${jsonLdHtml || ""}
<div class="dg-growth" data-dg-motion-root>
${inner}
</div>
`;
}

function ctas() {
  return `<div class="ctas">
    <a class="btn btn-primary" href="${FOUNDING}">Become a Founding Customer →</a>
    <a class="btn btn-secondary" href="${CONTACT}">Book a Platform Consultation</a>
    <a class="btn btn-secondary" href="${PRICING}#apps">View Apps &amp; pricing</a>
  </div>`;
}

function bullets(items) {
  if (!items?.length) return "";
  return `<ul class="bullets">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

function flow(steps) {
  return `<div class="flow">${steps
    .map((s, i) => `<span>${esc(s)}</span>${i < steps.length - 1 ? "<em>→</em>" : ""}`)
    .join("")}</div>`;
}

function landingPage(L) {
  const canonical = `${SITE}/${L.slug}/`;
  const jsonLdBlocks = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: L.seoTitle,
      description: L.metaDescription,
      url: canonical,
      isPartOf: { "@type": "WebSite", name: "DigitalGate", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: L.appName,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "AUD",
        description: L.pricing,
      },
      description: L.metaDescription,
    },
    L.faq?.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: L.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "DigitalGate", item: SITE },
        { "@type": "ListItem", position: 2, name: "Growth", item: `${SITE}/growth/` },
        { "@type": "ListItem", position: 3, name: L.appName, item: canonical },
      ],
    },
  ];

  const inner = `
  <section class="hero">
    <div class="wrap">
      <p class="crumbs"><a href="${SITE}/">DigitalGate</a> · <a href="/growth/">Growth</a> · ${esc(L.appName)}</p>
      <div class="badge-row">
        <span class="badge growth">Growth · ${esc(L.badge)}</span>
        <span class="badge price">${esc(L.pricing)}</span>
      </div>
      <h1>${esc(L.h1)}</h1>
      <p class="lead">${esc(L.heroLead)}</p>
      <p class="positioning">${esc(L.positioning)}</p>
      <p class="positioning" style="margin-top:0.65rem;font-size:0.88rem;">${esc(L.status)}</p>
      ${ctas()}
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <p class="sub">The problem</p>
      <h2 class="section-title">${esc(L.problem.title)}</h2>
      <p class="body">${esc(L.problem.body)}</p>
      ${bullets(L.problem.bullets)}
    </div>
  </section>

  <section>
    <div class="wrap">
      <p class="sub">DigitalGate approach</p>
      <h2 class="section-title">${esc(L.approach.title)}</h2>
      <p class="body">${esc(L.approach.body)}</p>
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <p class="sub">Key capabilities</p>
      <h2 class="section-title">What ${esc(L.appName)} delivers</h2>
      <div class="cap-grid">
        ${L.capabilities.map((c) => `<div class="cap-card"><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></div>`).join("")}
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <p class="sub">How it works</p>
      <h2 class="section-title">From signal to follow-through</h2>
      ${flow(L.howItWorks)}
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <p class="sub">Connected Business</p>
      <h2 class="section-title">${esc(L.connected.title)}</h2>
      <p class="body">${esc(L.connected.body)}</p>
      ${bullets(L.connected.bullets)}
      <p class="arch-band" style="margin-top:1.5rem;">Core → Industry → Growth → Intelligence</p>
    </div>
  </section>

  ${
    L.intelligence
      ? `<section>
    <div class="wrap">
      <p class="sub">Intelligence</p>
      <h2 class="section-title">${esc(L.intelligence.title)}</h2>
      <p class="body">${esc(L.intelligence.body)}</p>
      <p class="body"><a href="/business-brain/">Business Brain™ →</a> · <a href="/from-dumb-businesses-to-smart-businesses/">Connected Business philosophy →</a></p>
    </div>
  </section>`
      : ""
  }

  <section class="${L.intelligence ? "alt" : ""}">
    <div class="wrap">
      <p class="sub">Example workflow</p>
      <h2 class="section-title">${esc(L.workflow.title)}</h2>
      <ol class="workflow">${L.workflow.steps
        .map((s, i) => `<li><span class="n">${i + 1}</span><span>${esc(s)}</span></li>`)
        .join("")}</ol>
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <p class="sub">Audience</p>
      <h2 class="section-title">${esc(L.audience.title)}</h2>
      ${bullets(L.audience.bullets)}
    </div>
  </section>

  <section>
    <div class="wrap">
      <p class="sub">FAQ</p>
      <h2 class="section-title">Common questions</h2>
      ${L.faq.map((f) => `<div class="faq-item"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join("")}
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <p class="sub">Thought leadership</p>
      <h2 class="section-title">Understand the platform philosophy</h2>
      ${INSIGHT_LINKS.map(
        (i) =>
          `<a class="insight-card" href="${esc(i.href)}"><span class="k">${esc(i.kicker)}</span><div class="t">${esc(i.label)} →</div></a>`,
      ).join("")}
    </div>
  </section>

  <section>
    <div class="wrap">
      <p class="sub">Related</p>
      <h2 class="section-title">Connected capabilities</h2>
      <div class="link-grid">${L.related
        .map((r) => `<a href="${esc(r.href)}">${esc(r.label)}</a>`)
        .join("")}</div>
    </div>
  </section>

  <section class="alt cta-band">
    <div class="wrap">
      <h2>Run ${esc(L.appName)} on DigitalGate</h2>
      <p>Growth capabilities work alongside Core, Industry and Intelligence — not as isolated tools. ${esc(L.pricing)}</p>
      ${ctas()}
    </div>
  </section>`;

  return shell({
    title: L.seoTitle,
    description: L.metaDescription,
    canonical,
    keywords: L.keywords,
    jsonLdHtml: jsonLd(jsonLdBlocks),
    inner,
  });
}

function hubPage() {
  const canonical = `${SITE}/growth/`;
  const tiles = growthAppTiles();
  const inner = `
  <section class="hero">
    <div class="wrap">
      <p class="crumbs"><a href="${SITE}/">DigitalGate</a> · Growth</p>
      <span class="badge growth">Growth layer</span>
      <h1>${esc(GROWTH_HUB.h1)}</h1>
      <p class="lead">${esc(GROWTH_HUB.lead)}</p>
      <p class="arch-band" style="margin-top:1.25rem;text-align:left;">Core → Industry → Growth → Intelligence</p>
      ${ctas()}
    </div>
  </section>

  <section class="alt">
    <div class="wrap">
      <p class="sub">Growth Apps</p>
      <h2 class="section-title">Connected capabilities — not unrelated SaaS products</h2>
      <p class="body">Each capability below has a dedicated landing page with search-intent structure, honest status from the Apps catalog, and links into Core and Intelligence.</p>
      <div class="hub-grid">
        ${tiles
          .map(
            (t) =>
              `<a class="hub-tile" href="${esc(t.href)}"><div class="meta">${esc(t.badge)}</div><div class="name">${esc(t.name)}</div><div class="blurb">${esc(t.headline)}</div></a>`,
          )
          .join("")}
      </div>
      <p class="body" style="margin-top:1.5rem;"><a href="/apps/growth/">Technical App pages →</a> · <a href="${PRICING}#apps">Pricing →</a> · <a href="/apps/">Full Apps hub →</a></p>
    </div>
  </section>

  <section>
    <div class="wrap">
      <p class="sub">Philosophy</p>
      <h2 class="section-title">SEO is one part of the Growth layer</h2>
      <p class="body">DigitalGate does not add more software for its own sake. It connects the systems a business already depends on — then adds intelligence and action. Growth Apps improve visibility, discovery, measurement and follow-through on that connected foundation.</p>
      ${INSIGHT_LINKS.map(
        (i) =>
          `<a class="insight-card" href="${esc(i.href)}"><span class="k">${esc(i.kicker)}</span><div class="t">${esc(i.label)} →</div></a>`,
      ).join("")}
    </div>
  </section>

  <section class="alt cta-band">
    <div class="wrap">
      <h2>Start with the platform. Add Growth as you need it.</h2>
      <p>Commercial terms for each App match the Apps catalog and Pricing — never independent marketing claims.</p>
      ${ctas()}
    </div>
  </section>`;

  return shell({
    title: GROWTH_HUB.seoTitle,
    description: GROWTH_HUB.metaDescription,
    canonical,
    keywords: ["DigitalGate Growth", "SEO platform", "AI visibility", "business automation"],
    jsonLdHtml: jsonLd([
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: GROWTH_HUB.seoTitle,
        description: GROWTH_HUB.metaDescription,
        url: canonical,
      },
    ]),
    inner,
  });
}

function write(rel, html) {
  const path = join(OUT, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html);
}

write("growth.html", hubPage());
for (const L of GROWTH_LANDINGS) {
  write(`${L.slug}.html`, landingPage(L));
}

console.log(`Wrote ${1 + GROWTH_LANDINGS.length} Growth landing pages to ${OUT}`);
