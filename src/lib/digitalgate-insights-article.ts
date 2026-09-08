/**
 * DigitalGate Insights — dedicated production article presentation.
 *
 * This is the Insights PRESENTATION AUTHORITY. It re-composes a Website Studio
 * article (the CONTENT authority — title, lede, headings, paragraphs, lists,
 * links) into ONE approved four-chapter shell using the frozen `--insights-*`
 * design tokens. Every chapter uses the exact same structural shell (hero →
 * signature visual → prose → series navigation → CTA); only the content and the
 * part-specific signature diagram change.
 *
 * This deliberately REPLACES the previous "extract-then-repair" approach (per
 * part hero selectors, `:has()` layout repair, per-article margin overrides).
 * The article's own hero markup and stylesheet are dropped; the renderer owns
 * all geometry, typography, spacing, hero, progress, signature diagrams and
 * navigation. Idempotent, no client JS required, no Neon writes. Matching CSS
 * lives in `components/websites/digitalgate-visual-storytelling-css.ts`.
 */

export type InsightsPart = 1 | 2 | 3 | 4;

export const INSIGHTS_ARTICLE_MARKER = 'data-dg-insights-article="v2"';

type Chapter = { slug: string; route: string; short: string };

/** Canonical four-part publication (real production routes; no href="#"). */
const SERIES: Record<InsightsPart, Chapter> = {
  1: {
    slug: "from-dumb-businesses-to-smart-businesses",
    route: "/from-dumb-businesses-to-smart-businesses/",
    short: "From Dumb Businesses to Smart Businesses",
  },
  2: {
    slug: "intelligent-business-more-than-a-brain",
    route: "/intelligent-business-more-than-a-brain/",
    short: "An Intelligent Business Is More Than a Brain",
  },
  3: {
    slug: "from-signal-to-action",
    route: "/from-signal-to-action/",
    short: "From Signal to Action",
  },
  4: {
    slug: "business-software-should-tell-you-what-needs-doing",
    route: "/business-software-should-tell-you-what-needs-doing/",
    short: "Business Software Should Tell You What Needs Doing",
  },
};

const PARTS: InsightsPart[] = [1, 2, 3, 4];

const SLUG_PART: Record<string, InsightsPart> = {
  "from-dumb-businesses-to-smart-businesses": 1,
  "intelligent-business-more-than-a-brain": 2,
  "from-signal-to-action": 3,
  "business-software-should-tell-you-what-needs-doing": 4,
  "software-that-tells-you-what-needs-doing": 4,
};

export function insightsPartForSlug(slug?: string | null): InsightsPart | null {
  if (!slug) return null;
  const key = slug.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return SLUG_PART[key] ?? null;
}

/* ————————————————————————————— content extraction ————————————————————————
 * The Website Studio article stays the content authority: we extract its title,
 * lede, read-time and body prose. We NEVER re-author editorial copy here.
 * ————————————————————————————————————————————————————————————————————————— */

function findHero(html: string): { block: string; inner: string } | null {
  const m = html.match(
    /<(header|section)\b[^>]*\bclass="[^"]*\bhero\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/i,
  );
  return m ? { block: m[0], inner: m[2] } : null;
}

function extractTitle(inner: string): string {
  const m = inner.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? m[1].trim() : "";
}

function extractLede(inner: string): string {
  const thesis = inner.match(
    /<p\b[^>]*\bclass="[^"]*\b(?:hero-thesis|thesis)\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
  );
  if (thesis) return thesis[1].trim();
  const lead = inner.match(
    /<p\b[^>]*\bclass="[^"]*\b(?:hero-sub|lead)\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
  );
  return lead ? lead[1].trim() : "";
}

function extractReadMinutes(full: string): number {
  const m = full.match(/(\d{1,2})\s*min read/i);
  return m ? Number(m[1]) : 8;
}


function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** A normalised editorial section: an optional H2 + its editorial blocks. */
type Section = { heading: string | null; blocks: string[] };

/** Presentation-only paragraph roles that carry no standalone editorial value. */
const DROP_P_CLASS = /\b(?:gen|num|meta|label|chips|kicker|thesis|hero-thesis|hero-sub|dg-[\w-]+)\b/i;

