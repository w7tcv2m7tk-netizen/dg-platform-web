/**
 * DigitalGate visual STAGES (#48) — renderer-owned, reusable visual-storytelling
 * primitives for the Insights series.
 *
 * These are deliberately substantial "scenes", not small utility cards, and they
 * are generated INDIVIDUALLY so the renderer can weave them through the article
 * at semantic anchors (READ → SEE → READ → SEE the next layer) rather than
 * stacking them after the hero.
 *
 * Presentation only: HTML + SVG strings. No client JS, no Neon writes. Matching
 * CSS lives in `components/websites/digitalgate-visual-storytelling-css.ts`.
 *
 * Reusable vocabulary (styled in CSS):
 *   dg-stage   — one expanded visual scene (data-dg-stage="<name>")
 *   dg-brain   — the recognisable Business Brain™ object (reused across parts)
 *   dg-node    — a labelled system node (.is-signal/.is-live/.is-positive/.is-attention)
 *   dg-rail    — a maturity / progression rail
 *   dg-gate    — an explicit human-decision (approval) gate
 *   dg-frame   — a product / interface surface (glass UI)
 *   dg-flow    — a signal path travelling through the system
 */

import { part4 } from "./digitalgate-visual-stages-part4";

export type DigitalgateStageKind =
  | "insights-part-1"
  | "insights-part-2"
  | "insights-part-3"
  | "insights-part-4";

/**
 * One weavable scene. `anchors` are lowercase heading-substring hints; the
 * renderer places the scene at the end of the first article section whose
 * heading matches, with graceful fallback to even distribution.
 */
export type StageDef = {
  name: string;
  anchors: string[];
  html: string;
};

/** Every rendered stage carries this attribute so idempotency is per-page-kind. */
export const STAGE_OF_ATTR = "data-dg-stage-of";

/** True when this kind's stages are already present (idempotency guard). */
export function hasStagesForKind(html: string, kind: DigitalgateStageKind): boolean {
  return html.includes(`${STAGE_OF_ATTR}="${kind}"`);
}

/**
 * The recognisable Business Brain™ object. Reused (at varying scale / emphasis)
 * across every part so the series builds one consistent visual identity.
 */
function brainCore(opts?: { idSuffix?: string }): string {
  const id = opts?.idSuffix ?? "";
  return `<span class="dg-brain" data-dg-brain aria-hidden="true">
  <svg viewBox="0 0 120 120" class="dg-brain__glyph">
    <defs>
      <radialGradient id="dgBrainFill${id}" cx="50%" cy="42%" r="70%">
        <stop offset="0%" stop-color="#bfdbfe" stop-opacity="0.9"/>
        <stop offset="45%" stop-color="#3b82f6" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.35"/>
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(147,197,253,0.25)" stroke-width="1"/>
    <path class="dg-brain__hex" d="M60 16 L98 38 L98 82 L60 104 L22 82 L22 38 Z" fill="url(#dgBrainFill${id})" stroke="rgba(191,219,254,0.65)" stroke-width="1.5"/>
    <path d="M60 26 L60 94 M34 42 L86 78 M86 42 L34 78" stroke="rgba(226,232,240,0.35)" stroke-width="1"/>
    <circle cx="60" cy="60" r="9" fill="#0b1220" stroke="#93c5fd" stroke-width="1.5"/>
    <circle class="dg-brain__spark" cx="60" cy="60" r="3" fill="#dbeafe"/>
  </svg>
</span>`;
}

function stage(input: {
  kind: DigitalgateStageKind;
  name: string;
  index: string;
  eyebrow: string;
  title: string;
  lede: string;
  scene: string;
  caption: string;
  ariaLabel: string;
  variant?: string;
}): string {
  const variant = input.variant ? ` ${input.variant}` : "";
  return `<section class="dg-stage${variant}" data-dg-stage="${input.name}" ${STAGE_OF_ATTR}="${input.kind}" role="figure" aria-label="${input.ariaLabel}">
  <div class="dg-stage__intro">
    <p class="dg-stage__kicker"><span class="dg-stage__step" aria-hidden="true">${input.index}</span><span class="dg-stage__eyebrow">${input.eyebrow}</span></p>
    <h3 class="dg-stage__title">${input.title}</h3>
    <p class="dg-stage__lede">${input.lede}</p>
  </div>
  <div class="dg-stage__scene">${input.scene}</div>
  <p class="dg-stage__caption">${input.caption}</p>
</section>`;
}

/* —————————————————————————————————————————————————————————————————————————
 * PART 1 — “From dumb businesses to smart businesses”
 *
 * A faithful PORT of the approved DigitalGate concept prototype into
 * renderer-owned SVG/HTML (no client JS). Four visual moments are woven through
 * the real Website Studio article at semantic anchors:
 *   1. Fragmentation → DigitalGate core (scattered muted systems, broken signal
 *      paths, convergence, a luminous concentric intelligence core).
 *   2. Restrained problem indicators (icon + label + sublabel; not feature cards).
 *   3. Transformation rail FRAGMENTED → CONNECTED → INTELLIGENT → COORDINATED.
 *   4. Business-intelligence architecture: data sources → Digital Twin → the
 *      dominant Business Brain → AI Advisor → Recommend / Automation / Execution.
 * All presentation classes are namespaced `dgp1-` so Parts 2–4 are untouched.
 * ————————————————————————————————————————————————————————————————————————— */

/** Lucide-equivalent icon paths (24×24, stroked). */
const ICON: Record<string, string> = {
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  chart: "M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3",
  mail: "M2 5.5h20v13H2z M2 7l10 6 10-6",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M2 12h20 M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z",
  dollar: "M12 1.5v21 M17 5.5H9.5a3.3 3.3 0 0 0 0 6.6h5a3.3 3.3 0 0 1 0 6.6H6",
  message: "M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  calendar: "M4 4.5h16v16H4z M4 9.5h16 M8 2.5v4 M16 2.5v4",
  crosshair: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v12 M6 12h12",
  layers: "M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  gitbranch: "M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M15 6a9 9 0 0 1-9 9",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4",
  radio: "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M7.8 16.2a6 6 0 0 1 0-8.5 M16.2 7.8a6 6 0 0 1 0 8.5 M4.9 19.1a10 10 0 0 1 0-14.2 M19.1 4.9a10 10 0 0 1 0 14.2",
  signal: "M2 20h.01 M7 20v-4 M12 20v-8 M17 20V8 M22 20V4",
  network: "M9 2h6v6H9z M2 16h6v6H2z M16 16h6v6h-6z M6 16v-2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2 M12 13V8",
  target: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  contextbox: "M2 2h20v20H2z M8 2v20 M16 2v20",
  reason: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 4v2 M12 18v2 M4 12h2 M18 12h2",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2",
  refresh: "M21 12a9 9 0 1 1-6.2-8.56 M21 3v6h-6",
};

function iconG(key: string, cx: number, cy: number, size: number, color: string, opacity = 0.6): string {
  const s = size / 24;
  return `<g transform="translate(${(cx - size / 2).toFixed(1)},${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"><path d="${ICON[key]}"/></g>`;
}

/** The luminous DigitalGate intelligence core: rounded container + concentric
 * rings + crosshair + pulsing centre (matches the prototype). */
function p1CoreGeo(cx: number, cy: number, box: number): string {
  const h = box / 2;
  return `<rect x="${cx - h}" y="${cy - h}" width="${box}" height="${box}" rx="${Math.round(box * 0.14)}" fill="rgba(124,58,237,0.12)" stroke="rgba(124,58,237,0.32)"/>
  <circle cx="${cx}" cy="${cy}" r="${(box * 0.22).toFixed(0)}" fill="none" stroke="#7c3aed" stroke-width="1" opacity="0.4"/>
  <circle cx="${cx}" cy="${cy}" r="${(box * 0.14).toFixed(0)}" fill="none" stroke="#3b82f6" stroke-width="1" opacity="0.35"/>
  <circle cx="${cx}" cy="${cy}" r="${(box * 0.06).toFixed(0)}" fill="#7c3aed" opacity="0.35"/>
  <circle class="dgp1-corepulse" cx="${cx}" cy="${cy}" r="${(box * 0.03).toFixed(0)}" fill="#a78bfa"/>
  <path d="M${cx} ${cy - box * 0.22}V${cy + box * 0.22} M${cx - box * 0.22} ${cy}H${cx + box * 0.22} M${cx - box * 0.16} ${cy - box * 0.16}L${cx + box * 0.16} ${cy + box * 0.16} M${cx + box * 0.16} ${cy - box * 0.16}L${cx - box * 0.16} ${cy + box * 0.16}" stroke="#7c3aed" stroke-width="0.6" opacity="0.3"/>`;
}

/** A small orbital node around the core (icon in a translucent rounded square). */
function p1MiniNode(cx: number, cy: number, size: number, key: string, tint: string, tintBg: string): string {
  const h = size / 2;
  return `<rect x="${cx - h}" y="${cy - h}" width="${size}" height="${size}" rx="${Math.round(size * 0.28)}" fill="${tintBg}" stroke="${tint}" stroke-opacity="0.3"/>
  ${iconG(key, cx, cy, size * 0.5, tint, 0.85)}`;
}

/* ——— Scene 1 · Fragmentation → DigitalGate core (signature) ——— */

