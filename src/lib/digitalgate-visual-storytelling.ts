/**
 * DigitalGate visual storytelling — renderer-owned HTML primitives.
 *
 * Public marketing pages are Neon/Website Studio HTML. Visuals must not depend
 * solely on a one-off Neon apply script. This module upgrades HTML at render
 * time (idempotent) so Insights / Business Brain / Automation stay visible
 * even when Studio content is plain or carries an older story block.
 */

export type DigitalgateVisualPageKind =
  | "insights-part-1"
  | "insights-part-2"
  | "insights-part-3"
  | "insights-part-4"
  | "business-brain"
  | "automation"
  | null;

const SLUG_KIND: Record<string, Exclude<DigitalgateVisualPageKind, null>> = {
  "from-dumb-businesses-to-smart-businesses": "insights-part-1",
  "intelligent-business-more-than-a-brain": "insights-part-2",
  "from-signal-to-action": "insights-part-3",
  "business-software-should-tell-you-what-needs-doing": "insights-part-4",
  "software-that-tells-you-what-needs-doing": "insights-part-4",
  "business-brain": "business-brain",
  automation: "automation",
};

export function digitalgateVisualPageKind(
  pageSlug?: string | null,
): DigitalgateVisualPageKind {
  if (!pageSlug) return null;
  const key = pageSlug.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return SLUG_KIND[key] ?? null;
}

const intelligenceRail = `<aside class="dg-story-visual" data-dg-story="intelligence-rail" aria-label="DigitalGate intelligence loop">
  <span class="dg-story-label">The DigitalGate intelligence loop</span>
  <div class="dg-story-grid">
    <div class="dg-story-node is-live"><strong>Connect</strong><small>Bring authorised business signals together</small></div>
    <div class="dg-story-node is-live"><strong>Understand</strong><small>Interpret the signal in business context</small></div>
    <div class="dg-story-node is-live"><strong>Advise</strong><small>Decide what matters and what to do next</small></div>
    <div class="dg-story-node is-live"><strong>Act</strong><small>Turn the recommendation into governed follow-through</small></div>
    <div class="dg-story-node is-live"><strong>Learn</strong><small>Measure the outcome and improve the next decision</small></div>
  </div>
  <p class="dg-story-caption">Complex underneath. Simple on top.</p>
</aside>`;

const livingSystem = `<aside class="dg-story-visual" data-dg-story="living-system" aria-label="Business as a connected operating system">
  <span class="dg-story-label">A business as a connected operating system</span>
  <div class="dg-story-os">
    <div class="dg-story-os-hub">
      <svg viewBox="0 0 320 280" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="dgOsRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.35"/>
          </linearGradient>
        </defs>
        <circle cx="160" cy="140" r="108" fill="none" stroke="rgba(51,65,85,0.9)" stroke-width="1.5"/>
        <circle cx="160" cy="140" r="72" fill="none" stroke="rgba(96,165,250,0.28)" stroke-width="1.5" stroke-dasharray="4 6"/>
        <g class="dg-story-orbit">
          <circle cx="160" cy="32" r="5" fill="#60a5fa"/>
          <circle cx="268" cy="100" r="5" fill="#93c5fd"/>
          <circle cx="248" cy="210" r="5" fill="#34d399"/>
          <circle cx="72" cy="210" r="5" fill="#fbbf24"/>
          <circle cx="52" cy="100" r="5" fill="#a78bfa"/>
        </g>
        <circle cx="160" cy="140" r="46" fill="rgba(30,64,175,0.22)" stroke="url(#dgOsRing)" stroke-width="2"/>
        <circle cx="160" cy="140" r="28" fill="rgba(15,23,42,0.92)" stroke="rgba(147,197,253,0.45)" stroke-width="1.5"/>
      </svg>
      <div class="dg-story-os-center-label">
        <strong>Business Brain™</strong>
        <small>Shared context · judgement · governed recommendations</small>
      </div>
    </div>
    <div class="dg-story-os-legend">
      <div class="dg-story-node"><strong>Operations</strong><small>People, customers, products and delivery</small></div>
      <div class="dg-story-node"><strong>Signals</strong><small>Events, connectors and live activity</small></div>
      <div class="dg-story-node"><strong>Memory</strong><small>Records, documents and approved knowledge</small></div>
      <div class="dg-story-node is-live"><strong>Intelligence</strong><small>Business Brain understands the whole</small></div>
      <div class="dg-story-node"><strong>Action</strong><small>Automation, tasks and communications</small></div>
      <div class="dg-story-node is-positive"><strong>Learning</strong><small>Outcomes improve the next decision</small></div>
    </div>
  </div>
  <p class="dg-story-caption">Architectural map — not anatomy. The sophistication is the connection.</p>
</aside>`;

