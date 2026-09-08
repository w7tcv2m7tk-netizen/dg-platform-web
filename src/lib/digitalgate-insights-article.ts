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

const GRID = (id: string) =>
  `<pattern id="${id}" width="30" height="30" patternUnits="userSpaceOnUse" opacity="0.03"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" stroke-width="0.5"/></pattern>`;

const SIGNATURE: Record<
  InsightsPart,
  { svg: string; caption: string; aria: string }
> = {
  1: {
    caption:
      "The transformation from fragmented tools to connected business intelligence.",
    aria:
      "Fragmented business systems (website, CRM, email, analytics, bookings, finance) with the owner acting as the manual integration layer, converging into DigitalGate shared business context, then flowing through the Digital Twin, Business Brain and AI Advisor to a human authority gate before any authorised action.",
    svg: `<svg viewBox="0 0 1100 500" aria-hidden="true">
  <defs>
    <linearGradient id="p1Connect" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.2"/><stop offset="50%" stop-color="#7c3aed" stop-opacity="0.5"/><stop offset="100%" stop-color="#a78bfa" stop-opacity="0.2"/></linearGradient>
    <radialGradient id="p1BrainGlow"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.2"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    ${GRID("p1Grid")}
  </defs>
  <rect width="1100" height="500" fill="#0f0f1a" rx="12"/>
  <rect width="1100" height="500" fill="url(#p1Grid)" rx="12"/>
  <g opacity="0.6">
    <circle cx="80" cy="100" r="14" fill="rgba(239,68,68,0.03)" stroke="#ef4444" stroke-width="0.8"/><text x="80" y="130" text-anchor="middle" fill="#ef4444" font-size="8" font-family="monospace" opacity="0.5">Website</text>
    <circle cx="60" cy="170" r="12" fill="rgba(239,68,68,0.03)" stroke="#ef4444" stroke-width="0.8"/><text x="60" y="196" text-anchor="middle" fill="#ef4444" font-size="7" font-family="monospace" opacity="0.5">CRM</text>
    <circle cx="100" cy="230" r="12" fill="rgba(239,68,68,0.03)" stroke="#ef4444" stroke-width="0.8"/><text x="100" y="256" text-anchor="middle" fill="#ef4444" font-size="7" font-family="monospace" opacity="0.5">Email</text>
    <circle cx="50" cy="290" r="12" fill="rgba(239,68,68,0.03)" stroke="#ef4444" stroke-width="0.8"/><text x="50" y="316" text-anchor="middle" fill="#ef4444" font-size="7" font-family="monospace" opacity="0.5">Analytics</text>
    <circle cx="120" cy="350" r="12" fill="rgba(239,68,68,0.03)" stroke="#ef4444" stroke-width="0.8"/><text x="120" y="376" text-anchor="middle" fill="#ef4444" font-size="7" font-family="monospace" opacity="0.5">Bookings</text>
    <circle cx="70" cy="400" r="10" fill="rgba(239,68,68,0.03)" stroke="#ef4444" stroke-width="0.8"/><text x="70" y="424" text-anchor="middle" fill="#ef4444" font-size="6" font-family="monospace" opacity="0.5">Finance</text>
    <path d="M 94 100 C 140 100, 180 140, 220 180" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="3 8" fill="none" opacity="0.2"/>
    <path d="M 72 170 C 120 170, 170 200, 220 220" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="3 8" fill="none" opacity="0.2"/>
    <path d="M 112 230 C 160 230, 200 250, 240 260" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="3 8" fill="none" opacity="0.2"/>
    <path d="M 62 290 C 120 290, 170 300, 220 300" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="3 8" fill="none" opacity="0.2"/>
    <path d="M 132 350 C 180 350, 220 340, 260 330" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="3 8" fill="none" opacity="0.2"/>
  </g>
  <g>
    <circle cx="280" cy="250" r="40" fill="rgba(251,191,36,0.03)" stroke="#fbbf24" stroke-width="1.5" opacity="0.4"/>
    <circle cx="280" cy="250" r="26" fill="rgba(251,191,36,0.04)" stroke="#fbbf24" stroke-width="0.8" stroke-dasharray="4 6" opacity="0.3"/>
    <text x="280" y="244" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="system-ui" font-weight="600">You</text>
    <text x="280" y="262" text-anchor="middle" fill="#fbbf24" font-size="7" font-family="monospace" opacity="0.6">Integration Layer</text>
    <path d="M 130 100 L 260 235" stroke="#fbbf24" stroke-width="0.8" opacity="0.15" stroke-dasharray="4 6"/>
    <path d="M 110 170 L 260 242" stroke="#fbbf24" stroke-width="0.8" opacity="0.15" stroke-dasharray="4 6"/>
    <path d="M 150 230 L 260 248" stroke="#fbbf24" stroke-width="0.8" opacity="0.15" stroke-dasharray="4 6"/>
    <path d="M 90 290 L 260 252" stroke="#fbbf24" stroke-width="0.8" opacity="0.15" stroke-dasharray="4 6"/>
  </g>
  <path d="M 320 250 C 400 250, 460 250, 520 250" stroke="url(#p1Connect)" stroke-width="3" fill="none" opacity="0.6"/>
  <g>
    <circle cx="580" cy="250" r="80" fill="url(#p1BrainGlow)"/>
    <circle cx="580" cy="250" r="55" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="6 8" opacity="0.4"/>
    <circle cx="580" cy="250" r="40" fill="rgba(124,58,237,0.06)" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
    <circle cx="580" cy="250" r="26" fill="rgba(124,58,237,0.08)" stroke="#7c3aed" stroke-width="0.8" stroke-dasharray="4 6" opacity="0.3"/>
    <circle cx="580" cy="250" r="14" fill="#7c3aed" opacity="0.1"/>
    <circle cx="580" cy="250" r="5" fill="#a78bfa" opacity="0.6"/>
    <line x1="580" y1="210" x2="580" y2="290" stroke="#7c3aed" stroke-width="0.5" opacity="0.3"/>
    <line x1="540" y1="250" x2="620" y2="250" stroke="#7c3aed" stroke-width="0.5" opacity="0.3"/>
    <line x1="550" y1="220" x2="610" y2="280" stroke="#7c3aed" stroke-width="0.4" opacity="0.2"/>
    <line x1="610" y1="220" x2="550" y2="280" stroke="#7c3aed" stroke-width="0.4" opacity="0.2"/>
    <text x="580" y="295" text-anchor="middle" fill="#c4b5fd" font-size="13" font-family="system-ui" font-weight="700">DigitalGate</text>
    <text x="580" y="312" text-anchor="middle" fill="#6b7280" font-size="8" font-family="monospace">Shared Business Context</text>
  </g>
  <g opacity="0.8">
    <path d="M 635 240 L 680 220" stroke="#6366f1" stroke-width="1.5" opacity="0.4"/>
    <circle cx="720" cy="180" r="18" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="1.2"/>
    <text x="720" y="215" text-anchor="middle" fill="#c7d2fe" font-size="9" font-family="system-ui" font-weight="600">Digital Twin</text>
    <text x="720" y="229" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Evolving State</text>
    <path d="M 720 198 L 720 240" stroke="#6366f1" stroke-width="1.2" opacity="0.35"/>
    <circle cx="720" cy="280" r="26" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" stroke-width="1.5"/>
    <circle cx="720" cy="280" r="16" fill="rgba(124,58,237,0.06)" stroke="#7c3aed" stroke-width="0.6" stroke-dasharray="3 4" opacity="0.3"/>
    <text x="720" y="315" text-anchor="middle" fill="#c4b5fd" font-size="10" font-family="system-ui" font-weight="600">Business Brain</text>
    <text x="720" y="330" text-anchor="middle" fill="#6b7280" font-size="7" font-family="monospace">Structured Context</text>
    <path d="M 746 280 L 790 280" stroke="#7c3aed" stroke-width="1.5" opacity="0.4"/>
    <circle cx="820" cy="280" r="20" fill="rgba(59,130,246,0.04)" stroke="#3b82f6" stroke-width="1.2"/>
    <circle cx="820" cy="280" r="10" stroke="#60a5fa" stroke-width="0.6" fill="none" opacity="0.4"/>
    <text x="820" y="315" text-anchor="middle" fill="#bfdbfe" font-size="9" font-family="system-ui" font-weight="600">AI Advisor</text>
    <text x="820" y="329" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Reasoning Layer</text>
    <path d="M 840 280 L 880 280" stroke="#fbbf24" stroke-width="1.5" opacity="0.4" stroke-dasharray="4 6"/>
    <rect x="890" y="262" width="100" height="36" rx="4" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-width="1" opacity="0.7"/>
    <text x="940" y="278" text-anchor="middle" fill="#fbbf24" font-size="9" font-family="system-ui" font-weight="600">Human</text>
    <text x="940" y="292" text-anchor="middle" fill="#fbbf24" font-size="9" font-family="system-ui" font-weight="600">Authority</text>
    <path d="M 990 280 L 1030 280" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
    <rect x="1040" y="268" width="50" height="24" rx="4" fill="rgba(16,185,129,0.04)" stroke="#10b981" stroke-width="0.8" opacity="0.7"/>
    <text x="1065" y="285" text-anchor="middle" fill="#34d399" font-size="9" font-family="system-ui" font-weight="500">Action</text>
  </g>
  <text x="120" y="465" text-anchor="middle" fill="#4b5563" font-size="8" font-family="monospace" letter-spacing="0.1em">FRAGMENTED</text>
  <text x="580" y="465" text-anchor="middle" fill="#7c3aed" font-size="8" font-family="monospace" letter-spacing="0.1em" font-weight="600">CONNECTED</text>
  <text x="950" y="465" text-anchor="middle" fill="#a78bfa" font-size="8" font-family="monospace" letter-spacing="0.1em">INTELLIGENT</text>
</svg>`,
  },
  2: {
    caption:
      "A business is a living system. Intelligence emerges from the whole, not one part.",
    aria:
      "An abstract living-system architecture: senses (signals and analytics) and direction (goals) feed a nervous system of connectors and events; memory holds CRM and knowledge; the dominant Business Brain is DigitalGate's structured business knowledge and context layer, distinct from the AI Advisor reasoning layer; hands (automation), voice (communications) and body (Platform Core and apps) act; an immune system of security and governance surrounds it; and learning returns outcomes to the system.",
    svg: `<svg viewBox="0 0 1100 550" aria-hidden="true">
  <defs>
    <radialGradient id="p2BrainGlow"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.2"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <radialGradient id="p2AdvisorGlow"><stop offset="0%" stop-color="#3b82f6" stop-opacity="0.12"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/></radialGradient>
    <linearGradient id="p2Nervous" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.1"/><stop offset="50%" stop-color="#7c3aed" stop-opacity="0.3"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0.1"/></linearGradient>
    ${GRID("p2Grid")}
  </defs>
  <rect width="1100" height="550" fill="#0f0f1a" rx="12"/>
  <rect width="1100" height="550" fill="url(#p2Grid)" rx="12"/>
  <path d="M 300 100 C 300 180, 300 280, 550 280" stroke="url(#p2Nervous)" stroke-width="2" fill="none" opacity="0.4"/>
  <path d="M 300 150 C 300 230, 300 330, 550 330" stroke="url(#p2Nervous)" stroke-width="1.5" fill="none" opacity="0.3"/>
  <path d="M 550 280 C 700 280, 760 280, 850 280" stroke="url(#p2Nervous)" stroke-width="2" fill="none" opacity="0.4"/>
  <text x="550" y="90" text-anchor="middle" fill="#4b5563" font-size="8" font-family="monospace" letter-spacing="0.1em">NERVOUS SYSTEM</text>
  <g>
    <text x="100" y="150" text-anchor="middle" fill="#4b5563" font-size="8" font-family="monospace" letter-spacing="0.1em">SENSES</text>
    <text x="100" y="165" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Signals + Analytics</text>
    <circle cx="80" cy="200" r="10" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="0.8"/><text x="80" y="222" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Web</text>
    <circle cx="120" cy="200" r="10" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="0.8"/><text x="120" y="222" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Leads</text>
    <circle cx="80" cy="240" r="10" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="0.8"/><text x="80" y="262" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Customers</text>
    <circle cx="120" cy="240" r="10" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="0.8"/><text x="120" y="262" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Revenue</text>
    <path d="M 90 200 L 200 240" stroke="#6366f1" stroke-width="0.8" stroke-dasharray="3 6" fill="none" opacity="0.3"/>
    <path d="M 130 200 L 200 260" stroke="#6366f1" stroke-width="0.8" stroke-dasharray="3 6" fill="none" opacity="0.3"/>
  </g>
  <g>
    <text x="100" y="350" text-anchor="middle" fill="#4b5563" font-size="8" font-family="monospace" letter-spacing="0.1em">DIRECTION</text>
    <text x="100" y="365" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Goals + Strategy</text>
    <circle cx="80" cy="400" r="16" fill="rgba(251,191,36,0.03)" stroke="#fbbf24" stroke-width="0.8"/>
    <circle cx="80" cy="400" r="8" stroke="#fbbf24" stroke-width="0.6" fill="none"/>
    <line x1="80" y1="392" x2="80" y2="408" stroke="#fbbf24" stroke-width="0.4" opacity="0.4"/>
    <line x1="72" y1="400" x2="88" y2="400" stroke="#fbbf24" stroke-width="0.4" opacity="0.4"/>
    <path d="M 96 400 C 180 400, 250 380, 320 360" stroke="#fbbf24" stroke-width="0.8" fill="none" opacity="0.2" stroke-dasharray="4 6"/>
  </g>
  <g>
    <text x="100" y="310" text-anchor="middle" fill="#4b5563" font-size="7" font-family="monospace" letter-spacing="0.1em">MEMORY</text>
    <circle cx="260" cy="280" r="45" fill="rgba(99,102,241,0.03)" stroke="#6366f1" stroke-width="1" opacity="0.6"/>
    <circle cx="260" cy="280" r="30" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="0.6" stroke-dasharray="4 6" opacity="0.3"/>
    <rect x="250" y="272" width="20" height="12" rx="1.5" stroke="#818cf8" stroke-width="0.6" fill="none"/>
    <rect x="254" y="276" width="12" height="4" rx="0.5" fill="#818cf8" opacity="0.15"/>
    <text x="260" y="315" text-anchor="middle" fill="#c7d2fe" font-size="10" font-family="system-ui" font-weight="600">Memory</text>
    <text x="260" y="330" text-anchor="middle" fill="#6b7280" font-size="7" font-family="monospace">CRM + Knowledge</text>
    <text x="260" y="345" text-anchor="middle" fill="#4b5563" font-size="6" font-family="monospace">Context Layer</text>
  </g>
  <g>
    <text x="260" y="400" text-anchor="middle" fill="#4b5563" font-size="8" font-family="monospace" letter-spacing="0.1em">LEARNING</text>
    <circle cx="260" cy="450" r="30" fill="rgba(52,211,153,0.03)" stroke="#34d399" stroke-width="0.8" opacity="0.5"/>
    <circle cx="260" cy="450" r="18" fill="rgba(52,211,153,0.04)" stroke="#34d399" stroke-width="0.5" stroke-dasharray="3 4" opacity="0.3"/>
    <path d="M 256 450 L 259 453 L 264 447" stroke="#34d399" stroke-width="0.8" fill="none" opacity="0.6"/>
    <text x="260" y="472" text-anchor="middle" fill="#34d399" font-size="7" font-family="system-ui" font-weight="500">Digital Twin</text>
    <text x="260" y="484" text-anchor="middle" fill="#6b7280" font-size="5" font-family="monospace">Evolving State</text>
  </g>
  <path d="M 305 280 C 360 280, 420 280, 480 280" stroke="#7c3aed" stroke-width="2.5" opacity="0.5"/>
  <g>
    <circle cx="560" cy="280" r="85" fill="url(#p2BrainGlow)"/>
    <circle cx="560" cy="280" r="62" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="6 8" opacity="0.4"/>
    <circle cx="560" cy="280" r="46" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
    <circle cx="560" cy="280" r="32" fill="rgba(124,58,237,0.08)" stroke="#7c3aed" stroke-width="0.8" stroke-dasharray="4 6" opacity="0.3"/>
    <circle cx="560" cy="280" r="18" fill="#7c3aed" opacity="0.08"/>
    <circle cx="560" cy="280" r="6" fill="#a78bfa" opacity="0.5"/>
    <line x1="560" y1="230" x2="560" y2="330" stroke="#7c3aed" stroke-width="0.5" opacity="0.3"/>
    <line x1="515" y1="280" x2="605" y2="280" stroke="#7c3aed" stroke-width="0.5" opacity="0.3"/>
    <line x1="528" y1="248" x2="592" y2="312" stroke="#7c3aed" stroke-width="0.4" opacity="0.2"/>
    <line x1="592" y1="248" x2="528" y2="312" stroke="#7c3aed" stroke-width="0.4" opacity="0.2"/>
    <circle cx="540" cy="260" r="5" fill="#7c3aed" opacity="0.2"/><circle cx="580" cy="260" r="5" fill="#7c3aed" opacity="0.2"/><circle cx="540" cy="300" r="5" fill="#7c3aed" opacity="0.2"/><circle cx="580" cy="300" r="5" fill="#7c3aed" opacity="0.2"/>
    <text x="560" y="332" text-anchor="middle" fill="#fff" font-size="14" font-family="system-ui" font-weight="700">Business Brain</text>
    <text x="560" y="352" text-anchor="middle" fill="#a78bfa" font-size="9" font-family="monospace">Structured Intelligence</text>
    <text x="560" y="367" text-anchor="middle" fill="#6b7280" font-size="7" font-family="monospace">Context + Knowledge</text>
  </g>
  <path d="M 645 280 C 710 280, 770 280, 830 280" stroke="#3b82f6" stroke-width="2.5" opacity="0.5"/>
  <g>
    <circle cx="900" cy="280" r="70" fill="url(#p2AdvisorGlow)"/>
    <circle cx="900" cy="280" r="45" fill="rgba(59,130,246,0.03)" stroke="#3b82f6" stroke-width="1.2" opacity="0.6"/>
    <circle cx="900" cy="280" r="30" fill="rgba(59,130,246,0.05)" stroke="#3b82f6" stroke-width="0.8" stroke-dasharray="3 5" opacity="0.4"/>
    <circle cx="900" cy="280" r="16" stroke="#60a5fa" stroke-width="0.8" fill="none" opacity="0.4"/>
    <circle cx="900" cy="280" r="7" stroke="#60a5fa" stroke-width="0.5" fill="none" opacity="0.3"/>
    <circle cx="900" cy="280" r="3" fill="#60a5fa" opacity="0.5"/>
    <line x1="896" y1="280" x2="904" y2="280" stroke="#60a5fa" stroke-width="0.4" opacity="0.4"/>
    <line x1="900" y1="276" x2="900" y2="284" stroke="#60a5fa" stroke-width="0.4" opacity="0.4"/>
    <text x="900" y="315" text-anchor="middle" fill="#bfdbfe" font-size="12" font-family="system-ui" font-weight="600">AI Advisor</text>
    <text x="900" y="332" text-anchor="middle" fill="#6b7280" font-size="8" font-family="monospace">Reasoning Layer</text>
    <text x="900" y="347" text-anchor="middle" fill="#4b5563" font-size="7" font-family="monospace">Recommends actions</text>
  </g>
  <rect x="30" y="30" width="1040" height="490" rx="20" fill="none" stroke="#6366f1" stroke-width="0.5" opacity="0.08" stroke-dasharray="8 12"/>
  <rect x="40" y="40" width="1020" height="470" rx="16" fill="none" stroke="#6366f1" stroke-width="0.3" opacity="0.05" stroke-dasharray="4 16"/>
  <text x="1060" y="80" text-anchor="middle" fill="#4b5563" font-size="7" font-family="monospace" letter-spacing="0.05em" transform="rotate(-90, 1060, 80)">IMMUNE SYSTEM</text>
  <text x="1060" y="400" text-anchor="middle" fill="#4b5563" font-size="7" font-family="monospace" letter-spacing="0.05em" transform="rotate(-90, 1060, 400)">HEALTH</text>
  <circle cx="1040" cy="450" r="14" fill="rgba(52,211,153,0.03)" stroke="#34d399" stroke-width="0.6" opacity="0.5"/>
  <path d="M 1032 450 L 1036 450 L 1038 444 L 1042 456 L 1046 448 L 1050 450" stroke="#34d399" stroke-width="1" fill="none" opacity="0.5"/>
  <text x="1040" y="475" text-anchor="middle" fill="#6ee7b7" font-size="6" font-family="system-ui">Diagnostic</text>
  <g>
    <text x="940" y="400" text-anchor="middle" fill="#4b5563" font-size="8" font-family="monospace" letter-spacing="0.1em">HANDS</text>
    <circle cx="940" cy="430" r="14" fill="rgba(16,185,129,0.03)" stroke="#10b981" stroke-width="0.6"/>
    <text x="940" y="456" text-anchor="middle" fill="#34d399" font-size="7" font-family="system-ui" font-weight="500">Automation</text>
    <path d="M 900 310 L 926 415" stroke="#10b981" stroke-width="0.8" opacity="0.2"/>
    <text x="940" y="490" text-anchor="middle" fill="#4b5563" font-size="8" font-family="monospace" letter-spacing="0.1em">VOICE</text>
    <circle cx="940" cy="510" r="14" fill="rgba(236,72,153,0.03)" stroke="#ec4899" stroke-width="0.6"/>
    <text x="940" y="536" text-anchor="middle" fill="#f472b6" font-size="7" font-family="system-ui" font-weight="500">Communications</text>
    <path d="M 900 310 L 926 500" stroke="#ec4899" stroke-width="0.8" opacity="0.2"/>
    <text x="940" y="380" text-anchor="middle" fill="#4b5563" font-size="8" font-family="monospace" letter-spacing="0.1em">BODY</text>
    <rect x="920" y="385" width="40" height="12" rx="2" fill="rgba(139,92,246,0.03)" stroke="#8b5cf6" stroke-width="0.4" opacity="0.4"/>
    <text x="940" y="394" text-anchor="middle" fill="#a78bfa" font-size="5" font-family="monospace">Core+Apps</text>
  </g>
  <text x="550" y="520" text-anchor="middle" fill="#4b5563" font-size="7" font-family="monospace" letter-spacing="0.1em">ONE LIVING SYSTEM · SENSE · MEMORY · BRAIN · REASON · ACT · LEARN</text>
</svg>`,
  },
  3: {
    caption:
      "The intelligence loop: connect, understand, advise, authorise, act, learn — with explicit human governance before any action.",
    aria:
      "A causal loop: connect signals, understand context, advise with recommendations, then a human authority gate for consequential decisions, only then authorised action, an outcome, and learning that returns to context. No action path exists before the amber human-authority gate.",
    svg: `<svg viewBox="0 0 1100 500" aria-hidden="true">
  <defs>
    <linearGradient id="p3Loop" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.2"/><stop offset="25%" stop-color="#7c3aed" stop-opacity="0.4"/><stop offset="50%" stop-color="#a78bfa" stop-opacity="0.4"/><stop offset="75%" stop-color="#fbbf24" stop-opacity="0.4"/><stop offset="100%" stop-color="#34d399" stop-opacity="0.2"/></linearGradient>
    ${GRID("p3Grid")}
  </defs>
  <rect width="1100" height="500" fill="#0f0f1a" rx="12"/>
  <rect width="1100" height="500" fill="url(#p3Grid)" rx="12"/>
  <path d="M 100 250 C 180 120, 920 120, 1000 250 C 1030 300, 1000 380, 900 380 C 550 380, 250 380, 150 380 C 80 380, 70 300, 100 250" stroke="url(#p3Loop)" stroke-width="3" fill="none" opacity="0.5"/>
  <g>
    <circle cx="150" cy="250" r="35" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="1.5"/>
    <text x="150" y="244" text-anchor="middle" fill="#818cf8" font-size="11" font-family="system-ui" font-weight="600">CONNECT</text>
    <text x="150" y="262" text-anchor="middle" fill="#6b7280" font-size="7" font-family="monospace">Signals in</text>
    <circle cx="100" cy="190" r="6" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="0.6"/><text x="100" y="182" text-anchor="middle" fill="#6b7280" font-size="5" font-family="monospace">Web</text>
    <circle cx="100" cy="210" r="6" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="0.6"/><text x="100" y="202" text-anchor="middle" fill="#6b7280" font-size="5" font-family="monospace">CRM</text>
    <circle cx="100" cy="230" r="6" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="0.6"/><text x="100" y="222" text-anchor="middle" fill="#6b7280" font-size="5" font-family="monospace">Email</text>
  </g>
  <g>
    <circle cx="380" cy="160" r="35" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" stroke-width="1.5"/>
    <text x="380" y="154" text-anchor="middle" fill="#c4b5fd" font-size="11" font-family="system-ui" font-weight="600">UNDERSTAND</text>
    <text x="380" y="172" text-anchor="middle" fill="#6b7280" font-size="7" font-family="monospace">Context forms</text>
    <path d="M 185 250 C 250 220, 300 190, 345 175" stroke="#7c3aed" stroke-width="1.5" opacity="0.3"/>
  </g>
  <g>
    <circle cx="620" cy="160" r="35" fill="rgba(59,130,246,0.04)" stroke="#3b82f6" stroke-width="1.5"/>
    <text x="620" y="154" text-anchor="middle" fill="#60a5fa" font-size="11" font-family="system-ui" font-weight="600">ADVISE</text>
    <text x="620" y="172" text-anchor="middle" fill="#6b7280" font-size="7" font-family="monospace">Recommendations</text>
    <path d="M 415 160 C 480 160, 550 160, 585 160" stroke="#3b82f6" stroke-width="1.5" opacity="0.3"/>
  </g>
  <g>
    <rect x="740" y="310" width="220" height="44" rx="6" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-width="1.5" opacity="0.7"/>
    <text x="850" y="326" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="system-ui" font-weight="600">HUMAN AUTHORITY</text>
    <text x="850" y="342" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="monospace">Consequential decisions</text>
    <path d="M 655 160 C 730 200, 780 240, 810 280" stroke="#fbbf24" stroke-width="1.5" opacity="0.4" stroke-dasharray="5 8"/>
  </g>
  <g>
    <circle cx="850" cy="250" r="35" fill="rgba(16,185,129,0.04)" stroke="#10b981" stroke-width="1.5"/>
    <text x="850" y="244" text-anchor="middle" fill="#34d399" font-size="11" font-family="system-ui" font-weight="600">ACT</text>
    <text x="850" y="262" text-anchor="middle" fill="#6b7280" font-size="7" font-family="monospace">Authorised execution</text>
    <path d="M 850 310 L 850 285" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
  </g>
  <g>
    <circle cx="380" cy="380" r="35" fill="rgba(52,211,153,0.04)" stroke="#34d399" stroke-width="1.5"/>
    <text x="380" y="374" text-anchor="middle" fill="#34d399" font-size="11" font-family="system-ui" font-weight="600">LEARN</text>
    <text x="380" y="392" text-anchor="middle" fill="#6b7280" font-size="7" font-family="monospace">Outcomes update context</text>
    <path d="M 850 285 C 850 380, 700 380, 415 380" stroke="#34d399" stroke-width="1.5" opacity="0.4" stroke-dasharray="6 10"/>
    <text x="630" y="415" text-anchor="middle" fill="#34d399" font-size="7" font-family="monospace" opacity="0.6">↺ Learning returns to context</text>
  </g>
  <text x="550" y="465" text-anchor="middle" fill="#4b5563" font-size="7" font-family="monospace" letter-spacing="0.1em">CONNECT → UNDERSTAND → ADVISE → HUMAN AUTHORITY → ACT → LEARN ↺</text>
</svg>`,
  },
  4: {
    caption:
      "The maturity progression from passive software to an intelligent, governed learning system.",
    aria:
      "A maturity progression: passive software, assistive, proactive, governed automation, learning system. Alongside, a contrast between information (a bare count of 47 opportunities) and direction (seven opportunities need attention, three high-value prospects have gone quiet, priority follow-up is ready). Human authority remains explicit; the machine observes, reasons, prepares and learns.",
    svg: `<svg viewBox="0 0 1100 480" aria-hidden="true">
  <defs>
    <linearGradient id="p4Maturity" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.1"/><stop offset="25%" stop-color="#7c3aed" stop-opacity="0.2"/><stop offset="50%" stop-color="#7c3aed" stop-opacity="0.3"/><stop offset="75%" stop-color="#fbbf24" stop-opacity="0.2"/><stop offset="100%" stop-color="#34d399" stop-opacity="0.2"/></linearGradient>
    ${GRID("p4Grid")}
  </defs>
  <rect width="1100" height="480" fill="#0f0f1a" rx="12"/>
  <rect width="1100" height="480" fill="url(#p4Grid)" rx="12"/>
  <path d="M 100 240 C 300 240, 500 240, 700 240 C 900 240, 980 240, 1030 240" stroke="url(#p4Maturity)" stroke-width="2" fill="none" opacity="0.4"/>
  <g>
    <circle cx="150" cy="240" r="32" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="1.2" opacity="0.4"/>
    <text x="150" y="234" text-anchor="middle" fill="#818cf8" font-size="9" font-family="system-ui" font-weight="600">PASSIVE</text>
    <text x="150" y="252" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Data</text>
    <text x="150" y="290" text-anchor="middle" fill="#4b5563" font-size="6" font-family="monospace">Dashboards</text>
  </g>
  <text x="220" y="245" fill="#4b5563" font-size="14" opacity="0.3">→</text>
  <g>
    <circle cx="300" cy="240" r="32" fill="rgba(99,102,241,0.04)" stroke="#6366f1" stroke-width="1.2" opacity="0.5"/>
    <text x="300" y="234" text-anchor="middle" fill="#818cf8" font-size="9" font-family="system-ui" font-weight="600">ASSISTIVE</text>
    <text x="300" y="252" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Search</text>
    <text x="300" y="290" text-anchor="middle" fill="#4b5563" font-size="6" font-family="monospace">Answers</text>
  </g>
  <text x="370" y="245" fill="#4b5563" font-size="14" opacity="0.3">→</text>
  <g>
    <circle cx="460" cy="240" r="38" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" stroke-width="1.5" opacity="0.6"/>
    <text x="460" y="232" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui" font-weight="600">PROACTIVE</text>
    <text x="460" y="250" text-anchor="middle" fill="#a78bfa" font-size="6" font-family="monospace">Priorities</text>
    <text x="460" y="290" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Recommendations</text>
  </g>
  <text x="540" y="245" fill="#4b5563" font-size="14" opacity="0.3">→</text>
  <g>
    <circle cx="650" cy="240" r="38" fill="rgba(251,191,36,0.04)" stroke="#fbbf24" stroke-width="1.5" opacity="0.6"/>
    <text x="650" y="230" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="system-ui" font-weight="600">GOVERNED</text>
    <text x="650" y="248" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="system-ui" font-weight="600">AUTOMATION</text>
    <text x="650" y="290" text-anchor="middle" fill="#6b7280" font-size="6" font-family="monospace">Permissions + Oversight</text>
  </g>
  <text x="730" y="245" fill="#4b5563" font-size="14" opacity="0.3">→</text>
  <g>
    <circle cx="850" cy="240" r="44" fill="rgba(52,211,153,0.04)" stroke="#34d399" stroke-width="2" opacity="0.7"/>
    <circle cx="850" cy="240" r="28" fill="rgba(52,211,153,0.06)" stroke="#34d399" stroke-width="0.8" stroke-dasharray="4 6" opacity="0.3"/>
    <circle cx="850" cy="240" r="14" fill="rgba(52,211,153,0.04)" stroke="#34d399" stroke-width="0.5" opacity="0.2"/>
    <circle cx="850" cy="240" r="5" fill="#34d399" opacity="0.15"/>
    <path d="M 846 240 L 849 243 L 854 237" stroke="#34d399" stroke-width="0.8" fill="none" opacity="0.6"/>
    <text x="850" y="224" text-anchor="middle" fill="#34d399" font-size="9" font-family="system-ui" font-weight="700">LEARNING</text>
    <text x="850" y="242" text-anchor="middle" fill="#34d399" font-size="9" font-family="system-ui" font-weight="700">SYSTEM</text>
    <text x="850" y="295" text-anchor="middle" fill="#6ee7b7" font-size="6" font-family="monospace">Outcomes → Context</text>
  </g>
  <g>
    <text x="300" y="360" text-anchor="middle" fill="#4b5563" font-size="8" font-family="monospace" letter-spacing="0.1em">INFORMATION</text>
    <rect x="200" y="375" width="200" height="60" rx="6" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
    <text x="220" y="400" fill="#6b7280" font-size="8" font-family="monospace">Opportunities</text>
    <text x="220" y="420" fill="#4b5563" font-size="22" font-family="system-ui" font-weight="700">47</text>
    <text x="220" y="435" fill="#4b5563" font-size="6" font-family="monospace">All listed · No priority</text>
    <text x="750" y="360" text-anchor="middle" fill="#a78bfa" font-size="8" font-family="monospace" letter-spacing="0.1em">DIRECTION</text>
    <rect x="660" y="375" width="280" height="80" rx="6" fill="rgba(124,58,237,0.03)" stroke="rgba(124,58,237,0.08)" stroke-width="0.5"/>
    <circle cx="680" cy="395" r="4" fill="#fbbf24" opacity="0.6"/><text x="692" y="398" fill="#fbbf24" font-size="8" font-family="system-ui" font-weight="500">Seven opportunities need attention</text>
    <circle cx="680" cy="415" r="4" fill="#fbbf24" opacity="0.4"/><text x="692" y="418" fill="#fbbf24" font-size="8" font-family="system-ui" font-weight="500">Three high-value prospects have gone quiet</text>
    <circle cx="680" cy="435" r="4" fill="#34d399" opacity="0.6"/><text x="692" y="438" fill="#34d399" font-size="8" font-family="system-ui" font-weight="500">Priority follow-up is ready</text>
  </g>
  <text x="550" y="465" text-anchor="middle" fill="#4b5563" font-size="6" font-family="monospace" letter-spacing="0.05em">HUMAN AUTHORITY REMAINS EXPLICIT · MACHINE OBSERVES · REASONS · PREPARES · LEARNS</text>
</svg>`,
  },
};