function p1FragScene(): string {
  const tile = (
    key: string,
    x: number,
    y: number,
    sz: number,
    ic: string,
    st: string,
    label: string,
  ) => `<g>
    <rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="${Math.round(sz * 0.16)}" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/>
    ${iconG(key, x + sz / 2, y + sz / 2, Math.round(sz * 0.42), ic, 0.6)}
    <circle class="dgp1-pulse" cx="${x + sz - 6}" cy="${y + 6}" r="4" fill="${st}"/>
    <text x="${x + sz / 2}" y="${y + sz + 18}" text-anchor="middle" fill="#6b7280" font-size="11" font-family="ui-monospace,SFMono-Regular,monospace" letter-spacing="0.6">${label}</text>
  </g>`;

  const dTiles = [
    tile("globe", 232, 60, 80, "#a78bfa", "#ef4444", "Website"),
    tile("users", 44, 116, 96, "#60a5fa", "#ef4444", "CRM"),
    tile("calendar", 290, 232, 64, "#22d3ee", "#f59e0b", "Bookings"),
    tile("chart", 150, 330, 80, "#4ade80", "#eab308", "Analytics"),
    tile("message", 322, 412, 64, "#818cf8", "#ef4444", "Messaging"),
    tile("mail", 38, 452, 64, "#93c5fd", "#f59e0b", "Email"),
    tile("dollar", 122, 470, 96, "#86efac", "#eab308", "Accounting"),
  ].join("");

  const broken = [
    ["M140 150 L232 100", "#ef4444"],
    ["M272 128 L300 232", "#f59e0b"],
    ["M190 410 L168 470", "#ef4444"],
    ["M322 444 L318 300", "#f59e0b"],
    ["M102 480 L150 410", "#ef4444"],
    ["M216 500 L290 300", "#f59e0b"],
  ]
    .map(
      ([d, c]) =>
        `<path d="${d}" stroke="${c}" stroke-width="1.25" stroke-dasharray="4 9" fill="none" opacity="0.28"/>`,
    )
    .join("");

  const conv = [
    "M360 120 C 560 150, 700 300, 872 300",
    "M366 250 C 560 260, 720 300, 872 300",
    "M360 386 C 560 360, 720 300, 872 300",
    "M270 500 C 540 450, 720 320, 872 300",
    "M260 172 C 540 210, 720 288, 872 300",
  ]
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="url(#dgp1Conv)" stroke-width="1.5"/><path class="dgp1-flow" d="${d}" fill="none" stroke="#8fd6ff" stroke-width="1.2" stroke-opacity="0.7"/>`,
    )
    .join("");

  const core = (cx: number, cy: number, box: number, nodeSize: number) => `
  <circle cx="${cx}" cy="${cy}" r="${(box * 1.5).toFixed(0)}" fill="url(#dgp1CoreGlow)"/>
  <g class="dgp1-orbit-slow" style="transform-origin:${cx}px ${cy}px"><ellipse cx="${cx}" cy="${cy}" rx="${(box * 0.86).toFixed(0)}" ry="${(box * 0.58).toFixed(0)}" transform="rotate(-20 ${cx} ${cy})" fill="none" stroke="#7c3aed" stroke-width="0.7" opacity="0.32"/></g>
  <g class="dgp1-orbit-rev" style="transform-origin:${cx}px ${cy}px"><ellipse cx="${cx}" cy="${cy}" rx="${(box * 0.96).toFixed(0)}" ry="${(box * 0.46).toFixed(0)}" transform="rotate(30 ${cx} ${cy})" fill="none" stroke="#3b82f6" stroke-width="0.7" opacity="0.24"/></g>
  <ellipse cx="${cx}" cy="${cy}" rx="${(box * 0.7).toFixed(0)}" ry="${(box * 0.7).toFixed(0)}" transform="rotate(45 ${cx} ${cy})" fill="none" stroke="#7c3aed" stroke-width="0.5" opacity="0.2"/>
  ${p1MiniNode(cx + box * 0.62, cy - box * 0.66, nodeSize, "crosshair", "#a78bfa", "rgba(139,92,246,0.12)")}
  ${p1MiniNode(cx - box * 0.72, cy + box * 0.66, nodeSize, "layers", "#60a5fa", "rgba(59,130,246,0.12)")}
  ${p1MiniNode(cx + box * 0.9, cy + box * 0.1, nodeSize * 0.85, "gear", "#a78bfa", "rgba(139,92,246,0.1)")}
  ${p1MiniNode(cx - box * 0.92, cy - box * 0.05, nodeSize * 0.85, "activity", "#60a5fa", "rgba(59,130,246,0.1)")}
  ${p1CoreGeo(cx, cy, box)}
  <text x="${cx}" y="${cy + box * 0.5 + 24}" text-anchor="middle" fill="#fff" font-family="Sora,Inter,sans-serif" font-size="${(box * 0.16).toFixed(0)}" font-weight="700">DigitalGate</text>
  <text x="${cx}" y="${cy + box * 0.5 + 42}" text-anchor="middle" fill="#a78bfa" font-family="ui-monospace,monospace" font-size="${(box * 0.085).toFixed(0)}" letter-spacing="3">CORE</text>`;

  const desktop = `<svg class="dgp1-svg dgp1-svg--desktop" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <radialGradient id="dgp1CoreGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(124,58,237,0.18)"/><stop offset="45%" stop-color="rgba(59,130,246,0.09)"/><stop offset="100%" stop-color="rgba(124,58,237,0)"/></radialGradient>
    <linearGradient id="dgp1Conv" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.12"/><stop offset="55%" stop-color="#7c3aed" stop-opacity="0.45"/><stop offset="100%" stop-color="#60a5fa" stop-opacity="0.8"/></linearGradient>
    <pattern id="dgp1Grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-width="0.5"/></pattern>
  </defs>
  <rect width="1200" height="600" fill="url(#dgp1Grid)" opacity="0.03"/>
  <text x="30" y="30" fill="#6b7280" font-family="ui-monospace,monospace" font-size="11" letter-spacing="2.5">DIFFERENT TOOLS · DISCONNECTED DATA</text>
  ${broken}
  ${conv}
  ${dTiles}
  ${core(1012, 300, 128, 52)}
  <g transform="translate(30,566)"><rect x="0" y="-9" width="11" height="11" rx="2" fill="none" stroke="rgba(239,68,68,0.4)"/><text x="20" y="0" fill="#6b7280" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">FRAGMENTED TOOLS</text></g>
  <g transform="translate(950,566)"><circle class="dgp1-pulse" cx="5" cy="-3" r="5" fill="#a78bfa"/><text x="18" y="0" fill="#c4b5fd" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">CONNECTED INTELLIGENCE</text></g>
</svg>`;

  const mTile = (
    key: string,
    x: number,
    y: number,
    sz: number,
    ic: string,
    st: string,
    label: string,
  ) => `<g>
    <rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="${Math.round(sz * 0.16)}" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/>
    ${iconG(key, x + sz / 2, y + sz / 2, Math.round(sz * 0.42), ic, 0.6)}
    <circle class="dgp1-pulse" cx="${x + sz - 5}" cy="${y + 5}" r="3.5" fill="${st}"/>
    <text x="${x + sz / 2}" y="${y + sz + 15}" text-anchor="middle" fill="#6b7280" font-size="9.5" font-family="ui-monospace,monospace" letter-spacing="0.5">${label}</text>
  </g>`;
  const mTiles = [
    mTile("globe", 26, 34, 58, "#a78bfa", "#ef4444", "Website"),
    mTile("users", 196, 26, 62, "#60a5fa", "#ef4444", "CRM"),
    mTile("chart", 40, 138, 54, "#4ade80", "#eab308", "Analytics"),
    mTile("message", 210, 132, 54, "#818cf8", "#ef4444", "Messaging"),
    mTile("mail", 128, 226, 50, "#93c5fd", "#f59e0b", "Email"),
    mTile("dollar", 270, 224, 52, "#86efac", "#eab308", "Accounting"),
  ].join("");
  const mConv = [
    [55, 92],
    [227, 88],
    [67, 192],
    [237, 186],
    [153, 276],
    [296, 276],
  ]
    .map(([sx, sy]) => {
      const d = `M${sx} ${sy} C ${sx} ${(sy + 470) / 2}, 195 ${(sy + 470) / 2}, 195 470`;
      return `<path d="${d}" fill="none" stroke="url(#dgp1ConvV)" stroke-width="1.5"/><path class="dgp1-flow" d="${d}" fill="none" stroke="#8fd6ff" stroke-width="1.3" stroke-opacity="0.85"/>`;
    })
    .join("");
  const mobile = `<svg class="dgp1-svg dgp1-svg--mobile" viewBox="0 0 390 700" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <radialGradient id="dgp1CoreGlowV" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(124,58,237,0.18)"/><stop offset="45%" stop-color="rgba(59,130,246,0.09)"/><stop offset="100%" stop-color="rgba(124,58,237,0)"/></radialGradient>
    <linearGradient id="dgp1ConvV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.12"/><stop offset="55%" stop-color="#7c3aed" stop-opacity="0.45"/><stop offset="100%" stop-color="#60a5fa" stop-opacity="0.8"/></linearGradient>
  </defs>
  <text x="16" y="18" fill="#6b7280" font-family="ui-monospace,monospace" font-size="10" letter-spacing="1.5">DIFFERENT TOOLS · DISCONNECTED DATA</text>
  ${mConv}
  ${mTiles}
  <circle cx="195" cy="560" r="150" fill="url(#dgp1CoreGlowV)"/>
  <g class="dgp1-orbit-slow" style="transform-origin:195px 560px"><ellipse cx="195" cy="560" rx="86" ry="58" transform="rotate(-20 195 560)" fill="none" stroke="#7c3aed" stroke-width="0.7" opacity="0.3"/></g>
  ${p1CoreGeo(195, 560, 100)}
  <text x="195" y="632" text-anchor="middle" fill="#fff" font-family="Sora,Inter,sans-serif" font-size="16" font-weight="700">DigitalGate</text>
  <text x="195" y="650" text-anchor="middle" fill="#a78bfa" font-family="ui-monospace,monospace" font-size="9" letter-spacing="3">CORE</text>
</svg>`;

  return `<div class="dgp1-scene dgp1-scene--frag">${desktop}${mobile}</div>`;
}

/* ——— Scene 2 · Problem indicators (icon + label + sublabel; not cards) ——— */

const P1_PROBLEMS: Array<[string, string, string, string]> = [
  ["gitbranch", "red", "Tools don’t talk", "Data is trapped in silos"],
  ["share", "yellow", "You fill the gaps", "Opportunities are missed"],
  ["radio", "orange", "Manual work", "Wasted time & resources"],
  ["signal", "purple", "No visibility", "Reacting, not planning"],
];

function p1ProblemScene(): string {
  const items = P1_PROBLEMS.map(
    ([key, tone, title, sub]) => `<div class="dgp1-problem">
    <span class="dgp1-problem__ic dgp1-problem__ic--${tone}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[key]}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <div class="dgp1-problem__b"><strong>${title}</strong><small>${sub}</small></div>
  </div>`,
  ).join("");
  return `<div class="dgp1-scene dgp1-scene--problem"><div class="dgp1-problems">${items}</div></div>`;
}

/* ——— Scene 3 · Transformation rail ——— */

const P1_RAIL: Array<[string, string, string, string]> = [
  ["gitbranch", "", "Fragmented", "Tools"],
  ["network", "connected", "Connected", "Data"],
  ["crosshair", "intelligent", "Intelligent", "Insights"],
  ["target", "coordinated", "Coordinated", "Action"],
];

function p1RailScene(): string {
  const stops = P1_RAIL.map(
    ([key, mod, label, sub], i) =>
      `${i > 0 ? `<span class="dgp1-rail__arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14 M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : ""}<div class="dgp1-rail__stop${mod ? ` dgp1-rail__stop--${mod}` : ""}">
    <span class="dgp1-rail__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[key]}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <span class="dgp1-rail__label">${label}</span>
    <span class="dgp1-rail__sub">${sub}</span>
  </div>`,
  ).join("");
  return `<div class="dgp1-scene dgp1-scene--rail"><div class="dgp1-rail"><span class="dgp1-rail__track" aria-hidden="true"></span>${stops}</div></div>`;
}

