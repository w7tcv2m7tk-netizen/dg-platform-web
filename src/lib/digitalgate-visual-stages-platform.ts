/**
 * DigitalGate Platform Overview — renderer-owned architecture visuals.
 *
 * A faithful production PORT of the approved DeepSeek Platform prototype into
 * the existing Website Studio visual-storytelling system (the same mechanism
 * used for the Insights pages). Each scene is an isolated `<figure>` woven into
 * the Website Studio article at a semantic anchor (the section heading), so the
 * SEO-critical copy stays in Website Studio HTML and the architecture diagrams
 * are injected by the renderer.
 *
 * Presentation only: HTML + SVG strings. No client JS, no Neon writes. All
 * classes are namespaced `dgpov-`; SVGs are decorative (aria-hidden) and the
 * meaning lives in the surrounding HTML + each figure's aria-label. Matching CSS
 * lives in `components/websites/digitalgate-visual-storytelling-css.ts`.
 *
 * Fixes applied vs. the prototype reference:
 *   - JSX → renderer-owned HTML/SVG strings (valid SVG attributes).
 *   - the incomplete mobile hero path at the Digital Twin → Business Brain
 *     transition is completed.
 *   - decorative drift particles → restrained path-following dash-flow.
 *   - no fake nav / fake logo / href="#" (chrome + links come from Website
 *     Studio; CTAs use real production routes in the article HTML).
 */

import { STAGE_OF_ATTR, type StageDef } from "./digitalgate-visual-stages";

const PLATFORM_STAGE_KIND = "platform-overview" as const;

/** Animated flow: a static base path + a restrained path-following dash overlay
 * (disabled under prefers-reduced-motion; the static base always communicates
 * the relationship). */
function flow(d: string, color: string, w = 1.4): string {
  return `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" opacity="0.35"/><path class="dgpov-flow" d="${d}" stroke="${color}" stroke-width="${w}" fill="none" opacity="0.7"/>`;
}

function scene(
  name: string,
  ariaLabel: string,
  desktop: string,
  mobile: string,
  caption: string,
): string {
  return `<figure class="dgpov-scene dgpov-scene--${name}" data-dg-stage="${name}" ${STAGE_OF_ATTR}="${PLATFORM_STAGE_KIND}" role="figure" aria-label="${ariaLabel}">
  <div class="dgpov-viz">${desktop}${mobile}</div>
  <figcaption class="dgpov-cap">${caption}</figcaption>
</figure>`;
}

