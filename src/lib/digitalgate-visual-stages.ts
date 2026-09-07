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
 * PART 1 — “From dumb businesses to smart businesses” (redesigned, #48 Phase 1)
 *
 * One transformation, told visually: FRAGMENTED → CONNECTED → INTELLIGENT →
 * COORDINATED. The visual language itself grows more organised as the story
 * progresses. Signature scenes are self-contained SVG (crisp, scalable, zero
 * client JS) with a distinct desktop and mobile composition — mobile is a real
 * vertical recomposition, never a shrunk desktop. All presentation classes are
 * namespaced `dgp1-` so Parts 2–4 are untouched.
 * ————————————————————————————————————————————————————————————————————————— */

/** The recurring Business Brain™ object as inline SVG (for embedding in scenes). */
function p1Brain(cx: number, cy: number, k: number, id: string): string {
  const P = (dx: number, dy: number) =>
    `${(cx + dx * k).toFixed(1)} ${(cy + dy * k).toFixed(1)}`;
  const hex = `M${P(0, -44)} L${P(38, -22)} L${P(38, 22)} L${P(0, 44)} L${P(-38, 22)} L${P(-38, -22)} Z`;
  const lattice = `M${P(0, -30)} L${P(0, 30)} M${P(-24, -12)} L${P(24, 14)} M${P(24, -12)} L${P(-24, 14)}`;
  return `<g class="dgp1-brainglyph">
    <path d="${hex}" fill="url(#dgp1Brain${id})" stroke="rgba(191,219,254,0.7)" stroke-width="1.4"/>
    <path d="${lattice}" stroke="rgba(226,232,240,0.3)" stroke-width="0.9" fill="none"/>
    <circle cx="${cx}" cy="${cy}" r="${(9 * k).toFixed(1)}" fill="#0b1220" stroke="#93c5fd" stroke-width="1.3"/>
    <circle class="dgp1-spark" cx="${cx}" cy="${cy}" r="${(3.2 * k).toFixed(1)}" fill="#dbeafe"/>
  </g>`;
}

function p1BrainGrad(id: string): string {
  return `<radialGradient id="dgp1Brain${id}" cx="50%" cy="42%" r="70%">
    <stop offset="0%" stop-color="#bfdbfe" stop-opacity="0.95"/>
    <stop offset="45%" stop-color="#3b82f6" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.4"/>
  </radialGradient>`;
}

function p1FragNode(
  label: string,
  x: number,
  y: number,
  s: number,
  o: number,
  colour: string,
): string {
  return `<g transform="translate(${x},${y}) scale(${s})" opacity="${o}">
    <rect width="122" height="42" rx="9" fill="rgba(14,20,32,0.92)" stroke="rgba(122,140,170,0.28)"/>
    <rect x="10" y="11" width="20" height="20" rx="5" fill="${colour}" fill-opacity="0.14" stroke="${colour}" stroke-opacity="0.55"/>
    <circle cx="20" cy="21" r="2.6" fill="${colour}" fill-opacity="0.85"/>
    <text x="40" y="26" fill="#c3cede" font-family="Sora,Inter,sans-serif" font-size="13.5" font-weight="700">${label}</text>
    <path d="M122 20 l24 -8" stroke="rgba(122,140,170,0.4)" stroke-width="1.3" stroke-dasharray="3 4"/>
    <circle cx="149" cy="11" r="2.7" fill="none" stroke="rgba(122,140,170,0.4)" stroke-width="1.1"/>
  </g>`;
}

/** Luminous DigitalGate system core — an isometric cube (the connected system). */
function p1CubeGrads(id: string): string {
  return `<linearGradient id="dgp1CubeT${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#93c5fd"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient>
    <linearGradient id="dgp1CubeL${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(59,130,246,0.85)"/><stop offset="100%" stop-color="rgba(37,99,235,0.55)"/></linearGradient>
    <linearGradient id="dgp1CubeR${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(124,58,237,0.8)"/><stop offset="100%" stop-color="rgba(91,33,182,0.5)"/></linearGradient>`;
}

function p1Cube(cx: number, cy: number, s: number, id: string): string {
  const h = s / 2;
  const top = `${cx},${cy - s} ${cx + s},${cy - h} ${cx},${cy} ${cx - s},${cy - h}`;
  const left = `${cx - s},${cy - h} ${cx},${cy} ${cx},${cy + s} ${cx - s},${cy + h}`;
  const right = `${cx + s},${cy - h} ${cx},${cy} ${cx},${cy + s} ${cx + s},${cy + h}`;
  const edges = `M${cx},${cy} L${cx},${cy - s} M${cx},${cy} L${cx - s},${cy - h} M${cx},${cy} L${cx + s},${cy - h} M${cx},${cy} L${cx},${cy + s}`;
  return `<g class="dgp1-cube">
    <polygon points="${top}" fill="url(#dgp1CubeT${id})" stroke="rgba(199,224,255,0.9)" stroke-width="1.4"/>
    <polygon points="${left}" fill="url(#dgp1CubeL${id})" stroke="rgba(147,197,253,0.6)" stroke-width="1.1"/>
    <polygon points="${right}" fill="url(#dgp1CubeR${id})" stroke="rgba(167,139,250,0.6)" stroke-width="1.1"/>
    <path d="${edges}" stroke="rgba(214,232,255,0.4)" stroke-width="0.8" fill="none"/>
    <circle cx="${cx}" cy="${cy}" r="${(s * 0.24).toFixed(1)}" fill="#dbeafe" opacity="0.9"/>
    <circle class="dgp1-spark" cx="${cx}" cy="${cy}" r="${(s * 0.1).toFixed(1)}" fill="#ffffff"/>
  </g>`;
}

/* ——— Scene A · Fragmentation → Convergence → Intelligence (signature) ——— */

const P1_FRAG_DESKTOP: Array<[string, number, number, number, number, string]> = [
  ["Website", 34, 40, 1, 1, "#60a5fa"],
  ["CRM", 250, 24, 0.94, 0.9, "#818cf8"],
  ["Email", 24, 168, 0.9, 0.82, "#f87171"],
  ["Analytics", 236, 150, 1, 1, "#fbbf24"],
  ["Advertising", 108, 268, 0.86, 0.72, "#34d399"],
  ["Bookings", 300, 250, 0.94, 0.9, "#22d3ee"],
  ["Accounting", 40, 376, 0.9, 0.82, "#4ade80"],
  ["Comms", 262, 372, 0.86, 0.72, "#a78bfa"],
  ["Spreadsheets", 424, 92, 0.8, 0.62, "#a3e635"],
];

function p1SatsDesktop(): string {
  // 5 ordered satellites on r=94 around the core (1000,260).
  const pts = [
    [1000, 166],
    [1089.4, 231],
    [1055.3, 336],
    [944.7, 336],
    [910.6, 231],
  ];
  return pts
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="3.2" fill="#7dd3fc"/><line x1="${x}" y1="${y}" x2="${(x + (1000 - x) * 0.28).toFixed(1)}" y2="${(y + (260 - y) * 0.28).toFixed(1)}" stroke="rgba(125,211,252,0.4)" stroke-width="1"/>`,
    )
    .join("");
}

function p1SignatureScene(): string {
  const nodes = P1_FRAG_DESKTOP.map((n) => p1FragNode(...n)).join("");
  const streamSources: Array<[number, number]> = [
    [156, 61],
    [365, 47],
    [358, 171],
    [415, 270],
    [150, 393],
    [524, 108],
  ];
  const streams = streamSources
    .map(([sx, sy]) => {
      const d = `M${sx} ${sy} C ${sx + 190} ${sy}, 730 260, 906 260`;
      return `<path class="dgp1-stream" d="${d}" fill="none" stroke="url(#dgp1Stream)" stroke-width="1.7"/><path class="dgp1-flow" d="${d}" fill="none" stroke="#8fd6ff" stroke-width="1.5" stroke-opacity="0.85"/>`;
    })
    .join("");
  const tangles = [
    "M156 61 L236 171",
    "M146 190 L172 279",
    "M262 44 L300 260",
  ]
    .map((d) => `<path d="${d}" stroke="rgba(120,140,170,0.14)" stroke-width="1" fill="none"/>`)
    .join("");

  const desktop = `<svg class="dgp1-svg dgp1-svg--desktop" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    ${p1CubeGrads("A")}
    <radialGradient id="dgp1Glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(59,130,246,0.3)"/>
      <stop offset="42%" stop-color="rgba(124,58,237,0.15)"/>
      <stop offset="100%" stop-color="rgba(124,58,237,0)"/>
    </radialGradient>
    <linearGradient id="dgp1Stream" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(96,116,146,0.12)"/>
      <stop offset="55%" stop-color="rgba(56,189,248,0.5)"/>
      <stop offset="100%" stop-color="rgba(125,211,252,0.95)"/>
    </linearGradient>
  </defs>
  <text x="30" y="24" fill="rgba(148,163,184,0.7)" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="800" letter-spacing="2.5">DISCONNECTED TOOLS</text>
  ${tangles}
  ${nodes}
  ${streams}
  <circle cx="1000" cy="260" r="150" fill="url(#dgp1Glow)"/>
  <circle cx="1000" cy="260" r="94" fill="none" stroke="rgba(96,165,250,0.5)" stroke-width="1.4" stroke-dasharray="2 7"/>
  <circle cx="1000" cy="260" r="72" fill="none" stroke="rgba(167,139,250,0.4)" stroke-width="1"/>
  ${p1SatsDesktop()}
  ${p1Cube(1000, 250, 62, "A")}
  <text x="1000" y="382" text-anchor="middle" fill="#eaf1ff" font-family="Sora,Inter,sans-serif" font-size="19" font-weight="800">DigitalGate</text>
  <text x="1000" y="404" text-anchor="middle" fill="#9db4d8" font-family="Inter,sans-serif" font-size="12.5">One connected system</text>
</svg>`;

  const mNodes = (
    [
      ["Website", 20, 26, 0.9, 1, "#60a5fa"],
      ["CRM", 206, 20, 0.86, 0.9, "#818cf8"],
      ["Email", 16, 118, 0.86, 0.82, "#f87171"],
      ["Analytics", 200, 116, 0.9, 1, "#fbbf24"],
      ["Advertising", 58, 212, 0.8, 0.74, "#34d399"],
      ["Bookings", 198, 214, 0.82, 0.86, "#22d3ee"],
    ] as Array<[string, number, number, number, number, string]>
  )
    .map((n) => p1FragNode(...n))
    .join("");
  const mStreams = [
    [70, 250],
    [255, 246],
    [70, 158],
    [250, 156],
    [150, 300],
  ]
    .map(([sx, sy]) => {
      const d = `M${sx} ${sy} C ${sx} ${sy + 90}, 195 400, 195 452`;
      return `<path class="dgp1-stream" d="${d}" fill="none" stroke="url(#dgp1StreamV)" stroke-width="1.6"/><path class="dgp1-flow" d="${d}" fill="none" stroke="#8fd6ff" stroke-width="1.4" stroke-opacity="0.85"/>`;
    })
    .join("");
  const mobile = `<svg class="dgp1-svg dgp1-svg--mobile" viewBox="0 0 390 640" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    ${p1CubeGrads("Am")}
    <radialGradient id="dgp1GlowV" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(59,130,246,0.3)"/><stop offset="45%" stop-color="rgba(124,58,237,0.14)"/><stop offset="100%" stop-color="rgba(124,58,237,0)"/></radialGradient>
    <linearGradient id="dgp1StreamV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(96,116,146,0.12)"/><stop offset="55%" stop-color="rgba(56,189,248,0.5)"/><stop offset="100%" stop-color="rgba(125,211,252,0.95)"/></linearGradient>
  </defs>
  <text x="16" y="16" fill="rgba(148,163,184,0.7)" font-family="Sora,Inter,sans-serif" font-size="10" font-weight="800" letter-spacing="2">DISCONNECTED TOOLS</text>
  ${mNodes}
  ${mStreams}
  <circle cx="195" cy="512" r="120" fill="url(#dgp1GlowV)"/>
  <circle cx="195" cy="512" r="72" fill="none" stroke="rgba(96,165,250,0.5)" stroke-width="1.3" stroke-dasharray="2 7"/>
  ${p1Cube(195, 504, 48, "Am")}
  <text x="195" y="604" text-anchor="middle" fill="#eaf1ff" font-family="Sora,Inter,sans-serif" font-size="16" font-weight="800">DigitalGate</text>
  <text x="195" y="623" text-anchor="middle" fill="#9db4d8" font-family="Inter,sans-serif" font-size="11">One connected system</text>
</svg>`;

  return `<div class="dgp1-scene dgp1-scene--signature">${desktop}${mobile}</div>`;
}

/* ——— Editorial problem markers (restrained; never four feature cards) ——— */

const P1_MARKERS: Array<[string, string, string]> = [
  ["M4 7h16M4 12h10M4 17h13", "Tools don’t talk", "Each system keeps its own version of the truth."],
  ["M12 3v18M5 8l7-5 7 5", "Data stays trapped", "The answer exists — in a tool nobody has open."],
  ["M12 12m-4 0a4 4 0 108 0 4 4 0 10-8 0M4 20c1.6-3.4 4.6-5 8-5s6.4 1.6 8 5", "The owner fills the gaps", "You become the integration layer between apps."],
  ["M5 19l4-9 4 5 3-7 3 6", "Opportunities slip", "The moment to act passes before anyone notices."],
];

function p1MarkersScene(): string {
  const items = P1_MARKERS.map(
    ([d, title, detail]) => `<div class="dgp1-marker">
    <svg class="dgp1-marker__glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="dgp1-marker__body"><strong>${title}</strong><small>${detail}</small></div>
  </div>`,
  ).join("");
  return `<div class="dgp1-scene dgp1-scene--markers"><div class="dgp1-markers">${items}</div></div>`;
}

/* ——— Scene B · Intelligence architecture (Signals → Twin → Brain → Advisor → Action) ——— */

function p1ArchScene(): string {
  const flow = (d: string) =>
    `<path class="dgp1-stream" d="${d}" fill="none" stroke="url(#dgp1ArchFlow)" stroke-width="1.8"/><path class="dgp1-flow" d="${d}" fill="none" stroke="#8fd6ff" stroke-width="1.5" stroke-opacity="0.8"/>`;
  const desktop = `<svg class="dgp1-svg dgp1-svg--desktop" viewBox="0 0 1200 470" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    ${p1BrainGrad("B")}
    <radialGradient id="dgp1BrainGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(96,165,250,0.32)"/><stop offset="45%" stop-color="rgba(124,58,237,0.16)"/><stop offset="100%" stop-color="rgba(124,58,237,0)"/></radialGradient>
    <linearGradient id="dgp1ArchFlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(96,116,146,0.35)"/><stop offset="50%" stop-color="rgba(96,165,250,0.75)"/><stop offset="100%" stop-color="rgba(125,211,252,0.9)"/></linearGradient>
    <linearGradient id="dgp1Twin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(56,189,248,0.16)"/><stop offset="100%" stop-color="rgba(37,99,235,0.05)"/></linearGradient>
  </defs>
  ${flow("M196 235 C 280 235, 300 235, 344 235")}
  ${flow("M500 235 C 545 235, 560 235, 566 235")}
  ${flow("M700 235 C 760 235, 780 235, 820 235")}
  ${flow("M980 235 C 1010 235, 1020 235, 1024 235")}
  <text x="118" y="86" text-anchor="middle" fill="rgba(148,163,184,0.72)" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="800" letter-spacing="1.5">BUSINESS SIGNALS</text>
  ${[["Website", 150], ["CRM & Finance", 190], ["Comms & Bookings", 230], ["Analytics", 270], ["Reviews & Ops", 310]]
    .map(([t, y]) => `<g transform="translate(40,${y})"><rect width="156" height="30" rx="8" fill="rgba(13,19,31,0.9)" stroke="rgba(96,116,146,0.35)"/><circle cx="16" cy="15" r="3" fill="#60a5fa"/><text x="30" y="19" fill="#b9c6d8" font-family="Inter,sans-serif" font-size="12" font-weight="600">${t}</text></g>`) 
    .join("")}
  <g transform="translate(344,150)"><rect width="156" height="170" rx="16" fill="url(#dgp1Twin)" stroke="rgba(56,189,248,0.4)"/>
    <path d="M20 40 L136 40 M20 70 L136 70 M20 100 L136 100 M20 130 L136 130 M52 20 L20 150 M92 20 L60 150 M132 20 L100 150" stroke="rgba(125,211,252,0.28)" stroke-width="0.8" fill="none"/>
    <text x="78" y="26" text-anchor="middle" fill="#dbeafe" font-family="Sora,Inter,sans-serif" font-size="13" font-weight="800">Digital Twin</text>
  </g>
  <text x="422" y="342" text-anchor="middle" fill="#9db4d8" font-family="Inter,sans-serif" font-size="12">A live model of the business</text>
  <circle cx="632" cy="235" r="150" fill="url(#dgp1BrainGlow)"/>
  <circle cx="632" cy="235" r="96" fill="none" stroke="rgba(96,165,250,0.45)" stroke-width="1.3" stroke-dasharray="2 8"/>
  ${p1Brain(632, 232, 2.15, "B")}
  <text x="632" y="368" text-anchor="middle" fill="#f2f6ff" font-family="Sora,Inter,sans-serif" font-size="18" font-weight="800">Business Brain™</text>
  <text x="632" y="389" text-anchor="middle" fill="#9db4d8" font-family="Inter,sans-serif" font-size="12">Understands the whole business</text>
  <g transform="translate(820,168)"><rect width="160" height="134" rx="16" fill="rgba(13,19,31,0.92)" stroke="rgba(96,165,250,0.4)"/>
    <text x="80" y="30" text-anchor="middle" fill="#dbeafe" font-family="Sora,Inter,sans-serif" font-size="13" font-weight="800">AI Advisor</text>
    <path d="M22 52 h116 M22 74 h96 M22 96 h108" stroke="rgba(148,163,184,0.4)" stroke-width="3" stroke-linecap="round"/>
    <rect x="22" y="108" width="70" height="16" rx="8" fill="rgba(96,165,250,0.18)" stroke="rgba(96,165,250,0.5)"/><text x="57" y="120" text-anchor="middle" fill="#bfdbfe" font-family="Inter,sans-serif" font-size="9" font-weight="800">Recommends</text>
  </g>
  <text x="900" y="330" text-anchor="middle" fill="#9db4d8" font-family="Inter,sans-serif" font-size="12">The next sensible move</text>
  <text x="1088" y="150" text-anchor="middle" fill="rgba(148,163,184,0.72)" font-family="Sora,Inter,sans-serif" font-size="11" font-weight="800" letter-spacing="1.5">ACTION</text>
  ${[["Tasks", 178], ["Messages", 218], ["Automation", 258]]
    .map(([t, y]) => `<g transform="translate(1024,${y})"><rect width="150" height="30" rx="8" fill="rgba(13,19,31,0.9)" stroke="rgba(52,211,153,0.35)"/><circle cx="16" cy="15" r="3" fill="#34d399"/><text x="30" y="19" fill="#c7e6d6" font-family="Inter,sans-serif" font-size="12" font-weight="600">${t}</text></g>`)
    .join("")}
  <text x="1099" y="312" text-anchor="middle" fill="#9db4d8" font-family="Inter,sans-serif" font-size="12">People stay in control</text>
</svg>`;

  const vflow = (d: string) =>
    `<path class="dgp1-stream" d="${d}" fill="none" stroke="url(#dgp1ArchFlowV)" stroke-width="1.8"/><path class="dgp1-flow" d="${d}" fill="none" stroke="#8fd6ff" stroke-width="1.5" stroke-opacity="0.8"/>`;
  const mobile = `<svg class="dgp1-svg dgp1-svg--mobile" viewBox="0 0 390 760" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>${p1BrainGrad("Bm")}<radialGradient id="dgp1BrainGlowV" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(96,165,250,0.3)"/><stop offset="45%" stop-color="rgba(124,58,237,0.15)"/><stop offset="100%" stop-color="rgba(124,58,237,0)"/></radialGradient><linearGradient id="dgp1ArchFlowV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(96,116,146,0.35)"/><stop offset="50%" stop-color="rgba(96,165,250,0.75)"/><stop offset="100%" stop-color="rgba(125,211,252,0.9)"/></linearGradient></defs>
  ${vflow("M195 96 L195 150")}${vflow("M195 250 L195 300")}${vflow("M195 470 L195 520")}${vflow("M195 610 L195 660")}
  <g transform="translate(107,48)"><rect width="176" height="48" rx="12" fill="rgba(13,19,31,0.9)" stroke="rgba(96,116,146,0.4)"/><text x="88" y="22" text-anchor="middle" fill="#dbeafe" font-family="Sora,Inter,sans-serif" font-size="13" font-weight="800">Business signals</text><text x="88" y="38" text-anchor="middle" fill="#9db4d8" font-family="Inter,sans-serif" font-size="10.5">Website · CRM · comms · finance</text></g>
  <g transform="translate(115,150)"><rect width="160" height="100" rx="14" fill="url(#dgp1Twin)" stroke="rgba(56,189,248,0.4)"/><path d="M20 40 H140 M20 66 H140 M60 20 L36 90 M100 20 L76 90" stroke="rgba(125,211,252,0.28)" stroke-width="0.8" fill="none"/><text x="80" y="26" text-anchor="middle" fill="#dbeafe" font-family="Sora,Inter,sans-serif" font-size="12.5" font-weight="800">Digital Twin</text></g>
  <circle cx="195" cy="385" r="118" fill="url(#dgp1BrainGlowV)"/><circle cx="195" cy="385" r="78" fill="none" stroke="rgba(96,165,250,0.45)" stroke-width="1.2" stroke-dasharray="2 8"/>${p1Brain(195, 382, 1.7, "Bm")}<text x="195" y="486" text-anchor="middle" fill="#f2f6ff" font-family="Sora,Inter,sans-serif" font-size="15" font-weight="800">Business Brain™</text>
  <g transform="translate(115,520)"><rect width="160" height="90" rx="14" fill="rgba(13,19,31,0.92)" stroke="rgba(96,165,250,0.4)"/><text x="80" y="26" text-anchor="middle" fill="#dbeafe" font-family="Sora,Inter,sans-serif" font-size="12.5" font-weight="800">AI Advisor</text><path d="M24 46 h112 M24 64 h84" stroke="rgba(148,163,184,0.4)" stroke-width="3" stroke-linecap="round"/></g>
  <g transform="translate(107,660)"><rect width="176" height="48" rx="12" fill="rgba(13,19,31,0.9)" stroke="rgba(52,211,153,0.4)"/><text x="88" y="22" text-anchor="middle" fill="#c7e6d6" font-family="Sora,Inter,sans-serif" font-size="13" font-weight="800">Action</text><text x="88" y="38" text-anchor="middle" fill="#9db4d8" font-family="Inter,sans-serif" font-size="10.5">Tasks · messages · automation</text></g>
</svg>`;

  return `<div class="dgp1-scene dgp1-scene--arch">${desktop}${mobile}</div>`;
}

/* ——— Scene C · Transformation rail (grows more organised left → right) ——— */

const P1_RAIL: Array<[string, string, string]> = [
  [
    "scattered",
    "Fragmented",
    "Disconnected tools",
  ],
  [
    "linked",
    "Connected",
    "One shared system",
  ],
  [
    "intelligent",
    "Intelligent",
    "It understands the business",
  ],
  [
    "coordinated",
    "Coordinated",
    "It helps run the business",
  ],
];

function p1RailGlyph(kind: string): string {
  if (kind === "scattered")
    return `<circle cx="10" cy="12" r="3"/><circle cx="30" cy="8" r="3"/><circle cx="44" cy="24" r="3"/><circle cx="20" cy="28" r="3"/><circle cx="38" cy="14" r="3"/>`;
  if (kind === "linked")
    return `<path d="M10 12 L30 8 L44 24 M30 8 L20 28 L44 24" stroke="currentColor" stroke-width="1.3" fill="none" opacity="0.55"/><circle cx="10" cy="12" r="3"/><circle cx="30" cy="8" r="3"/><circle cx="44" cy="24" r="3"/><circle cx="20" cy="28" r="3"/>`;
  if (kind === "intelligent")
    return `<path d="M27 16 L10 10 M27 16 L44 8 M27 16 L14 28 M27 16 L42 26" stroke="currentColor" stroke-width="1.3" opacity="0.6"/><circle cx="10" cy="10" r="2.6"/><circle cx="44" cy="8" r="2.6"/><circle cx="14" cy="28" r="2.6"/><circle cx="42" cy="26" r="2.6"/><circle cx="27" cy="16" r="5.5" fill="currentColor"/>`;
  return `<rect x="10" y="6" width="34" height="22" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="27" cy="17" r="4.5" fill="currentColor"/><path d="M27 17 L18 11 M27 17 L36 11 M27 17 L18 23 M27 17 L36 23" stroke="currentColor" stroke-width="1.1"/>`;
}

function p1RailScene(): string {
  const stops = P1_RAIL.map(
    ([kind, title, sub], i) => `<li class="dgp1-rail__stop dgp1-rail__stop--${kind}">
    <span class="dgp1-rail__marker"><svg viewBox="0 0 54 34" aria-hidden="true">${p1RailGlyph(kind)}</svg></span>
    <span class="dgp1-rail__step">0${i + 1}</span>
    <strong>${title}</strong>
    <small>${sub}</small>
  </li>`,
  ).join("");
  return `<div class="dgp1-scene dgp1-scene--rail"><ol class="dgp1-rail"><span class="dgp1-rail__track" aria-hidden="true"></span>${stops}</ol></div>`;
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
          "A field of disconnected business systems on the left — website, CRM, email, analytics, advertising, bookings, accounting, communications and spreadsheets — each with broken, incomplete signal paths. Their signals converge through brightening streams into a single luminous DigitalGate core on the right, which is visibly more ordered than the scattered tools.",
        variant: "dg-stage--wide dg-stage--p1 dgp1-stage--signature",
        scene: p1SignatureScene(),
        caption: "Fragmentation on the left, one connected system on the right — the same business, made coherent.",
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
        title: "The cost of a disconnected business",
        lede: "None of these are dramatic failures. They are the quiet, daily tax of software that was never designed to work together.",
        ariaLabel:
          "Four supporting problems of a disconnected business: tools don’t talk, data stays trapped, the owner fills the gaps, and opportunities slip.",
        variant: "dg-stage--p1 dgp1-stage--markers",
        scene: p1MarkersScene(),
        caption: "Connection is not a feature. It is the precondition for everything intelligent that follows.",
      }),
    },
    {
      name: "intelligence-stack",
      anchors: [
        "what “connected” actually means",
        'what "connected" actually means',
        "connected” actually means",
        "the intelligence model",
      ],
      html: stage({
        kind,
        name: "intelligence-stack",
        index: "03",
        eyebrow: "The architecture",
        title: "From tools to an operating system",
        lede: "Once the business is connected, intelligence has something to work with. Signals feed a live Digital Twin; the Business Brain™ understands it; the AI Advisor recommends the next move — and only appropriate, governed action follows.",
        ariaLabel:
          "An intelligence architecture flowing left to right: business signals feed a Digital Twin, which feeds the dominant central Business Brain, which feeds the AI Advisor, which drives governed Action. The Brain is the largest, most luminous node.",
        variant: "dg-stage--wide dg-stage--p1 dgp1-stage--arch",
        scene: p1ArchScene(),
        caption: "Intelligence builds as information moves through the system — the Business Brain is the centre of gravity.",
      }),
    },
    {
      name: "operating-system",
      anchors: [
        "digitalgate is not trying to replace",
        "not trying to replace every tool",
        "the vision: software",
        "software → systems → intelligence",
        "the vision",
      ],
      html: stage({
        kind,
        name: "operating-system",
        index: "04",
        eyebrow: "The transformation",
        title: "Fragmented → Connected → Intelligent → Coordinated",
        lede: "This is the whole journey on one line. The business you start with is a pile of tools. The business you end with runs as one coordinated system.",
        ariaLabel:
          "A four-step transformation rail whose glyphs grow more organised at each step: fragmented (scattered dots), connected (linked dots), intelligent (dots around a central node) and coordinated (one unified system).",
        variant: "dg-stage--wide dg-stage--p1 dgp1-stage--rail",
        scene: p1RailScene(),
        caption: "The reader began surrounded by fragmented tools; they finish looking at one organised operating system.",
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
