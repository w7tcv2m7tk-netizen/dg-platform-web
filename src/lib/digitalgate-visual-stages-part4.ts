/**
 * Insights Part 4 — approved prototype port (#48).
 *
 * Isolated `dgp4-*` namespace so concurrent Part 1–3 work does not collide.
 * Presentation only: HTML + SVG strings. No client JS. No Neon writes.
 *
 * Conceptual progression (must remain visible as SYSTEM CAPABILITY, not tiers):
 *   PASSIVE → ASSISTIVE → PROACTIVE → GOVERNED AUTOMATION → LEARNING SYSTEM
 *
 * Central contrast:
 *   RAW INFORMATION → CONTEXT → PRIORITY → RECOMMENDATION → ACTION READINESS
 *
 * Responsibility:
 *   MACHINE → HUMAN AUTHORITY → ACTION → LEARN ↺
 */

import type {
  DigitalgateStageKind,
  StageDef,
} from "./digitalgate-visual-stages";

/** Keep in sync with STAGE_OF_ATTR in digitalgate-visual-stages.ts (avoid circular runtime import). */
const STAGE_OF_ATTR = "data-dg-stage-of";

function p4Stage(input: {
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
  return `<section class="dg-stage dg-stage--p4${variant}" data-dg-stage="${input.name}" ${STAGE_OF_ATTR}="${input.kind}" role="figure" aria-label="${input.ariaLabel}">
  <div class="dg-stage__intro">
    <span class="dg-stage__index" aria-hidden="true">${input.index}</span>
    <span class="dg-stage__eyebrow">${input.eyebrow}</span>
    <h3 class="dg-stage__title">${input.title}</h3>
    <p class="dg-stage__lede">${input.lede}</p>
  </div>
  <div class="dg-stage__scene">${input.scene}</div>
  <p class="dg-stage__caption">${input.caption}</p>
</section>`;
}

/* —— 1. Maturity architecture (evolving capability) —— */

function maturityDesktopSvg(): string {
  return `<svg class="dgp4-svg" viewBox="0 0 1200 550" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="dgp4MaturityArch" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.05"/>
      <stop offset="25%" stop-color="#7c3aed" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#7c3aed" stop-opacity="0.15"/>
      <stop offset="75%" stop-color="#fbbf24" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#34d399" stop-opacity="0.15"/>
    </linearGradient>
    <filter id="dgp4GlowFilter" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="40" y="40" width="1120" height="450" rx="16" fill="url(#dgp4MaturityArch)" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>

  <g opacity="0.55">
    <text x="120" y="70" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="Sora,Inter,system-ui" font-weight="700">PASSIVE</text>
    <circle cx="80" cy="120" r="2" fill="#6b7280" opacity="0.45"/><circle cx="110" cy="140" r="2" fill="#6b7280" opacity="0.45"/>
    <circle cx="130" cy="110" r="2" fill="#6b7280" opacity="0.45"/><circle cx="95" cy="160" r="2" fill="#6b7280" opacity="0.45"/>
    <circle cx="140" cy="150" r="2" fill="#6b7280" opacity="0.45"/><circle cx="70" cy="170" r="2" fill="#6b7280" opacity="0.45"/>
    <text x="105" y="200" text-anchor="middle" fill="#9ca3af" font-size="7" font-family="ui-monospace,monospace">Raw telemetry</text>
    <text x="105" y="212" text-anchor="middle" fill="#9ca3af" font-size="7" font-family="ui-monospace,monospace">Disconnected</text>
  </g>

  <g opacity="0.7">
    <text x="320" y="70" text-anchor="middle" fill="#a5b4fc" font-size="10" font-family="Sora,Inter,system-ui" font-weight="700">ASSISTIVE</text>
    <circle cx="290" cy="130" r="3" fill="#818cf8" opacity="0.55"/><circle cx="320" cy="115" r="3" fill="#818cf8" opacity="0.55"/>
    <circle cx="350" cy="140" r="3" fill="#818cf8" opacity="0.55"/><circle cx="305" cy="160" r="3" fill="#818cf8" opacity="0.55"/>
    <circle cx="335" cy="155" r="3" fill="#818cf8" opacity="0.55"/>
    <line x1="290" y1="130" x2="320" y2="115" stroke="#818cf8" stroke-width="0.6" opacity="0.35"/>
    <line x1="320" y1="115" x2="350" y2="140" stroke="#818cf8" stroke-width="0.6" opacity="0.35"/>
    <line x1="290" y1="130" x2="305" y2="160" stroke="#818cf8" stroke-width="0.6" opacity="0.35"/>
    <text x="320" y="200" text-anchor="middle" fill="#a5b4fc" font-size="7" font-family="ui-monospace,monospace">Information organising</text>
    <text x="320" y="212" text-anchor="middle" fill="#a5b4fc" font-size="7" font-family="ui-monospace,monospace">Searchable / Interpretable</text>
  </g>

  <g opacity="0.9">
    <text x="540" y="70" text-anchor="middle" fill="#c4b5fd" font-size="10" font-family="Sora,Inter,system-ui" font-weight="700">PROACTIVE</text>
    <circle cx="510" cy="120" r="5" fill="#7c3aed" opacity="0.65"/>
    <circle cx="545" cy="135" r="8" fill="#7c3aed" opacity="0.55" filter="url(#dgp4GlowFilter)"/>
    <circle cx="570" cy="115" r="4" fill="#a78bfa" opacity="0.5"/><circle cx="525" cy="160" r="6" fill="#7c3aed" opacity="0.45"/>
    <circle cx="555" cy="155" r="4" fill="#a78bfa" opacity="0.45"/>
    <line x1="510" y1="120" x2="545" y2="135" stroke="#7c3aed" stroke-width="1" opacity="0.4"/>
    <line x1="545" y1="135" x2="570" y2="115" stroke="#7c3aed" stroke-width="1" opacity="0.4"/>
    <line x1="545" y1="135" x2="525" y2="160" stroke="#7c3aed" stroke-width="1" opacity="0.4"/>
    <circle class="dgp4-priority-pulse" cx="545" cy="135" r="2.5" fill="#ddd6fe" opacity="0.9"/>
    <text x="540" y="200" text-anchor="middle" fill="#c4b5fd" font-size="7" font-family="ui-monospace,monospace">Priority signals emerge</text>
    <text x="540" y="212" text-anchor="middle" fill="#c4b5fd" font-size="7" font-family="ui-monospace,monospace">Irrelevant noise recedes</text>
  </g>

  <g opacity="0.95">
    <text x="760" y="70" text-anchor="middle" fill="#fbbf24" font-size="10" font-family="Sora,Inter,system-ui" font-weight="700">GOVERNED AUTOMATION</text>
    <circle cx="740" cy="125" r="10" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-width="1" opacity="0.7"/>
    <circle cx="760" cy="140" r="14" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" stroke-width="1.2" opacity="0.8"/>
    <circle cx="780" cy="125" r="8" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-width="0.8" opacity="0.6"/>
    <rect x="735" y="170" width="50" height="20" rx="3" fill="rgba(251,191,36,0.06)" stroke="#fbbf24" stroke-width="0.8"/>
    <text x="760" y="183" text-anchor="middle" fill="#fbbf24" font-size="7" font-family="ui-monospace,monospace">APPROVAL</text>
    <line x1="760" y1="190" x2="760" y2="210" stroke="#fbbf24" stroke-width="1"/>
    <rect x="745" y="210" width="30" height="12" rx="2" fill="rgba(251,191,36,0.04)" stroke="#fbbf24" stroke-width="0.5"/>
    <text x="760" y="219" text-anchor="middle" fill="#fbbf24" font-size="6" font-family="ui-monospace,monospace">EXECUTE</text>
    <text x="760" y="250" text-anchor="middle" fill="#fbbf24" font-size="7" font-family="ui-monospace,monospace">Decision boundaries</text>
    <text x="760" y="262" text-anchor="middle" fill="#fbbf24" font-size="7" font-family="ui-monospace,monospace">Approval gates</text>
  </g>

  <g>
    <text x="990" y="70" text-anchor="middle" fill="#34d399" font-size="10" font-family="Sora,Inter,system-ui" font-weight="800">LEARNING SYSTEM</text>
    <circle cx="970" cy="120" r="16" fill="rgba(52,211,153,0.05)" stroke="#34d399" stroke-width="1.5" opacity="0.85"/>
    <circle cx="990" cy="135" r="20" fill="rgba(52,211,153,0.08)" stroke="#34d399" stroke-width="1.5" opacity="0.9" filter="url(#dgp4GlowFilter)"/>
    <circle cx="1010" cy="120" r="12" fill="rgba(52,211,153,0.05)" stroke="#34d399" stroke-width="1" opacity="0.7"/>
    <line x1="970" y1="120" x2="990" y2="135" stroke="#34d399" stroke-width="1.5" opacity="0.45"/>
    <line x1="990" y1="135" x2="1010" y2="120" stroke="#34d399" stroke-width="1.5" opacity="0.45"/>
    <line x1="970" y1="120" x2="1010" y2="120" stroke="#34d399" stroke-width="1" opacity="0.35"/>
    <path class="dgp4-learn-path" d="M 990 155 C 990 180, 1020 180, 1020 160" stroke="#34d399" stroke-width="1.5" fill="none" stroke-dasharray="4 6" opacity="0.65"/>
    <circle class="dgp4-learn-particle" cx="1005" cy="170" r="2.5" fill="#34d399" opacity="0.7"/>
    <rect x="975" y="175" width="30" height="12" rx="2" fill="rgba(52,211,153,0.04)" stroke="#34d399" stroke-width="0.5"/>
    <text x="990" y="184" text-anchor="middle" fill="#34d399" font-size="6" font-family="ui-monospace,monospace">LEARN</text>
    <text x="990" y="220" text-anchor="middle" fill="#34d399" font-size="7" font-family="ui-monospace,monospace" font-weight="700">Feedback closes</text>
    <text x="990" y="232" text-anchor="middle" fill="#34d399" font-size="7" font-family="ui-monospace,monospace">Context becomes richer</text>
    <text x="990" y="244" text-anchor="middle" fill="#34d399" font-size="7" font-family="ui-monospace,monospace">Structurally complete</text>
  </g>

  <text x="600" y="480" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="ui-monospace,monospace" letter-spacing="0.08em">SOFTWARE MATURITY — EVOLVING CAPABILITY</text>
  <rect x="120" y="490" width="960" height="3" rx="1.5" fill="rgba(255,255,255,0.04)"/>
  <rect x="120" y="490" width="870" height="3" rx="1.5" fill="url(#dgp4MaturityArch)" opacity="0.7"/>
</svg>`;
}

function maturityMobileSvg(): string {
  return `<svg class="dgp4-svg" viewBox="0 0 390 650" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="dgp4MobileMaturityArch" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.05"/>
      <stop offset="25%" stop-color="#7c3aed" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#7c3aed" stop-opacity="0.15"/>
      <stop offset="75%" stop-color="#fbbf24" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#34d399" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect x="15" y="10" width="360" height="620" rx="12" fill="url(#dgp4MobileMaturityArch)" stroke="rgba(255,255,255,0.02)" stroke-width="0.5"/>
  <line x1="195" y1="40" x2="195" y2="590" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <text x="195" y="40" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="Sora,Inter,system-ui" font-weight="700">PASSIVE</text>
  <circle cx="180" cy="65" r="2.5" fill="#6b7280" opacity="0.45"/><circle cx="210" cy="75" r="2.5" fill="#6b7280" opacity="0.45"/>
  <circle cx="190" cy="85" r="2.5" fill="#6b7280" opacity="0.45"/><circle cx="200" cy="60" r="2.5" fill="#6b7280" opacity="0.45"/>
  <text x="195" y="108" text-anchor="middle" fill="#9ca3af" font-size="8" font-family="ui-monospace,monospace">Raw telemetry</text>

  <text x="195" y="140" text-anchor="middle" fill="#a5b4fc" font-size="10" font-family="Sora,Inter,system-ui" font-weight="700">ASSISTIVE</text>
  <circle cx="180" cy="160" r="3.5" fill="#818cf8" opacity="0.5"/><circle cx="210" cy="170" r="3.5" fill="#818cf8" opacity="0.5"/>
  <line x1="180" y1="160" x2="210" y2="170" stroke="#818cf8" stroke-width="0.7" opacity="0.35"/>
  <text x="195" y="198" text-anchor="middle" fill="#a5b4fc" font-size="8" font-family="ui-monospace,monospace">Organising / Interpretable</text>

  <text x="195" y="230" text-anchor="middle" fill="#c4b5fd" font-size="10" font-family="Sora,Inter,system-ui" font-weight="700">PROACTIVE</text>
  <circle cx="190" cy="255" r="5.5" fill="#7c3aed" opacity="0.55"/><circle class="dgp4-priority-pulse" cx="200" cy="270" r="7.5" fill="#7c3aed" opacity="0.5"/>
  <line x1="190" y1="255" x2="200" y2="270" stroke="#7c3aed" stroke-width="0.9" opacity="0.4"/>
  <text x="195" y="300" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="ui-monospace,monospace">Priority emerges</text>

  <text x="195" y="335" text-anchor="middle" fill="#fbbf24" font-size="9" font-family="Sora,Inter,system-ui" font-weight="700">GOVERNED AUTOMATION</text>
  <circle cx="195" cy="360" r="11" fill="rgba(251,191,36,0.06)" stroke="#fbbf24" stroke-width="1.1"/>
  <rect x="175" y="382" width="40" height="16" rx="3" fill="rgba(251,191,36,0.06)" stroke="#fbbf24" stroke-width="0.6"/>
  <text x="195" y="393" text-anchor="middle" fill="#fbbf24" font-size="7" font-family="ui-monospace,monospace">APPROVAL</text>
  <text x="195" y="420" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="ui-monospace,monospace">Decision boundaries</text>

  <text x="195" y="455" text-anchor="middle" fill="#34d399" font-size="10" font-family="Sora,Inter,system-ui" font-weight="800">LEARNING SYSTEM</text>
  <circle cx="195" cy="485" r="15" fill="rgba(52,211,153,0.06)" stroke="#34d399" stroke-width="1.5"/>
  <circle cx="195" cy="485" r="6.5" fill="rgba(52,211,153,0.1)" stroke="#34d399" stroke-width="0.6"/>
  <path d="M 190 485 L 194 489 L 200 481" stroke="#34d399" stroke-width="1" fill="none" opacity="0.8"/>
  <path class="dgp4-learn-path" d="M 195 500 C 195 520, 215 520, 215 505" stroke="#34d399" stroke-width="1" fill="none" stroke-dasharray="3 4" opacity="0.55"/>
  <text x="195" y="545" text-anchor="middle" fill="#34d399" font-size="8" font-family="ui-monospace,monospace">Feedback closes</text>
  <text x="195" y="560" text-anchor="middle" fill="#34d399" font-size="8" font-family="ui-monospace,monospace">Richer context</text>
</svg>`;
}

function maturityScene(): string {
  return `<div class="dgp4-scene dgp4-scene--maturity">
  <div class="dgp4-desktop">${maturityDesktopSvg()}</div>
  <div class="dgp4-mobile">${maturityMobileSvg()}</div>
  <ol class="dgp4-sr-only">
    <li>Passive — raw disconnected telemetry</li>
    <li>Assistive — information organising and interpretable</li>
    <li>Proactive — priority signals emerge; noise recedes</li>
    <li>Governed automation — decision boundaries and approval gates</li>
    <li>Learning system — feedback closes; context becomes richer</li>
  </ol>
</div>`;
}

/* —— 2. Information vs Direction —— */

function compareDesktopSvg(): string {
  return `<svg class="dgp4-svg" viewBox="0 0 1100 380" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="dgp4DividerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4b5563" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#4b5563" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#4b5563" stop-opacity="0.35"/>
    </linearGradient>
  </defs>

  <g>
    <text x="250" y="55" text-anchor="middle" fill="#9ca3af" font-size="11" font-family="Sora,Inter,system-ui" font-weight="700" letter-spacing="0.08em">TRADITIONAL SOFTWARE</text>
    <rect x="80" y="75" width="340" height="240" rx="8" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <text x="120" y="115" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">Opportunities</text>
    <text x="120" y="150" fill="#e2e8f0" font-size="28" font-family="Sora,Inter,system-ui" font-weight="800">47</text>
    <text x="120" y="170" fill="#94a3b8" font-size="8" font-family="ui-monospace,monospace">Total</text>
    <circle cx="180" cy="155" r="3" fill="#6b7280" opacity="0.4"/><circle cx="200" cy="145" r="3" fill="#6b7280" opacity="0.4"/>
    <circle cx="220" cy="160" r="3" fill="#6b7280" opacity="0.4"/><circle cx="240" cy="150" r="3" fill="#6b7280" opacity="0.4"/>
    <circle cx="260" cy="165" r="3" fill="#6b7280" opacity="0.4"/><circle cx="280" cy="140" r="3" fill="#6b7280" opacity="0.4"/>
    <circle cx="300" cy="155" r="3" fill="#6b7280" opacity="0.4"/><circle cx="320" cy="148" r="3" fill="#6b7280" opacity="0.4"/>
    <circle cx="340" cy="160" r="3" fill="#6b7280" opacity="0.4"/><circle cx="360" cy="150" r="3" fill="#6b7280" opacity="0.4"/>
    <text x="120" y="205" fill="#94a3b8" font-size="9" font-family="ui-monospace,monospace">All opportunities listed</text>
    <text x="120" y="222" fill="#94a3b8" font-size="9" font-family="ui-monospace,monospace">No priority</text>
    <text x="120" y="239" fill="#94a3b8" font-size="9" font-family="ui-monospace,monospace">No recommendations</text>
    <text x="120" y="256" fill="#94a3b8" font-size="9" font-family="ui-monospace,monospace">Interpretation required</text>
    <text x="250" y="345" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">You work out what matters</text>
  </g>

  <line x1="460" y1="55" x2="460" y2="340" stroke="url(#dgp4DividerGrad)" stroke-width="1"/>
  <text x="460" y="210" text-anchor="middle" fill="#64748b" font-size="14" font-family="Sora,Inter,system-ui" opacity="0.7">VS</text>

  <g>
    <text x="800" y="55" text-anchor="middle" fill="#c4b5fd" font-size="11" font-family="Sora,Inter,system-ui" font-weight="700" letter-spacing="0.06em">DIGITALGATE — INTELLIGENCE LAYER</text>
    <rect x="520" y="75" width="520" height="240" rx="8" fill="rgba(124,58,237,0.04)" stroke="rgba(124,58,237,0.18)" stroke-width="1"/>
    <text x="550" y="105" fill="#94a3b8" font-size="8" font-family="ui-monospace,monospace">RAW INFORMATION → CONTEXT → PRIORITY → RECOMMENDATION</text>
    <circle cx="555" cy="140" r="5" fill="#fbbf24" opacity="0.7"/>
    <text x="570" y="144" fill="#fde68a" font-size="12" font-family="Inter,system-ui" font-weight="600">Seven opportunities need attention</text>
    <circle cx="555" cy="175" r="5" fill="#fbbf24" opacity="0.5"/>
    <text x="570" y="179" fill="#fde68a" font-size="12" font-family="Inter,system-ui" font-weight="600">Three high-value prospects have gone quiet</text>
    <circle cx="555" cy="210" r="5" fill="#34d399" opacity="0.7"/>
    <text x="570" y="214" fill="#a7f3d0" font-size="12" font-family="Inter,system-ui" font-weight="600">I've prepared the priority follow-up list</text>
    <rect x="550" y="240" width="170" height="26" rx="5" fill="rgba(52,211,153,0.12)" stroke="rgba(52,211,153,0.28)" stroke-width="0.6"/>
    <text x="635" y="257" text-anchor="middle" fill="#34d399" font-size="10" font-family="Inter,system-ui" font-weight="600">Ready to act →</text>
    <rect x="740" y="243" width="90" height="20" rx="4" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.2)" stroke-width="0.5"/>
    <text x="785" y="257" text-anchor="middle" fill="#a5b4fc" font-size="8" font-family="ui-monospace,monospace">AI Advisor</text>
    <rect x="840" y="243" width="110" height="20" rx="4" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.22)" stroke-width="0.5"/>
    <text x="895" y="257" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="ui-monospace,monospace">Human approval</text>
    <text x="780" y="345" text-anchor="middle" fill="#c4b5fd" font-size="10" font-family="ui-monospace,monospace">Intelligence converts information into direction</text>
  </g>
</svg>`;
}

function compareMobileSvg(): string {
  return `<svg class="dgp4-svg" viewBox="0 0 390 560" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <text x="195" y="28" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="Sora,Inter,system-ui" font-weight="700">TRADITIONAL SOFTWARE</text>
  <rect x="24" y="42" width="342" height="130" rx="8" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" stroke-width="0.9"/>
  <text x="48" y="72" fill="#94a3b8" font-size="9" font-family="ui-monospace,monospace">Opportunities</text>
  <text x="48" y="102" fill="#e2e8f0" font-size="26" font-family="Sora,Inter,system-ui" font-weight="800">47</text>
  <text x="48" y="124" fill="#94a3b8" font-size="8" font-family="ui-monospace,monospace">All listed · No priority</text>
  <text x="195" y="195" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="Inter,system-ui">You work out what matters</text>

  <line x1="50" y1="215" x2="340" y2="215" stroke="#4b5563" stroke-width="0.6" opacity="0.35"/>
  <text x="195" y="235" text-anchor="middle" fill="#64748b" font-size="12" opacity="0.8">VS</text>

  <text x="195" y="265" text-anchor="middle" fill="#c4b5fd" font-size="10" font-family="Sora,Inter,system-ui" font-weight="700">DIGITALGATE</text>
  <text x="195" y="282" text-anchor="middle" fill="#94a3b8" font-size="7" font-family="ui-monospace,monospace">Raw → Context → Priority → Recommendation</text>
  <rect x="24" y="295" width="342" height="230" rx="8" fill="rgba(124,58,237,0.04)" stroke="rgba(124,58,237,0.18)" stroke-width="0.9"/>
  <circle cx="48" cy="325" r="4.5" fill="#fbbf24" opacity="0.7"/>
  <text x="62" y="329" fill="#fde68a" font-size="10" font-family="Inter,system-ui" font-weight="600">Seven opportunities need attention</text>
  <circle cx="48" cy="358" r="4.5" fill="#fbbf24" opacity="0.5"/>
  <text x="62" y="362" fill="#fde68a" font-size="10" font-family="Inter,system-ui" font-weight="600">Three high-value prospects quiet</text>
  <circle cx="48" cy="391" r="4.5" fill="#34d399" opacity="0.7"/>
  <text x="62" y="395" fill="#a7f3d0" font-size="10" font-family="Inter,system-ui" font-weight="600">I've prepared the priority follow-up list</text>
  <rect x="48" y="420" width="120" height="24" rx="4" fill="rgba(52,211,153,0.12)" stroke="rgba(52,211,153,0.28)" stroke-width="0.5"/>
  <text x="108" y="436" text-anchor="middle" fill="#34d399" font-size="9" font-family="Inter,system-ui" font-weight="600">Ready to act</text>
  <text x="195" y="490" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="Inter,system-ui">Intelligence → Direction</text>
</svg>`;
}

function compareScene(): string {
  return `<div class="dgp4-scene dgp4-scene--compare">
  <div class="dgp4-desktop">${compareDesktopSvg()}</div>
  <div class="dgp4-mobile">${compareMobileSvg()}</div>
  <div class="dgp4-sr-only">
    <p>Traditional software shows 47 opportunities with no priority — the human must interpret what matters.</p>
    <p>DigitalGate converts raw information into context, priority and recommendation: seven opportunities need attention; three high-value prospects have gone quiet; the priority follow-up list is prepared for human approval via the AI Advisor.</p>
  </div>
</div>`;
}

/* —— 3. Responsibility architecture —— */

function responsibilityDesktopSvg(): string {
  return `<svg class="dgp4-svg" viewBox="0 0 1100 300" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="dgp4MachineZone" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <line x1="80" y1="150" x2="1020" y2="150" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>

  <rect x="40" y="30" width="320" height="240" rx="12" fill="url(#dgp4MachineZone)" stroke="#6366f1" stroke-width="0.7" opacity="0.85"/>
  <text x="200" y="60" text-anchor="middle" fill="#a5b4fc" font-size="12" font-family="Sora,Inter,system-ui" font-weight="700">MACHINE RESPONSIBILITY</text>
  <text x="70" y="100" fill="#cbd5e1" font-size="10" font-family="ui-monospace,monospace">MONITOR</text>
  <text x="70" y="122" fill="#cbd5e1" font-size="10" font-family="ui-monospace,monospace">REMEMBER</text>
  <text x="70" y="144" fill="#cbd5e1" font-size="10" font-family="ui-monospace,monospace">DETECT</text>
  <text x="70" y="166" fill="#cbd5e1" font-size="10" font-family="ui-monospace,monospace">PRIORITISE</text>
  <text x="70" y="188" fill="#cbd5e1" font-size="10" font-family="ui-monospace,monospace">RECOMMEND</text>

  <path d="M 360 150 L 440 150" stroke="#6366f1" stroke-width="1.5" opacity="0.4"/>
  <circle class="dgp4-resp-flow" cx="400" cy="150" r="3" fill="#818cf8" opacity="0.55"/>

  <rect x="440" y="50" width="220" height="200" rx="12" fill="rgba(251,191,36,0.04)" stroke="#fbbf24" stroke-width="1.1" opacity="0.95"/>
  <text x="550" y="80" text-anchor="middle" fill="#fbbf24" font-size="12" font-family="Sora,Inter,system-ui" font-weight="700">HUMAN AUTHORITY</text>
  <text x="470" y="118" fill="#fde68a" font-size="10" font-family="ui-monospace,monospace">GOALS</text>
  <text x="470" y="140" fill="#fde68a" font-size="10" font-family="ui-monospace,monospace">JUDGEMENT</text>
  <text x="470" y="162" fill="#fde68a" font-size="10" font-family="ui-monospace,monospace">APPROVAL / OVERRIDE</text>
  <text x="470" y="184" fill="#fde68a" font-size="10" font-family="ui-monospace,monospace">STRATEGY</text>
  <rect x="520" y="205" width="70" height="18" rx="3" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" stroke-width="0.6"/>
  <text x="555" y="217" text-anchor="middle" fill="#fbbf24" font-size="7" font-family="ui-monospace,monospace">GATE</text>

  <path d="M 660 150 L 740 150" stroke="#fbbf24" stroke-width="1.5" opacity="0.4"/>
  <circle class="dgp4-resp-flow" cx="700" cy="150" r="3" fill="#fbbf24" opacity="0.55"/>

  <rect x="740" y="80" width="140" height="140" rx="12" fill="rgba(16,185,129,0.04)" stroke="#10b981" stroke-width="0.7" opacity="0.9"/>
  <text x="810" y="110" text-anchor="middle" fill="#34d399" font-size="12" font-family="Sora,Inter,system-ui" font-weight="700">ACTION</text>
  <text x="770" y="142" fill="#a7f3d0" font-size="10" font-family="ui-monospace,monospace">EXECUTION</text>
  <text x="770" y="164" fill="#a7f3d0" font-size="10" font-family="ui-monospace,monospace">COMMUNICATION</text>

  <path d="M 880 150 L 960 150" stroke="#34d399" stroke-width="1.5" opacity="0.4"/>
  <circle class="dgp4-resp-flow" cx="920" cy="150" r="3" fill="#34d399" opacity="0.55"/>

  <rect x="960" y="30" width="100" height="240" rx="12" fill="rgba(52,211,153,0.04)" stroke="#34d399" stroke-width="0.7" opacity="0.9"/>
  <text x="1010" y="60" text-anchor="middle" fill="#34d399" font-size="12" font-family="Sora,Inter,system-ui" font-weight="700">LEARN</text>
  <text x="980" y="100" fill="#a7f3d0" font-size="8" font-family="ui-monospace,monospace">OUTCOME</text>
  <text x="980" y="120" fill="#a7f3d0" font-size="8" font-family="ui-monospace,monospace">↓</text>
  <text x="980" y="140" fill="#a7f3d0" font-size="8" font-family="ui-monospace,monospace">CONTEXT</text>
  <text x="980" y="160" fill="#a7f3d0" font-size="8" font-family="ui-monospace,monospace">↓</text>
  <text x="980" y="180" fill="#a7f3d0" font-size="8" font-family="ui-monospace,monospace">BETTER</text>
  <text x="980" y="195" fill="#a7f3d0" font-size="8" font-family="ui-monospace,monospace">DECISION</text>

  <path class="dgp4-learn-path" d="M 960 210 C 900 210, 850 240, 360 240" stroke="#34d399" stroke-width="1.1" fill="none" stroke-dasharray="4 6" opacity="0.4"/>
  <circle class="dgp4-learn-particle" cx="660" cy="240" r="2.5" fill="#34d399" opacity="0.55"/>
  <text x="660" y="262" text-anchor="middle" fill="#34d399" font-size="8" font-family="ui-monospace,monospace" opacity="0.75">↺ Learning improves future context</text>
</svg>`;
}

function responsibilityMobileSvg(): string {
  return `<svg class="dgp4-svg" viewBox="0 0 390 520" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
  <line x1="195" y1="18" x2="195" y2="500" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>

  <rect x="24" y="16" width="342" height="100" rx="10" fill="rgba(99,102,241,0.05)" stroke="#6366f1" stroke-width="0.7"/>
  <text x="195" y="42" text-anchor="middle" fill="#a5b4fc" font-size="11" font-family="Sora,Inter,system-ui" font-weight="700">MACHINE RESPONSIBILITY</text>
  <text x="44" y="70" fill="#cbd5e1" font-size="9" font-family="ui-monospace,monospace">Monitor · Remember · Detect</text>
  <text x="44" y="90" fill="#cbd5e1" font-size="9" font-family="ui-monospace,monospace">Prioritise · Recommend</text>

  <circle class="dgp4-mobile-resp-flow" cx="195" cy="128" r="2.5" fill="#818cf8" opacity="0.55"/>

  <rect x="24" y="140" width="342" height="110" rx="10" fill="rgba(251,191,36,0.05)" stroke="#fbbf24" stroke-width="1"/>
  <text x="195" y="168" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="Sora,Inter,system-ui" font-weight="700">HUMAN AUTHORITY</text>
  <text x="44" y="196" fill="#fde68a" font-size="9" font-family="ui-monospace,monospace">Goals · Judgement</text>
  <text x="44" y="216" fill="#fde68a" font-size="9" font-family="ui-monospace,monospace">Approval · Override · Strategy</text>

  <circle class="dgp4-mobile-resp-flow" cx="195" cy="264" r="2.5" fill="#fbbf24" opacity="0.55"/>

  <rect x="24" y="276" width="342" height="80" rx="10" fill="rgba(16,185,129,0.05)" stroke="#10b981" stroke-width="0.7"/>
  <text x="195" y="304" text-anchor="middle" fill="#34d399" font-size="11" font-family="Sora,Inter,system-ui" font-weight="700">ACTION</text>
  <text x="44" y="330" fill="#a7f3d0" font-size="9" font-family="ui-monospace,monospace">Execution · Communication</text>

  <circle class="dgp4-mobile-resp-flow" cx="195" cy="370" r="2.5" fill="#34d399" opacity="0.55"/>

  <rect x="24" y="382" width="342" height="110" rx="10" fill="rgba(52,211,153,0.05)" stroke="#34d399" stroke-width="0.7"/>
  <text x="195" y="410" text-anchor="middle" fill="#34d399" font-size="11" font-family="Sora,Inter,system-ui" font-weight="700">LEARN</text>
  <text x="44" y="438" fill="#a7f3d0" font-size="9" font-family="ui-monospace,monospace">Outcome → Updated context</text>
  <text x="44" y="458" fill="#a7f3d0" font-size="9" font-family="ui-monospace,monospace">Better future decisions ↺</text>
</svg>`;
}

function responsibilityScene(): string {
  return `<div class="dgp4-scene dgp4-scene--responsibility">
  <div class="dgp4-desktop">${responsibilityDesktopSvg()}</div>
  <div class="dgp4-mobile">${responsibilityMobileSvg()}</div>
  <div class="dgp4-sr-only">
    <p>Machine responsibility: monitor, remember, detect, prioritise, recommend.</p>
    <p>Human authority remains explicit: goals, judgement, approval, override and strategy — the decision gate.</p>
    <p>Action covers execution and communication. Learning turns outcomes into updated context and better future decisions.</p>
  </div>
</div>`;
}

/* —— 4. Learning loop —— */

function learningLoopScene(): string {
  return `<div class="dgp4-scene dgp4-scene--learning">
  <p class="dgp4-learning-kicker">The learning system closes the series</p>
  <ol class="dgp4-learning-loop">
    <li><strong>Signal</strong><small>Connected activity arrives</small></li>
    <li><strong>Context</strong><small>Business Brain interprets</small></li>
    <li><strong>Priority</strong><small>What matters now</small></li>
    <li><strong>Recommendation</strong><small>AI Advisor proposes</small></li>
    <li><strong>Governed action</strong><small>Human authority approves</small></li>
    <li><strong>Outcome</strong><small>Execution recorded</small></li>
    <li><strong>Updated context</strong><small>Digital Twin enriched</small></li>
    <li class="is-return"><strong>Better next decision</strong><small>Learning is not an endpoint ↺</small></li>
  </ol>
  <p class="dgp4-learning-note">Software that doesn't just report, but learns — with human authority intact.</p>
</div>`;
}

/* —— 5. Series recap timeline (not cards) —— */

function seriesRecapScene(): string {
  return `<div class="dgp4-scene dgp4-scene--recap">
  <p class="dgp4-recap-label">DigitalGate Insights — Series Complete</p>
  <ol class="dgp4-recap-timeline">
    <li><span class="dgp4-recap-num" aria-hidden="true">01</span><span class="dgp4-recap-text">Fragmented → Connected</span></li>
    <li><span class="dgp4-recap-num" aria-hidden="true">02</span><span class="dgp4-recap-text">Connected → Intelligent System</span></li>
    <li><span class="dgp4-recap-num" aria-hidden="true">03</span><span class="dgp4-recap-text">Signal → Action → Learn</span></li>
    <li class="is-current"><span class="dgp4-recap-num" aria-hidden="true">04</span><span class="dgp4-recap-text">Passive → Learning System</span></li>
  </ol>
</div>`;
}

/** Part 4 StageDef list — woven through Website Studio article headings. */
export function part4(kind: DigitalgateStageKind): StageDef[] {
  return [
    {
      name: "maturity",
      anchors: [
        "software should tell you",
        "the problem with passive",
        "passive software",
        "business software should",
        "the software that tells you",
      ],
      html: p4Stage({
        kind,
        name: "maturity",
        index: "01",
        eyebrow: "Software maturity",
        title: "Capability climbs — not five product tiers",
        lede: "Passive software waits. A learning system monitors, prioritises, acts under governance, and improves from every outcome.",
        ariaLabel:
          "Software maturity architecture evolving from passive raw telemetry, through assistive organisation and proactive priority, into governed automation with approval gates, and finally a structurally complete learning system with feedback.",
        variant: "dg-stage--wide dgp4-stage--maturity",
        scene: maturityScene(),
        caption:
          "PASSIVE → ASSISTIVE → PROACTIVE → GOVERNED AUTOMATION → LEARNING SYSTEM — increasing system capability.",
      }),
    },
    {
      name: "passive-vs-intelligent",
      anchors: ["the problem with dashboards", "dashboards"],
      html: p4Stage({
        kind,
        name: "passive-vs-intelligent",
        index: "02",
        eyebrow: "Information vs Direction",
        title: "A dashboard tells you what happened. An intelligent system tells you what needs attention.",
        lede: "Raw information becomes context, priority, recommendation and action readiness — not a prettier count.",
        ariaLabel:
          "Information versus direction. Traditional software shows 47 opportunities with no priority. DigitalGate shows seven opportunities need attention, three high-value prospects have gone quiet, and a prepared priority follow-up list ready for human approval.",
        variant: "dg-stage--wide dgp4-stage--compare",
        scene: compareScene(),
        caption:
          "RAW INFORMATION → CONTEXT → PRIORITY → RECOMMENDATION → ACTION READINESS.",
      }),
    },
    {
      name: "governance",
      anchors: [
        "human control is part of the intelligence",
        "human control is part",
        "human control",
        "the system needs to know the difference",
      ],
      html: p4Stage({
        kind,
        name: "governance",
        index: "03",
        eyebrow: "Responsibility architecture",
        title: "Delegate the cognitive load, not the accountability.",
        lede: "The machine handles routine thinking. Humans keep goals, judgement, approval and strategy. Action executes; learning improves the next decision.",
        ariaLabel:
          "Responsibility architecture. Machine responsibility monitors, remembers, detects, prioritises and recommends. Human authority covers goals, judgement, approval, override and strategy through an explicit gate. Action covers execution and communication. Learning turns outcomes into updated context and better future decisions.",
        variant: "dg-stage--wide dgp4-stage--responsibility",
        scene: responsibilityScene(),
        caption:
          "MACHINE → HUMAN AUTHORITY → ACTION → LEARN ↺ — human authority stays explicit.",
      }),
    },
    {
      name: "learning-loop",
      anchors: [
        "the business should get smarter",
        "get smarter as more",
        "from tools to an operating partner",
        "operating partner",
      ],
      html: p4Stage({
        kind,
        name: "learning-loop",
        index: "04",
        eyebrow: "Learning is not an endpoint",
        title: "Outcomes improve future context and recommendations",
        lede: "Signal → Context → Priority → Recommendation → Governed Action → Outcome → Updated Context / Digital Twin → Better Next Decision — then around again.",
        ariaLabel:
          "Closed learning loop: signal, context, priority, recommendation, governed action, outcome, updated context including the Digital Twin, and a better next decision that feeds back into the loop.",
        variant: "dgp4-stage--learning",
        scene: learningLoopScene(),
        caption:
          "Business Brain, AI Advisor, Digital Twin and governed automation compound — without removing human authority.",
      }),
    },
    {
      name: "series-recap",
      anchors: [
        "from tools to an operating partner",
        "operating partner",
        "explore the intelligent",
      ],
      html: p4Stage({
        kind,
        name: "series-recap",
        index: "05",
        eyebrow: "Series complete",
        title: "Four parts. One DigitalGate argument.",
        lede: "Part 4 concludes the progression from fragmented tools to a learning business operating system.",
        ariaLabel:
          "Restrained series timeline. Part 1 Fragmented to Connected. Part 2 Connected to Intelligent System. Part 3 Signal to Action to Learn. Part 4 Passive to Learning System, current.",
        variant: "dgp4-stage--recap",
        scene: seriesRecapScene(),
        caption: "Not four cards — one coherent argument concluded.",
      }),
    },
  ];
}