/* ——— 1 · HERO — the whole operating system ——— */
function heroScene(): string {
  const src = (cx: number, cy: number, label: string) =>
    `<circle cx="${cx}" cy="${cy}" r="7" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.8"/><text x="${cx + 14}" y="${cy + 3}" fill="#94a3b8" font-size="11" font-family="ui-monospace,monospace">${label}</text>`;

  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="dgpovCoreSub" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.12"/><stop offset="50%" stop-color="#7c3aed" stop-opacity="0.04"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0.08"/></linearGradient>
    <radialGradient id="dgpovBrainGlow"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.22"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <radialGradient id="dgpovAdvGlow"><stop offset="0%" stop-color="#3b82f6" stop-opacity="0.14"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/></radialGradient>
  </defs>

  <text x="60" y="60" fill="#64748b" font-size="12" font-family="ui-monospace,monospace" letter-spacing="1.5">BUSINESS SIGNALS</text>
  ${src(70, 110, "Customers")}${src(80, 150, "Website")}${src(60, 190, "CRM")}${src(90, 230, "Email")}${src(70, 270, "Payments")}${src(95, 310, "Operations")}
  ${flow("M 100 150 C 170 150, 220 200, 280 230", "#6366f1")}
  ${flow("M 105 230 C 175 230, 220 245, 280 255", "#6366f1")}
  ${flow("M 100 270 C 175 270, 220 290, 280 285", "#6366f1")}

  <!-- PLATFORM CORE substrate -->
  <rect x="280" y="140" width="240" height="230" rx="12" fill="url(#dgpovCoreSub)" stroke="#7c3aed" stroke-width="1" opacity="0.55"/>
  <rect x="292" y="152" width="216" height="206" rx="8" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="0.4" opacity="0.25"/>
  <text x="400" y="184" text-anchor="middle" fill="#c4b5fd" font-size="15" font-family="Sora,Inter,sans-serif" font-weight="700">Platform Core</text>
  <text x="400" y="202" text-anchor="middle" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">Shared Foundation</text>
  <text x="312" y="234" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">Identity</text><text x="392" y="234" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">Organisations</text>
  <text x="312" y="256" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">Customers</text><text x="392" y="256" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">Data</text><text x="452" y="256" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">Events</text>
  <text x="312" y="278" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">Permissions</text><text x="404" y="278" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">Reporting</text>
  <text x="312" y="300" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">Billing</text><text x="372" y="300" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">Connectors</text>

  ${flow("M 520 255 C 575 255, 610 220, 660 205", "#7c3aed", 1.6)}

  <!-- DIGITAL TWIN -->
  <circle cx="700" cy="200" r="42" fill="rgba(99,102,241,0.03)" stroke="#6366f1" stroke-width="1" opacity="0.6"/>
  <circle cx="700" cy="200" r="28" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.5" stroke-dasharray="3 4" opacity="0.35"/>
  <rect x="690" y="192" width="20" height="12" rx="1.5" stroke="#818cf8" stroke-width="0.6" fill="none"/>
  <text x="700" y="258" text-anchor="middle" fill="#c7d2fe" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">Digital Twin</text>
  <text x="700" y="273" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="ui-monospace,monospace">Current State</text>

  ${flow("M 700 242 C 700 285, 720 300, 758 300", "#7c3aed", 1.8)}

  <!-- BUSINESS BRAIN (dominant) -->
  <circle cx="830" cy="270" r="72" fill="url(#dgpovBrainGlow)"/>
  <circle cx="830" cy="270" r="54" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="6 8" opacity="0.4"/>
  <circle cx="830" cy="270" r="40" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
  <circle cx="830" cy="270" r="24" fill="rgba(124,58,237,0.08)" stroke="#7c3aed" stroke-width="0.5" opacity="0.35"/>
  <circle cx="830" cy="270" r="12" fill="#7c3aed" opacity="0.14"/>
  <circle class="dgpov-pulse" cx="830" cy="270" r="4.5" fill="#a78bfa"/>
  <path d="M830 230v80 M790 270h80 M802 242l56 56 M858 242l-56 56" stroke="#7c3aed" stroke-width="0.5" opacity="0.3"/>
  <text x="830" y="360" text-anchor="middle" fill="#fff" font-size="15" font-family="Sora,Inter,sans-serif" font-weight="700">Business Brain</text>
  <text x="830" y="377" text-anchor="middle" fill="#a78bfa" font-size="10" font-family="ui-monospace,monospace">Context + Knowledge</text>

  ${flow("M 902 258 C 945 250, 975 230, 1005 215", "#3b82f6", 1.6)}

  <!-- AI ADVISOR -->
  <circle cx="1045" cy="200" r="40" fill="url(#dgpovAdvGlow)"/>
  <circle cx="1045" cy="200" r="28" fill="rgba(59,130,246,0.03)" stroke="#3b82f6" stroke-width="1" opacity="0.6"/>
  <circle cx="1045" cy="200" r="14" stroke="#60a5fa" stroke-width="0.7" fill="none" opacity="0.5"/><path d="M1041 200h8 M1045 196v8" stroke="#60a5fa" stroke-width="0.5" opacity="0.4"/>
  <text x="1045" y="256" text-anchor="middle" fill="#bfdbfe" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">AI Advisor</text>
  <text x="1045" y="271" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="ui-monospace,monospace">Reasoning</text>

  <!-- GOVERNANCE amber gate -->
  <path d="M 1045 240 L 1045 296" stroke="#fbbf24" stroke-width="1.2" opacity="0.35" stroke-dasharray="5 7"/>
  <rect x="1000" y="298" width="90" height="24" rx="5" fill="rgba(251,191,36,0.06)" stroke="#fbbf24" stroke-width="0.9" opacity="0.65"/>
  <text x="1045" y="314" text-anchor="middle" fill="#fbbf24" font-size="10.5" font-family="Sora,Inter,sans-serif" font-weight="600">AUTHORITY</text>

  <!-- ACTION green -->
  <path d="M 1045 322 L 1045 356" stroke="#10b981" stroke-width="1" opacity="0.35"/>
  <rect x="1005" y="358" width="80" height="24" rx="5" fill="rgba(16,185,129,0.04)" stroke="#10b981" stroke-width="0.8" opacity="0.65"/>
  <text x="1045" y="374" text-anchor="middle" fill="#34d399" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">ACTION</text>

  <!-- LEARNING return -->
  <path class="dgpov-flow" d="M 1080 382 C 1130 400, 1130 450, 1060 470 C 900 495, 620 495, 470 460 C 420 448, 400 420, 400 380" stroke="#34d399" stroke-width="1.2" fill="none" stroke-dasharray="6 8" opacity="0.4"/>
  <text x="740" y="492" text-anchor="middle" fill="#34d399" font-size="11" font-family="ui-monospace,monospace" opacity="0.7">↺ Outcomes return as learning</text>
</svg>`;

  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 620" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs><radialGradient id="dgpovBrainGlowV"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.2"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient></defs>
  <text x="180" y="26" text-anchor="middle" fill="#64748b" font-size="11" font-family="ui-monospace,monospace" letter-spacing="1">BUSINESS SIGNALS</text>
  ${flow("M 180 34 L 180 54", "#6366f1")}
  <rect x="95" y="58" width="170" height="46" rx="8" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" stroke-width="0.8" opacity="0.55"/>
  <text x="180" y="80" text-anchor="middle" fill="#c4b5fd" font-size="13" font-family="Sora,Inter,sans-serif" font-weight="600">Platform Core</text>
  <text x="180" y="96" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="ui-monospace,monospace">Identity · Data · Context</text>
  ${flow("M 180 104 L 180 128", "#7c3aed")}
  <circle cx="180" cy="156" r="24" fill="rgba(99,102,241,0.03)" stroke="#6366f1" stroke-width="0.8" opacity="0.6"/>
  <text x="180" y="153" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">Digital Twin</text>
  <text x="180" y="167" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">State</text>
  ${flow("M 180 180 L 180 210", "#7c3aed")}
  <circle cx="180" cy="256" r="42" fill="url(#dgpovBrainGlowV)"/>
  <circle cx="180" cy="256" r="30" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" stroke-width="1" stroke-dasharray="5 7" opacity="0.5"/>
  <circle cx="180" cy="256" r="16" fill="rgba(124,58,237,0.08)" stroke="#7c3aed" stroke-width="0.6"/>
  <circle class="dgpov-pulse" cx="180" cy="256" r="4" fill="#a78bfa"/>
  <text x="180" y="316" text-anchor="middle" fill="#fff" font-size="13" font-family="Sora,Inter,sans-serif" font-weight="700">Business Brain</text>
  <text x="180" y="331" text-anchor="middle" fill="#a78bfa" font-size="9" font-family="ui-monospace,monospace">Intelligence</text>
  ${flow("M 180 345 L 180 372", "#3b82f6")}
  <circle cx="180" cy="398" r="24" fill="rgba(59,130,246,0.03)" stroke="#3b82f6" stroke-width="0.8" opacity="0.6"/>
  <text x="180" y="395" text-anchor="middle" fill="#bfdbfe" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">AI Advisor</text>
  <text x="180" y="409" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">Reasoning</text>
  ${flow("M 180 422 L 180 448", "#fbbf24")}
  <rect x="128" y="450" width="104" height="26" rx="5" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-width="0.8" opacity="0.65"/>
  <text x="180" y="467" text-anchor="middle" fill="#fbbf24" font-size="10.5" font-family="Sora,Inter,sans-serif" font-weight="600">HUMAN AUTHORITY</text>
  ${flow("M 180 476 L 180 502", "#10b981")}
  <rect x="146" y="504" width="68" height="26" rx="5" fill="rgba(16,185,129,0.04)" stroke="#10b981" stroke-width="0.8" opacity="0.65"/>
  <text x="180" y="521" text-anchor="middle" fill="#34d399" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">ACTION</text>
  ${flow("M 180 530 L 180 556", "#34d399")}
  <text x="180" y="576" text-anchor="middle" fill="#34d399" font-size="10.5" font-family="ui-monospace,monospace">OUTCOME → LEARN ↺</text>
  <path class="dgpov-flow" d="M 214 516 C 250 500, 250 300, 210 258" stroke="#34d399" stroke-width="1" fill="none" stroke-dasharray="5 7" opacity="0.4"/>
</svg>`;

  return scene(
    "hero-architecture",
    "The DigitalGate operating system: business signals feed Platform Core, which maintains the Digital Twin; the dominant Business Brain turns context into understanding; the AI Advisor reasons and recommends; governance and human authority gate consequential decisions; action produces an outcome; and learning returns to improve the next decision.",
    desktop,
    mobile,
    "Business signals → Platform Core → Digital Twin → Business Brain → AI Advisor → human authority → action → learning.",
  );
}