const closedLoop = `<aside class="dg-story-visual" data-dg-story="closed-loop" aria-label="Signal to learning intelligence loop">
  <span class="dg-story-label">How DigitalGate gets more useful over time</span>
  <div class="dg-story-closed-loop">
    <svg viewBox="0 0 280 280" role="img" aria-hidden="true">
      <defs>
        <marker id="dgLoopArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#60a5fa"/>
        </marker>
      </defs>
      <circle cx="140" cy="140" r="96" fill="none" stroke="rgba(51,65,85,0.85)" stroke-width="1.5"/>
      <circle class="dg-story-loop-path" cx="140" cy="140" r="96" fill="none" stroke="#60a5fa" stroke-width="2" stroke-opacity="0.55" marker-end="url(#dgLoopArrow)"/>
      <circle cx="140" cy="44" r="18" fill="#0b1220" stroke="#60a5fa" stroke-width="1.5"/>
      <circle cx="220" cy="92" r="18" fill="#0b1220" stroke="#93c5fd" stroke-width="1.5"/>
      <circle cx="220" cy="188" r="18" fill="#0b1220" stroke="#a78bfa" stroke-width="1.5"/>
      <circle cx="140" cy="236" r="18" fill="#0b1220" stroke="#34d399" stroke-width="1.5"/>
      <circle cx="60" cy="188" r="18" fill="#0b1220" stroke="#fbbf24" stroke-width="1.5"/>
      <circle cx="60" cy="92" r="18" fill="#0b1220" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="140" y="48" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="700">Signal</text>
      <text x="220" y="96" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="700">Insight</text>
      <text x="220" y="192" text-anchor="middle" fill="#e2e8f0" font-size="8" font-weight="700">Advise</text>
      <text x="140" y="240" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="700">Action</text>
      <text x="60" y="192" text-anchor="middle" fill="#e2e8f0" font-size="8" font-weight="700">Outcome</text>
      <text x="60" y="96" text-anchor="middle" fill="#e2e8f0" font-size="9" font-weight="700">Learn</text>
      <circle cx="140" cy="140" r="34" fill="rgba(30,64,175,0.2)" stroke="rgba(147,197,253,0.4)" stroke-width="1.5"/>
      <text x="140" y="136" text-anchor="middle" fill="#93c5fd" font-size="9" font-weight="800">Business</text>
      <text x="140" y="148" text-anchor="middle" fill="#93c5fd" font-size="9" font-weight="800">Brain</text>
    </svg>
    <div class="dg-story-closed-loop-steps">
      <div class="dg-story-node is-live"><span class="dg-story-step-index">1</span><div><strong>Signal</strong><small>Something meaningful happens in the connected business</small></div></div>
      <div class="dg-story-node is-live"><span class="dg-story-step-index">2</span><div><strong>Insight</strong><small>Context turns the event into understanding</small></div></div>
      <div class="dg-story-node is-live"><span class="dg-story-step-index">3</span><div><strong>Recommendation</strong><small>The next sensible move becomes visible</small></div></div>
      <div class="dg-story-node is-live"><span class="dg-story-step-index">4</span><div><strong>Action</strong><small>People approve; the platform can follow through</small></div></div>
      <div class="dg-story-node is-positive"><span class="dg-story-step-index">5</span><div><strong>Outcome → Learning</strong><small>Results feed the next decision — the loop compounds</small></div></div>
    </div>
  </div>
  <p class="dg-story-caption">Connect → Understand → Advise → Act → Learn</p>
</aside>`;

