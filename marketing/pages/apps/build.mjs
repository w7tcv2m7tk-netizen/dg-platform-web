import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APPS, LAYERS, appBySlug, appsInLayer, hrefFor } from "./catalog.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "html");

const FOUNDING = "https://digitalgate.com.au/founding-customers/";
const CONTACT = "https://digitalgate.com.au/contact/#platform-consultation";
const PRICING = "https://digitalgate.com.au/pricing/";
const HUB = "/apps/";

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const CSS = `
.dg-app * { margin: 0; padding: 0; box-sizing: border-box; }
.dg-app {
  font-family: Inter, system-ui, sans-serif;
  background: #0A0E17;
  color: #F9FAFB;
  line-height: 1.6;
}
.dg-app a { color: inherit; text-decoration: none; }
.dg-app .wrap { max-width: 1100px; margin: 0 auto; padding: 0 2rem; }
.dg-app h1, .dg-app h2, .dg-app h3 { color: #F9FAFB !important; }
.dg-app section { padding: 4rem 0; border-top: 1px solid #1E293B; }
.dg-app section.alt { background: #111827; }
.dg-app .sub {
  display: inline-block; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: #93C5FD; margin-bottom: 0.65rem;
}
.dg-app .hero {
  padding: 7.5rem 0 4rem;
  background: linear-gradient(180deg, #05070A 0%, #0A0E17 100%);
  border-top: none;
}
.dg-app .crumbs { font-size: 0.82rem; color: #64748B; margin-bottom: 1.25rem; }
.dg-app .crumbs a { color: #93C5FD; }
.dg-app .crumbs a:hover { color: #BFDBFE; }
.dg-app .badge {
  display: inline-block; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; padding: 0.28rem 0.65rem; border-radius: 999px;
  border: 1px solid #334155; color: #CBD5E1; margin-bottom: 0.85rem;
}
.dg-app .badge.full { border-color: rgba(59,130,246,0.45); color: #BFDBFE; background: rgba(59,130,246,0.12); }
.dg-app .badge.lite { border-color: rgba(45,212,191,0.35); color: #99F6E4; }
.dg-app .badge.soon { color: #94A3B8; }
.dg-app .templates-list { display: grid; gap: 0.65rem; margin-top: 1rem; }
.dg-app .templates-list a {
  display: flex; justify-content: space-between; gap: 1rem; align-items: center;
  padding: 0.75rem 1rem; border: 1px solid #1E293B; border-radius: 12px; background: #0F172A;
}
.dg-app .templates-list a:hover { border-color: #3B82F6; }
.dg-app .templates-list .t-name { font-weight: 700; color: #E2E8F0; }
.dg-app .templates-list .t-status { font-size: 0.75rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.04em; }
.dg-app .parent-note { color: #93C5FD; font-size: 0.9rem; margin-bottom: 0.75rem; }
.dg-app h1 {
  font-size: clamp(1.85rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.15;
  letter-spacing: -0.02em; margin-bottom: 0.75rem; max-width: 18ch;
}
.dg-app .lead { color: #CBD5E1; font-size: 1.05rem; max-width: 720px; margin-bottom: 0.85rem; }
.dg-app .status { color: #94A3B8; font-size: 0.92rem; max-width: 680px; }
.dg-app .ctas { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.75rem; }
.dg-app .btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0.85rem 1.35rem; border-radius: 999px; font-weight: 700; font-size: 0.92rem;
}
.dg-app .btn-primary { background: linear-gradient(105deg, #3B82F6, #2563EB); color: #fff !important; }
.dg-app .btn-primary:hover { box-shadow: 0 8px 24px rgba(59,130,246,0.35); }
.dg-app .btn-secondary { border: 1px solid #334155; color: #E2E8F0 !important; }
.dg-app .btn-secondary:hover { border-color: #3B82F6; color: #fff !important; }
.dg-app .loop {
  display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center;
}
.dg-app .loop span {
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 0.4rem 0.7rem; border-radius: 999px; border: 1px solid #334155; color: #64748B;
}
.dg-app .loop span.on {
  color: #BFDBFE; border-color: rgba(59,130,246,0.5); background: rgba(59,130,246,0.14);
}
.dg-app .loop-caption { text-align: center; color: #94A3B8; font-size: 0.88rem; margin-bottom: 1.25rem; }
.dg-app .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.dg-app .card {
  background: #0A0E17; border: 1px solid #334155; border-radius: 16px; padding: 1.25rem;
}
.dg-app .card h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.45rem; }
.dg-app .card p { font-size: 0.88rem; color: #94A3B8; }
.dg-app .flow {
  display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center;
}
.dg-app .flow b {
  background: #111827; border: 1px solid #334155; border-radius: 10px;
  padding: 0.55rem 0.8rem; font-size: 0.85rem; font-weight: 600;
}
.dg-app .flow i { color: #3B82F6; font-style: normal; font-weight: 700; }
.dg-app .chips { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.dg-app .chip {
  background: #111827; border: 1px solid #334155; border-radius: 999px;
  padding: 0.35rem 0.8rem; font-size: 0.8rem; font-weight: 600; color: #94A3B8;
}
.dg-app .not-this {
  max-width: 760px; color: #CBD5E1; font-size: 1rem; line-height: 1.75;
}
.dg-app .badge.commercial {
  border-color: rgba(59,130,246,0.55); color: #BFDBFE; background: rgba(59,130,246,0.18);
  letter-spacing: 0.08em;
}
.dg-app h2.section-title { font-size: 1.45rem; font-weight: 800; margin-bottom: 1rem; }
.dg-app .section-body { color: #CBD5E1; font-size: 1rem; line-height: 1.75; max-width: 760px; }
.dg-app .section-note { color: #94A3B8; font-size: 0.92rem; margin-top: 0.85rem; max-width: 680px; }
.dg-app .bullets { list-style: none; display: grid; gap: 0.55rem; max-width: 640px; }
.dg-app .bullets li {
  position: relative; padding-left: 1.15rem; color: #CBD5E1; font-size: 0.95rem;
}
.dg-app .bullets li::before {
  content: "•"; position: absolute; left: 0; color: #3B82F6; font-weight: 700;
}
.dg-app .proof-ref {
  margin: 1.25rem 0 1rem; padding: 1rem 1.15rem; background: #111827;
  border: 1px solid #334155; border-radius: 14px; max-width: 480px;
}
.dg-app .proof-ref .name { font-weight: 800; font-size: 1.05rem; margin-bottom: 0.2rem; }
.dg-app .proof-ref .label { font-size: 0.82rem; color: #94A3B8; }
.dg-app .proof-table { width: 100%; max-width: 640px; border-collapse: collapse; margin-top: 0.5rem; }
.dg-app .proof-table th, .dg-app .proof-table td {
  text-align: left; padding: 0.65rem 0.75rem; border-bottom: 1px solid #334155; font-size: 0.9rem;
}
.dg-app .proof-table th { color: #64748B; font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; }
.dg-app .proof-table td:last-child { color: #99F6E4; font-weight: 600; }
.dg-app .pricing-box {
  max-width: 640px; padding: 1.15rem 1.25rem; background: #111827;
  border: 1px solid #334155; border-radius: 14px; color: #CBD5E1; font-size: 0.95rem;
}
.dg-app .pricing-box a { color: #93C5FD; }
.dg-app .arch-caption {
  text-align: center; color: #64748B; font-size: 0.82rem; margin-top: 1rem; max-width: 720px; margin-left: auto; margin-right: auto;
}
.dg-app .cta-band { text-align: center; }
.dg-app .cta-band h2 { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.6rem; }
.dg-app .cta-band p { color: #94A3B8; max-width: 620px; margin: 0 auto 1.5rem; }
.dg-app .hub-hero h1 { max-width: 22ch; }
.dg-app .layers { display: grid; gap: 2rem; }
.dg-app .layer-head { margin-bottom: 1rem; }
.dg-app .layer-head h2 { font-size: 1.35rem; font-weight: 800; }
.dg-app .layer-head p { color: #94A3B8; font-size: 0.92rem; max-width: 640px; }
.dg-app .app-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem;
}
.dg-app a.app-tile {
  display: block; background: #0A0E17; border: 1px solid #334155; border-radius: 14px;
  padding: 1rem 1.05rem; min-height: 7.5rem;
}
.dg-app a.app-tile:hover { border-color: #3B82F6; }
.dg-app a.app-tile .name { font-weight: 700; margin-bottom: 0.25rem; }
.dg-app a.app-tile .meta { font-size: 0.75rem; color: #64748B; margin-bottom: 0.4rem; }
.dg-app a.app-tile .blurb { font-size: 0.8rem; color: #94A3B8; line-height: 1.45; }
.dg-app .model {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.65rem; margin-top: 1.5rem;
}
.dg-app .model div {
  text-align: center; padding: 0.9rem 0.5rem; background: #111827; border: 1px solid #334155;
  border-radius: 12px; font-size: 0.82rem; font-weight: 600;
}
.dg-app .model span { display: block; font-size: 0.65rem; color: #64748B; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 0.25rem; font-weight: 600; }
@media (max-width: 800px) {
  .dg-app .grid-3, .dg-app .model { grid-template-columns: 1fr; }
  .dg-app .hero { padding-top: 6.5rem; }
}
`;

