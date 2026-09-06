import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(ROOT, "visual-storytelling.css"), "utf8");
const STYLE = `<style data-dg-visual-storytelling>${CSS}</style>`;

const intelligenceRail = `<div class="dg-story-visual"><span class="dg-story-label">The DigitalGate intelligence loop</span><div class="dg-story-grid"><div class="dg-story-node is-live"><strong>Connect</strong><small>Bring authorised business signals together</small></div><div class="dg-story-node is-live"><strong>Understand</strong><small>Interpret the signal in business context</small></div><div class="dg-story-node is-live"><strong>Advise</strong><small>Decide what matters and what to do next</small></div><div class="dg-story-node is-live"><strong>Act</strong><small>Turn the recommendation into governed follow-through</small></div><div class="dg-story-node is-live"><strong>Learn</strong><small>Measure the outcome and improve the next decision</small></div></div><p class="dg-story-caption">Complex underneath. Simple on top.</p></div>`;

const livingSystem = `<div class="dg-story-visual"><span class="dg-story-label">A business as a living system</span><div class="dg-story-loop"><div class="dg-story-node"><strong>Body</strong><small>People, customers, products and operations</small></div><div class="dg-story-node"><strong>Nervous system</strong><small>Events and connected business signals</small></div><div class="dg-story-node"><strong>Memory</strong><small>Data, history and approved knowledge</small></div><div class="dg-story-node is-live"><strong>Business Brain</strong><small>Context, understanding and judgement</small></div><div class="dg-story-node"><strong>Hands &amp; voice</strong><small>Automation, tasks and communications</small></div><div class="dg-story-node"><strong>Learning</strong><small>Outcomes improve future decisions</small></div></div></div>`;

const proactiveCompare = `<div class="dg-story-visual"><span class="dg-story-label">Passive software vs proactive software</span><div class="dg-story-compare"><div class="dg-story-panel"><h3>Traditional software</h3><p>Stores the record.</p><p>Waits for you to open the right screen.</p><p>Shows the dashboard.</p><p>Leaves the next move to you.</p></div><div class="dg-story-panel is-dg"><h3>DigitalGate</h3><p>Notices the signal.</p><p>Understands why it matters.</p><p>Recommends the next sensible move.</p><p>Helps act — with the human in control.</p></div></div></div><div class="dg-story-visual"><span class="dg-story-label">What proactive intelligence feels like</span><div class="dg-story-recommendation"><div class="dg-story-signal">!</div><div><strong>Three high-value opportunities have gone quiet.</strong><p>Two are strong candidates for follow-up today based on value, recency and previous engagement.</p></div><span class="dg-story-action">Prepare follow-ups →</span></div></div>`;

export function enhanceFoundationalInsight(html, slug) {
  let out = html.includes("data-dg-visual-storytelling") ? html : `${STYLE}${html}`;
  const heroEnd = out.indexOf("</section>");
  if (slug === "from-dumb-businesses-to-smart-businesses" && heroEnd >= 0 && !out.includes("The DigitalGate intelligence loop</span>")) {
    out = `${out.slice(0, heroEnd + 10)}${intelligenceRail}${out.slice(heroEnd + 10)}`;
  }
  if (slug === "intelligent-business-more-than-a-brain" && heroEnd >= 0 && !out.includes("A business as a living system</span>")) {
    out = `${out.slice(0, heroEnd + 10)}${livingSystem}${out.slice(heroEnd + 10)}`;
  }
  return out;
}

export function enhanceEditorialInsight(html, article) {
  let out = html.includes("data-dg-visual-storytelling") ? html : `${STYLE}${html}`;
  const heroEnd = out.indexOf("</header>");
  if (article.id === "foundational-3" && heroEnd >= 0 && !out.includes("The DigitalGate intelligence loop</span>")) {
    out = `${out.slice(0, heroEnd + 9)}${intelligenceRail}${out.slice(heroEnd + 9)}`;
  }
  if (article.id === "proactive-business-software" && heroEnd >= 0 && !out.includes("Passive software vs proactive software</span>")) {
    out = `${out.slice(0, heroEnd + 9)}${proactiveCompare}${out.slice(heroEnd + 9)}`;
  }
  return out;
}