/* ——— Scene 4 · Business-intelligence architecture ——— */

function p1ArchScene(): string {
  const src = (cy: number, tint: string, key: string, label: string) => `
    <circle cx="80" cy="${cy}" r="18" fill="rgba(255,255,255,0.03)" stroke="${tint}" stroke-width="1.4" opacity="0.7"/>
    ${iconG(key, 80, cy, 18, tint, 0.75)}
    <text x="80" y="${cy + 32}" text-anchor="middle" fill="#6b7280" font-size="10" font-family="ui-monospace,monospace" letter-spacing="0.4">${label}</text>`;
  const link = (d: string, c: string) =>
    `<path d="${d}" stroke="${c}" stroke-width="1.5" fill="none" stroke-dasharray="4 6" opacity="0.4"/><path class="dgp1-flow" d="${d}" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.7"/>`;
  const flow = (d: string, c: string, w = 1.6) =>
    `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" opacity="0.55"/><path class="dgp1-flow" d="${d}" stroke="#bfe4ff" stroke-width="1.2" fill="none" opacity="0.7"/>`;

  const desktop = `<svg class="dgp1-svg dgp1-svg--desktop" viewBox="0 0 1100 500" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="dgp1BrainGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.2"/><stop offset="50%" stop-color="#7c3aed" stop-opacity="0.08"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0.2"/></linearGradient>
    <radialGradient id="dgp1BrainRadial"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.11"/><stop offset="70%" stop-color="#7c3aed" stop-opacity="0.04"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <filter id="dgp1Soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <text x="80" y="60" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1.5">DATA SOURCES</text>
  ${src(100, "#8b5cf6", "globe", "Website")}
  ${src(180, "#3b82f6", "users", "CRM")}
  ${src(270, "#10b981", "chart", "Analytics")}
  ${src(360, "#ec4899", "mail", "Email")}
  ${link("M100 100 C 150 100, 180 180, 200 210", "#8b5cf6")}
  ${link("M100 180 C 150 180, 180 210, 200 230", "#3b82f6")}
  ${link("M100 270 C 150 270, 180 260, 200 260", "#10b981")}
  ${link("M100 360 C 150 360, 180 300, 200 285", "#ec4899")}
  <circle cx="230" cy="250" r="45" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="1.5" opacity="0.8"/>
  <circle cx="230" cy="250" r="35" fill="none" stroke="#6366f1" stroke-width="1" stroke-dasharray="3 5" opacity="0.45"/>
  ${iconG("layers", 230, 246, 26, "#818cf8", 0.7)}
  <text x="230" y="272" text-anchor="middle" fill="#c7d2fe" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="700">Digital Twin</text>
  <text x="230" y="315" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">CONTEXT</text>
  ${flow("M275 250 C 320 250, 360 250, 400 250", "#7c3aed")}
  <circle cx="480" cy="250" r="100" fill="url(#dgp1BrainRadial)"/>
  <g class="dgp1-spin-slow" style="transform-origin:480px 250px"><circle cx="480" cy="250" r="80" fill="none" stroke="#7c3aed" stroke-width="1" stroke-dasharray="8 8" opacity="0.3"/></g>
  <g class="dgp1-spin-rev" style="transform-origin:480px 250px"><circle cx="480" cy="250" r="90" fill="none" stroke="#3b82f6" stroke-width="0.6" stroke-dasharray="3 6" opacity="0.2"/></g>
  <circle cx="480" cy="250" r="50" fill="url(#dgp1BrainGlow)" stroke="#7c3aed" stroke-width="2" opacity="0.6" filter="url(#dgp1Soft)"/>
  <circle cx="480" cy="175" r="6" fill="#7c3aed" opacity="0.6"/><circle cx="480" cy="325" r="6" fill="#7c3aed" opacity="0.6"/><circle cx="405" cy="250" r="6" fill="#3b82f6" opacity="0.6"/><circle cx="555" cy="250" r="6" fill="#3b82f6" opacity="0.6"/>
  <circle cx="480" cy="250" r="28" fill="rgba(124,58,237,0.1)" stroke="#7c3aed" stroke-width="1.5" opacity="0.85"/>
  <circle cx="480" cy="250" r="18" fill="rgba(124,58,237,0.15)" stroke="#7c3aed" stroke-width="1" opacity="0.6"/>
  <circle cx="480" cy="250" r="8" fill="#7c3aed" opacity="0.35"/>
  <circle class="dgp1-corepulse" cx="480" cy="250" r="3.5" fill="#a78bfa"/>
  <path d="M480 222v56 M452 250h56 M460 230l40 40 M500 230l-40 40" stroke="#7c3aed" stroke-width="0.6" opacity="0.28"/>
  <text x="480" y="304" text-anchor="middle" fill="#fff" font-family="Sora,Inter,sans-serif" font-size="15" font-weight="800">Business Brain</text>
  <text x="480" y="320" text-anchor="middle" fill="#a78bfa" font-size="10" font-family="ui-monospace,monospace">Core Intelligence</text>
  <text x="480" y="356" text-anchor="middle" fill="#7c3aed" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1" font-weight="600">CORE INTELLIGENCE</text>
  ${flow("M530 250 C 600 250, 660 230, 700 210", "#3b82f6")}
  <circle cx="770" cy="200" r="40" fill="rgba(96,165,250,0.05)" stroke="#3b82f6" stroke-width="1.5" opacity="0.8"/>
  <circle cx="770" cy="200" r="30" fill="none" stroke="#3b82f6" stroke-width="1" stroke-dasharray="3 5" opacity="0.5"/>
  ${iconG("crosshair", 770, 198, 24, "#60a5fa", 0.7)}
  <text x="770" y="216" text-anchor="middle" fill="#bfdbfe" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="700">AI Advisor</text>
  <text x="770" y="258" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">REASONING</text>
  ${flow("M810 200 C 860 200, 880 100, 905 90", "#8b5cf6", 1.5)}
  ${flow("M810 200 C 860 200, 880 200, 905 200", "#10b981", 1.5)}
  ${flow("M810 200 C 860 200, 880 300, 905 310", "#f59e0b", 1.5)}
  <circle cx="945" cy="90" r="35" fill="rgba(139,92,246,0.06)" stroke="#8b5cf6" stroke-width="1.5" opacity="0.85"/>
  ${iconG("share", 945, 84, 22, "#a78bfa", 0.75)}
  <text x="945" y="106" text-anchor="middle" fill="#c4b5fd" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="700">Recommend</text>
  <circle cx="945" cy="200" r="35" fill="rgba(16,185,129,0.06)" stroke="#10b981" stroke-width="1.5" opacity="0.85"/>
  ${iconG("gear", 945, 194, 22, "#34d399", 0.75)}
  <text x="945" y="216" text-anchor="middle" fill="#6ee7b7" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="700">Automation</text>
  <circle cx="945" cy="310" r="35" fill="rgba(245,158,11,0.06)" stroke="#f59e0b" stroke-width="1.5" opacity="0.85"/>
  ${iconG("activity", 945, 304, 22, "#fbbf24", 0.75)}
  <text x="945" y="326" text-anchor="middle" fill="#fcd34d" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="700">Execution</text>
  <text x="945" y="366" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">EXECUTION</text>
</svg>`;

  const mSrc = (x: number, tint: string, key: string) =>
    `<circle cx="${x}" cy="46" r="16" fill="rgba(255,255,255,0.03)" stroke="${tint}" stroke-width="1.3" opacity="0.7"/>${iconG(key, x, 46, 16, tint, 0.75)}`;
  const mBranch = (cx: number, cy: number, tint: string, bg: string, key: string, label: string) =>
    `<circle cx="${cx}" cy="${cy}" r="30" fill="${bg}" stroke="${tint}" stroke-width="1.4" opacity="0.85"/>${iconG(key, cx, cy - 4, 20, tint, 0.8)}<text x="${cx}" y="${cy + 44}" text-anchor="middle" fill="#e5e7eb" font-family="Sora,Inter,sans-serif" font-size="10.5" font-weight="700">${label}</text>`;
  const mobile = `<svg class="dgp1-svg dgp1-svg--mobile" viewBox="0 0 390 900" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="dgp1BrainGlowV" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.2"/><stop offset="50%" stop-color="#7c3aed" stop-opacity="0.08"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0.2"/></linearGradient>
    <radialGradient id="dgp1BrainRadialV"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.11"/><stop offset="70%" stop-color="#7c3aed" stop-opacity="0.04"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
  </defs>
  <text x="195" y="18" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1.5">DATA SOURCES</text>
  ${mSrc(90, "#8b5cf6", "globe")}${mSrc(160, "#3b82f6", "users")}${mSrc(230, "#10b981", "chart")}${mSrc(300, "#ec4899", "mail")}
  ${flow("M195 66 L195 128", "#7c3aed")}
  <circle cx="195" cy="176" r="40" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="1.4" opacity="0.8"/>${iconG("layers", 195, 172, 24, "#818cf8", 0.7)}<text x="195" y="198" text-anchor="middle" fill="#c7d2fe" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="700">Digital Twin</text>
  ${flow("M195 216 L195 300", "#7c3aed")}
  <circle cx="195" cy="400" r="100" fill="url(#dgp1BrainRadialV)"/>
  <g class="dgp1-spin-slow" style="transform-origin:195px 400px"><circle cx="195" cy="400" r="78" fill="none" stroke="#7c3aed" stroke-width="1" stroke-dasharray="8 8" opacity="0.3"/></g>
  <circle cx="195" cy="400" r="50" fill="url(#dgp1BrainGlowV)" stroke="#7c3aed" stroke-width="2" opacity="0.6"/>
  <circle cx="195" cy="400" r="28" fill="rgba(124,58,237,0.1)" stroke="#7c3aed" stroke-width="1.5"/><circle cx="195" cy="400" r="16" fill="rgba(124,58,237,0.15)" stroke="#7c3aed" stroke-width="1"/><circle class="dgp1-corepulse" cx="195" cy="400" r="3.5" fill="#a78bfa"/>
  <path d="M195 372v56 M167 400h56" stroke="#7c3aed" stroke-width="0.6" opacity="0.28"/>
  <text x="195" y="470" text-anchor="middle" fill="#fff" font-family="Sora,Inter,sans-serif" font-size="14" font-weight="800">Business Brain</text>
  <text x="195" y="488" text-anchor="middle" fill="#a78bfa" font-size="10" font-family="ui-monospace,monospace">Core Intelligence</text>
  ${flow("M195 500 L195 560", "#3b82f6")}
  <circle cx="195" cy="606" r="36" fill="rgba(96,165,250,0.05)" stroke="#3b82f6" stroke-width="1.5" opacity="0.8"/>${iconG("crosshair", 195, 602, 22, "#60a5fa", 0.7)}<text x="195" y="626" text-anchor="middle" fill="#bfdbfe" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="700">AI Advisor</text>
  ${flow("M195 642 C 150 690, 92 700, 92 748", "#8b5cf6", 1.5)}${flow("M195 642 L195 748", "#10b981", 1.5)}${flow("M195 642 C 240 690, 298 700, 298 748", "#f59e0b", 1.5)}
  ${mBranch(92, 778, "#a78bfa", "rgba(139,92,246,0.06)", "share", "Recommend")}
  ${mBranch(195, 778, "#10b981", "rgba(16,185,129,0.06)", "gear", "Automation")}
  ${mBranch(298, 778, "#fbbf24", "rgba(245,158,11,0.06)", "activity", "Execution")}
</svg>`;

  return `<div class="dgp1-scene dgp1-scene--arch">${desktop}${mobile}</div>`;
}