/** Strip presentation wrappers/attributes from a kept semantic fragment. */
function cleanFragment(frag: string): string {
  return frag
    .replace(/<span\b[^>]*>/gi, "")
    .replace(/<\/span>/gi, "")
    .replace(/\s(?:class|style|id|aria-label|aria-hidden|role|data-[\w-]+)="[^"]*"/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * NORMALISATION / COMPOSITION LAYER.
 *
 * Website Studio is the content authority but must not inject obsolete
 * presentation architecture into the Insights shell. This collects ONLY the
 * semantic editorial stream — H2/H3, paragraphs, lists, pull-quotes — from the
 * article body, in document order, and DISCARDS every legacy presentation-only
 * wrapper (dg-evolution, dg-flow-steps, dg-connected-flow, dg-model-grid,
 * dg-manifesto-*, dg-body-map/dg-organ, dg-loop, dg-grid/dg-card, dg-callout,
 * dg-stack, dg-prompt, dg-principle, dg-next, dg-series-nav …). Meaning that
 * lives inside those wrappers as real H3/P survives as clean editorial; the
 * decorative scaffolding (and any diagram that a renderer-owned visual already
 * expresses) is dropped. The result is grouped into H2 sections for composition.
 */
function normaliseArticle(html: string): Section[] {
  let body = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const hero = findHero(body);
  if (hero) body = body.replace(hero.block, "");

  const BLOCK =
    /<h2\b[^>]*>[\s\S]*?<\/h2>|<h3\b[^>]*>[\s\S]*?<\/h3>|<ul\b[^>]*>[\s\S]*?<\/ul>|<ol\b[^>]*>[\s\S]*?<\/ol>|<blockquote\b[^>]*>[\s\S]*?<\/blockquote>|<div\b[^>]*\bpull-quote\b[^>]*>[\s\S]*?<\/div>|<p\b[^>]*>[\s\S]*?<\/p>/gi;

  const sections: Section[] = [{ heading: null, blocks: [] }];
  let m: RegExpExecArray | null;
  while ((m = BLOCK.exec(body)) !== null) {
    const raw = m[0];
    if (/^<h2/i.test(raw)) {
      sections.push({ heading: cleanFragment(raw), blocks: [] });
      continue;
    }
    let out = "";
    if (/^<h3/i.test(raw) || /^<ul/i.test(raw) || /^<ol/i.test(raw)) {
      out = cleanFragment(raw);
    } else if (/^<blockquote/i.test(raw) || /pull-quote/i.test(raw)) {
      const inner = raw.replace(/^<[^>]+>/, "").replace(/<\/(?:div|blockquote)>\s*$/i, "");
      const text = cleanFragment(inner);
      if (stripTags(text).length > 3) {
        out = `<blockquote class="insights-pullquote">${text.includes("<p") ? text : `<p>${text}</p>`}</blockquote>`;
      }
    } else if (/^<p/i.test(raw)) {
      const cls = raw.match(/class="([^"]*)"/i)?.[1] ?? "";
      if (DROP_P_CLASS.test(cls)) continue;
      const cleaned = cleanFragment(raw);
      if (stripTags(cleaned).length < 3) continue;
      out = cleaned;
    }
    if (out) sections[sections.length - 1].blocks.push(out);
  }
  return sections.filter((s) => s.heading || s.blocks.length);
}

function renderSection(s: Section): string {
  const inner = [s.heading, ...s.blocks].filter(Boolean).join("\n      ");
  return `<section class="insights-section">
    <div class="insights-prose">
      ${inner}
    </div>
  </section>`;
}

/* —— Supporting visual: a responsive editorial rail (HTML, not a tiny SVG) so
 * every label stays legible and machine-readable at any width. Colour semantics:
 * purple/blue = context/reasoning, cyan = signal, amber = governance/authority,
 * green ONLY after authority (authorised action / outcome / learning). —— */
type Step = { label: string; sub: string; tone: string };

const RAILS: Record<
  InsightsPart,
  { aria: string; caption: string; steps: Step[] }