const proactiveCompare = `<aside class="dg-story-visual" data-dg-story="proactive-compare" aria-label="Traditional software versus DigitalGate">
  <span class="dg-story-label">Traditional software vs proactive software</span>
  <div class="dg-story-flow-compare">
    <div class="dg-story-flow-row">
      <div class="dg-story-flow-row-label">Traditional software</div>
      <div class="dg-story-flow-track is-traditional">
        <div class="dg-story-flow-chip"><strong>Human asks</strong><small>Open the right screen</small></div>
        <div class="dg-story-flow-chip"><strong>Software responds</strong><small>Shows the record</small></div>
      </div>
    </div>
    <div class="dg-story-flow-row is-dg">
      <div class="dg-story-flow-row-label">DigitalGate</div>
      <div class="dg-story-flow-track">
        <div class="dg-story-flow-chip"><strong>Business signals</strong><small>Connected activity arrives</small></div>
        <div class="dg-story-flow-chip"><strong>System understands</strong><small>Context + judgement</small></div>
        <div class="dg-story-flow-chip"><strong>Recommends / acts</strong><small>Human stays in control</small></div>
        <div class="dg-story-flow-chip"><strong>Learns</strong><small>Outcomes improve next time</small></div>
      </div>
    </div>
  </div>
</aside>
<aside class="dg-story-visual" data-dg-story="recommendation-card" aria-label="Example proactive recommendation">
  <span class="dg-story-label">What proactive intelligence feels like</span>
  <div class="dg-story-recommendation">
    <div class="dg-story-signal" aria-hidden="true">!</div>
    <div>
      <strong>Three high-value opportunities have gone quiet.</strong>
      <p>Two are strong candidates for follow-up today based on value, recency and previous engagement.</p>
    </div>
    <span class="dg-story-action">Prepare follow-ups →</span>
  </div>
</aside>`;

const businessBrainNetwork = `<aside class="dg-story-visual" data-dg-story="business-brain-network" aria-label="Business Brain as shared organisational context">
  <span class="dg-story-label">Business Brain™ — shared intelligence layer</span>
  <div class="dg-story-network">
    <div class="dg-story-network-canvas">
      <svg viewBox="0 0 640 300" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="dgBrainCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.25"/>
          </linearGradient>
        </defs>
        <line x1="120" y1="70" x2="320" y2="150" stroke="rgba(96,165,250,0.35)" stroke-width="1.5"/>
        <line x1="320" y1="40" x2="320" y2="150" stroke="rgba(96,165,250,0.35)" stroke-width="1.5"/>
        <line x1="520" y1="70" x2="320" y2="150" stroke="rgba(96,165,250,0.35)" stroke-width="1.5"/>
        <line x1="100" y1="200" x2="320" y2="150" stroke="rgba(96,165,250,0.28)" stroke-width="1.5"/>
        <line x1="320" y1="260" x2="320" y2="150" stroke="rgba(52,211,153,0.35)" stroke-width="1.5"/>
        <line x1="540" y1="200" x2="320" y2="150" stroke="rgba(96,165,250,0.28)" stroke-width="1.5"/>
        <circle cx="120" cy="70" r="28" fill="#0b1220" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="320" cy="40" r="28" fill="#0b1220" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="520" cy="70" r="28" fill="#0b1220" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="100" cy="200" r="28" fill="#0b1220" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="540" cy="200" r="28" fill="#0b1220" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="320" cy="150" r="52" fill="url(#dgBrainCore)" stroke="#93c5fd" stroke-width="2"/>
        <circle cx="320" cy="260" r="30" fill="#0b1220" stroke="#34d399" stroke-width="1.5"/>
        <text x="120" y="74" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="700">CRM</text>
        <text x="320" y="44" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="700">Website</text>
        <text x="520" y="74" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="700">Comms</text>
        <text x="100" y="204" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="700">Finance</text>
        <text x="540" y="204" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="700">Ops</text>
        <text x="320" y="146" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="800">Business</text>
        <text x="320" y="162" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="800">Brain™</text>
        <text x="320" y="264" text-anchor="middle" fill="#a7f3d0" font-size="10" font-weight="700">Advise / Act</text>
      </svg>
    </div>
    <div class="dg-story-network-feeds">
      <div class="dg-story-node"><strong>Customers</strong><small>Contacts &amp; relationships</small></div>
      <div class="dg-story-node"><strong>Services</strong><small>Delivery &amp; operations</small></div>
      <div class="dg-story-node"><strong>Knowledge</strong><small>Approved documents &amp; goals</small></div>
      <div class="dg-story-node is-live"><strong>Governed context</strong><small>Not magical omniscience</small></div>
    </div>
  </div>
  <p class="dg-story-caption">Entities feed a governed context graph. Recommendations emerge from what the business actually knows.</p>
</aside>`;