/* ——— 2 · PLATFORM CORE substrate ——— */
function coreScene(): string {
  const svc = (x: number, label: string) =>
    `<text x="${x}" y="166" fill="#94a3b8" font-size="11" font-family="ui-monospace,monospace" letter-spacing="0.5">${label}</text>`;
  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 1000 220" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <rect x="150" y="76" width="700" height="64" rx="10" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="1" opacity="0.55"/>
  <rect x="162" y="88" width="676" height="40" rx="5" fill="rgba(124,58,237,0.02)" stroke="#7c3aed" stroke-width="0.3" opacity="0.25"/>
  <text x="500" y="112" text-anchor="middle" fill="#c4b5fd" font-size="14" font-family="Sora,Inter,sans-serif" font-weight="700" letter-spacing="1">PLATFORM CORE — SHARED FOUNDATION</text>
  ${svc(196, "IDENTITY")}${svc(280, "ORGANISATIONS")}${svc(400, "CUSTOMERS")}${svc(492, "DATA")}${svc(548, "PERMISSIONS")}${svc(648, "EVENTS")}${svc(716, "REPORTING")}${svc(806, "BILLING")}
  <rect x="200" y="186" width="600" height="22" rx="4" fill="rgba(99,102,241,0.03)" stroke="#6366f1" stroke-width="0.4" opacity="0.35"/>
  <text x="500" y="201" text-anchor="middle" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">Apps · Intelligence · Digital Presence · Connectors attach here</text>
  ${flow("M 320 76 L 320 42", "#6366f1", 1)}${flow("M 500 76 L 500 42", "#7c3aed", 1)}${flow("M 680 76 L 680 42", "#3b82f6", 1)}
  <text x="500" y="30" text-anchor="middle" fill="#64748b" font-size="10.5" font-family="ui-monospace,monospace">Everything attaches to one foundation</text>
</svg>`;
  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <text x="180" y="26" text-anchor="middle" fill="#64748b" font-size="10.5" font-family="ui-monospace,monospace">Apps · Intelligence · Presence</text>
  ${flow("M 180 32 L 180 56", "#7c3aed")}
  <rect x="30" y="58" width="300" height="52" rx="8" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="0.8" opacity="0.55"/>
  <text x="180" y="82" text-anchor="middle" fill="#c4b5fd" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="700">PLATFORM CORE</text>
  <text x="180" y="98" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">Shared Foundation</text>
  <text x="180" y="140" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Identity · Organisations · Customers</text>
  <text x="180" y="158" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Data · Permissions · Events</text>
  <text x="180" y="176" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Reporting · Billing · Connectors</text>
</svg>`;
  return scene(
    "platform-core",
    "Platform Core is the shared foundation. One substrate provides identity, organisations, customers, data, permissions, events, reporting and billing, and everything else — apps, intelligence, digital presence and connectors — attaches to it.",
    desktop,
    mobile,
    "One foundation. Shared services. Everything else attaches.",
  );
}

/* ——— 3 · SHARED BUSINESS CONTEXT ——— */
function sharedContextScene(): string {
  const branch = (d: string, color: string, y: number, label: string) =>
    `${flow(d, color, 1.2)}<text x="905" y="${y}" fill="${color}" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="500">${label}</text>`;
  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 1100 240" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <circle cx="150" cy="120" r="30" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="1.5"/>
  <text x="150" y="116" text-anchor="middle" fill="#818cf8" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">Website</text>
  <text x="150" y="130" text-anchor="middle" fill="#818cf8" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">Enquiry</text>
  ${flow("M 182 120 C 240 120, 290 120, 340 120", "#6366f1", 1.8)}
  <rect x="340" y="66" width="440" height="108" rx="10" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" stroke-width="0.8" opacity="0.45"/>
  <text x="560" y="112" text-anchor="middle" fill="#a78bfa" font-size="13" font-family="Sora,Inter,sans-serif" font-weight="600">SHARED BUSINESS CONTEXT</text>
  <text x="560" y="134" text-anchor="middle" fill="#64748b" font-size="10.5" font-family="ui-monospace,monospace">ONE EVENT · ONE CONTEXT · MANY CAPABILITIES</text>
  ${branch("M 780 92 C 830 92, 850 74, 890 74", "#818cf8", 78, "CRM")}
  ${branch("M 780 108 C 830 108, 850 108, 890 108", "#a78bfa", 112, "Business Brain")}
  ${branch("M 780 132 C 830 132, 850 150, 890 150", "#60a5fa", 154, "AI Advisor")}
  ${branch("M 780 150 C 830 150, 850 186, 890 186", "#34d399", 190, "Automation")}
  <text x="1010" y="112" text-anchor="middle" fill="#64748b" font-size="10.5" font-family="ui-monospace,monospace">Reporting</text>
  <path d="M 985 108 L 1055 108" stroke="#64748b" stroke-width="0.6" opacity="0.3"/>
</svg>`;
  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 300" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <rect x="105" y="20" width="150" height="38" rx="8" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.8"/>
  <text x="180" y="44" text-anchor="middle" fill="#818cf8" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">Website Enquiry</text>
  ${flow("M 180 58 L 180 82", "#6366f1")}
  <rect x="40" y="84" width="280" height="60" rx="10" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" stroke-width="0.8" opacity="0.5"/>
  <text x="180" y="112" text-anchor="middle" fill="#a78bfa" font-size="11.5" font-family="Sora,Inter,sans-serif" font-weight="600">SHARED BUSINESS CONTEXT</text>
  <text x="180" y="130" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">One event · Many capabilities</text>
  ${flow("M 180 144 L 180 168", "#a78bfa")}
  <text x="180" y="192" text-anchor="middle" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">CRM · Digital Twin · Business Brain</text>
  <text x="180" y="212" text-anchor="middle" fill="#94a3b8" font-size="10.5" font-family="ui-monospace,monospace">AI Advisor · Automation · Reporting</text>
</svg>`;
  return scene(
    "shared-context",
    "One event, one shared context, many capabilities. A single website enquiry becomes shared business context that informs CRM, the Business Brain, the AI Advisor, automation and reporting without being re-entered.",
    desktop,
    mobile,
    "One event → one shared context → many capabilities.",
  );
}

