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
 * PART 1 — Fragmented → Intelligent (chaos → context → intelligence → coordination)
 * ————————————————————————————————————————————————————————————————————————— */

const FRAGMENT_SIGNALS: Array<[string, string]> = [
  ["Website", "Enquiries & visits"],
  ["CRM", "Contacts & deals"],
  ["Ads", "Spend & clicks"],
  ["Email", "Threads & replies"],
  ["Accounting", "Invoices & cash"],
  ["Bookings", "Calendar & stays"],
  ["Analytics", "Traffic & events"],
  ["Reviews", "Reputation"],
  ["Leads", "New interest"],
  ["Messages", "Customer questions"],
];

function part1(kind: DigitalgateStageKind): StageDef[] {
  const scatter = FRAGMENT_SIGNALS.map(
    ([t, d], i) =>
      `<div class="dg-scatter__chip dg-scatter__chip--p${i + 1}"><strong>${t}</strong><small>${d}</small></div>`,
  ).join("");

  return [
    {
      name: "fragmented",
      anchors: ["they’re fragmented", "they're fragmented", "aren’t dumb", "aren't dumb", "fragmented"],
      html: stage({
        kind,
        name: "fragmented",
        index: "01",
        eyebrow: "The problem",
        title: "The owner is the integration layer",
        lede: "Ten disconnected tools. Every signal lands in a different place — and the one thing holding them together is the person in the middle, copying, remembering and deciding.",
        ariaLabel:
          "A business owner surrounded by ten disconnected systems — website, CRM, ads, email, accounting, bookings, analytics, reviews, leads and messages — manually connecting each one.",
        variant: "dg-stage--chaos",
        scene: `<div class="dg-scatter">
  <div class="dg-scatter__field" aria-hidden="true">${scatter}</div>
  <div class="dg-scatter__owner">
    <span class="dg-scatter__owner-glyph" aria-hidden="true">
      <svg viewBox="0 0 64 64"><circle cx="32" cy="22" r="12" fill="none" stroke="#fca5a5" stroke-width="2.5"/><path d="M12 56c0-12 9-19 20-19s20 7 20 19" fill="none" stroke="#fca5a5" stroke-width="2.5"/></svg>
    </span>
    <strong>You</strong>
    <small>Copy · remember · decide</small>
  </div>
</div>`,
        caption:
          "Cognitive load, visualised: the business runs on the owner's memory. Nothing shares context.",
      }),
    },
    {
      name: "convergence",
      anchors: [
        "what “connected” actually means",
        'what "connected" actually means',
        "connected” actually means",
        "the evolution of business software",
      ],
      html: stage({
        kind,
        name: "convergence",
        index: "02",
        eyebrow: "The shift",
        title: "Fragments converge into one operating layer",
        lede: "The same signals stop scattering. DigitalGate connects them into a single, coherent surface — order emerging from fragmentation.",
        ariaLabel:
          "The previously scattered systems converging along connector paths into a single DigitalGate operating layer.",
        scene: `<div class="dg-converge">
  <div class="dg-converge__sources" aria-hidden="true">
    ${["Website", "CRM", "Ads", "Email", "Bookings", "Reviews"].map((s) => `<span class="dg-converge__src">${s}</span>`).join("")}
  </div>
  <svg class="dg-converge__paths" viewBox="0 0 320 220" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="dgConvPath" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#60a5fa"/></linearGradient></defs>
    ${[26, 64, 102, 140, 178, 200].map((y) => `<path class="dg-flow__line" d="M8 ${y} C 150 ${y}, 180 110, 312 110" fill="none" stroke="url(#dgConvPath)" stroke-width="1.5"/>`).join("")}
  </svg>
  <div class="dg-converge__hub">
    ${brainCore({ idSuffix: "P1c" })}
    <strong>DigitalGate</strong>
    <small>One connected operating layer</small>
  </div>
</div>`,
        caption: "Connect → the same activity, now shared context instead of ten islands.",
      }),
    },
    {
      name: "intelligence-stack",
      anchors: ["the intelligence model", "intelligence model"],
      html: stage({
        kind,
        name: "intelligence-stack",
        index: "03",
        eyebrow: "The engine",
        title: "From connection to intelligence",
        lede: "Connected data becomes a Digital Twin. The Business Brain™ gives it context. The AI Advisor turns context into judgement — and only then, governed action.",
        ariaLabel:
          "A vertical intelligence stack: Digital Twin feeds the Business Brain, which feeds the AI Advisor, which proposes governed Action.",
        variant: "dg-stage--stack",
        scene: `<div class="dgs-stack">
  <div class="dgs-stack__col">
    <div class="dgs-stack__layer"><span class="dgs-stack__k">Digital Twin</span><span class="dgs-stack__v">A live model of the connected business</span></div>
    <span class="dgs-stack__down" aria-hidden="true"></span>
    <div class="dgs-stack__layer dgs-stack__layer--brain">${brainCore({ idSuffix: "P1s" })}<span class="dgs-stack__k">Business Brain™</span><span class="dgs-stack__v">Shared context, memory and judgement</span></div>
    <span class="dgs-stack__down" aria-hidden="true"></span>
    <div class="dgs-stack__layer"><span class="dgs-stack__k">AI Advisor</span><span class="dgs-stack__v">Decides what matters and what to do next</span></div>
    <span class="dgs-stack__down" aria-hidden="true"></span>
    <div class="dgs-stack__layer dgs-stack__layer--act"><span class="dgs-stack__k">Action</span><span class="dgs-stack__v">Governed follow-through — people stay in control</span></div>
  </div>
  <div class="dgs-stack__context" aria-hidden="true">
    ${["Core", "Connectors", "Events", "Signals", "Knowledge"].map((c) => `<span class="dgs-stack__ctx">${c}</span>`).join("")}
  </div>
</div>`,
        caption: "Digital Twin → Business Brain → AI Advisor → Action. The Brain is the centre of gravity.",
      }),
    },
    {
      name: "operating-system",
      anchors: [
        "the vision: software",
        "software → systems → intelligence",
        "the path from disconnected to intelligent",
        "from disconnected to intelligent",
      ],
      html: stage({
        kind,
        name: "operating-system",
        index: "04",
        eyebrow: "The result",
        title: "A coordinated operating system",
        lede: "Not a folder of subscriptions — a single system where every part shares the same context and moves together.",
        ariaLabel:
          "The business as one coordinated operating system with the Business Brain at the centre, coordinating operations, signals, memory, action and learning.",
        variant: "dg-stage--os",
        scene: `<div class="dg-orbit">
  <div class="dg-orbit__core">${brainCore({ idSuffix: "P1o" })}<strong>Business Brain™</strong></div>
  <ul class="dg-orbit__ring">
    <li class="dg-orbit__sat"><strong>Operations</strong><small>People & delivery</small></li>
    <li class="dg-orbit__sat"><strong>Signals</strong><small>Live activity</small></li>
    <li class="dg-orbit__sat"><strong>Memory</strong><small>Records & knowledge</small></li>
    <li class="dg-orbit__sat"><strong>Action</strong><small>Tasks & comms</small></li>
    <li class="dg-orbit__sat dg-orbit__sat--learn"><strong>Learning</strong><small>Outcomes improve</small></li>
  </ul>
  <p class="dg-orbit__movement" aria-hidden="true"><span>Chaos</span><span>Context</span><span>Intelligence</span><span>Coordination</span></p>
</div>`,
        caption: "Chaos → Context → Intelligence → Coordination.",
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