function shell({ title, description, canonical, bodyClass = "", inner }) {
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap"></noscript>
<style>${CSS}</style>
<div class="dg-app ${bodyClass}">
${inner}
</div>
`;
}

function loopHtml(app) {
  const on = new Set(app.highlight || []);
  return `<div class="loop">${app.loop
    .map((step) => `<span class="${on.has(step) ? "on" : ""}">${esc(step)}</span>`)
    .join("")}</div>`;
}

function relatedHtml(app) {
  const items = (app.related || [])
    .map((slug) => appBySlug(slug))
    .filter(Boolean);
  if (!items.length) return "";
  return `<div class="chips">${items
    .map(
      (r) =>
        `<a class="chip" href="${hrefFor(r)}">${esc(r.name)}</a>`
    )
    .join("")}</div>`;
}

function flowHtml(flow) {
  if (!flow?.length) return "";
  return `<div class="flow">${flow
    .map((step, i) => `<b>${esc(step)}</b>${i < flow.length - 1 ? "<i>→</i>" : ""}`)
    .join("")}</div>`;
}

function ctas(app) {
  const primary =
    app.depth === "soon" || app.badge === "Early Access" || app.badge === "Coming / Founding"
      ? { href: FOUNDING, label: "Register interest →" }
      : { href: FOUNDING, label: "Become a Founding Customer →" };
  return `<div class="ctas">
      <a class="btn btn-primary" href="${primary.href}">${esc(primary.label)}</a>
      <a class="btn btn-secondary" href="${CONTACT}">Book a Platform Consultation</a>
      <a class="btn btn-secondary" href="${PRICING}">View pricing</a>
    </div>`;
}

function layerOf(app) {
  return LAYERS.find((l) => l.id === app.layer);
}

function bulletsHtml(items) {
  if (!items?.length) return "";
  return `<ul class="bullets">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
}