> = {
  1: {
    aria: "Transformation: fragmented tools become connected, then intelligent, then coordinated.",
    caption: "The transformation — from fragmented tools to one coordinated system.",
    steps: [
      { label: "Fragmented", sub: "Disconnected tools", tone: "muted" },
      { label: "Connected", sub: "One shared business context", tone: "purple" },
      { label: "Intelligent", sub: "Context becomes understanding", tone: "violet" },
      { label: "Coordinated", sub: "Governed action and learning", tone: "blue" },
    ],
  },
  2: {
    aria: "The living-system flow: sense, remember, understand, reason, act, then learn back into the system.",
    caption: "One living system — sensing, remembering, understanding, reasoning, acting and learning.",
    steps: [
      { label: "Sense", sub: "Signals + analytics", tone: "cyan" },
      { label: "Remember", sub: "CRM + knowledge", tone: "purple" },
      { label: "Understand", sub: "Business Brain", tone: "violet" },
      { label: "Reason", sub: "AI Advisor", tone: "blue" },
      { label: "Act", sub: "Automation + comms", tone: "green" },
      { label: "Learn", sub: "Outcomes return", tone: "green" },
    ],
  },
  3: {
    aria: "One enquiry through the system: website enquiry, CRM context, Digital Twin, Business Brain, AI Advisor, then human authority before an authorised follow-up, outcome and learning.",
    caption: "One enquiry through the system — governed by human authority before any action.",
    steps: [
      { label: "Website enquiry", sub: "Signal in", tone: "cyan" },
      { label: "CRM · context", sub: "Digital Twin updates", tone: "purple" },
      { label: "Business Brain", sub: "Understanding", tone: "violet" },
      { label: "AI Advisor", sub: "Recommendation", tone: "blue" },
      { label: "Human Authority", sub: "Consequential decision", tone: "amber" },
      { label: "Authorised follow-up", sub: "Outcome → learning", tone: "green" },
    ],
  },
  4: {
    aria: "The maturity progression: passive software, assistive, proactive, governed automation, then a learning system.",
    caption: "The maturity curve — from passive software to a governed learning system.",
    steps: [
      { label: "Passive", sub: "Dashboards", tone: "muted" },
      { label: "Assistive", sub: "Answers", tone: "purple" },
      { label: "Proactive", sub: "Priorities", tone: "violet" },
      { label: "Governed automation", sub: "Permissions + oversight", tone: "amber" },
      { label: "Learning system", sub: "Outcomes → context", tone: "green" },
    ],
  },
};

function railFigure(part: InsightsPart): string {
  const r = RAILS[part];
  const items = r.steps
    .map(
      (s, i) =>
        `<li class="insights-rail-step is-${s.tone}">${i > 0 ? '<span class="insights-rail-line" aria-hidden="true"></span>' : ""}<span class="insights-rail-node" aria-hidden="true"></span><span class="insights-rail-text"><span class="insights-rail-label">${s.label}</span><span class="insights-rail-sub">${s.sub}</span></span></li>`,
    )
    .join("");
  return `<figure class="insights-figure insights-figure-rail" role="figure" aria-label="${r.aria}">
    <ol class="insights-rail">${items}</ol>
    <figcaption class="insights-figcaption">${r.caption}</figcaption>
  </figure>`;
}

/* —— Canonical definitions, treated editorially (a semantic <dl>, not cards) so
 * the key concepts stay machine-readable in HTML, never only inside an SVG. —— */
function definitionsSection(): string {
  return `<section class="insights-section insights-definitions-section">
    <div class="insights-prose">
      <dl class="insights-definitions">
        <div><dt>Digital Twin</dt><dd>The evolving representation of the business's current operating state.</dd></div>
        <div><dt>Business Brain</dt><dd>DigitalGate's structured business knowledge and context.</dd></div>
        <div><dt>AI Advisor</dt><dd>The reasoning layer that uses Business Brain context to identify priorities and recommend actions.</dd></div>
      </dl>
    </div>
  </section>`;
}

/* ————————————————————————————————— shell ————————————————————————————————— */

