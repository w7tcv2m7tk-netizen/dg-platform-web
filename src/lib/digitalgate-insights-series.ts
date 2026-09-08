/**
 * DigitalGate Insights — shared SERIES SHELL (renderer-owned).
 *
 * The four Insights articles are authored independently in Website Studio, with
 * divergent hero markup, chapter numbering, metadata and widths. This module
 * normalises every part into ONE editorial series shell at render time, so all
 * four unmistakably read as chapters of one four-part series:
 *
 *   breadcrumb → DigitalGate Insights badge → Part X of 4 → progress →
 *   title → lede → author/read-time → (signature visual) → … → series nav.
 *
 * Content authority stays in Website Studio: the TITLE and LEDE text are
 * extracted from the existing hero (never re-authored here); only the series
 * chrome (badge, Part X of 4, progress, breadcrumb, metadata, series
 * navigation) is renderer-owned presentation. Idempotent and no Neon writes.
 * The shared CSS lives in `components/websites/digitalgate-visual-storytelling-css.ts`.
 */

export type InsightsPart = 1 | 2 | 3 | 4;

type ChapterMeta = {
  slug: string;
  route: string;
  chapter: string;
  title: string;
};

/** Canonical four-part order (real production routes, no href="#"). */
const SERIES: Record<InsightsPart, ChapterMeta> = {
  1: {
    slug: "from-dumb-businesses-to-smart-businesses",
    route: "/from-dumb-businesses-to-smart-businesses/",
    chapter: "The problem",
    title: "From fragmented businesses to intelligent ones",
  },
  2: {
    slug: "intelligent-business-more-than-a-brain",
    route: "/intelligent-business-more-than-a-brain/",
    chapter: "The intelligent system",
    title: "The intelligent business is more than a brain",
  },
  3: {
    slug: "from-signal-to-action",
    route: "/from-signal-to-action/",
    chapter: "Signal → action",
    title: "From signal to action",
  },
  4: {
    slug: "business-software-should-tell-you-what-needs-doing",
    route: "/business-software-should-tell-you-what-needs-doing/",
    chapter: "Proactive learning system",
    title: "The software that tells you what needs doing",
  },
};

const PARTS: InsightsPart[] = [1, 2, 3, 4];

/** Marker proving the shell has already been applied (idempotency). */
export const SERIES_SHELL_MARKER = 'data-dg-insights-shell="v1"';

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the hero block regardless of whether it is a <header> or <section>. */
function findHero(html: string): { block: string; inner: string } | null {
  const m = html.match(
    /<(header|section)\b[^>]*\bclass="[^"]*\bhero\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/i,
  );
  if (!m) return null;
  return { block: m[0], inner: m[2] };
}

function extractTitle(inner: string): string {
  const m = inner.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? m[1].trim() : "";
}

function extractLede(inner: string): string {
  // Prefer an explicit thesis/hero-thesis; fall back to the first lead paragraph.
  const thesis = inner.match(
    /<p\b[^>]*\bclass="[^"]*\b(?:hero-thesis|thesis)\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
  );
  if (thesis) return thesis[1].trim();
  const sub = inner.match(
    /<p\b[^>]*\bclass="[^"]*\b(?:hero-sub|lead)\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
  );
  return sub ? sub[1].trim() : "";
}

function extractReadMinutes(inner: string, full: string): number {
  const m =
    inner.match(/(\d{1,2})\s*min read/i) || full.match(/(\d{1,2})\s*min read/i);
  return m ? Number(m[1]) : 8;
}

function progressDots(current: InsightsPart): string {
  const dots = PARTS.map(
    (p) => `<i class="${p === current ? "is-on" : ""}"></i>`,
  ).join("");
  return `<span class="dg-insights-progress" role="img" aria-label="Part ${current} of 4">${dots}</span>`;
}