function part1(kind: DigitalgateStageKind): StageDef[] {
  return [
    {
      name: "fragmented",
      anchors: ["they’re fragmented", "they're fragmented", "aren’t dumb", "aren't dumb", "fragmented"],
      html: stage({
        kind,
        name: "fragmented",
        index: "01",
        eyebrow: "The problem",
        title: "Capable software. No coherent system.",
        lede: "Every part of the business runs on its own tool. The signals are all there — scattered across apps that never talk to each other. So the owner becomes the wiring: copying, remembering and deciding by hand.",
        ariaLabel:
          "A field of disconnected business systems on the left — website, CRM, analytics, email, accounting, messaging and bookings — each with broken, incomplete signal paths. Their signals converge through brightening streams into a single luminous DigitalGate intelligence core on the right, which is visibly calmer and more ordered than the scattered tools.",
        variant: "dg-stage--wide dg-stage--p1 dgp1-stage--frag",
        scene: p1FragScene(),
        caption: "Fragmented tools on the left; one connected intelligence on the right — the same business, made coherent.",
      }),
    },
    {
      name: "convergence",
      anchors: [
        "the hidden human integration layer",
        "hidden human integration",
      ],
      html: stage({
        kind,
        name: "convergence",
        index: "02",
        eyebrow: "Why it hurts",
        title: "Good businesses aren’t dumb. They’re just fragmented.",
        lede: "Most businesses use best-in-class tools for different parts of the operation. The problem isn’t the tools — it’s that they don’t talk to each other.",
        ariaLabel:
          "Four restrained problem indicators of a disconnected business: tools don’t talk (data is trapped in silos), you fill the gaps (opportunities are missed), manual work (wasted time and resources), and no visibility (reacting, not planning).",
        variant: "dg-stage--p1 dgp1-stage--problem",
        scene: p1ProblemScene(),
        caption: "Connection is not a feature. It is the precondition for everything intelligent that follows.",
      }),
    },
    {
      name: "operating-system",
      anchors: [
        "what “connected” actually means",
        'what "connected" actually means',
        "connected” actually means",
      ],
      html: stage({
        kind,
        name: "operating-system",
        index: "03",
        eyebrow: "The transformation",
        title: "Fragmented → Connected → Intelligent → Coordinated",
        lede: "The whole journey on one line. The business you start with is a pile of tools; the business you end with runs as one coordinated system.",
        ariaLabel:
          "A four-step transformation rail — Fragmented (tools), Connected (data), Intelligent (insights) and Coordinated (action) — connected by arrows, growing more organised at each step.",
        variant: "dg-stage--wide dg-stage--p1 dgp1-stage--rail",
        scene: p1RailScene(),
        caption: "The reader began surrounded by fragmented tools; the story ends at one organised operating system.",
      }),
    },
    {
      name: "intelligence-stack",
      anchors: [
        "digitalgate is not trying to replace",
        "not trying to replace every tool",
        "the vision: software",
        "software → systems → intelligence",
        "the vision",
      ],
      html: stage({
        kind,
        name: "intelligence-stack",
        index: "04",
        eyebrow: "The architecture",
        title: "Your business, working as a system",
        lede: "DigitalGate brings together your data, people and processes so the business can sense, understand, decide and act. Data sources feed a Digital Twin; the Business Brain understands it; the AI Advisor reasons; and only then — recommendation, automation and governed execution.",
        ariaLabel:
          "A connected intelligence architecture. Multiple data sources on the left flow into a Digital Twin context model, then into the dominant central Business Brain (concentric intelligence layers with orbiting nodes), then into the AI Advisor reasoning layer, which branches into recommendation, automation and execution. The Business Brain is the largest, most luminous node.",
        variant: "dg-stage--wide dg-stage--p1 dgp1-stage--arch",
        scene: p1ArchScene(),
        caption: "Information becomes intelligence as it moves through the system — the Business Brain is the centre of gravity.",
      }),
    },
  ];
}

/* —————————————————————————————————————————————————————————————————————————
 * PART 2 — “An intelligent business is more than a brain”
 *
 * A faithful PORT of the approved concept prototype into renderer-owned SVG/HTML.
 * Two visual moments woven through the real article:
 *   1. The living-system signature — Senses feed the system through a visible
 *      Nervous System; Memory/context; the dominant Business Brain; a distinct
 *      AI Advisor; Direction influencing; Hands / Voice / Body acting; Health
 *      telemetry; a Security/Governance perimeter; and a Learning feedback loop
 *      returning outcomes to the Brain.
 *   2. The learning sequence rail: SIGNALS → CONTEXT → INTELLIGENCE → REASONING
 *      → ACTION → OUTCOME → LEARNING ↺.
 * All presentation classes are namespaced `dgp2-`; Part 1 and Parts 3–4 untouched.
 * ————————————————————————————————————————————————————————————————————————— */

/** Animated flow path (base + dashed signal overlay following the same path). */
function p2Dash(d: string, c: string, w = 1.5): string {
  return `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-dasharray="4 6" opacity="0.4"/><path class="dgp1-flow" d="${d}" stroke="${c}" stroke-width="${w}" fill="none" opacity="0.7"/>`;
}
function p2Flow(d: string, c: string, w = 2): string {
  return `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" opacity="0.55"/><path class="dgp1-flow" d="${d}" stroke="#cbe6ff" stroke-width="1.3" fill="none" opacity="0.75"/>`;
}