function progress(part: InsightsPart): string {
  const dots = PARTS.map(
    (p) =>
      `<span class="insights-progress-dot${p === part ? " active" : ""}"></span>`,
  ).join("");
  const labels = PARTS.map(
    (p) => `<span class="${p === part ? "active" : ""}">0${p}</span>`,
  ).join("");
  return `<div class="insights-progress" role="img" aria-label="Chapter ${part} of 4">
      <span class="insights-progress-track">${dots}</span>
      <span class="insights-progress-labels">${labels}</span>
    </div>`;
}

function hero(
  part: InsightsPart,
  title: string,
  lede: string,
  readMin: number,
): string {
  return `<div class="insights-hero">
    <div class="insights-shell">
    <div class="insights-hero-inner">
      <div class="insights-meta">
        <span class="insights-badge">Insights Series</span>
        <span class="insights-part">Part ${part} of 4</span>
      </div>
      ${progress(part)}
      <h1 class="insights-title">${title}</h1>
      ${lede ? `<p class="insights-lede">${lede}</p>` : ""}
      <div class="insights-byline">
        <span class="insights-avatar" aria-hidden="true">DG</span>
        <span class="insights-author">DigitalGate</span>
        <span class="insights-divider" aria-hidden="true">·</span>
        <span class="insights-read-time">${readMin} min read</span>
      </div>
    </div>
    </div>
  </div>`;
}

function seriesNav(part: InsightsPart): string {
  const items = PARTS.map((p) => {
    const meta = SERIES[p];
    const cur = p === part;
    const body = `<span class="insights-series-nav-num">0${p}</span><span class="insights-series-nav-label">${meta.short}</span>`;
    return cur
      ? `<li class="insights-series-nav-item active" aria-current="true">${body}</li>`
      : `<li class="insights-series-nav-item"><a href="${meta.route}">${body}</a></li>`;
  }).join("");

  const prev =
    part > 1
      ? `<a class="insights-prev" href="${SERIES[(part - 1) as InsightsPart].route}">← Part ${part - 1}</a>`
      : `<span></span>`;
  const nextOrEnd =
    part < 4
      ? `<a class="insights-next" href="${SERIES[(part + 1) as InsightsPart].route}">Part ${part + 1} →</a>`
      : `<a class="insights-complete" href="/insights/">Series complete →</a>`;

  return `<nav class="insights-series-nav" aria-label="DigitalGate Insights series navigation">
      <p class="insights-series-nav-eyebrow">DigitalGate Insights · A four-part series</p>
      <ol class="insights-series-nav-list">${items}</ol>
      <div class="insights-series-nav-links">
        ${prev}
        <span class="insights-current">Part ${part}</span>
        ${nextOrEnd}
      </div>
    </nav>`;
}

function cta(): string {
  return `<div class="insights-cta">
      <p>Explore how DigitalGate can turn disconnected tools into one intelligent business.</p>
      <div class="insights-cta-actions">
        <a class="insights-btn-primary" href="/apps/">Explore the Platform</a>
        <a class="insights-btn-secondary" href="https://audit.digitalgate.com.au">Get My Free Business Audit</a>
      </div>
    </div>`;
}

/**
 * Render a Website Studio Insights article into the approved four-chapter shell.
 * Idempotent (guarded by INSIGHTS_ARTICLE_MARKER).
 */
export function renderInsightsArticle(html: string, part: InsightsPart): string {
  if (!html || html.includes(INSIGHTS_ARTICLE_MARKER)) return html;

  const heroBlock = findHero(html);
  const title = heroBlock ? extractTitle(heroBlock.inner) : "";
  if (!title) return html; // not an insights article we can recompose safely
  const lede = heroBlock ? extractLede(heroBlock.inner) : "";
  const readMin = extractReadMinutes(html);
  const visual = signatureVisual(part);

  // Deliberate editorial rhythm: hero → signature visual → short editorial →
  // supporting transformation visual → editorial → definitions → synthesis.
  const sections = normaliseArticle(html);
  const n = sections.length;
  const a = Math.min(n, Math.max(1, Math.round(n / 3)));
  const b = Math.min(n, Math.max(a + 1, Math.round((2 * n) / 3)));
  const group = (from: number, to: number) =>
    sections.slice(from, to).map(renderSection).join("\n");

  const primary = `<figure class="insights-figure insights-figure-stage" role="figure" aria-label="${visual.aria}">
      <div class="insights-diagram">${visual.svg}</div>
      <figcaption class="insights-figcaption">${visual.caption}</figcaption>
    </figure>`;

  return `<article class="insights-article" data-part="${part}" ${INSIGHTS_ARTICLE_MARKER}>
  ${hero(part, title, lede, readMin)}
  <div class="insights-body">
    <div class="insights-shell">
      ${primary}
      ${group(0, a)}
      ${railFigure(part)}
      ${group(a, b)}
      ${definitionsSection()}
      ${group(b, n)}
    </div>
  </div>
  <footer class="insights-footer">
    <div class="insights-shell">
      ${seriesNav(part)}
      ${cta()}
    </div>
  </footer>
</article>`;
}