function productionProofHtml(proof) {
  if (!proof) return "";
  const rows = (proof.items || [])
    .map(
      (row) =>
        `<tr><td>${esc(row.name)}</td><td>${esc(row.status)}</td></tr>`
    )
    .join("");
  const ref = proof.reference
    ? `<div class="proof-ref">
        <div class="name">${esc(proof.reference.name)}</div>
        <div class="label">${esc(proof.reference.label)}</div>
      </div>`
    : "";
  return `<p class="section-body">${esc(proof.intro || "")}</p>
      ${ref}
      ${
        rows
          ? `<table class="proof-table">
        <thead><tr><th>Capability</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
          : ""
      }`;
}

function pricingSection(app, isSoon) {
  const text =
    app.pricing ||
    (app.included
      ? "Included with the platform subscription on Starter, Growth and Scale — see Pricing."
      : isSoon
        ? "Not available for purchase yet. Register interest via the Founding Customer Programme."
        : "Licensed separately unless your agreement says otherwise. See Apps & pricing.");
  return `<section class="alt">
    <div class="wrap">
      <p class="sub">Pricing</p>
      <h2 class="section-title">Commercial model</h2>
      <div class="pricing-box">${esc(text)} · <a href="${PRICING}#apps">Apps &amp; pricing →</a></div>
      <p class="section-note">${esc(app.commercial)}</p>
    </div>
  </section>`;
}

function sectionBlock({ alt = false, label, title, body }) {
  if (!body) return "";
  return `<section class="${alt ? "alt" : ""}">
    <div class="wrap">
      <p class="sub">${esc(label)}</p>
      ${title ? `<h2 class="section-title">${esc(title)}</h2>` : ""}
      ${body}
    </div>
  </section>`;
}

function appPage(app) {
  const layer = layerOf(app);
  const isFull = app.depth === "full";
  const isSoon = app.depth === "soon";
  const canonical = `https://digitalgate.com.au${hrefFor(app)}`;
  const isTemplate = app.kind === "template";
  const isIndustryApp = app.kind === "industry-app" || (!app.kind && app.layer === "industry" && !isTemplate);
  const title = isTemplate
    ? `${app.name} Template | ${app.parentIndustryLabel || "Industry"} | DigitalGate`
    : isIndustryApp
      ? `${app.name} Industry App | DigitalGate`
      : `${app.name} | DigitalGate ${layer.name} App`;
  const description = app.subhead || app.headline || app.what;

  const heroBadge = app.commercialStatus
    ? `<span class="badge commercial full">${esc(app.commercialStatus)}</span>`
    : `<span class="badge ${app.depth}">${esc(isTemplate ? "Template" : layer.name)} · ${esc(app.badge)}</span>`;

  const parentNote = isTemplate && app.parentIndustryLabel
    ? `<p class="parent-note">Template under <a href="/apps/industry/${esc(app.parentIndustry)}/" style="color:#BFDBFE;font-weight:700;">${esc(app.parentIndustryLabel)}</a> Industry App — not a separate Industry product.</p>`
    : "";

  const templatesBody = Array.isArray(app.templates) && app.templates.length
    ? `<p class="section-body">Activate the Template that matches your business. One Industry App subscription — Templates specialise workflows.</p>
      <div class="templates-list">${app.templates.map((t) =>
        `<a href="${esc(t.href || "#")}"><span class="t-name">${esc(t.name)}</span><span class="t-status">${esc(t.status || "")}</span></a>`
      ).join("")}</div>`
    : "";

  const builtForBody = app.builtFor?.length
    ? `${bulletsHtml(app.builtFor)}${app.builtForNote ? `<p class="section-note">${esc(app.builtForNote)}</p>` : ""}`
    : app.who
      ? `<p class="section-body">${esc(app.who)}</p>`
      : "";

  const whatBody = `<p class="section-body">${esc(app.what)}</p>${
    isFull && app.notThis
      ? `<p class="section-body" style="margin-top:1rem;color:#94A3B8;font-size:0.95rem;">${esc(app.notThis)}</p>`
      : ""
  }`;

  const readinessBody = app.productionProof
    ? productionProofHtml(app.productionProof)
    : `<p class="section-body">${esc(app.status)}</p>${
        app.objects?.length && !isSoon
          ? `<div class="chips" style="margin-top:1rem;">${app.objects.map((o) => `<span class="chip">${esc(o)}</span>`).join("")}</div>`
          : ""
      }`;

  const fullSections = isFull
    ? [
        sectionBlock({
          label: "What it does",
          body: whatBody,
        }),
        templatesBody
          ? sectionBlock({
              alt: true,
              label: "Templates",
              title: "Specialisations in this Industry App",
              body: templatesBody,
            })
          : "",
        sectionBlock({
          alt: !templatesBody,
          label: "Built for",
          title: "Who it’s for",
          body: builtForBody,
        }),
        sectionBlock({
          label: "Platform connection",
          title: "How it connects to Core",
          body: `<p class="section-body">${esc(app.connects)}</p>
            <p class="arch-caption">Core is the foundation. Apps specialise it. AI understands it. Automation acts on it. Growth Apps improve it.</p>`,
        }),
        app.flow?.length
          ? sectionBlock({
              alt: true,
              label: "Operating workflow",
              title: "Every object feeds the platform",
              body: flowHtml(app.flow),
            })
          : "",
        app.whatYouGet?.length
          ? sectionBlock({
              label: "What you get",
              title: "Capabilities in this App",
              body: bulletsHtml(app.whatYouGet),
            })
          : "",
        sectionBlock({
          alt: true,
          label: app.productionProof ? "Proven in production" : "Readiness",
          title: app.productionProof ? "Production reference" : "Current status",
          body: readinessBody,
        }),
      ].join("")
    : "";

  const liteSections = !isFull
    ? `<section class="alt">
    <div class="wrap grid-3">
      <div class="card"><h3>What it does</h3><p>${esc(app.what)}</p></div>
      <div class="card"><h3>How it connects to Core</h3><p>${esc(app.connects)}</p></div>
      <div class="card"><h3>Current status</h3><p>${esc(app.status)}</p></div>
    </div>
  </section>
  ${templatesBody ? sectionBlock({ label: "Templates", title: "Specialisations in this Industry App", body: templatesBody }) : ""}
  ${
    builtForBody
      ? sectionBlock({ label: "Built for", title: "Who it’s for", body: builtForBody })
      : ""
  }`
    : "";

  const inner = `
  <section class="hero">
    <div class="wrap">
      <p class="crumbs"><a href="${HUB}">Apps</a> · <a href="/apps/${app.layer}/">${esc(layer.name)}</a>${isTemplate && app.parentIndustry ? ` · <a href="/apps/industry/${esc(app.parentIndustry)}/">${esc(app.parentIndustryLabel || "Industry")}</a>` : ""} · ${esc(app.name)}</p>
      ${heroBadge}
      ${parentNote}
      <h1>${esc(app.headline)}</h1>
      <p class="lead">${esc(app.subhead || app.what)}</p>
      <p class="status">${esc(app.status)}</p>
      ${ctas(app)}
    </div>
  </section>
  <section class="alt">
    <div class="wrap">
      <p class="loop-caption">Connect → Centralise → Understand → Decide → Act → Learn → Grow</p>
      ${loopHtml(app)}
    </div>
  </section>
  ${fullSections}
  ${liteSections}
  <section class="${isFull ? "" : "alt"}">
    <div class="wrap">
      <p class="sub">Related Apps</p>
      ${relatedHtml(app) || `<p class="status">See the <a href="${HUB}" style="color:#93C5FD">Apps hub</a>.</p>`}
    </div>
  </section>
  ${pricingSection(app, isSoon)}
  <section class="alt cta-band">
    <div class="wrap">
      <h2>${isSoon ? "Register interest" : "Ready to run this on DigitalGate?"}</h2>
      <p>${
        isSoon
          ? "We are not building a catalogue of vapourware pages. If this App matters to your business, tell us — Founding 10 is the live commercial path."
          : "Founding 10 is the live offer. The platform is the operating foundation. Apps extend it."
      }</p>
      ${ctas(app)}
    </div>
  </section>`;

  return shell({ title, description, canonical, inner });
}

function tile(app) {
  const meta =
    app.kind === "template"
      ? `${esc(app.badge)}${app.parentIndustryLabel ? ` · under ${esc(app.parentIndustryLabel)}` : ""}`
      : `${esc(app.badge)}${app.depth === "full" ? " · Demo-ready" : ""}`;
  return `<a class="app-tile" href="${hrefFor(app)}">
            <div class="name">${esc(app.name)}</div>
            <div class="meta">${meta}</div>
            <div class="blurb">${esc(app.headline)}</div>
          </a>`;
}

function industryAppsOnly(apps) {
  return apps.filter((a) => a.kind !== "template");
}

function templatesOnly(apps) {
  return apps.filter((a) => a.kind === "template");
}

function hubPage() {
  const layersHtml = LAYERS.map((layer) => {
    const all = appsInLayer(layer.id);
    const apps = layer.id === "industry" ? industryAppsOnly(all) : all;
    return `<div class="apps-block">
        <div class="layer-head">
          <p class="sub">${esc(layer.name)} — ${esc(layer.verb)}</p>
          <h2><a href="/apps/${layer.id}/" style="color:#F9FAFB">${esc(layer.name)}</a> <span style="color:#64748B;font-weight:600;font-size:0.95rem;">${esc(layer.tagline)}</span></h2>
          <p>${esc(layer.intro)}</p>
        </div>
        <div class="app-grid">${apps.map(tile).join("")}</div>
      </div>`;
  }).join("");

  const inner = `
  <section class="hero hub-hero">
    <div class="wrap">
      <p class="crumbs"><a href="https://digitalgate.com.au/">DigitalGate</a> · Apps</p>
      <span class="badge full">Platform → Apps → Services → Success</span>
      <h1>Apps on an operating system — not a catalogue of tools.</h1>
      <p class="lead">DigitalGate is the platform. Apps extend it. No App is included in the platform subscription unless we say so on Pricing. Core is the operating foundation. Infrastructure, Industry and Growth specialise, power and grow the same business.</p>
      <p class="status">Fully developed pages exist for Apps we can demonstrate and sell now. Everything else uses a status template — architecture without theatre.</p>
      <div class="ctas">
        <a class="btn btn-primary" href="${FOUNDING}">Become a Founding Customer →</a>
        <a class="btn btn-secondary" href="${PRICING}#apps">Apps &amp; pricing</a>
      </div>
      <div class="model">
        <div>Core<span>foundational capabilities</span></div>
        <div>Infrastructure<span>digital infrastructure</span></div>
        <div>Industry<span>vertical workflows</span></div>
        <div>Growth<span>growth &amp; intelligence</span></div>
      </div>
    </div>
  </section>
  <section class="alt">
    <div class="wrap">
      <p class="loop-caption">Every App page sells the same loop</p>
      <div class="loop"><span class="on">Connect</span><span class="on">Centralise</span><span class="on">Understand</span><span class="on">Decide</span><span class="on">Act</span><span class="on">Learn</span><span class="on">Grow</span></div>
    </div>
  </section>
  <section>
    <div class="wrap layers">${layersHtml}</div>
  </section>
  <section class="alt cta-band">
    <div class="wrap">
      <h2>Start with the platform. Add Apps as you grow.</h2>
      <p>Starter $99 · Growth $249 · Scale $499. Industry and Growth Apps are add-ons. Core capabilities listed as Included on Pricing are the explicit exception.</p>
      <div class="ctas">
        <a class="btn btn-primary" href="${FOUNDING}">Founding Customer Programme →</a>
        <a class="btn btn-secondary" href="${CONTACT}">Platform Consultation</a>
      </div>
    </div>
  </section>`;

  return shell({
    title: "DigitalGate Apps | Core, Infrastructure, Industry, Growth",
    description:
      "DigitalGate Apps sit on the platform: Core, Infrastructure, Industry and Growth. Not a tool catalogue — an operating system you extend.",
    canonical: "https://digitalgate.com.au/apps/",
    inner,
  });
}

function layerPage(layer) {
  const all = appsInLayer(layer.id);
  const isIndustry = layer.id === "industry";
  const apps = isIndustry ? industryAppsOnly(all) : all;
  const templates = isIndustry ? templatesOnly(all) : [];
  const templatesBlock = templates.length
    ? `<div style="margin-top:2.5rem;">
        <p class="sub">Templates</p>
        <h2 style="font-size:1.35rem;margin-bottom:0.5rem;">Specialisations under Industry Apps</h2>
        <p style="color:#94A3B8;margin-bottom:1.25rem;max-width:40rem;">Templates are not separate Industry products. Buy the Industry App, then activate the Template that matches your business.</p>
        <div class="app-grid">${templates.map(tile).join("")}</div>
      </div>`
    : "";
  const inner = `
  <section class="hero">
    <div class="wrap">
      <p class="crumbs"><a href="${HUB}">Apps</a> · ${esc(layer.name)}</p>
      <span class="badge full">${esc(layer.name)} — ${esc(layer.verb)}</span>
      <h1>${esc(layer.name)} Apps — ${esc(layer.tagline)}.</h1>
      <p class="lead">${esc(layer.intro)}</p>
      ${ctas({ depth: "lite", badge: "" })}
    </div>
  </section>
  <section class="alt">
    <div class="wrap">
      ${isIndustry ? `<p class="sub" style="margin-bottom:1rem;">Industry Apps</p>` : ""}
      <div class="app-grid">${apps.map(tile).join("")}</div>
      ${templatesBlock}
      <p style="margin-top:1.5rem;"><a href="${HUB}" class="btn btn-secondary">← All Apps</a></p>
    </div>
  </section>`;
  return shell({
    title: `${layer.name} Apps | DigitalGate`,
    description: layer.intro,
    canonical: `https://digitalgate.com.au/apps/${layer.id}/`,
    inner,
  });
}

function write(rel, html) {
  const path = join(OUT, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html);
}

write("apps.html", hubPage());
for (const layer of LAYERS) {
  write(`${layer.id}/index.html`, layerPage(layer));
}
for (const app of APPS) {
  write(`${app.layer}/${app.slug}.html`, appPage(app));
}

console.log(`Wrote ${1 + LAYERS.length + APPS.length} pages to ${OUT}`);