const automationTimeline = `<aside class="dg-story-visual" data-dg-story="automation-timeline" aria-label="Automation from trigger to outcome">
  <span class="dg-story-label">Trigger → context → decision → action → outcome</span>
  <div class="dg-story-timeline">
    <div class="dg-story-timeline-item is-live"><span class="dg-story-timeline-dot" aria-hidden="true"></span><div><strong>Trigger</strong><p>A lead arrives, a payment fails, a stay is confirmed, or an opportunity goes quiet.</p></div></div>
    <div class="dg-story-timeline-item is-live"><span class="dg-story-timeline-dot" aria-hidden="true"></span><div><strong>Context</strong><p>Business Brain supplies who they are, what’s open, and what already happened.</p></div></div>
    <div class="dg-story-timeline-item is-live"><span class="dg-story-timeline-dot" aria-hidden="true"></span><div><strong>Decision</strong><p>A rule or recommendation chooses the next sensible move — with permissions intact.</p></div></div>
    <div class="dg-story-timeline-item is-live"><span class="dg-story-timeline-dot" aria-hidden="true"></span><div><strong>Action</strong><p>Create a task, send a message, advance a stage, or prepare a human follow-up.</p></div></div>
    <div class="dg-story-timeline-item is-outcome"><span class="dg-story-timeline-dot" aria-hidden="true"></span><div><strong>Outcome</strong><p>The result is logged so the next trigger is smarter — not another silent Zap.</p></div></div>
  </div>
  <div class="dg-story-examples">
    <div class="dg-story-example"><strong>New enquiry</strong><p>Capture → enrich → assign → confirm receipt without spreadsheet hopping.</p></div>
    <div class="dg-storyexample dg-story-example"><strong>Quiet opportunity</strong><p>Notice silence → recommend follow-up → draft the message for approval.</p></div>
    <div class="dg-story-example"><strong>Failed payment</strong><p>Detect → notify the right owner → open a recovery task with context.</p></div>
  </div>
  <p class="dg-story-caption">Automation on DigitalGate acts on shared business context — not disconnected glue.</p>
</aside>`;

/** Fix typo introduced above - dg-storyexample */
const automationTimelineFixed = automationTimeline.replace(
  'dg-storyexample dg-story-example',
  'dg-story-example',
);

function visualForKind(kind: Exclude<DigitalgateVisualPageKind, null>): string {
  switch (kind) {
    case "insights-part-1":
      return intelligenceRail;
    case "insights-part-2":
      return livingSystem;
    case "insights-part-3":
      return `${closedLoop}${intelligenceRail}`;
    case "insights-part-4":
      return proactiveCompare;
    case "business-brain":
      return businessBrainNetwork;
    case "automation":
      return automationTimelineFixed;
  }
}

/** Only data-dg-story markers count as current — legacy Neon blocks should upgrade. */
const CURRENT_STORY_MARKER: Record<Exclude<DigitalgateVisualPageKind, null>, string> = {
  "insights-part-1": 'data-dg-story="intelligence-rail"',
  "insights-part-2": 'data-dg-story="living-system"',
  "insights-part-3": 'data-dg-story="closed-loop"',
  "insights-part-4": 'data-dg-story="proactive-compare"',
  "business-brain": 'data-dg-story="business-brain-network"',
  automation: 'data-dg-story="automation-timeline"',
};

function hasCurrentVisual(html: string, kind: Exclude<DigitalgateVisualPageKind, null>): boolean {
  return html.includes(CURRENT_STORY_MARKER[kind]);
}

function removeBlocksContaining(html: string, needles: string[]): string {
  let out = html;
  for (const needle of needles) {
    let guard = 0;
    while (guard < 8 && out.includes(needle)) {
      guard += 1;
      const needleAt = out.indexOf(needle);
      if (needleAt < 0) break;
      const markerAt = out.lastIndexOf("dg-story-visual", needleAt);
      if (markerAt < 0) break;
      const openLt = out.lastIndexOf("<", markerAt);
      if (openLt < 0) break;
      const tagMatch = out.slice(openLt).match(/^<(aside|div)\b/i);
      if (!tagMatch) break;
      const tag = tagMatch[1].toLowerCase();
      const closeTag = `</${tag}>`;
      let depth = 0;
      let i = openLt;
      let end = -1;
      while (i < out.length) {
        const nextOpen = out.toLowerCase().indexOf(`<${tag}`, i);
        const nextClose = out.toLowerCase().indexOf(closeTag, i);
        if (nextClose < 0) break;
        if (nextOpen >= 0 && nextOpen < nextClose) {
          // Only count real open tags of this element type
          const after = out[nextOpen + tag.length + 1];
          if (after === " " || after === ">" || after === "\n" || after === "\r" || after === "\t") {
            depth += 1;
            i = nextOpen + tag.length + 1;
            continue;
          }
          i = nextOpen + tag.length + 1;
          continue;
        }
        depth -= 1;
        i = nextClose + closeTag.length;
        if (depth <= 0) {
          end = i;
          break;
        }
      }
      if (end < 0) break;
      out = `${out.slice(0, openLt)}${out.slice(end)}`;
    }
  }
  return out;
}