/* ———————————————————————————— signature visuals —————————————————————————
 * One DigitalGate illustration family (graphite canvas, fine grid, DG purple/
 * blue illumination, cyan signal, amber governance, green only AFTER authority).
 * Faithful ports of the approved clean-room SVGs. Decorative <animate> (SMIL)
 * is stripped for a static-first, reduced-motion-safe baseline; the diagrams
 * remain fully understandable without motion, and their meaning is duplicated
 * in the figure caption + surrounding prose (never SVG-only).
 * ————————————————————————————————————————————————————————————————————————— */

function stripSmil(svg: string): string {
  return svg.replace(/<animate\b[^>]*\/>/gi, "").replace(/<animate\b[^>]*>[\s\S]*?<\/animate>/gi, "");
}

function signatureVisual(part: InsightsPart): {
  svg: string;
  caption: string;
  aria: string;
} {
  const v = SIGNATURE[part];
  return { svg: stripSmil(v.svg), caption: v.caption, aria: v.aria };
}

/* —————————————————————————————————————————————————————————————————————————
 * Signature diagram visual language
 *
 * A single, shared node/flow system so all four chapters read as one series.
 * Every diagram uses the same canvas, grid, node treatment, typography and
 * colour semantics. Colour is meaning, not decoration:
 *   cyan   — incoming signal / sensing        purple — context / memory
 *   indigo — digital twin (live state)        violet — Business Brain (dominant)
 *   blue   — AI Advisor (reasoning)           amber  — human authority (governance)
 *   green  — authorised action / learning     muted  — fragmented / passive
 * Green never appears before the amber human-authority gate.
 * ————————————————————————————————————————————————————————————————————————— */

type ToneKey =
  | "muted"
  | "purple"
  | "indigo"
  | "violet"
  | "blue"
  | "cyan"
  | "amber"
  | "green";

const TONE: Record<
  ToneKey,
  { line: string; fill: string; label: string; glow: string }
> = {
  muted: { line: "#64748b", fill: "rgba(148,163,184,0.05)", label: "#94a3b8", glow: "#64748b" },
  purple: { line: "#8b5cf6", fill: "rgba(139,92,246,0.06)", label: "#c4b5fd", glow: "#8b5cf6" },
  indigo: { line: "#6366f1", fill: "rgba(99,102,241,0.06)", label: "#a5b4fc", glow: "#6366f1" },
  violet: { line: "#7c3aed", fill: "rgba(124,58,237,0.07)", label: "#c4b5fd", glow: "#7c3aed" },
  blue: { line: "#3b82f6", fill: "rgba(59,130,246,0.06)", label: "#93c5fd", glow: "#3b82f6" },
  cyan: { line: "#22d3ee", fill: "rgba(34,211,238,0.06)", label: "#67e8f9", glow: "#22d3ee" },
  amber: { line: "#fbbf24", fill: "rgba(251,191,36,0.06)", label: "#fcd34d", glow: "#fbbf24" },
  green: { line: "#34d399", fill: "rgba(52,211,153,0.06)", label: "#6ee7b7", glow: "#34d399" },
};

function glowDefs(): string {
  return (Object.keys(TONE) as ToneKey[])
    .map(
      (k) =>
        `<radialGradient id="g-${k}"><stop offset="0%" stop-color="${TONE[k].glow}" stop-opacity="0.22"/><stop offset="65%" stop-color="${TONE[k].glow}" stop-opacity="0.05"/><stop offset="100%" stop-color="${TONE[k].glow}" stop-opacity="0"/></radialGradient>`,
    )
    .join("");
}