function p2AnatomyScene(): string {
  const senseNode = (cy: number, label: string) =>
    `<circle cx="60" cy="${cy}" r="14" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="1" opacity="0.6"/><rect x="54" y="${cy - 4}" width="12" height="8" rx="1" stroke="#818cf8" stroke-width="0.8" fill="none"/><text x="60" y="${cy + 28}" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">${label}</text>`;

  const desktop = `<svg class="dgp2-svg dgp2-svg--desktop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <radialGradient id="dgp2BrainGlow"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.16"/><stop offset="50%" stop-color="#7c3aed" stop-opacity="0.06"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <radialGradient id="dgp2AdvisorGlow"><stop offset="0%" stop-color="#3b82f6" stop-opacity="0.1"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/></radialGradient>
    <filter id="dgp2Glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>

  <!-- Governance / immune perimeter -->
  <rect x="180" y="105" width="900" height="540" rx="30" fill="none" stroke="#6366f1" stroke-width="0.5" opacity="0.12" stroke-dasharray="8 8"/>
  <rect x="190" y="115" width="880" height="520" rx="24" fill="none" stroke="#6366f1" stroke-width="0.5" opacity="0.08" stroke-dasharray="4 12"/>
  <rect x="200" y="125" width="860" height="500" rx="18" fill="none" stroke="#6366f1" stroke-width="0.3" opacity="0.06" stroke-dasharray="2 16"/>
  <circle cx="210" cy="135" r="6" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.5" opacity="0.4"/><circle cx="1050" cy="135" r="6" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.5" opacity="0.4"/><circle cx="210" cy="615" r="6" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.5" opacity="0.4"/><circle cx="1050" cy="615" r="6" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.5" opacity="0.4"/>
  <text x="1140" y="462" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">IMMUNE SYSTEM</text>
  <text x="1140" y="476" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">Security + Governance</text>

  <!-- Nervous system pathways -->
  <g opacity="0.22">
    <path d="M300 100 C 300 200, 300 300, 560 300" stroke="#7c3aed" stroke-width="0.8" fill="none" opacity="0.4"/>
    <path d="M300 150 C 300 250, 300 350, 560 350" stroke="#7c3aed" stroke-width="0.8" fill="none" opacity="0.3"/>
    <path d="M300 200 C 300 300, 300 400, 560 400" stroke="#7c3aed" stroke-width="0.8" fill="none" opacity="0.3"/>
    <path d="M560 300 C 700 300, 760 300, 850 300" stroke="#7c3aed" stroke-width="0.8" fill="none" opacity="0.4"/>
    <path d="M560 500 C 700 500, 760 500, 850 500" stroke="#7c3aed" stroke-width="0.8" fill="none" opacity="0.3"/>
    <text x="560" y="95" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">NERVOUS SYSTEM</text>
    <text x="560" y="110" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">Connectors + Events</text>
  </g>

  <!-- Senses -->
  <text x="80" y="70" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">SENSES</text>
  <text x="80" y="85" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">Signals + Analytics</text>
  ${senseNode(140, "Web")}${senseNode(210, "Leads")}${senseNode(280, "Customers")}${senseNode(350, "Revenue")}
  ${p2Dash("M74 140 C 120 140, 160 180, 200 220", "#6366f1")}
  ${p2Dash("M74 210 C 120 210, 160 240, 200 270", "#6366f1")}
  ${p2Dash("M74 280 C 120 280, 160 300, 200 320", "#6366f1")}
  ${p2Dash("M74 350 C 120 350, 160 360, 200 370", "#6366f1")}

  <!-- Direction -->
  <text x="100" y="470" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">DIRECTION</text>
  <text x="100" y="485" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">Goals + Strategy</text>
  <circle cx="80" cy="530" r="20" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-width="1" opacity="0.6"/><circle cx="80" cy="530" r="10" stroke="#fbbf24" stroke-width="0.8" fill="none" opacity="0.5"/><path d="M80 520v20 M70 530h20 M75 525l10 10 M85 525l-10 10" stroke="#fbbf24" stroke-width="0.5" opacity="0.35"/>
  ${p2Dash("M100 530 C 200 530, 300 480, 400 430", "#fbbf24", 1)}
  ${p2Dash("M100 530 C 200 530, 300 530, 400 530", "#fbbf24", 1)}

  <!-- Memory / context -->
  <text x="260" y="195" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">MEMORY</text>
  <text x="260" y="210" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">CRM + Knowledge</text>
  <circle cx="260" cy="300" r="55" fill="rgba(99,102,241,0.03)" stroke="#6366f1" stroke-width="1" opacity="0.6"/>
  <circle cx="260" cy="300" r="42" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.5" stroke-dasharray="4 6" opacity="0.4"/>
  <circle cx="260" cy="300" r="28" fill="rgba(99,102,241,0.03)" stroke="#6366f1" stroke-width="0.5" opacity="0.2"/>
  <rect x="250" y="292" width="20" height="12" rx="1.5" stroke="#818cf8" stroke-width="0.8" fill="none" opacity="0.6"/><rect x="254" y="296" width="12" height="3" rx="0.5" fill="#818cf8" opacity="0.2"/>
  <text x="260" y="338" text-anchor="middle" fill="#c7d2fe" font-family="Sora,Inter,sans-serif" font-size="10" font-weight="600">Memory</text>
  <text x="260" y="352" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">Context Layer</text>

  <!-- Flow into the Brain -->
  ${p2Flow("M315 300 C 380 300, 440 300, 490 300", "#7c3aed")}

  <!-- BUSINESS BRAIN (dominant) -->
  <circle cx="580" cy="300" r="120" fill="url(#dgp2BrainGlow)"/>
  <g class="dgp1-spin-slow" style="transform-origin:580px 300px"><circle cx="580" cy="300" r="90" fill="none" stroke="#7c3aed" stroke-width="1" stroke-dasharray="8 8" opacity="0.3"/></g>
  <circle cx="580" cy="300" r="75" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="1.5" opacity="0.4"/>
  <circle cx="580" cy="300" r="60" fill="url(#dgp2BrainGlow)" stroke="#7c3aed" stroke-width="2" opacity="0.6" filter="url(#dgp2Glow)"/>
  <g class="dgp1-spin-rev" style="transform-origin:580px 300px"><circle cx="580" cy="300" r="95" fill="none" stroke="#3b82f6" stroke-width="0.5" stroke-dasharray="3 6" opacity="0.2"/></g>
  <circle cx="580" cy="215" r="8" fill="#7c3aed" opacity="0.5"/><circle cx="580" cy="385" r="8" fill="#7c3aed" opacity="0.5"/><circle cx="495" cy="300" r="8" fill="#3b82f6" opacity="0.5"/><circle cx="665" cy="300" r="8" fill="#3b82f6" opacity="0.5"/>
  <circle cx="580" cy="300" r="38" fill="rgba(124,58,237,0.08)" stroke="#7c3aed" stroke-width="1.5" opacity="0.6"/>
  <circle cx="580" cy="300" r="28" fill="rgba(124,58,237,0.12)" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
  <circle cx="580" cy="300" r="18" fill="rgba(124,58,237,0.15)" stroke="#7c3aed" stroke-width="0.8" opacity="0.4"/>
  <circle cx="580" cy="300" r="10" fill="#7c3aed" opacity="0.25"/>
  <circle class="dgp1-corepulse" cx="580" cy="300" r="4" fill="#a78bfa"/>
  <path d="M580 262v76 M542 300h76 M550 270l60 60 M610 270l-60 60 M565 265l30 70 M595 265l-30 70" stroke="#7c3aed" stroke-width="0.5" opacity="0.32"/>
  <text x="580" y="360" text-anchor="middle" fill="#fff" font-family="Sora,Inter,sans-serif" font-size="16" font-weight="700">Business Brain</text>
  <text x="580" y="380" text-anchor="middle" fill="#a78bfa" font-size="10" font-family="ui-monospace,monospace">Structured Intelligence</text>
  <text x="580" y="395" text-anchor="middle" fill="#6b7280" font-size="9" font-family="ui-monospace,monospace">Context + Understanding</text>

  <!-- Flow to AI Advisor -->
  ${p2Flow("M640 300 C 710 300, 770 300, 820 300", "#3b82f6")}

  <!-- AI ADVISOR (distinct) -->
  <circle cx="870" cy="300" r="80" fill="url(#dgp2AdvisorGlow)"/>
  <circle cx="870" cy="300" r="55" fill="rgba(59,130,246,0.05)" stroke="#3b82f6" stroke-width="1.5" opacity="0.8"/>
  <circle cx="870" cy="300" r="42" fill="rgba(59,130,246,0.08)" stroke="#3b82f6" stroke-width="1" stroke-dasharray="3 5" opacity="0.5"/>
  <circle cx="870" cy="300" r="16" stroke="#60a5fa" stroke-width="1" fill="none" opacity="0.5"/><circle cx="870" cy="300" r="8" stroke="#60a5fa" stroke-width="0.8" fill="none" opacity="0.4"/>
  <circle class="dgp1-corepulse" cx="870" cy="300" r="3" fill="#60a5fa"/>
  <path d="M870 284v32 M854 300h32 M858 288l24 24 M882 288l-24 24" stroke="#60a5fa" stroke-width="0.4" opacity="0.35"/>
  <text x="870" y="330" text-anchor="middle" fill="#bfdbfe" font-family="Sora,Inter,sans-serif" font-size="13" font-weight="600">AI Advisor</text>
  <text x="870" y="348" text-anchor="middle" fill="#6b7280" font-size="9" font-family="ui-monospace,monospace">Reasoning Layer</text>
  <text x="870" y="362" text-anchor="middle" fill="#4b5563" font-size="8" font-family="ui-monospace,monospace">Recommends actions</text>

  <!-- Flow to Hands / Voice / Body -->
  ${p2Flow("M925 300 C 965 300, 990 300, 1010 300", "#f59e0b", 1.5)}
  ${p2Flow("M925 300 C 965 300, 990 400, 1010 400", "#10b981", 1.5)}
  ${p2Flow("M925 300 C 965 300, 990 200, 1010 200", "#8b5cf6", 1.5)}

  <!-- Hands -->
  <text x="1050" y="180" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">HANDS</text>
  <text x="1050" y="194" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">Tools + Automation</text>
  <circle cx="1050" cy="230" r="25" fill="rgba(139,92,246,0.05)" stroke="#8b5cf6" stroke-width="1" opacity="0.8"/><rect x="1042" y="226" width="16" height="8" rx="1" stroke="#a78bfa" stroke-width="0.8" fill="none"/>
  <text x="1050" y="270" text-anchor="middle" fill="#c4b5fd" font-family="Sora,Inter,sans-serif" font-size="9" font-weight="600">Workflows</text>
  <circle cx="1050" cy="320" r="25" fill="rgba(16,185,129,0.05)" stroke="#10b981" stroke-width="1" opacity="0.8"/><rect x="1042" y="316" width="16" height="8" rx="1" stroke="#34d399" stroke-width="0.8" fill="none"/><circle cx="1050" cy="320" r="3" stroke="#34d399" stroke-width="0.5" fill="none"/>
  <text x="1050" y="360" text-anchor="middle" fill="#6ee7b7" font-family="Sora,Inter,sans-serif" font-size="9" font-weight="600">Automation</text>

  <!-- Voice -->
  <text x="1050" y="412" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">VOICE</text>
  <text x="1050" y="426" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">Communications</text>
  <circle cx="1050" cy="462" r="25" fill="rgba(236,72,153,0.05)" stroke="#ec4899" stroke-width="1" opacity="0.8"/><rect x="1042" y="458" width="16" height="8" rx="1" stroke="#f472b6" stroke-width="0.8" fill="none"/>
  <text x="1050" y="502" text-anchor="middle" fill="#f472b6" font-family="Sora,Inter,sans-serif" font-size="9" font-weight="600">Comms</text>

  <!-- Body -->
  <text x="800" y="552" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">BODY</text>
  <text x="800" y="566" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">Core + Industry Apps</text>
  <rect x="750" y="580" width="100" height="30" rx="6" fill="rgba(139,92,246,0.03)" stroke="#8b5cf6" stroke-width="0.5" opacity="0.4"/>
  ${[755, 770, 785, 800, 815, 830].map((x) => `<rect x="${x}" y="588" width="12" height="6" rx="1" fill="#8b5cf6" opacity="0.2"/>`).join("")}

  <!-- Health -->
  <text x="1140" y="72" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">HEALTH</text>
  <text x="1140" y="86" text-anchor="middle" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">Business Health</text>
  <circle cx="1140" cy="130" r="25" fill="rgba(52,211,153,0.03)" stroke="#34d399" stroke-width="1" opacity="0.6"/><circle cx="1140" cy="130" r="15" stroke="#34d399" stroke-width="0.5" fill="none" opacity="0.4"/>
  <path class="dgp2-health" d="M1128 130h4l3-6 3 12 4-8 3 2h7" stroke="#34d399" stroke-width="1.2" fill="none"/>
  <text x="1140" y="170" text-anchor="middle" fill="#6ee7b7" font-family="Sora,Inter,sans-serif" font-size="9" font-weight="500">Diagnostic</text>

  <!-- Learning feedback loop -->
  ${p2Dash("M1050 232 C 950 160, 850 160, 750 220", "#34d399", 1.5)}
  ${p2Dash("M1050 320 C 950 380, 850 420, 750 420", "#34d399", 1.5)}
  ${p2Dash("M750 220 C 700 220, 670 260, 640 300", "#34d399", 1.5)}
  ${p2Dash("M750 420 C 700 420, 670 380, 640 340", "#34d399", 1.5)}
  <text x="850" y="562" text-anchor="middle" fill="#34d399" font-size="9" font-family="ui-monospace,monospace" opacity="0.75">↺ Learning Feedback Loop</text>
  <text x="850" y="576" text-anchor="middle" fill="#4b5563" font-size="7.5" font-family="ui-monospace,monospace">Outcomes → Digital Twin → Business Brain</text>

  <!-- Legend -->
  <text x="600" y="712" text-anchor="middle" fill="#4b5563" font-size="8" font-family="ui-monospace,monospace" letter-spacing="1" opacity="0.6">SYSTEM ANATOMY</text>
  <text x="600" y="726" text-anchor="middle" fill="#6b7280" font-size="7.5" font-family="ui-monospace,monospace" opacity="0.6">SENSES · MEMORY · BRAIN · ADVISOR · HANDS · VOICE · BODY · HEALTH · DIRECTION · IMMUNE · LEARNING</text>
</svg>`;

  const mBrain = (cx: number, cy: number) => `
    <circle cx="${cx}" cy="${cy}" r="90" fill="url(#dgp2BrainGlowV)"/>
    <g class="dgp1-spin-slow" style="transform-origin:${cx}px ${cy}px"><circle cx="${cx}" cy="${cy}" r="72" fill="none" stroke="#7c3aed" stroke-width="1" stroke-dasharray="8 8" opacity="0.3"/></g>
    <circle cx="${cx}" cy="${cy}" r="56" fill="url(#dgp2BrainGlowV)" stroke="#7c3aed" stroke-width="2" opacity="0.6"/>
    <circle cx="${cx}" cy="${cy}" r="34" fill="rgba(124,58,237,0.1)" stroke="#7c3aed" stroke-width="1.4"/>
    <circle cx="${cx}" cy="${cy}" r="20" fill="rgba(124,58,237,0.15)" stroke="#7c3aed" stroke-width="0.8"/>
    <circle class="dgp1-corepulse" cx="${cx}" cy="${cy}" r="4" fill="#a78bfa"/>
    <path d="M${cx} ${cy - 34}v68 M${cx - 34} ${cy}h68 M${cx - 24} ${cy - 24}l48 48 M${cx + 24} ${cy - 24}l-48 48" stroke="#7c3aed" stroke-width="0.5" opacity="0.3"/>`;
  const mBlock = (cy: number, tint: string, bg: string, key: string, kicker: string, label: string) =>
    `<rect x="70" y="${cy}" width="250" height="60" rx="14" fill="${bg}" stroke="${tint}" stroke-opacity="0.4"/>${iconG(key, 104, cy + 30, 22, tint, 0.8)}<text x="132" y="${cy + 25}" fill="#6b7280" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">${kicker}</text><text x="132" y="${cy + 44}" fill="#eef4ff" font-family="Sora,Inter,sans-serif" font-size="14" font-weight="700">${label}</text>`;
  const mobile = `<svg class="dgp2-svg dgp2-svg--mobile" viewBox="0 0 390 1080" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <radialGradient id="dgp2BrainGlowV"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.16"/><stop offset="55%" stop-color="#7c3aed" stop-opacity="0.055"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <radialGradient id="dgp2AdvisorGlowV"><stop offset="0%" stop-color="#3b82f6" stop-opacity="0.1"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/></radialGradient>
  </defs>
  <rect x="18" y="18" width="354" height="1044" rx="26" fill="none" stroke="#6366f1" stroke-width="0.5" opacity="0.12" stroke-dasharray="8 8"/>
  <text x="195" y="46" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">IMMUNE SYSTEM · SECURITY + GOVERNANCE</text>
  ${mBlock(74, "#6366f1", "rgba(99,102,241,0.06)", "signal", "SENSES", "Signals + Analytics")}
  ${p2Flow("M195 134 L195 176", "#7c3aed")}
  ${mBlock(176, "#6366f1", "rgba(99,102,241,0.06)", "contextbox", "MEMORY", "CRM + Knowledge")}
  ${p2Flow("M195 236 L195 300", "#7c3aed")}
  <text x="195" y="300" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1">BUSINESS BRAIN</text>
  ${mBrain(195, 400)}
  <text x="195" y="512" text-anchor="middle" fill="#fff" font-family="Sora,Inter,sans-serif" font-size="15" font-weight="700">Business Brain</text>
  <text x="195" y="530" text-anchor="middle" fill="#a78bfa" font-size="9" font-family="ui-monospace,monospace">Structured Intelligence</text>
  ${p2Flow("M195 548 L195 600", "#3b82f6")}
  <circle cx="195" cy="656" r="46" fill="url(#dgp2AdvisorGlowV)" stroke="#3b82f6" stroke-width="1.5" opacity="0.8"/><circle cx="195" cy="656" r="16" stroke="#60a5fa" stroke-width="1" fill="none"/><circle class="dgp1-corepulse" cx="195" cy="656" r="3" fill="#60a5fa"/><text x="195" y="722" text-anchor="middle" fill="#bfdbfe" font-family="Sora,Inter,sans-serif" font-size="13" font-weight="600">AI Advisor</text><text x="195" y="738" text-anchor="middle" fill="#6b7280" font-size="9" font-family="ui-monospace,monospace">Reasoning Layer</text>
  ${p2Flow("M195 702 L195 770", "#f59e0b")}
  ${mBlock(770, "#f59e0b", "rgba(245,158,11,0.06)", "gear", "HANDS · VOICE · BODY", "Act — automation, comms, apps")}
  ${p2Dash("M320 800 C 370 780, 372 620, 300 470", "#34d399", 1.5)}
  <text x="316" y="612" text-anchor="middle" fill="#34d399" font-size="8" font-family="ui-monospace,monospace" opacity="0.75" transform="rotate(90 316 612)">↺ LEARNING → BRAIN</text>
  ${mBlock(880, "#fbbf24", "rgba(251,191,36,0.05)", "target", "DIRECTION", "Goals influence decisions")}
  ${mBlock(970, "#34d399", "rgba(52,211,153,0.05)", "activity", "HEALTH", "System diagnostics")}
</svg>`;

  return `<div class="dgp2-scene dgp2-scene--anatomy">${desktop}${mobile}</div>`;
}

