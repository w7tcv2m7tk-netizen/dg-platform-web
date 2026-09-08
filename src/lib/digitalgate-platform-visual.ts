/**
 * Platform Overview visual weaving — ported from the approved PR #144
 * implementation, isolated so current Insights presentation code on main is
 * untouched.
 *
 * Presentation only: injects renderer-owned `dgpov-*` architecture figures at
 * Website Studio section anchors. Idempotent. No Neon writes.
 */

import {
  PLATFORM_STAGE_OF_ATTR,
  platformOverviewStages,
  type PlatformStageDef,
} from "./digitalgate-visual-stages-platform";

const HEADING_RE = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

function normaliseHeading(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type HeadingHit = { start: number; text: string };

function collectHeadings(html: string): HeadingHit[] {
  const hits: HeadingHit[] = [];
  HEADING_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HEADING_RE.exec(html)) !== null) {
    hits.push({ start: m.index, text: normaliseHeading(m[0]) });
  }
  return hits;
}

function articleEndIndex(html: string): number {
  for (const tag of ["</article>", "</main>"]) {
    const idx = html.lastIndexOf(tag);
    if (idx >= 0) return idx;
  }
  return html.length;
}

function findInsertIndex(html: string): number {
  const markers = ["</header>", "</section>", "<main", "<article"];
  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx >= 0) {
      if (marker.startsWith("</")) return idx + marker.length;
      return idx;
    }
  }
  return -1;
}

/** Place each stage at the end of the first matching section (by heading anchor). */
function placePlatformStages(html: string, stages: PlatformStageDef[]): string {
  const headings = collectHeadings(html);
  const endIdx = articleEndIndex(html);

  if (headings.length === 0) {
    const at = findInsertIndex(html);
    const joined = stages.map((s) => s.html).join("\n");
    return at < 0
      ? `${joined}\n${html}`
      : `${html.slice(0, at)}\n${joined}\n${html.slice(at)}`;
  }

  const used = new Set<number>();
  const stageHeading: Array<number | null> = stages.map(() => null);
  const pending: number[] = [];

  stages.forEach((stage, si) => {
    let found = -1;
    for (let hi = 0; hi < headings.length; hi += 1) {
      if (used.has(hi)) continue;
      if (stage.anchors.some((a) => headings[hi].text.includes(a))) {
        found = hi;
        break;
      }
    }
    if (found >= 0) {
      stageHeading[si] = found;
      used.add(found);
    } else {
      pending.push(si);
    }
  });

  const remaining = headings.map((_, i) => i).filter((i) => !used.has(i));
  pending.forEach((si, k) => {
    let hi: number;
    if (remaining.length) {
      const pos = Math.min(
        remaining.length - 1,
        Math.floor(((k + 1) / (pending.length + 1)) * remaining.length),
      );
      hi = remaining[pos];
      if (used.has(hi)) hi = remaining.find((x) => !used.has(x)) ?? hi;
    } else {
      hi = headings.length - 1;
    }
    stageHeading[si] = hi;
    used.add(hi);
  });

  const placements = stages.map((stage, si) => {
    const hi = stageHeading[si];
    const index =
      hi == null
        ? endIdx
        : hi + 1 < headings.length
          ? Math.min(headings[hi + 1].start, endIdx)
          : endIdx;
    return { index, order: si, html: stage.html };
  });

  let out = html;
  placements
    .slice()
    .sort((a, b) => b.index - a.index || b.order - a.order)
    .forEach((p) => {
      out = `${out.slice(0, p.index)}\n${p.html}\n${out.slice(p.index)}`;
    });
  return out;
}

/**
 * Idempotently weave Platform Overview architecture scenes into Website Studio
 * HTML. SEO-critical copy is preserved; only visuals are injected.
 */
export function enhancePlatformOverviewHtml(html: string): string {
  if (!html) return html;
  if (html.includes(`${PLATFORM_STAGE_OF_ATTR}="platform-overview"`)) {
    return html;
  }
  return placePlatformStages(html, platformOverviewStages());
}