function gridDef(id: string): string {
  return `<pattern id="${id}" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M46 0H0V46" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.025"/></pattern>`;
}

function frame(w: number, h: number, id: string): string {
  return `<rect width="${w}" height="${h}" rx="16" fill="#0c0c15"/><rect width="${w}" height="${h}" rx="16" fill="url(#${id})"/>`;
}

/** A clean node: soft glow, ring(s) for the dominant one, label + optional mono sub. */
function node(
  x: number,
  y: number,
  r: number,
  tone: ToneKey,
  label: string,
  sub = "",
  dominant = false,
): string {
  const t = TONE[tone];
  const glow = `<circle cx="${x}" cy="${y}" r="${(r * 1.85).toFixed(1)}" fill="url(#g-${tone})"/>`;
  const outer = dominant
    ? `<circle cx="${x}" cy="${y}" r="${r + 16}" fill="none" stroke="${t.line}" stroke-width="1" stroke-dasharray="5 8" opacity="0.35"/><circle cx="${x}" cy="${y}" r="${r + 7}" fill="none" stroke="${t.line}" stroke-width="1" opacity="0.4"/>`
    : "";
  const body = `<circle cx="${x}" cy="${y}" r="${r}" fill="${t.fill}" stroke="${t.line}" stroke-width="${dominant ? 2 : 1.5}"/>`;
  const neural = dominant
    ? `<circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(1)}" fill="none" stroke="${t.line}" stroke-width="0.7" opacity="0.3"/><line x1="${(x - r * 0.7).toFixed(1)}" y1="${y}" x2="${(x + r * 0.7).toFixed(1)}" y2="${y}" stroke="${t.line}" stroke-width="0.7" opacity="0.3"/><line x1="${x}" y1="${(y - r * 0.7).toFixed(1)}" x2="${x}" y2="${(y + r * 0.7).toFixed(1)}" stroke="${t.line}" stroke-width="0.7" opacity="0.3"/>`
    : "";
  const dot = `<circle cx="${x}" cy="${y}" r="4" fill="${t.line}" opacity="0.75"/>`;
  const ly = y + r + (dominant ? 27 : 23);
  const fs = dominant ? 18 : 15;
  const lbl = `<text x="${x}" y="${ly}" text-anchor="middle" fill="${t.label}" font-family="system-ui,-apple-system,'Segoe UI',sans-serif" font-size="${fs}" font-weight="${dominant ? 700 : 600}">${label}</text>`;
  const sb = sub
    ? `<text x="${x}" y="${ly + 18}" text-anchor="middle" fill="#94a3b8" font-family="ui-monospace,SFMono-Regular,monospace" font-size="11">${sub}</text>`
    : "";
  return `<g>${glow}${outer}${body}${neural}${dot}${lbl}${sb}</g>`;
}

function flow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tone: ToneKey,
  dashed = false,
  width = 2,
): string {
  const t = TONE[tone];
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${t.line}" stroke-width="${width}" opacity="0.5" stroke-linecap="round"${dashed ? ` stroke-dasharray="6 7"` : ""}/>`;
}

function arc(d: string, tone: ToneKey, dashed = true, width = 2): string {
  const t = TONE[tone];
  return `<path d="${d}" fill="none" stroke="${t.line}" stroke-width="${width}" opacity="0.5" stroke-linecap="round"${dashed ? ` stroke-dasharray="6 8"` : ""}/>`;
}

