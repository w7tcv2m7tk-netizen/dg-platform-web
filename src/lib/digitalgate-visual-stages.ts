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

function node(title: string, detail: string, cls = ""): string {
  const c = cls ? ` ${cls}` : "";
  return `<div class="dg-node${c}"><strong>${title}</strong><small>${detail}</small></div>`;
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
        `<path d="${d}" stroke="${c}" stroke-width="1.5" stroke-dasharray="4 9" fill="none" opacity="0.32"/>`,
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
        `<path d="${d}" fill="none" stroke="url(#dgp1Conv)" stroke-width="1.8"/><path class="dgp1-flow" d="${d}" fill="none" stroke="#8fd6ff" stroke-width="1.4" stroke-opacity="0.85"/>`,
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
    <radialGradient id="dgp1CoreGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(124,58,237,0.28)"/><stop offset="45%" stop-color="rgba(59,130,246,0.14)"/><stop offset="100%" stop-color="rgba(124,58,237,0)"/></radialGradient>
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
    <radialGradient id="dgp1CoreGlowV" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(124,58,237,0.28)"/><stop offset="45%" stop-color="rgba(59,130,246,0.14)"/><stop offset="100%" stop-color="rgba(124,58,237,0)"/></radialGradient>
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
  const flow = (d: string, c: string, w = 2) =>
    `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" opacity="0.6"/><path class="dgp1-flow" d="${d}" stroke="#bfe4ff" stroke-width="1.4" fill="none" opacity="0.8"/>`;

  const desktop = `<svg class="dgp1-svg dgp1-svg--desktop" viewBox="0 0 1100 500" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="dgp1BrainGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.3"/><stop offset="50%" stop-color="#7c3aed" stop-opacity="0.1"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0.3"/></linearGradient>
    <radialGradient id="dgp1BrainRadial"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.16"/><stop offset="70%" stop-color="#7c3aed" stop-opacity="0.05"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <filter id="dgp1Soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
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
  <circle cx="230" cy="250" r="45" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="2" opacity="0.8"/>
  <circle cx="230" cy="250" r="35" fill="none" stroke="#6366f1" stroke-width="1" stroke-dasharray="3 5" opacity="0.5"/>
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
    <linearGradient id="dgp1BrainGlowV" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.3"/><stop offset="50%" stop-color="#7c3aed" stop-opacity="0.1"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0.3"/></linearGradient>
    <radialGradient id="dgp1BrainRadialV"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.16"/><stop offset="70%" stop-color="#7c3aed" stop-opacity="0.05"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
  </defs>
  <text x="195" y="18" text-anchor="middle" fill="#4b5563" font-size="9" font-family="ui-monospace,monospace" letter-spacing="1.5">DATA SOURCES</text>
  ${mSrc(90, "#8b5cf6", "globe")}${mSrc(160, "#3b82f6", "users")}${mSrc(230, "#10b981", "chart")}${mSrc(300, "#ec4899", "mail")}
  ${flow("M195 66 L195 128", "#7c3aed")}
  <circle cx="195" cy="176" r="40" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="1.6" opacity="0.8"/>${iconG("layers", 195, 172, 24, "#818cf8", 0.7)}<text x="195" y="198" text-anchor="middle" fill="#c7d2fe" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="700">Digital Twin</text>
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
 * PART 2 — Business as a living system (architecture map, not a table)
 * ————————————————————————————————————————————————————————————————————————— */

const LIVING_SYSTEM: Array<{ ring: 1 | 2 | 3; k: string; v: string; cls?: string }> = [
  { ring: 1, k: "Brain", v: "Business Brain", cls: "is-brain" },
  { ring: 2, k: "Mind", v: "AI Advisor — reasoning" },
  { ring: 2, k: "Memory", v: "CRM + Business Knowledge" },
  { ring: 2, k: "Senses", v: "Signals + Analytics" },
  { ring: 2, k: "Nervous system", v: "Connectors + Events" },
  { ring: 3, k: "Body", v: "Core + Industry Apps" },
  { ring: 3, k: "Hands", v: "Tools + Automation" },
  { ring: 3, k: "Voice", v: "Communications" },
  { ring: 3, k: "Immune system", v: "Security + Governance", cls: "is-guard" },
  { ring: 3, k: "Health", v: "Business Health" },
  { ring: 3, k: "Direction", v: "Goals + Strategy" },
  { ring: 3, k: "Learning", v: "Outcomes + Digital Twin", cls: "is-learn" },
];

function part2(kind: DigitalgateStageKind): StageDef[] {
  const rings = (r: 1 | 2 | 3) =>
    LIVING_SYSTEM.filter((x) => x.ring === r)
      .map(
        (x) =>
          `<li class="dg-anatomy__node${x.cls ? ` ${x.cls}` : ""}"><strong>${x.k}</strong><small>${x.v}</small></li>`,
      )
      .join("");

  return [
    {
      name: "living-system",
      anchors: ["the digitalgate body map", "body map", "the body map"],
      html: stage({
        kind,
        name: "living-system",
        index: "01",
        eyebrow: "The architecture",
        title: "An intelligent business is more than a brain",
        lede: "A brain without a body senses nothing and does nothing. DigitalGate is the whole system — organised as connected rings around one shared intelligence.",
        ariaLabel:
          "A living-system map. Inner ring: Business Brain. Middle ring: mind (AI Advisor), memory (CRM and knowledge), senses (signals and analytics) and nervous system (connectors and events). Outer ring: body (Core and industry apps), hands (tools and automation), voice (communications), immune system (security and governance), health, direction (goals) and learning (outcomes and Digital Twin).",
        variant: "dg-stage--map dg-stage--wide",
        scene: `<div class="dg-anatomy">
  <div class="dg-anatomy__diagram" aria-hidden="true">
    <span class="dg-anatomy__ring dg-anatomy__ring--3"></span>
    <span class="dg-anatomy__ring dg-anatomy__ring--2"></span>
    <span class="dg-anatomy__core">${brainCore({ idSuffix: "P2" })}<strong>Business Brain™</strong></span>
  </div>
  <div class="dg-anatomy__legend">
    <p class="dg-anatomy__ring-label">Intelligence</p>
    <ul class="dg-anatomy__group is-inner">${rings(1)}</ul>
    <p class="dg-anatomy__ring-label">Perception &amp; memory</p>
    <ul class="dg-anatomy__group is-mid">${rings(2)}</ul>
    <p class="dg-anatomy__ring-label">Body, action &amp; governance</p>
    <ul class="dg-anatomy__group is-outer">${rings(3)}</ul>
  </div>
</div>`,
        caption:
          "The sophistication is the connection: senses inform memory, memory informs the Brain, the Brain informs action — all governed.",
      }),
    },
    {
      name: "living-flow",
      anchors: ["a business operating system", "operating system", "the bigger idea"],
      html: stage({
        kind,
        name: "living-flow",
        index: "02",
        eyebrow: "How it lives",
        title: "Perceive → remember → understand → act → govern",
        lede: "The parts are not a checklist. They form a pathway the business runs on, continuously.",
        ariaLabel:
          "A pathway across the living system: senses perceive, memory retains, the Business Brain understands, hands and voice act, and the immune system governs throughout.",
        scene: `<ol class="dg-path">
  ${node("Senses", "Signals + Analytics perceive activity", "is-signal")}
  ${node("Memory", "CRM + Knowledge retain the context", "")}
  ${node("Brain", "Business Brain understands the whole", "is-live")}
  ${node("Hands & Voice", "Automation + Communications act", "")}
  ${node("Immune system", "Security + Governance keep it safe", "is-guard")}
  ${node("Learning", "Outcomes + Digital Twin improve it", "is-positive")}
</ol>`,
        caption: "One connected organism — every capability strengthens the next.",
      }),
    },
  ];
}

/* —————————————————————————————————————————————————————————————————————————
 * PART 3 — Signal → Action (the loop is dominant; explicit human approval)
 * ————————————————————————————————————————————————————————————————————————— */

function part3(kind: DigitalgateStageKind): StageDef[] {
  return [
    {
      name: "intelligence-loop",
      anchors: ["1. connect", "connect →", "connect \u2192", "understand \u2192 advise"],
      html: stage({
        kind,
        name: "intelligence-loop",
        index: "01",
        eyebrow: "The operating model",
        title: "Connect → Understand → Advise → Act → Learn",
        lede: "The whole platform is one loop. It gets more useful every time it goes round.",
        ariaLabel:
          "A dominant circular intelligence loop with five stages — Connect, Understand, Advise, Act, Learn — orbiting the Business Brain at the centre.",
        variant: "dg-stage--loop dg-stage--wide",
        scene: `<div class="dgs-loop">
  <svg class="dgs-loop__ring" viewBox="0 0 320 320" aria-hidden="true">
    <defs>
      <marker id="dgLoopHead" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#60a5fa"/></marker>
    </defs>
    <circle cx="160" cy="160" r="120" fill="none" stroke="rgba(51,65,85,0.8)" stroke-width="1.5"/>
    <circle class="dg-flow__loop" cx="160" cy="160" r="120" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-opacity="0.6" marker-end="url(#dgLoopHead)"/>
  </svg>
  <div class="dgs-loop__center">${brainCore({ idSuffix: "P3" })}<strong>Business Brain™</strong></div>
  <ul class="dgs-loop__stops">
    <li class="dgs-loop__stop dgs-loop__stop--1"><span>1</span><strong>Connect</strong><small>Authorised signals arrive</small></li>
    <li class="dgs-loop__stop dgs-loop__stop--2"><span>2</span><strong>Understand</strong><small>Context interprets the signal</small></li>
    <li class="dgs-loop__stop dgs-loop__stop--3"><span>3</span><strong>Advise</strong><small>The next sensible move appears</small></li>
    <li class="dgs-loop__stop dgs-loop__stop--4"><span>4</span><strong>Act</strong><small>People approve; the platform follows through</small></li>
    <li class="dgs-loop__stop dgs-loop__stop--5"><span>5</span><strong>Learn</strong><small>Outcomes improve the next decision</small></li>
  </ul>
</div>`,
        caption: "Alive by design — each turn of the loop compounds the last.",
      }),
    },
    {
      name: "scenario",
      anchors: ["3. advise", "4. act", "2. understand"],
      html: stage({
        kind,
        name: "scenario",
        index: "02",
        eyebrow: "A signal travels",
        title: "One enquiry, all the way through",
        lede: "Follow a single website enquiry across the system. Nothing is sent to a customer until a human approves.",
        ariaLabel:
          "A worked scenario: a website enquiry gains CRM context, the Business Brain interprets it, the AI Advisor recommends a reply, a human approves at an explicit gate, a follow-up is sent, the outcome is captured, and the system learns.",
        variant: "dg-stage--journey",
        scene: `<ol class="dg-journey">
  <li class="dg-journey__step is-signal"><span class="dg-journey__dot" aria-hidden="true"></span><div><strong>Website enquiry</strong><p>A prospect asks a question on the site.</p></div></li>
  <li class="dg-journey__step"><span class="dg-journey__dot" aria-hidden="true"></span><div><strong>Context attached</strong><p>CRM adds who they are and what's already happened.</p></div></li>
  <li class="dg-journey__step is-brain"><span class="dg-journey__dot" aria-hidden="true"></span><div>${brainCore({ idSuffix: "P3j" })}<strong>Business Brain interprets</strong><p>Reads intent, value and history together.</p></div></li>
  <li class="dg-journey__step"><span class="dg-journey__dot" aria-hidden="true"></span><div><strong>AI Advisor recommends</strong><p>Drafts the sensible next reply and follow-up.</p></div></li>
  <li class="dg-journey__step dg-journey__gate"><span class="dg-journey__dot" aria-hidden="true"></span><div><strong>Human approval</strong><p>A person reviews and decides. Nothing goes out without this.</p><span class="dg-gate__badge">You approve</span></div></li>
  <li class="dg-journey__step"><span class="dg-journey__dot" aria-hidden="true"></span><div><strong>Follow-up sent</strong><p>The approved action is carried out.</p></div></li>
  <li class="dg-journey__step is-positive"><span class="dg-journey__dot" aria-hidden="true"></span><div><strong>Outcome captured → learns</strong><p>The result feeds the next decision.</p></div></li>
</ol>`,
        caption:
          "Understand the model from the picture alone: signal in, judgement in the middle, a human decision before anything leaves.",
      }),
    },
  ];
}

/* —————————————————————————————————————————————————————————————————————————
 * PART 4 — Proactive / self-driving business (maturity, comparison, governance)
 * ————————————————————————————————————————————————————————————————————————— */

const MATURITY: Array<[string, string]> = [
  ["Passive software", "Waits to be asked"],
  ["Assistive", "Suggests when opened"],
  ["Proactive", "Surfaces what needs doing"],
  ["Governed automation", "Acts on approved rules"],
  ["Learning system", "Improves with every outcome"],
];

function part4(kind: DigitalgateStageKind): StageDef[] {
  return [
    {
      name: "maturity",
      anchors: [
        "software should tell you",
        "the problem with passive",
        "passive software",
        "business software should",
      ],
      html: stage({
        kind,
        name: "maturity",
        index: "01",
        eyebrow: "The progression",
        title: "Software should tell you what needs doing",
        lede: "Five steps from software that waits, to a system that thinks ahead — each meaningfully more capable than the last.",
        ariaLabel:
          "A five-step maturity rail: passive software, assistive, proactive, governed automation, and learning system — each step more capable.",
        variant: "dg-stage--rail",
        scene: `<ol class="dg-rail">
  ${MATURITY.map(
    ([k, v], i) =>
      `<li class="dg-rail__step${i >= 2 ? " is-live" : ""}${i === 4 ? " is-peak" : ""}"><span class="dg-rail__num" aria-hidden="true">${i + 1}</span><strong>${k}</strong><small>${v}</small></li>`,
  ).join("")}
</ol>`,
        caption: "Capability climbs — DigitalGate operates at the top of this rail, with governance built in.",
      }),
    },
    {
      name: "passive-vs-intelligent",
      anchors: ["the problem with dashboards", "dashboards"],
      html: stage({
        kind,
        name: "passive-vs-intelligent",
        index: "02",
        eyebrow: "The difference, felt",
        title: "A number vs an operating decision",
        lede: "Passive software reports. Operating intelligence interprets, prioritises and prepares — as a product experience, not a statistic.",
        ariaLabel:
          "A comparison. Passive software shows the number 47 opportunities. DigitalGate shows a prepared briefing: seven opportunities need attention, three high-value prospects have gone quiet, and the priority follow-up list is ready.",
        variant: "dg-stage--compare",
        scene: `<div class="dg-compare">
  <div class="dg-compare__side dg-compare__side--passive">
    <span class="dg-compare__tag">Passive software</span>
    <div class="dg-compare__stat"><strong>47</strong><small>opportunities</small></div>
    <p class="dg-compare__note">A count. You still have to work out what it means.</p>
  </div>
  <div class="dg-compare__side dg-compare__side--dg">
    <span class="dg-compare__tag">DigitalGate</span>
    <div class="dg-frame" role="group" aria-label="AI Advisor briefing">
      <div class="dg-frame__bar" aria-hidden="true"><span></span><span></span><span></span><em>AI Advisor</em></div>
      <div class="dg-frame__body">
        <p class="dg-frame__line"><span class="dg-frame__pill">Priority</span> Seven opportunities need attention.</p>
        <p class="dg-frame__line">Three high-value prospects have gone quiet.</p>
        <p class="dg-frame__line dg-frame__line--done">I've prepared the priority follow-up list.</p>
        <span class="dg-frame__cta" aria-hidden="true">Review &amp; approve →</span>
      </div>
    </div>
    <p class="dg-compare__note">Interpreted, prioritised, prepared — ready for your decision.</p>
  </div>
</div>`,
        caption: "Same data. One tells you a number; the other tells you what to do — and waits for you.",
      }),
    },
    {
      name: "governance",
      anchors: [
        "human control is part of the intelligence",
        "human control is part",
        "human control",
      ],
      html: stage({
        kind,
        name: "governance",
        index: "03",
        eyebrow: "Who does what",
        title: "The machine thinks. The human decides.",
        lede: "Make the machine do the thinking wherever appropriate. Keep the decisions that matter with people. This is not the AI taking over.",
        ariaLabel:
          "A governance split in three columns. Machine: detects, correlates, prioritises, recommends, prepares. Human: reviews, approves, decides where judgement matters. System: executes approved actions, records the outcome, learns.",
        variant: "dg-stage--governance",
        scene: `<div class="dg-govern">
  <div class="dg-govern__col dg-govern__col--machine">
    <span class="dg-govern__role">Machine</span>
    <ul>${["Detects", "Correlates", "Prioritises", "Recommends", "Prepares"].map((x) => `<li>${x}</li>`).join("")}</ul>
  </div>
  <div class="dg-govern__col dg-govern__col--human">
    <span class="dg-govern__role">Human</span>
    <ul>${["Reviews", "Approves", "Decides where judgement matters"].map((x) => `<li>${x}</li>`).join("")}</ul>
    <span class="dg-gate__badge">Decision stays here</span>
  </div>
  <div class="dg-govern__col dg-govern__col--system">
    <span class="dg-govern__role">System</span>
    <ul>${["Executes approved actions", "Records the outcome", "Learns"].map((x) => `<li>${x}</li>`).join("")}</ul>
  </div>
</div>`,
        caption: "Thinking is delegated. Judgement is not.",
      }),
    },
  ];
}

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