/* ——— 4 · DIGITAL TWIN ——— */
function twinScene(): string {
  const rel = (cx: number, cy: number, label: string, lx: number, ly: number) =>
    `<circle cx="${cx}" cy="${cy}" r="15" fill="rgba(99,102,241,0.03)" stroke="#6366f1" stroke-width="0.6" opacity="0.5"/><text x="${cx}" y="${cy + 3}" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="ui-monospace,monospace">${label}</text><line x1="${cx}" y1="${cy}" x2="${lx}" y2="${ly}" stroke="#6366f1" stroke-width="0.5" opacity="0.22"/>`;
  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 620 240" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <circle cx="310" cy="112" r="52" fill="rgba(99,102,241,0.03)" stroke="#6366f1" stroke-width="1.5" opacity="0.7"/>
  <circle cx="310" cy="112" r="34" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.8" stroke-dasharray="4 6" opacity="0.4"/>
  <text x="310" y="108" text-anchor="middle" fill="#c7d2fe" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">Digital Twin</text>
  <text x="310" y="124" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="ui-monospace,monospace">Current State</text>
  ${rel(120, 68, "Customers", 262, 96)}${rel(140, 172, "Opportunities", 276, 130)}${rel(500, 68, "Bookings", 358, 96)}${rel(486, 172, "Interactions", 344, 130)}${rel(90, 120, "Assets", 258, 112)}${rel(530, 120, "Outcomes", 362, 112)}
  <text x="310" y="214" text-anchor="middle" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">NEW ENQUIRY → ACTIVE OPPORTUNITY → FOLLOW-UP → OUTCOME</text>
  <path class="dgpov-flow" d="M 140 224 C 220 236, 400 236, 480 224" stroke="#6366f1" stroke-width="0.8" opacity="0.35" stroke-dasharray="4 7" fill="none"/>
</svg>`;
  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 260" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <circle cx="180" cy="86" r="46" fill="rgba(99,102,241,0.03)" stroke="#6366f1" stroke-width="1.4" opacity="0.7"/>
  <circle cx="180" cy="86" r="30" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.7" stroke-dasharray="4 6" opacity="0.4"/>
  <text x="180" y="82" text-anchor="middle" fill="#c7d2fe" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">Digital Twin</text>
  <text x="180" y="98" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">Current State</text>
  <text x="180" y="164" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Customers · Opportunities · Bookings</text>
  <text x="180" y="184" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Assets · Interactions · Outcomes</text>
  <text x="180" y="220" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">NEW → ACTIVE → FOLLOW-UP</text>
  <text x="180" y="236" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">→ OUTCOME</text>
</svg>`;
  return scene(
    "digital-twin",
    "The Digital Twin is a living representation of the business: customers, opportunities, assets, bookings, jobs, campaigns, interactions and outcomes held as relationships, with state changing over time from new enquiry to active opportunity to follow-up to outcome.",
    desktop,
    mobile,
    "Relationships, not records — and the state changes over time.",
  );
}

/* ——— 5 · BUSINESS BRAIN (dominant) ——— */
function brainScene(): string {
  const inp = (y: number, d: string, label: string) =>
    `${flow(d, "#6366f1", 0.8)}<text x="30" y="${y}" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">${label}</text>`;
  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 620 260" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs><radialGradient id="dgpovBrainGlow2"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.18"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient></defs>
  ${inp(72, "M 96 76 L 210 118", "Digital Twin")}
  ${inp(112, "M 96 116 L 214 130", "History")}
  ${inp(152, "M 96 156 L 210 146", "Goals")}
  ${inp(192, "M 96 196 L 214 158", "Documents")}
  <circle cx="330" cy="130" r="80" fill="url(#dgpovBrainGlow2)"/>
  <circle cx="330" cy="130" r="60" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="6 8" opacity="0.4"/>
  <circle cx="330" cy="130" r="44" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
  <circle cx="330" cy="130" r="26" fill="rgba(124,58,237,0.08)" stroke="#7c3aed" stroke-width="0.6" opacity="0.35"/>
  <circle cx="330" cy="130" r="13" fill="#7c3aed" opacity="0.12"/>
  <circle class="dgpov-pulse" cx="330" cy="130" r="5.5" fill="#a78bfa"/>
  <path d="M330 78v104 M278 130h104 M292 92l76 76 M368 92l-76 76" stroke="#7c3aed" stroke-width="0.5" opacity="0.28"/>
  <circle cx="308" cy="108" r="5" fill="#7c3aed" opacity="0.2"/><circle cx="352" cy="108" r="5" fill="#7c3aed" opacity="0.2"/><circle cx="308" cy="152" r="5" fill="#7c3aed" opacity="0.2"/><circle cx="352" cy="152" r="5" fill="#7c3aed" opacity="0.2"/>
  <text x="330" y="230" text-anchor="middle" fill="#fff" font-size="15" font-family="Sora,Inter,sans-serif" font-weight="700">Business Brain</text>
  <text x="330" y="248" text-anchor="middle" fill="#a78bfa" font-size="10" font-family="ui-monospace,monospace">Context + Knowledge</text>
</svg>`;
  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 260" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <text x="180" y="26" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Digital Twin · History · Goals · Documents</text>
  ${flow("M 180 34 L 180 58", "#6366f1")}
  <defs><radialGradient id="dgpovBrainGlow2V"><stop offset="0%" stop-color="#7c3aed" stop-opacity="0.2"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient></defs>
  <circle cx="180" cy="150" r="70" fill="url(#dgpovBrainGlow2V)"/>
  <circle cx="180" cy="150" r="52" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" stroke-width="1.2" stroke-dasharray="5 7" opacity="0.5"/>
  <circle cx="180" cy="150" r="34" fill="rgba(124,58,237,0.07)" stroke="#7c3aed" stroke-width="0.8"/>
  <circle cx="180" cy="150" r="16" fill="#7c3aed" opacity="0.12"/>
  <circle class="dgpov-pulse" cx="180" cy="150" r="5" fill="#a78bfa"/>
  <path d="M180 98v104 M128 150h104" stroke="#7c3aed" stroke-width="0.5" opacity="0.28"/>
  <text x="180" y="240" text-anchor="middle" fill="#fff" font-size="14" font-family="Sora,Inter,sans-serif" font-weight="700">Business Brain</text>
  <text x="180" y="256" text-anchor="middle" fill="#a78bfa" font-size="9" font-family="ui-monospace,monospace">Context + Knowledge</text>
</svg>`;
  return scene(
    "business-brain",
    "The Business Brain is DigitalGate's structured business knowledge and context layer. It forms internal relationships from Digital Twin state, customer history, goals, operations, approved documents and previous outcomes — the dominant intelligence layer, distinct from the AI Advisor.",
    desktop,
    mobile,
    "Inputs form internal relationships — context becomes understanding.",
  );
}