function stageSvg(w: number, h: number, id: string, inner: string): string {
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs>${glowDefs()}${gridDef(id)}</defs>${frame(w, h, id)}${inner}</svg>`;
}

/* ── Part 1 — fragmented tools → coordinated business intelligence ────────── */
const SIG1 = (() => {
  const frag = [
    { x: 74, y: 92, l: "Website" },
    { x: 58, y: 168, l: "CRM" },
    { x: 96, y: 236, l: "Email" },
    { x: 64, y: 312, l: "Analytics" },
    { x: 124, y: 130, l: "Bookings" },
    { x: 122, y: 292, l: "Finance" },
  ];
  const dots = frag
    .map(
      (f) =>
        `<circle cx="${f.x}" cy="${f.y}" r="9" fill="rgba(148,163,184,0.05)" stroke="#64748b" stroke-width="1"/><text x="${f.x}" y="${f.y + 22}" text-anchor="middle" fill="#64748b" font-family="ui-monospace,monospace" font-size="9">${f.l}</text>`,
    )
    .join("");
  const conv = frag
    .map((f) => `<path d="M ${f.x + 8} ${f.y} Q 150 ${f.y} 190 205" fill="none" stroke="#64748b" stroke-width="0.8" stroke-dasharray="3 7" opacity="0.3"/>`)
    .join("");
  const inner =
    `<g>${conv}${dots}</g>` +
    node(190, 205, 16, "amber", "You", "manual layer") +
    flow(206, 205, 290, 202, "amber") +
    flow(370, 200, 454, 200, "purple") +
    flow(502, 200, 592, 200, "indigo") +
    flow(672, 200, 760, 200, "violet") +
    flow(816, 200, 894, 200, "blue") +
    flow(922, 228, 922, 296, "green") +
    node(330, 200, 40, "purple", "DigitalGate", "Shared context") +
    node(478, 200, 24, "indigo", "Digital Twin", "Live state") +
    node(632, 200, 40, "violet", "Business Brain", "Structured context", true) +
    node(788, 200, 28, "blue", "AI Advisor", "Reasoning") +
    node(922, 200, 28, "amber", "Human Authority", "Approves") +
    node(922, 318, 22, "green", "Action", "Authorised");
  return stageSvg(1100, 405, "ig1", inner);
})();

/* ── Part 2 — a business is a living system ───────────────────────────────── */
const SIG2 = (() => {
  const inner =
    // feeds into memory
    flow(128, 108, 278, 178, "cyan") +
    flow(128, 282, 278, 208, "amber") +
    // central spine
    flow(330, 190, 502, 190, "purple") +
    flow(608, 190, 762, 190, "violet") +
    // advisor → hands / voice
    flow(828, 176, 936, 122, "green") +
    flow(828, 206, 936, 262, "cyan") +
    // learning return
    arc("M 952 292 C 900 372, 520 372, 300 226", "green", true, 2) +
    `<text x="626" y="366" text-anchor="middle" fill="#6ee7b7" font-family="ui-monospace,monospace" font-size="11" opacity="0.85">Learning returns to context</text>` +
    node(108, 92, 22, "cyan", "Senses", "Signals") +
    node(108, 296, 22, "amber", "Direction", "Goals") +
    node(300, 190, 30, "indigo", "Memory", "CRM + knowledge") +
    node(555, 190, 46, "violet", "Business Brain", "Structured intelligence", true) +
    node(800, 190, 30, "blue", "AI Advisor", "Reasoning") +
    node(955, 108, 22, "green", "Automation", "Hands") +
    node(955, 276, 22, "cyan", "Comms", "Voice");
  return stageSvg(1100, 400, "ig2", inner);
})();

/* ── Part 3 — the intelligence loop, governed by human authority ──────────── */
const SIG3 = (() => {
  const inner =
    // forward path
    flow(176, 155, 319, 155, "cyan") +
    flow(371, 155, 514, 155, "purple") +
    flow(566, 155, 700, 155, "blue") +
    flow(760, 155, 889, 155, "green") +
    // act → outcome → learning return (below, clearly separated)
    arc("M 915 181 C 915 300, 850 300, 792 300", "green", false, 2) +
    arc("M 730 300 C 470 300, 300 300, 168 178", "green", true, 2) +
    `<text x="430" y="332" text-anchor="middle" fill="#6ee7b7" font-family="ui-monospace,monospace" font-size="11" opacity="0.85">Learning returns to context</text>` +
    node(150, 155, 26, "cyan", "Connect", "Signals in") +
    node(345, 155, 26, "purple", "Understand", "Context") +
    node(540, 155, 26, "blue", "Advise", "Recommends") +
    node(730, 155, 30, "amber", "Human Authority", "Approves", true) +
    node(915, 155, 26, "green", "Act", "Authorised") +
    node(755, 300, 20, "green", "Outcome", "");
  return stageSvg(1100, 400, "ig3", inner);
})();

/* ── Part 4 — the maturity curve, human authority stays explicit ──────────── */
const SIG4 = (() => {
  const stops = [
    { x: 150, y: 300, r: 22, tone: "muted" as ToneKey, l: "Passive", s: "Software runs" },
    { x: 340, y: 255, r: 22, tone: "blue" as ToneKey, l: "Assistive", s: "Answers" },
    { x: 530, y: 205, r: 22, tone: "purple" as ToneKey, l: "Proactive", s: "Surfaces" },
    { x: 720, y: 160, r: 26, tone: "amber" as ToneKey, l: "Governed", s: "Automation" },
    { x: 905, y: 116, r: 24, tone: "green" as ToneKey, l: "Learning", s: "Improves" },
  ];
  const curve = `<path d="M 150 300 C 245 300, 250 255, 340 255 C 435 255, 440 205, 530 205 C 625 205, 630 160, 720 160 C 815 160, 815 116, 905 116" fill="none" stroke="url(#p4Rise)" stroke-width="2.5" opacity="0.55" stroke-linecap="round"/>`;
  const rise = `<linearGradient id="p4Rise" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#64748b"/><stop offset="45%" stop-color="#8b5cf6"/><stop offset="75%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#34d399"/></linearGradient>`;
  const axis = `<line x1="120" y1="352" x2="965" y2="352" stroke="#334155" stroke-width="1" opacity="0.45"/><text x="965" y="378" text-anchor="end" fill="#6ee7b7" font-family="ui-monospace,monospace" font-size="11" opacity="0.8">maturity →</text>`;
  const gate = `<text x="720" y="96" text-anchor="middle" fill="#fcd34d" font-family="ui-monospace,monospace" font-size="11" opacity="0.85">human authority stays explicit</text>`;
  const nodes = stops.map((s) => node(s.x, s.y, s.r, s.tone, s.l, s.s)).join("");
  const inner = `<defs>${rise}</defs>${curve}${axis}${gate}${nodes}`;
  return stageSvg(1100, 400, "ig4", inner);
})();