function stripLegacyStoryBlocks(html: string, kind: Exclude<DigitalgateVisualPageKind, null>): string {
  const needles: string[] = [];
  if (kind === "insights-part-1" || kind === "insights-part-3") {
    needles.push("The DigitalGate intelligence loop", 'data-dg-story="intelligence-rail"');
  }
  if (kind === "insights-part-2") {
    needles.push(
      "A business as a living system",
      "A business as a connected operating system",
      'data-dg-story="living-system"',
    );
  }
  if (kind === "insights-part-3") {
    needles.push(
      "How DigitalGate gets more useful over time",
      'data-dg-story="closed-loop"',
    );
  }
  if (kind === "insights-part-4") {
    needles.push(
      "Passive software vs proactive software",
      "Traditional software vs proactive software",
      "What proactive intelligence feels like",
      'data-dg-story="proactive-compare"',
      'data-dg-story="recommendation-card"',
    );
  }
  if (kind === "business-brain") {
    needles.push(
      "Business Brain™ — shared intelligence layer",
      'data-dg-story="business-brain-network"',
    );
  }
  if (kind === "automation") {
    needles.push(
      "Trigger → context → decision → action → outcome",
      'data-dg-story="automation-timeline"',
    );
  }
  return removeBlocksContaining(html, needles);
}

function findInsertIndex(html: string): number {
  const headerClose = html.search(/<\/header>/i);
  if (headerClose >= 0) return headerClose + "</header>".length;

  const heroSection = html.search(
    /<header[^>]*class="[^"]*\bhero\b[^"]*"[^>]*>[\s\S]*?<\/header>/i,
  );
  if (heroSection >= 0) {
    const end = html.indexOf("</header>", heroSection);
    if (end >= 0) return end + "</header>".length;
  }

  // Foundational Insights use <section class="hero"> … </section>
  const heroOpen = html.search(/<(?:section|div)[^>]*class="[^"]*\bhero\b[^"]*"[^>]*>/i);
  if (heroOpen >= 0) {
    const close = html.indexOf("</section>", heroOpen);
    if (close >= 0) return close + "</section>".length;
    const divClose = html.indexOf("</div>", heroOpen);
    if (divClose >= 0) return divClose + "</div>".length;
  }

  // Business Brain / app pages: after first </section> inside .dg-bb / .dg-app
  const firstSection = html.indexOf("</section>");
  if (firstSection >= 0) return firstSection + "</section>".length;

  return -1;
}

function refreshStaleSeriesChrome(html: string): string {
  return html
    .replace(/03\s*·\s*Coming soon/gi, "03 · Intelligence Loop")
    .replace(/Part 3[^.]*Coming soon/gi, "Part 3 — From Signal to Action — is live");
}

/**
 * Idempotently inject / upgrade visual storytelling blocks for known DigitalGate
 * marketing pages. Safe to call on every public render.
 */
export function enhanceDigitalgateVisualHtml(
  html: string,
  pageSlug?: string | null,
): string {
  if (!html) return html;
  const kind = digitalgateVisualPageKind(pageSlug);
  if (!kind) return html;

  let out = refreshStaleSeriesChrome(html);

  if (hasCurrentVisual(out, kind)) {
    // Part 3 should also keep the rail; if only closed-loop exists that's enough.
    return out;
  }

  out = stripLegacyStoryBlocks(out, kind);
  const visual = visualForKind(kind);
  const at = findInsertIndex(out);
  if (at < 0) {
    return `${visual}${out}`;
  }
  return `${out.slice(0, at)}${visual}${out.slice(at)}`;
}

/** Exported for marketing apply scripts / tests. */
export const digitalgateVisualPrimitives = {
  intelligenceRail,
  livingSystem,
  closedLoop,
  proactiveCompare,
  businessBrainNetwork,
  automationTimeline: automationTimelineFixed,
};