/* ——— 6 · AI ADVISOR reasoning chain ——— */
function advisorScene(): string {
  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <rect x="70" y="52" width="190" height="96" rx="8" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="0.8" opacity="0.45"/>
  <text x="165" y="90" text-anchor="middle" fill="#a78bfa" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">Business Brain</text>
  <text x="165" y="110" text-anchor="middle" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">Structured context</text>
  ${flow("M 260 100 C 340 100, 400 100, 460 100", "#3b82f6", 2)}
  <circle cx="520" cy="100" r="42" fill="rgba(59,130,246,0.03)" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/>
  <circle cx="520" cy="100" r="26" fill="rgba(59,130,246,0.05)" stroke="#3b82f6" stroke-width="0.8" stroke-dasharray="3 5" opacity="0.4"/>
  <circle cx="520" cy="100" r="14" stroke="#60a5fa" stroke-width="0.8" fill="none" opacity="0.5"/><path d="M516 100h8 M520 96v8" stroke="#60a5fa" stroke-width="0.5" opacity="0.4"/>
  <text x="520" y="160" text-anchor="middle" fill="#bfdbfe" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">AI Advisor</text>
  <text x="520" y="176" text-anchor="middle" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">Reasoning → Priority → Recommendation</text>
  ${flow("M 562 100 C 620 100, 680 100, 726 100", "#fbbf24", 1.4)}
  <rect x="740" y="58" width="230" height="84" rx="7" fill="rgba(251,191,36,0.03)" stroke="#fbbf24" stroke-width="0.8" opacity="0.45"/>
  <text x="855" y="86" text-anchor="middle" fill="#fbbf24" font-size="11.5" font-family="Sora,Inter,sans-serif" font-weight="500">Several high-value</text>
  <text x="855" y="103" text-anchor="middle" fill="#fbbf24" font-size="11.5" font-family="Sora,Inter,sans-serif" font-weight="500">opportunities need attention</text>
  <text x="855" y="122" text-anchor="middle" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">Follow-up prepared · Human review</text>
</svg>`;
  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 280" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <rect x="70" y="18" width="220" height="44" rx="8" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="0.8" opacity="0.45"/>
  <text x="180" y="45" text-anchor="middle" fill="#a78bfa" font-size="11.5" font-family="Sora,Inter,sans-serif" font-weight="600">Business Brain</text>
  ${flow("M 180 62 L 180 86", "#3b82f6")}
  <circle cx="180" cy="120" r="30" fill="rgba(59,130,246,0.03)" stroke="#3b82f6" stroke-width="1.2" opacity="0.6"/>
  <circle cx="180" cy="120" r="14" stroke="#60a5fa" stroke-width="0.7" fill="none" opacity="0.5"/>
  <text x="180" y="166" text-anchor="middle" fill="#bfdbfe" font-size="11.5" font-family="Sora,Inter,sans-serif" font-weight="600">AI Advisor</text>
  ${flow("M 180 178 L 180 202", "#fbbf24")}
  <rect x="40" y="204" width="280" height="62" rx="7" fill="rgba(251,191,36,0.03)" stroke="#fbbf24" stroke-width="0.8" opacity="0.45"/>
  <text x="180" y="230" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="500">High-value opportunities</text>
  <text x="180" y="246" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="500">need attention</text>
  <text x="180" y="261" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">Follow-up prepared · Human review</text>
</svg>`;
  return scene(
    "ai-advisor",
    "The AI Advisor reasons on top of Business Brain context: Business Brain to reasoning to priority to recommendation to human review. It might surface that several high-value opportunities need attention, with a follow-up prepared and available for human review.",
    desktop,
    mobile,
    "Business Brain → reasoning → priority → recommendation → human review.",
  );
}

/* ——— 7 · GOVERNED AUTOMATION ——— */
function automationScene(): string {
  const step = (x: number, label: string, color: string) =>
    `<text x="${x}" y="60" text-anchor="middle" fill="${color}" font-size="11.5" font-family="ui-monospace,monospace" font-weight="600">${label}</text>`;
  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 1100 190" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  ${step(90, "SIGNAL", "#818cf8")}${flow("M 130 56 L 176 56", "#6366f1", 1.3)}
  ${step(220, "CONTEXT", "#818cf8")}${flow("M 268 56 L 314 56", "#6366f1", 1.3)}
  ${step(356, "REASON", "#a78bfa")}${flow("M 398 56 L 444 56", "#7c3aed", 1.3)}
  <rect x="450" y="24" width="180" height="70" rx="8" fill="rgba(251,191,36,0.04)" stroke="#fbbf24" stroke-width="1.2" opacity="0.55"/>
  <text x="540" y="48" text-anchor="middle" fill="#fbbf24" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">GOVERNANCE</text>
  <text x="540" y="66" text-anchor="middle" fill="#fbbf24" font-size="9.5" font-family="ui-monospace,monospace">Policy · Permissions</text>
  <text x="540" y="80" text-anchor="middle" fill="#fbbf24" font-size="9.5" font-family="ui-monospace,monospace">Human authority if required</text>
  ${flow("M 630 56 L 676 56", "#fbbf24", 1.3)}
  <rect x="682" y="40" width="120" height="32" rx="5" fill="rgba(16,185,129,0.03)" stroke="#10b981" stroke-width="0.9" opacity="0.6"/>
  <text x="742" y="61" text-anchor="middle" fill="#34d399" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">ACTION</text>
  ${flow("M 804 56 L 846 56", "#10b981", 1.3)}
  <text x="892" y="60" text-anchor="middle" fill="#34d399" font-size="11.5" font-family="ui-monospace,monospace">OUTCOME</text>
  <path class="dgpov-flow" d="M 916 62 C 960 62, 980 92, 980 120" stroke="#34d399" stroke-width="1.2" opacity="0.4" stroke-dasharray="5 8" fill="none"/>
  <text x="1010" y="126" text-anchor="middle" fill="#34d399" font-size="11" font-family="ui-monospace,monospace">↺ LEARN</text>
  <text x="540" y="160" text-anchor="middle" fill="#64748b" font-size="10.5" font-family="ui-monospace,monospace">Auto-approved within policy · Human approval when consequential</text>
</svg>`;
  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 320" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <text x="180" y="28" text-anchor="middle" fill="#818cf8" font-size="11" font-family="ui-monospace,monospace" font-weight="600">SIGNAL → CONTEXT → REASON</text>
  ${flow("M 180 36 L 180 62", "#7c3aed")}
  <rect x="60" y="64" width="240" height="66" rx="8" fill="rgba(251,191,36,0.04)" stroke="#fbbf24" stroke-width="1" opacity="0.55"/>
  <text x="180" y="90" text-anchor="middle" fill="#fbbf24" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">GOVERNANCE</text>
  <text x="180" y="108" text-anchor="middle" fill="#fbbf24" font-size="9.5" font-family="ui-monospace,monospace">Policy · Permissions</text>
  <text x="180" y="122" text-anchor="middle" fill="#fbbf24" font-size="9.5" font-family="ui-monospace,monospace">Human authority if required</text>
  ${flow("M 180 130 L 180 156", "#10b981")}
  <text x="180" y="180" text-anchor="middle" fill="#34d399" font-size="11.5" font-family="ui-monospace,monospace" font-weight="600">ACTION → OUTCOME → LEARN ↺</text>
  <text x="180" y="232" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="ui-monospace,monospace">Auto-approved within policy</text>
  <text x="180" y="250" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="ui-monospace,monospace">Human approval when consequential</text>
</svg>`;
  return scene(
    "governed-automation",
    "Governed automation: signal to context to reasoning and rule to governance to action to outcome to learning. Governance covers policy, permissions, scope and human authority. Actions are auto-approved within policy and require human approval when consequential.",
    desktop,
    mobile,
    "Signal → context → reason → governance → action → outcome → learning.",
  );
}