const SIGNATURE: Record<
  InsightsPart,
  { svg: string; caption: string; aria: string }
> = {
  1: {
    caption:
      "The transformation from fragmented tools to connected business intelligence.",
    aria:
      "Fragmented business systems (website, CRM, email, analytics, bookings, finance) with the owner acting as the manual integration layer, converging into DigitalGate shared business context, then flowing through the Digital Twin, Business Brain and AI Advisor to a human authority gate before any authorised action.",
    svg: SIG1,
  },
  2: {
    caption:
      "A business is a living system. Intelligence emerges from the whole, not one part.",
    aria:
      "An abstract living-system architecture: senses (signals and analytics) and direction (goals) feed a nervous system of connectors and events; memory holds CRM and knowledge; the dominant Business Brain is DigitalGate's structured business knowledge and context layer, distinct from the AI Advisor reasoning layer; hands (automation), voice (communications) and body (Platform Core and apps) act; an immune system of security and governance surrounds it; and learning returns outcomes to the system.",
    svg: SIG2,
  },
  3: {
    caption:
      "The intelligence loop: connect, understand, advise, authorise, act, learn — with explicit human governance before any action.",
    aria:
      "A causal loop: connect signals, understand context, advise with recommendations, then a human authority gate for consequential decisions, only then authorised action, an outcome, and learning that returns to context. No action path exists before the amber human-authority gate.",
    svg: SIG3,
  },
  4: {
    caption:
      "The maturity progression from passive software to an intelligent, governed learning system.",
    aria:
      "A maturity progression: passive software, assistive, proactive, governed automation, learning system. Alongside, a contrast between information (a bare count of 47 opportunities) and direction (seven opportunities need attention, three high-value prospects have gone quiet, priority follow-up is ready). Human authority remains explicit; the machine observes, reasons, prepares and learns.",
    svg: SIG4,
  },
};