function buildHero(
  part: InsightsPart,
  title: string,
  lede: string,
  readMin: number,
): string {
  const plainTitle = stripTags(title);
  return `<header class="dg-insights-hero" ${SERIES_SHELL_MARKER}>
  <div class="dg-insights-shell">
    <nav class="dg-insights-breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span aria-hidden="true">›</span><a href="/insights/">Insights</a><span aria-hidden="true">›</span><span class="dg-insights-breadcrumb__current" aria-current="page">${plainTitle}</span>
    </nav>
    <div class="dg-insights-eyebrow">
      <span class="dg-insights-badge">DigitalGate Insights</span>
      <span class="dg-insights-part">Part ${part} of 4</span>
      ${progressDots(part)}
    </div>
    <h1 class="dg-insights-title">${title}</h1>
    ${lede ? `<p class="dg-insights-lede">${lede}</p>` : ""}
    <p class="dg-insights-meta"><span class="dg-insights-avatar" aria-hidden="true">DG</span> By DigitalGate<span class="dg-insights-meta__sep" aria-hidden="true">·</span>${readMin} min read</p>
  </div>
</header>`;
}

function buildSeriesNav(part: InsightsPart): string {
  const items = PARTS.map((p) => {
    const meta = SERIES[p];
    const cur = p === part;
    const inner = `<span class="dg-insights-chapter__num">0${p}</span><span class="dg-insights-chapter__meta"><span class="dg-insights-chapter__kicker">${meta.chapter}</span><span class="dg-insights-chapter__title">${meta.title}</span></span>`;
    return cur
      ? `<li class="dg-insights-chapter is-current" aria-current="true">${inner}</li>`
      : `<li class="dg-insights-chapter"><a href="${meta.route}">${inner}</a></li>`;
  }).join("");

  const next =
    part < 4
      ? `<a class="dg-insights-next" href="${SERIES[(part + 1) as InsightsPart].route}"><span class="dg-insights-next__k">Next in the series</span><span class="dg-insights-next__t">Part ${part + 1} — ${SERIES[(part + 1) as InsightsPart].title}</span><span class="dg-insights-next__a" aria-hidden="true">→</span></a>`
      : `<a class="dg-insights-next dg-insights-next--end" href="/insights/"><span class="dg-insights-next__k">End of the series</span><span class="dg-insights-next__t">Explore all four DigitalGate Insights chapters</span><span class="dg-insights-next__a" aria-hidden="true">→</span></a>`;

  return `<nav class="dg-insights-series-nav" aria-label="DigitalGate Insights series navigation" ${SERIES_SHELL_MARKER}>
  <div class="dg-insights-shell">
    <p class="dg-insights-series-nav__eyebrow">DigitalGate Insights · A four-part series</p>
    <ol class="dg-insights-series-nav__list">${items}</ol>
    ${next}
  </div>
</nav>`;
}

/**
 * Normalise an Insights article into the shared series shell. Replaces the
 * per-article hero with a canonical one, removes stale in-article series
 * chrome, and appends the shared series-progression footer. Idempotent.
 */
export function applyInsightsSeriesShell(
  html: string,
  part: InsightsPart,
): string {
  if (!html || html.includes(SERIES_SHELL_MARKER)) return html;

  let out = html;

  // 1) Rebuild the hero from the existing (Website Studio) content.
  const hero = findHero(out);
  if (hero) {
    const title = extractTitle(hero.inner);
    if (title) {
      const lede = extractLede(hero.inner);
      const readMin = extractReadMinutes(hero.inner, out);
      out = out.replace(hero.block, buildHero(part, title, lede, readMin));
    }
  }

  // 2) Remove stale, per-article top series navigation (Parts 1–2) and any
  //    old "next / continue" blocks (Parts 3–4) — the shared footer replaces them.
  out = removeBlocks(out, [
    /<nav\b[^>]*\bclass="[^"]*\bdg-series-nav\b[^"]*"[^>]*>[\s\S]*?<\/nav>/gi,
    /<(?:aside|div|section)\b[^>]*\bclass="[^"]*\bdg-next\b[^"]*"[^>]*>[\s\S]*?<\/(?:aside|div|section)>/gi,
  ]);

  // 3) Append the shared four-part series navigation at the end of the article.
  const closeIdx = out.lastIndexOf("</div>");
  const nav = buildSeriesNav(part);
  out =
    closeIdx >= 0
      ? `${out.slice(0, closeIdx)}${nav}\n${out.slice(closeIdx)}`
      : `${out}${nav}`;

  return out;
}

function removeBlocks(html: string, patterns: RegExp[]): string {
  let out = html;
  for (const re of patterns) out = out.replace(re, "");
  return out;
}