/* ——— 8 · APPS attach to substrate ——— */
function appsScene(): string {
  const fam = (x: number, y: number, label: string, color: string, lx: number) =>
    `<rect x="${x}" y="${y}" width="170" height="32" rx="5" fill="rgba(124,58,237,0.02)" stroke="${color}" stroke-width="0.5" opacity="0.5"/><text x="${x + 85}" y="${y + 21}" text-anchor="middle" fill="${color}" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="500">${label}</text><line x1="${x + 85}" y1="${y < 100 ? y + 32 : y}" x2="${lx}" y2="120" stroke="${color}" stroke-width="0.6" opacity="0.2"/>`;
  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 1000 250" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <rect x="150" y="106" width="700" height="42" rx="6" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="1" opacity="0.55"/>
  <text x="500" y="132" text-anchor="middle" fill="#c4b5fd" font-size="13" font-family="Sora,Inter,sans-serif" font-weight="700" letter-spacing="0.5">PLATFORM CORE — SHARED SUBSTRATE</text>
  ${fam(70, 46, "Core Apps", "#818cf8", 300)}
  ${fam(280, 46, "Intelligence", "#60a5fa", 440)}
  ${fam(490, 46, "Growth", "#34d399", 570)}
  ${fam(700, 46, "Industry", "#fbbf24", 660)}
  ${fam(70, 170, "Infrastructure", "#818cf8", 310)}
  ${fam(700, 170, "Digital Presence", "#fbbf24", 650)}
  <text x="500" y="234" text-anchor="middle" fill="#64748b" font-size="10.5" font-family="ui-monospace,monospace">Apps share context — they are not independent products</text>
</svg>`;
  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 260" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <rect x="30" y="18" width="300" height="38" rx="6" fill="rgba(124,58,237,0.05)" stroke="#7c3aed" stroke-width="0.8" opacity="0.55"/>
  <text x="180" y="42" text-anchor="middle" fill="#c4b5fd" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="700">PLATFORM CORE — SUBSTRATE</text>
  ${flow("M 180 56 L 180 78", "#7c3aed")}
  <text x="180" y="102" text-anchor="middle" fill="#818cf8" font-size="10.5" font-family="Sora,Inter,sans-serif" font-weight="500">Core Apps · Infrastructure</text>
  <text x="180" y="124" text-anchor="middle" fill="#60a5fa" font-size="10.5" font-family="Sora,Inter,sans-serif" font-weight="500">Intelligence · Growth</text>
  <text x="180" y="146" text-anchor="middle" fill="#fbbf24" font-size="10.5" font-family="Sora,Inter,sans-serif" font-weight="500">Industry · Digital Presence</text>
  <text x="180" y="188" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="ui-monospace,monospace">Apps share context — not</text>
  <text x="180" y="204" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="ui-monospace,monospace">independent products</text>
</svg>`;
  return scene(
    "apps",
    "Apps specialise the platform without fragmenting it. Capability families — core apps, infrastructure, intelligence, growth and industry — all attach to the same Platform Core shared substrate and shared business context.",
    desktop,
    mobile,
    "Apps share one substrate and one context — not disconnected products.",
  );
}