/* Learning sequence rail. */
const P2_LEARN: Array<[string, string, string]> = [
  ["layers", "", "SIGNALS"],
  ["contextbox", "", "CONTEXT"],
  ["crosshair", "intelligence", "INTELLIGENCE"],
  ["reason", "", "REASONING"],
  ["network", "", "ACTION"],
  ["clock", "", "OUTCOME"],
  ["refresh", "learning", "LEARNING"],
];

function p2LearnScene(): string {
  const stops = P2_LEARN.map(
    ([key, mod, label], i) =>
      `${i > 0 ? `<span class="dgp2-learn__arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14 M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : ""}<div class="dgp2-learn__stop${mod ? ` dgp2-learn__stop--${mod}` : ""}">
    <span class="dgp2-learn__ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[key]}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <span class="dgp2-learn__label">${label}</span>
  </div>`,
  ).join("");
  return `<div class="dgp2-scene dgp2-scene--learn"><div class="dgp2-learn"><span class="dgp2-learn__track" aria-hidden="true"></span>${stops}<span class="dgp2-learn__loop" aria-hidden="true">↺</span></div></div>`;
}

function part2(kind: DigitalgateStageKind): StageDef[] {
  return [
    {
      name: "living-system",
      anchors: ["the digitalgate body map", "body map", "the body map"],
      html: stage({
        kind,
        name: "living-system",
        index: "01",
        eyebrow: "The living system",
        title: "Your business, working as a system",
        lede: "Senses feed the system through a nervous system of connectors and events; memory holds context; the Business Brain understands; the AI Advisor reasons; direction steers; hands, voice and body act; governance protects — and every outcome learns its way back to the Brain.",
        ariaLabel:
          "A living-system architecture. On the left, Senses (web, leads, customers, revenue) feed the system through a visible Nervous System of pathways; a Memory context layer holds knowledge; Direction (goals and strategy) influences it. At the centre, the dominant Business Brain holds structured intelligence, feeding a distinct AI Advisor reasoning layer. On the right, Hands (tools and automation), Voice (communications) and the operational Body act; Business Health provides telemetry; a Security and Governance perimeter protects the whole; and a Learning feedback loop returns outcomes through the Digital Twin back to the Business Brain.",
        variant: "dg-stage--wide dg-stage--p2 dgp2-stage--anatomy",
        scene: p2AnatomyScene(),
        caption: "Intelligence is a property of the whole system — senses, memory, brain, advisor, action, governance and learning, connected.",
      }),
    },
    {
      name: "living-flow",
      anchors: ["a business operating system", "operating system", "the bigger idea"],
      html: stage({
        kind,
        name: "living-flow",
        index: "02",
        eyebrow: "How intelligence emerges",
        title: "Signals → Context → Intelligence → Reasoning → Action → Outcome → Learning",
        lede: "The parts are not a checklist. They form one continuous loop the business runs on — and every outcome feeds the next decision.",
        ariaLabel:
          "A learning sequence rail: signals become context, context becomes intelligence, intelligence becomes reasoning, reasoning becomes action, action produces an outcome, and the outcome feeds learning back into the system.",
        variant: "dg-stage--wide dg-stage--p2 dgp2-stage--learn",
        scene: p2LearnScene(),
        caption: "Intelligence is not a feature. It is a system property — and the loop compounds every time it runs.",
      }),
    },
  ];
}

/* —————————————————————————————————————————————————————————————————————————
 * PART 3 — “From signal to action”
 *
 * A faithful PORT of the approved concept prototype into renderer-owned
 * SVG/HTML (no client JS). Two visual moments woven through the real article:
 *   1. The DigitalGate intelligence loop (signature): CONNECT → UNDERSTAND
 *      (Digital Twin) → the dominant BUSINESS BRAIN → ADVISE (AI Advisor) →
 *      an amber HUMAN AUTHORITY governance gate → ACT → LEARN, with a major
 *      green learning-return pathway (outcomes → Digital Twin → better context).
 *   2. The signal journey: one enquiry changing state as it moves through the
 *      system — RAW → CONTEXTUALISED → UNDERSTOOD → REASONED → AUTHORISED →
 *      EXECUTED → LEARNED.
 * All presentation classes are namespaced `dgp3-`; Parts 1, 2 and 4 untouched.
 * Motion reuses the dgp1- utilities (flow / spin / corepulse) so causality is
 * shown by path-following dash-flow, not by fragile drifting particles.
 * ————————————————————————————————————————————————————————————————————————— */

/* ——— Scene 1 · The intelligence loop (signature) ——— */
function p3LoopScene(): string {
  const src = (cx: number, cy: number) =>
    `<circle cx="${cx}" cy="${cy}" r="14" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="1" opacity="0.6"/><rect x="${cx - 6}" y="${cy - 4}" width="12" height="8" rx="1" stroke="#818cf8" stroke-width="0.6" fill="none"/>`;

  const desktop = `<svg class="dgp3-svg dgp3-svg--desktop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <radialGradient id="dgp3BrainGlow"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.25"/><stop offset="50%" stop-color="#7c3aed" stop-opacity="0.08"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <radialGradient id="dgp3AdvisorGlow"><stop offset="0%" stop-color="#3b82f6" stop-opacity="0.15"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/></radialGradient>
    <filter id="dgp3Glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>

  <text x="600" y="30" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="2" opacity="0.6">THE DIGITALGATE INTELLIGENCE LOOP</text>

  <!-- CONNECT -->
  <text x="150" y="70" text-anchor="middle" fill="#818cf8" font-size="13" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="2">CONNECT</text>
  ${src(120, 140)}${src(170, 140)}${src(120, 200)}${src(170, 200)}
  ${p2Dash("M184 140 C 220 140, 260 180, 290 220", "#6366f1")}
  ${p2Dash("M184 200 C 220 200, 260 240, 290 270", "#6366f1")}

  <!-- UNDERSTAND / Digital Twin -->
  <text x="310" y="70" text-anchor="middle" fill="#818cf8" font-size="13" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="2">UNDERSTAND</text>
  <circle cx="310" cy="250" r="55" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="1" opacity="0.6"/>
  <circle cx="310" cy="250" r="40" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="0.5" stroke-dasharray="4 6" opacity="0.4"/>
  <circle cx="310" cy="250" r="25" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="0.5" opacity="0.2"/>
  <rect x="300" y="242" width="20" height="12" rx="1.5" stroke="#a78bfa" stroke-width="0.8" fill="none" opacity="0.6"/><rect x="304" y="246" width="12" height="4" rx="0.5" fill="#a78bfa" opacity="0.2"/>
  <text x="310" y="286" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">Digital Twin</text>
  <text x="310" y="301" text-anchor="middle" fill="#6b7280" font-size="9" font-family="ui-monospace,monospace">Context + Relationships</text>

  <!-- Flow to Brain -->
  <path d="M365 240 C 420 240, 470 240, 520 240" stroke="#7c3aed" stroke-width="1" fill="none" opacity="0.25"/>
  <path d="M365 260 C 420 260, 470 260, 520 260" stroke="#7c3aed" stroke-width="1" fill="none" opacity="0.25"/>
  ${p2Dash("M365 250 C 420 250, 470 250, 520 250", "#7c3aed", 2.5)}

  <!-- BUSINESS BRAIN (dominant) -->
  <text x="620" y="70" text-anchor="middle" fill="#c4b5fd" font-size="14" font-family="Sora,Inter,sans-serif" font-weight="700" letter-spacing="2">BUSINESS BRAIN</text>
  <circle cx="620" cy="250" r="110" fill="url(#dgp3BrainGlow)"/>
  <g class="dgp1-spin-slow" style="transform-origin:620px 250px"><circle cx="620" cy="250" r="85" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="1" stroke-dasharray="8 8" opacity="0.3"/></g>
  <circle cx="620" cy="250" r="70" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="1.5" opacity="0.4"/>
  <circle cx="620" cy="250" r="55" fill="url(#dgp3BrainGlow)" stroke="#7c3aed" stroke-width="2" opacity="0.6" filter="url(#dgp3Glow)"/>
  <g class="dgp1-spin-slow" style="transform-origin:620px 250px"><circle cx="620" cy="250" r="80" fill="none" stroke="#7c3aed" stroke-width="0.5" opacity="0.25" stroke-dasharray="4 8"/></g>
  <g class="dgp1-spin-rev" style="transform-origin:620px 250px"><circle cx="620" cy="250" r="90" fill="none" stroke="#3b82f6" stroke-width="0.5" opacity="0.2" stroke-dasharray="3 6"/></g>
  <circle cx="620" cy="165" r="7" fill="#7c3aed" opacity="0.5"/><circle cx="620" cy="335" r="7" fill="#7c3aed" opacity="0.5"/><circle cx="535" cy="250" r="7" fill="#3b82f6" opacity="0.5"/><circle cx="705" cy="250" r="7" fill="#3b82f6" opacity="0.5"/>
  <circle cx="620" cy="250" r="35" fill="rgba(124,58,237,0.08)" stroke="#7c3aed" stroke-width="1.5" opacity="0.6"/>
  <circle cx="620" cy="250" r="25" fill="rgba(124,58,237,0.12)" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
  <circle cx="620" cy="250" r="15" fill="rgba(124,58,237,0.15)" stroke="#7c3aed" stroke-width="0.8" opacity="0.4"/>
  <circle cx="620" cy="250" r="7" fill="#7c3aed" opacity="0.25"/>
  <circle class="dgp1-corepulse" cx="620" cy="250" r="3" fill="#a78bfa"/>
  <path d="M620 215v70 M585 250h70 M592 222l56 56 M648 222l-56 56" stroke="#7c3aed" stroke-width="0.5" opacity="0.4"/>
  <text x="620" y="310" text-anchor="middle" fill="#fff" font-size="15" font-family="Sora,Inter,sans-serif" font-weight="700">Structured Intelligence</text>
  <text x="620" y="328" text-anchor="middle" fill="#a78bfa" font-size="10" font-family="ui-monospace,monospace">Context + Understanding</text>

  <!-- Flow to Advisor -->
  <path d="M675 240 C 740 240, 800 235, 850 235" stroke="#3b82f6" stroke-width="1" fill="none" opacity="0.25"/>
  <path d="M675 260 C 740 260, 800 265, 850 265" stroke="#3b82f6" stroke-width="1" fill="none" opacity="0.25"/>
  ${p2Dash("M675 250 C 740 250, 800 250, 850 250", "#3b82f6", 2.5)}

  <!-- ADVISE / AI Advisor -->
  <text x="950" y="70" text-anchor="middle" fill="#60a5fa" font-size="13" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="2">ADVISE</text>
  <circle cx="950" cy="250" r="75" fill="url(#dgp3AdvisorGlow)"/>
  <circle cx="950" cy="250" r="50" fill="rgba(59,130,246,0.05)" stroke="#3b82f6" stroke-width="1.5" opacity="0.8"/>
  <circle cx="950" cy="250" r="38" fill="rgba(59,130,246,0.08)" stroke="#3b82f6" stroke-width="1" stroke-dasharray="3 5" opacity="0.5"/>
  <circle cx="950" cy="250" r="25" fill="rgba(59,130,246,0.05)" stroke="#3b82f6" stroke-width="0.5" opacity="0.3"/>
  <circle cx="950" cy="250" r="14" stroke="#60a5fa" stroke-width="1" fill="none" opacity="0.5"/><circle cx="950" cy="250" r="6" stroke="#60a5fa" stroke-width="0.8" fill="none" opacity="0.4"/>
  <circle class="dgp1-corepulse" cx="950" cy="250" r="2.5" fill="#60a5fa"/>
  <path d="M950 236v28 M936 250h28 M940 240l20 20 M960 240l-20 20" stroke="#60a5fa" stroke-width="0.4" opacity="0.35"/>
  <text x="950" y="282" text-anchor="middle" fill="#bfdbfe" font-size="13" font-family="Sora,Inter,sans-serif" font-weight="600">AI Advisor</text>
  <text x="950" y="299" text-anchor="middle" fill="#6b7280" font-size="9" font-family="ui-monospace,monospace">Reasoning Layer</text>

  <!-- Flow to Governance -->
  ${p2Dash("M950 325 C 950 370, 950 420, 950 452", "#fbbf24", 2)}

  <!-- HUMAN AUTHORITY (amber governance gate) -->
  <text x="950" y="500" text-anchor="middle" fill="#fbbf24" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="1">HUMAN AUTHORITY</text>
  <circle cx="950" cy="540" r="30" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-width="1.5" opacity="0.7"/>
  <circle cx="950" cy="540" r="20" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" stroke-width="0.8" stroke-dasharray="3 5" opacity="0.5"/>
  <circle cx="950" cy="540" r="10" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-width="0.5" opacity="0.3"/>
  <circle cx="950" cy="540" r="5" stroke="#fbbf24" stroke-width="0.9" fill="none"/><path d="M947 540l2 2 4-4" stroke="#fbbf24" stroke-width="0.9" fill="none"/>
  <text x="950" y="590" text-anchor="middle" fill="#6b7280" font-size="9" font-family="ui-monospace,monospace">Approval gate</text>

  <!-- Flow to Act -->
  ${p2Dash("M950 570 C 950 620, 950 668, 950 692", "#34d399", 2)}

  <!-- ACT -->
  <text x="950" y="732" text-anchor="middle" fill="#34d399" font-size="13" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="2">ACT</text>
  <circle cx="950" cy="762" r="35" fill="rgba(16,185,129,0.03)" stroke="#10b981" stroke-width="1" opacity="0.6"/>
  <circle cx="950" cy="762" r="22" fill="rgba(16,185,129,0.05)" stroke="#10b981" stroke-width="0.5" stroke-dasharray="4 6" opacity="0.4"/>
  <rect x="942" y="756" width="16" height="10" rx="1.5" stroke="#34d399" stroke-width="0.8" fill="none" opacity="0.7"/><circle cx="950" cy="761" r="3" stroke="#34d399" stroke-width="0.5" fill="none"/>

  <!-- LEARN -->
  <text x="1082" y="500" text-anchor="middle" fill="#34d399" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="2">LEARN</text>
  <circle cx="1082" cy="540" r="35" fill="rgba(52,211,153,0.03)" stroke="#34d399" stroke-width="1" opacity="0.6"/>
  <circle cx="1082" cy="540" r="22" fill="rgba(52,211,153,0.05)" stroke="#34d399" stroke-width="0.5" stroke-dasharray="4 6" opacity="0.4"/>
  <circle cx="1082" cy="540" r="10" stroke="#34d399" stroke-width="0.8" fill="none" opacity="0.5"/><circle cx="1082" cy="540" r="4" fill="#34d399" opacity="0.2"/>
  <path d="M1078 540l3 3 5-6" stroke="#34d399" stroke-width="0.9" fill="none" opacity="0.8"/>

  <!-- Act → Learn -->
  ${p2Dash("M985 762 C 1035 762, 1055 720, 1055 578", "#34d399", 1.5)}

  <!-- LEARNING RETURN (major architectural return to context) -->
  ${p2Dash("M1050 545 C 900 560, 750 560, 620 560 C 490 560, 400 555, 365 545 C 335 537, 315 528, 300 508", "#34d399", 2.5)}
  <text x="700" y="600" text-anchor="middle" fill="#34d399" font-size="10" font-family="ui-monospace,monospace" opacity="0.85">↺ OUTCOMES → DIGITAL TWIN → BETTER CONTEXT</text>
</svg>`;

  const mobile = `<svg class="dgp3-svg dgp3-svg--mobile" viewBox="0 0 390 760" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <radialGradient id="dgp3BrainGlowV"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.2"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <radialGradient id="dgp3AdvisorGlowV"><stop offset="0%" stop-color="#3b82f6" stop-opacity="0.12"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/></radialGradient>
  </defs>

  <text x="175" y="30" text-anchor="middle" fill="#818cf8" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="2">CONNECT</text>
  <circle cx="150" cy="65" r="10" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.8"/><circle cx="200" cy="65" r="10" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.8"/><circle cx="150" cy="95" r="10" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.8"/><circle cx="200" cy="95" r="10" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.8"/>
  ${p2Dash("M175 116 L175 140", "#6366f1")}

  <text x="175" y="160" text-anchor="middle" fill="#818cf8" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="2">UNDERSTAND</text>
  <circle cx="175" cy="188" r="30" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="0.8"/><circle cx="175" cy="188" r="18" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="0.5" stroke-dasharray="3 4"/><rect x="167" y="182" width="16" height="10" rx="1.5" stroke="#a78bfa" stroke-width="0.7" fill="none" opacity="0.6"/>
  <text x="175" y="232" text-anchor="middle" fill="#c7d2fe" font-size="9" font-family="Sora,Inter,sans-serif" font-weight="600">Digital Twin</text>
  ${p2Dash("M175 240 L175 264", "#7c3aed", 2)}

  <text x="175" y="286" text-anchor="middle" fill="#c4b5fd" font-size="13" font-family="Sora,Inter,sans-serif" font-weight="700" letter-spacing="2">BUSINESS BRAIN</text>
  <circle cx="175" cy="330" r="46" fill="url(#dgp3BrainGlowV)"/>
  <g class="dgp1-spin-slow" style="transform-origin:175px 330px"><circle cx="175" cy="330" r="34" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="1" stroke-dasharray="4 4"/></g>
  <circle cx="175" cy="330" r="24" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="0.8"/><circle cx="175" cy="330" r="13" fill="rgba(124,58,237,0.1)" stroke="#7c3aed" stroke-width="0.5"/>
  <circle class="dgp1-corepulse" cx="175" cy="330" r="4" fill="#a78bfa"/>
  <path d="M175 306v48 M151 330h48 M158 313l34 34 M192 313l-34 34" stroke="#7c3aed" stroke-width="0.4" opacity="0.35"/>
  <text x="175" y="392" text-anchor="middle" fill="#fff" font-size="10" font-family="Sora,Inter,sans-serif" font-weight="600">Structured Intelligence</text>
  ${p2Dash("M175 402 L175 426", "#3b82f6", 2)}

  <text x="175" y="448" text-anchor="middle" fill="#60a5fa" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="2">ADVISE</text>
  <circle cx="175" cy="476" r="28" fill="url(#dgp3AdvisorGlowV)"/><circle cx="175" cy="476" r="18" fill="rgba(59,130,246,0.05)" stroke="#3b82f6" stroke-width="0.8"/><circle cx="175" cy="476" r="9" stroke="#60a5fa" stroke-width="0.6" fill="none"/><circle class="dgp1-corepulse" cx="175" cy="476" r="2.5" fill="#60a5fa"/>
  <text x="175" y="518" text-anchor="middle" fill="#bfdbfe" font-size="10" font-family="Sora,Inter,sans-serif" font-weight="600">AI Advisor</text>
  ${p2Dash("M175 524 L175 548", "#fbbf24", 1.5)}

  <text x="175" y="570" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="1">HUMAN AUTHORITY</text>
  <circle cx="175" cy="596" r="17" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-width="1"/><circle cx="175" cy="596" r="9" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" stroke-width="0.5" stroke-dasharray="2 3"/><path d="M171 596l3 3 5-5" stroke="#fbbf24" stroke-width="0.9" fill="none"/>
  ${p2Dash("M175 613 L175 636", "#34d399", 1.5)}

  <text x="175" y="658" text-anchor="middle" fill="#34d399" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="2">ACT</text>
  <circle cx="175" cy="682" r="18" fill="rgba(16,185,129,0.03)" stroke="#10b981" stroke-width="0.8"/><rect x="169" y="678" width="12" height="8" rx="1" stroke="#34d399" stroke-width="0.6" fill="none"/>
  ${p2Dash("M175 700 L175 722", "#34d399", 1.5)}

  <text x="175" y="744" text-anchor="middle" fill="#34d399" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600" letter-spacing="2">LEARN</text>

  <!-- Learning return to context/intelligence -->
  ${p2Dash("M200 740 C 300 736, 320 560, 320 470 C 320 340, 260 336, 210 332", "#34d399", 1.5)}
  <text x="352" y="540" text-anchor="middle" fill="#34d399" font-size="8" font-family="ui-monospace,monospace" opacity="0.8" transform="rotate(90 352 540)">↺ LEARNING → CONTEXT</text>
</svg>`;

  return `<div class="dgp3-scene dgp3-scene--loop">${desktop}${mobile}</div>`;
}

/* ——— Scene 2 · The signal journey (one enquiry changing state) ——— */
const P3_JOURNEY: Array<{ label: string; sub: string; tint: string; dim: string }> = [
  { label: "RAW", sub: "Website enquiry", tint: "#6366f1", dim: "#6b7280" },
  { label: "CONTEXTUALISED", sub: "CRM + history", tint: "#6366f1", dim: "#9ca3af" },
  { label: "UNDERSTOOD", sub: "Business Brain", tint: "#7c3aed", dim: "#c4b5fd" },
  { label: "REASONED", sub: "AI Advisor", tint: "#3b82f6", dim: "#93c5fd" },
  { label: "AUTHORISED", sub: "Human approval", tint: "#fbbf24", dim: "#fbbf24" },
  { label: "EXECUTED", sub: "Action sent", tint: "#10b981", dim: "#6ee7b7" },
  { label: "LEARNED", sub: "↺ returns", tint: "#34d399", dim: "#34d399" },
];

function p3JourneyScene(): string {
  const desktop = `<svg class="dgp3-svg dgp3-svg--desktop" viewBox="0 0 1100 300" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="dgp3SignalGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.2"/><stop offset="30%" stop-color="#7c3aed" stop-opacity="0.4"/><stop offset="55%" stop-color="#3b82f6" stop-opacity="0.4"/><stop offset="75%" stop-color="#fbbf24" stop-opacity="0.3"/><stop offset="100%" stop-color="#34d399" stop-opacity="0.2"/></linearGradient>
  </defs>
  <path d="M50 150 H1060" stroke="url(#dgp3SignalGrad)" stroke-width="2" fill="none" opacity="0.6"/>
  <path class="dgp1-flow" d="M50 150 H1060" stroke="#a78bfa" stroke-width="2" fill="none" opacity="0.7"/>
  ${P3_JOURNEY.map((s, i) => {
    const x = 100 + i * 160;
    const r = i === 2 ? 26 : i === 4 ? 24 : i === 6 ? 18 : 22;
    return `<g><circle cx="${x}" cy="150" r="${r}" fill="rgba(255,255,255,0.02)" stroke="${s.tint}" stroke-width="1.3" opacity="${0.5 + i * 0.05}"/><circle cx="${x}" cy="150" r="${(r * 0.4).toFixed(0)}" stroke="${s.tint}" stroke-width="0.7" fill="none" opacity="0.45"/><text x="${x}" y="200" text-anchor="middle" fill="${s.dim}" font-size="10" font-family="Sora,Inter,sans-serif" font-weight="600">${s.label}</text><text x="${x}" y="214" text-anchor="middle" fill="#6b7280" font-size="7.5" font-family="ui-monospace,monospace">${s.sub}</text></g>`;
  }).join("")}
</svg>`;

  const mobile = `<svg class="dgp3-svg dgp3-svg--mobile" viewBox="0 0 390 520" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="dgp3SignalGradV" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.2"/><stop offset="30%" stop-color="#7c3aed" stop-opacity="0.4"/><stop offset="55%" stop-color="#3b82f6" stop-opacity="0.4"/><stop offset="75%" stop-color="#fbbf24" stop-opacity="0.3"/><stop offset="100%" stop-color="#34d399" stop-opacity="0.2"/></linearGradient>
  </defs>
  <path d="M120 30 V490" stroke="url(#dgp3SignalGradV)" stroke-width="2" fill="none" opacity="0.5"/>
  <path class="dgp1-flow" d="M120 30 V490" stroke="#a78bfa" stroke-width="2" fill="none" opacity="0.6"/>
  ${P3_JOURNEY.map((s, i) => {
    const y = 45 + i * 70;
    const r = i === 2 ? 18 : 16;
    return `<g><circle cx="120" cy="${y}" r="${r}" fill="rgba(255,255,255,0.02)" stroke="${s.tint}" stroke-width="1" opacity="${0.55 + i * 0.04}"/><text x="152" y="${y - 3}" fill="${s.dim}" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">${s.label}</text><text x="152" y="${y + 12}" fill="#6b7280" font-size="8" font-family="ui-monospace,monospace">${s.sub}</text></g>`;
  }).join("")}
</svg>`;

  return `<div class="dgp3-scene dgp3-scene--journey">${desktop}${mobile}</div>`;
}

function part3(kind: DigitalgateStageKind): StageDef[] {
  return [
    {
      name: "intelligence-loop",
      anchors: ["1. connect", "connect \u2192 understand", "establish the truth"],
      html: stage({
        kind,
        name: "intelligence-loop",
        index: "01",
        eyebrow: "The intelligence loop",
        title: "Connect → Understand → Advise → Act → Learn",
        lede: "Signals become context in the Digital Twin, the Business Brain turns context into understanding, the AI Advisor reasons over it — and where a decision is consequential, a human holds authority before anything acts. Every outcome learns its way back.",
        ariaLabel:
          "The DigitalGate intelligence loop. Connected signals arrive and become context in the Digital Twin. Context flows into the dominant Business Brain, which holds structured intelligence and understanding. The Business Brain feeds a distinct AI Advisor reasoning layer. Consequential recommendations pass through an amber human-authority governance gate before an action is executed. Outcomes are learned and returned along a major green pathway — outcomes to Digital Twin to better context — so the next decision starts richer.",
        variant: "dg-stage--wide dg-stage--p3 dgp3-stage--loop",
        scene: p3LoopScene(),
        caption:
          "The Business Brain understands; the AI Advisor reasons; humans retain authority over consequential decisions; learning closes the loop.",
      }),
    },
    {
      name: "scenario",
      anchors: ["3. advise", "4. act", "5. learn"],
      html: stage({
        kind,
        name: "scenario",
        index: "02",
        eyebrow: "One signal, changing state",
        title: "A single enquiry, all the way through",
        lede: "Watch one website enquiry travel through the architecture — raw, then contextualised, understood, reasoned, authorised by a human, executed, and finally learned back into the system.",
        ariaLabel:
          "A signal journey: one website enquiry changes state as it moves through the system — RAW, then CONTEXTUALISED with CRM history, UNDERSTOOD by the Business Brain, REASONED by the AI Advisor, AUTHORISED at a human-approval gate, EXECUTED as an action, and LEARNED as the outcome returns to context.",
        variant: "dg-stage--wide dg-stage--p3 dgp3-stage--journey",
        scene: p3JourneyScene(),
        caption:
          "One signal, changing state as it moves: nothing consequential is executed until a human authorises it — and the outcome returns as learning.",
      }),
    },
  ];
}

/* —————————————————————————————————————————————————————————————————————————
 * PART 4 — approved prototype port (isolated module; dgp4-* namespace)
 * ————————————————————————————————————————————————————————————————————————— */

const STAGE_BUILDERS: Record<DigitalgateStageKind, (kind: DigitalgateStageKind) => StageDef[]> = {
  "insights-part-1": part1,
  "insights-part-2": part2,
  "insights-part-3": part3,
  "insights-part-4": part4,
};

/** Ordered, individually-placeable scenes for an Insights kind. */
export function stagesForKind(kind: DigitalgateStageKind): StageDef[] {
  return STAGE_BUILDERS[kind](kind);
}

/** Exported for tests / apply tooling. */
export const digitalgateVisualStages = {
  brainCore,
  stagesForKind,
  hasStagesForKind,
  STAGE_OF_ATTR,
};