/* ——— 9 · INDUSTRY adaptation ——— */
function industryScene(): string {
  const mode = (x: number, y: number, name: string, flowText: string, color: string) =>
    `<rect x="${x}" y="${y}" width="230" height="22" rx="3" fill="rgba(124,58,237,0.02)" stroke="${color}" stroke-width="0.4" opacity="0.45"/><text x="${x + 10}" y="${y + 15}" fill="${color}" font-size="10" font-family="Sora,Inter,sans-serif" font-weight="600">${name}</text><text x="${x + 82}" y="${y + 15}" fill="#94a3b8" font-size="9" font-family="ui-monospace,monospace">${flowText}</text>`;
  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 1000 210" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <circle cx="500" cy="105" r="34" fill="rgba(124,58,237,0.03)" stroke="#7c3aed" stroke-width="1" opacity="0.55"/>
  <text x="500" y="101" text-anchor="middle" fill="#a78bfa" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">DigitalGate</text>
  <text x="500" y="116" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">Core</text>
  ${mode(110, 78, "PROPERTY", "Lead → Appraisal → Listing → Offer → Settlement", "#818cf8")}
  ${mode(660, 78, "HOSPITALITY", "Booking → Guest → Stay → Ops → Revenue", "#34d399")}
  ${mode(110, 112, "SERVICES", "Enquiry → Quote → Job → Invoice → Review", "#60a5fa")}
  ${mode(660, 112, "FINANCE", "Lead → Qualify → Application → Compliance → Close", "#fbbf24")}
  <line x1="340" y1="90" x2="468" y2="100" stroke="#6366f1" stroke-width="0.5" opacity="0.2"/><line x1="340" y1="122" x2="468" y2="110" stroke="#3b82f6" stroke-width="0.5" opacity="0.2"/>
  <line x1="660" y1="90" x2="532" y2="100" stroke="#34d399" stroke-width="0.5" opacity="0.2"/><line x1="660" y1="122" x2="532" y2="110" stroke="#fbbf24" stroke-width="0.5" opacity="0.2"/>
  <text x="500" y="190" text-anchor="middle" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">One stable core · specialised workflow modes</text>
</svg>`;
  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 320" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <text x="180" y="26" text-anchor="middle" fill="#a78bfa" font-size="11" font-family="Sora,Inter,sans-serif" font-weight="600">DigitalGate Core</text>
  ${flow("M 180 34 L 180 54", "#7c3aed")}
  <g font-family="ui-monospace,monospace">
  <rect x="20" y="58" width="320" height="42" rx="6" fill="rgba(255,255,255,0.02)" stroke="#818cf8" stroke-width="0.4" opacity="0.5"/><text x="34" y="78" fill="#818cf8" font-size="10.5" font-family="Sora,Inter,sans-serif" font-weight="600">PROPERTY</text><text x="34" y="93" fill="#94a3b8" font-size="9">Lead → Appraisal → Listing → Offer → Settle</text>
  <rect x="20" y="108" width="320" height="42" rx="6" fill="rgba(255,255,255,0.02)" stroke="#60a5fa" stroke-width="0.4" opacity="0.5"/><text x="34" y="128" fill="#60a5fa" font-size="10.5" font-family="Sora,Inter,sans-serif" font-weight="600">SERVICES</text><text x="34" y="143" fill="#94a3b8" font-size="9">Enquiry → Quote → Job → Invoice → Review</text>
  <rect x="20" y="158" width="320" height="42" rx="6" fill="rgba(255,255,255,0.02)" stroke="#34d399" stroke-width="0.4" opacity="0.5"/><text x="34" y="178" fill="#34d399" font-size="10.5" font-family="Sora,Inter,sans-serif" font-weight="600">HOSPITALITY</text><text x="34" y="193" fill="#94a3b8" font-size="9">Booking → Guest → Stay → Ops → Revenue</text>
  <rect x="20" y="208" width="320" height="42" rx="6" fill="rgba(255,255,255,0.02)" stroke="#fbbf24" stroke-width="0.4" opacity="0.5"/><text x="34" y="228" fill="#fbbf24" font-size="10.5" font-family="Sora,Inter,sans-serif" font-weight="600">FINANCE</text><text x="34" y="243" fill="#94a3b8" font-size="9">Lead → Qualify → Application → Compliance → Close</text>
  </g>
</svg>`;
  return scene(
    "industry",
    "Same platform, different operating models. The Platform Core and intelligence layers stay constant while a specialised workflow mode changes per industry: property, services, hospitality and finance each run their own lifecycle on the one shared core.",
    desktop,
    mobile,
    "One stable core. Specialised workflow modes per industry.",
  );
}

/* ——— 10 · DIGITAL PRESENCE gateway ——— */
function presenceScene(): string {
  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 1100 190" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <rect x="70" y="34" width="360" height="118" rx="8" fill="rgba(124,58,237,0.02)" stroke="#7c3aed" stroke-width="0.6" opacity="0.35"/>
  <text x="250" y="66" text-anchor="middle" fill="#a78bfa" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">OPERATING CONTEXT</text>
  <text x="250" y="94" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Customers · Operations · Intelligence</text>
  <text x="250" y="112" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Automation · Learning</text>
  ${flow("M 434 93 L 662 93", "#7c3aed", 1.2)}
  <text x="548" y="80" text-anchor="middle" fill="#64748b" font-size="10.5" font-family="ui-monospace,monospace">GATEWAY</text>
  <rect x="668" y="34" width="360" height="118" rx="8" fill="rgba(59,130,246,0.02)" stroke="#3b82f6" stroke-width="0.6" opacity="0.35"/>
  <text x="848" y="66" text-anchor="middle" fill="#60a5fa" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">DIGITAL PRESENCE</text>
  <text x="848" y="94" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Website · SEO · AI Visibility · Reputation</text>
  <text x="848" y="112" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Search · Discovery · Campaigns</text>
  <path class="dgpov-flow" d="M 1028 100 C 1058 110, 1058 150, 1010 162 C 760 178, 420 178, 250 158" stroke="#60a5fa" stroke-width="1" fill="none" opacity="0.35" stroke-dasharray="5 8"/>
  <text x="640" y="176" text-anchor="middle" fill="#60a5fa" font-size="10.5" font-family="ui-monospace,monospace" opacity="0.6">↺ Customer / lead signals return to operating context</text>
</svg>`;
  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 280" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <rect x="30" y="20" width="300" height="60" rx="8" fill="rgba(124,58,237,0.02)" stroke="#7c3aed" stroke-width="0.6" opacity="0.4"/>
  <text x="180" y="46" text-anchor="middle" fill="#a78bfa" font-size="11.5" font-family="Sora,Inter,sans-serif" font-weight="600">OPERATING CONTEXT</text>
  <text x="180" y="66" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="ui-monospace,monospace">Customers · Operations · Intelligence</text>
  ${flow("M 180 80 L 180 104", "#7c3aed")}
  <text x="180" y="100" text-anchor="middle" fill="#64748b" font-size="9" font-family="ui-monospace,monospace">GATEWAY</text>
  <rect x="30" y="108" width="300" height="60" rx="8" fill="rgba(59,130,246,0.02)" stroke="#3b82f6" stroke-width="0.6" opacity="0.4"/>
  <text x="180" y="134" text-anchor="middle" fill="#60a5fa" font-size="11.5" font-family="Sora,Inter,sans-serif" font-weight="600">DIGITAL PRESENCE</text>
  <text x="180" y="154" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="ui-monospace,monospace">Website · SEO · AI Visibility</text>
  <path class="dgpov-flow" d="M 300 138 C 340 150, 340 210, 200 214 C 190 214, 185 200, 182 172" stroke="#60a5fa" stroke-width="1" fill="none" opacity="0.35" stroke-dasharray="5 7"/>
  <text x="180" y="238" text-anchor="middle" fill="#60a5fa" font-size="9.5" font-family="ui-monospace,monospace" opacity="0.7">↺ Signals return to context</text>
</svg>`;
  return scene(
    "digital-presence",
    "Digital presence is part of the operating system. Operating context flows through the Gateway into website, structured content, SEO, AI visibility and reputation, reaching search and AI discovery; the customer and lead signals that result return to the same operating context.",
    desktop,
    mobile,
    "Operating context → Gateway → digital presence → discovery → signals return.",
  );
}

/* ——— 11 · ARCHITECTURE RECAP (climax) ——— */
function recapScene(): string {
  const row = (y: number, label: string, color: string, w: number, big = false) =>
    `<rect x="${500 - w / 2}" y="${y}" width="${w}" height="${big ? 30 : 22}" rx="4" fill="rgba(124,58,237,0.04)" stroke="${color}" stroke-width="${big ? 0.9 : 0.5}" opacity="${big ? 0.65 : 0.45}"/><text x="500" y="${y + (big ? 20 : 15)}" text-anchor="middle" fill="${big ? "#fff" : color}" font-size="${big ? 13 : 10.5}" font-family="Sora,Inter,sans-serif" font-weight="${big ? 700 : 600}">${label}</text>`;
  const arrow = (y: number) => `<text x="500" y="${y}" text-anchor="middle" fill="#475569" font-size="13">↓</text>`;
  const desktop = `<svg class="dgpov-svg dgpov-svg--d" viewBox="0 0 1000 360" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <path class="dgpov-flow" d="M 500 24 L 500 336" stroke="rgba(124,58,237,0.25)" stroke-width="1.5" fill="none" stroke-dasharray="4 8"/>
  <text x="500" y="20" text-anchor="middle" fill="#64748b" font-size="10.5" font-family="ui-monospace,monospace" letter-spacing="1">BUSINESS SIGNALS</text>
  ${arrow(44)}
  ${row(52, "PLATFORM CORE", "#c4b5fd", 240)}${arrow(96)}
  ${row(104, "DIGITAL TWIN", "#c7d2fe", 220)}${arrow(146)}
  ${row(154, "BUSINESS BRAIN", "#7c3aed", 280, true)}${arrow(204)}
  ${row(212, "AI ADVISOR", "#bfdbfe", 220)}${arrow(254)}
  ${row(262, "GOVERNANCE · HUMAN AUTHORITY", "#fbbf24", 300)}${arrow(304)}
  ${row(312, "ACTION → OUTCOME → LEARN ↺", "#34d399", 260)}
  <rect x="70" y="150" width="120" height="18" rx="3" fill="rgba(99,102,241,0.02)" stroke="#6366f1" stroke-width="0.3" opacity="0.35"/><text x="130" y="163" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="ui-monospace,monospace">Apps</text><line x1="190" y1="159" x2="358" y2="164" stroke="#6366f1" stroke-width="0.4" opacity="0.18"/>
  <rect x="810" y="150" width="120" height="18" rx="3" fill="rgba(59,130,246,0.02)" stroke="#3b82f6" stroke-width="0.3" opacity="0.35"/><text x="870" y="163" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="ui-monospace,monospace">Presence</text><line x1="810" y1="159" x2="642" y2="164" stroke="#3b82f6" stroke-width="0.4" opacity="0.18"/>
  <text x="500" y="352" text-anchor="middle" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">Everything works from one shared context</text>
</svg>`;
  const mobile = `<svg class="dgpov-svg dgpov-svg--m" viewBox="0 0 360 400" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <text x="180" y="22" text-anchor="middle" fill="#64748b" font-size="10" font-family="ui-monospace,monospace">BUSINESS SIGNALS</text>
  <text x="180" y="44" text-anchor="middle" fill="#475569" font-size="13">↓</text>
  <text x="180" y="70" text-anchor="middle" fill="#c4b5fd" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="700">Platform Core</text>
  <text x="180" y="92" text-anchor="middle" fill="#475569" font-size="13">↓</text>
  <text x="180" y="118" text-anchor="middle" fill="#c7d2fe" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">Digital Twin</text>
  <text x="180" y="140" text-anchor="middle" fill="#475569" font-size="13">↓</text>
  <text x="180" y="168" text-anchor="middle" fill="#fff" font-size="14" font-family="Sora,Inter,sans-serif" font-weight="700">Business Brain</text>
  <text x="180" y="190" text-anchor="middle" fill="#475569" font-size="13">↓</text>
  <text x="180" y="216" text-anchor="middle" fill="#bfdbfe" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">AI Advisor</text>
  <text x="180" y="238" text-anchor="middle" fill="#475569" font-size="13">↓</text>
  <text x="180" y="264" text-anchor="middle" fill="#fbbf24" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">Human Authority</text>
  <text x="180" y="286" text-anchor="middle" fill="#475569" font-size="13">↓</text>
  <text x="180" y="312" text-anchor="middle" fill="#34d399" font-size="12" font-family="Sora,Inter,sans-serif" font-weight="600">Action → Outcome → Learn ↺</text>
  <text x="180" y="356" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="ui-monospace,monospace">Apps · Digital Presence attach</text>
  <text x="180" y="372" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="ui-monospace,monospace">to the shared context</text>
</svg>`;
  return scene(
    "architecture-recap",
    "The full architecture: business signals to Platform Core to Digital Twin to the dominant Business Brain to AI Advisor to governance and human authority to action to outcome to learning, which returns to the shared context. Apps and digital presence attach to the same shared context.",
    desktop,
    mobile,
    "Signals → Platform Core → Digital Twin → Business Brain → AI Advisor → governance → action → learning ↺.",
  );
}

/** All Platform Overview architecture scenes, in narrative order, each anchored
 * to the Website Studio section heading it illustrates. */
export function platformOverviewStages(): StageDef[] {
  return [
    { name: "hero-architecture", anchors: ["one operating system"], html: heroScene() },
    { name: "platform-core", anchors: ["the core everything shares"], html: coreScene() },
    { name: "shared-context", anchors: ["what the software shares"], html: sharedContextScene() },
    { name: "digital-twin", anchors: ["a living representation"], html: twinScene() },
    { name: "business-brain", anchors: ["context becomes understanding"], html: brainScene() },
    { name: "ai-advisor", anchors: ["reasoning on top of real business context"], html: advisorScene() },
    { name: "governed-automation", anchors: ["automation with context and boundaries"], html: automationScene() },
    { name: "apps", anchors: ["apps specialise the platform"], html: appsScene() },
    { name: "industry", anchors: ["different operating models"], html: industryScene() },
    { name: "digital-presence", anchors: ["does not stop at your internal operations"], html: presenceScene() },
    { name: "architecture-recap", anchors: ["one platform. one business context"], html: recapScene() },
  ];
}
