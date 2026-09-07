/**
 * Issue #48 — DigitalGate visual storytelling render-time enhance.
 * No Neon / database required.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const load = () =>
  import(
    pathToFileURL(
      path.join(__dirname, "../src/lib/digitalgate-visual-storytelling.ts"),
    ).href
  );

describe("digitalgate visual storytelling", () => {
  it("maps known marketing slugs", async () => {
    const { digitalgateVisualPageKind } = await load();
    assert.equal(
      digitalgateVisualPageKind("intelligent-business-more-than-a-brain"),
      "insights-part-2",
    );
    assert.equal(digitalgateVisualPageKind("business-brain"), "business-brain");
    assert.equal(digitalgateVisualPageKind("automation"), "automation");
    assert.equal(digitalgateVisualPageKind("pricing"), null);
  });

  it("injects Part 2 living-system visual after hero", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const bare = `<div class="dg-insight"><section class="hero"><h1>Part 2</h1></section><section><p>Body</p></section></div>`;
    const html = enhanceDigitalgateVisualHtml(
      bare,
      "intelligent-business-more-than-a-brain",
    );
    assert.match(html, /data-dg-story="living-system"/);
    assert.match(html, /Business Brain™/);
    assert.ok(html.indexOf("data-dg-story") < html.indexOf("<section><p>Body"));
    const again = enhanceDigitalgateVisualHtml(
      html,
      "intelligent-business-more-than-a-brain",
    );
    assert.equal((again.match(/data-dg-story="living-system"/g) || []).length, 1);
  });

  it("upgrades legacy Part 2 Neon story blocks", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const legacy = `<div><section class="hero"></section><div class="dg-story-visual"><span class="dg-story-label">A business as a living system</span><div class="dg-story-loop"><div class="dg-story-node"><strong>Body</strong></div></div></div><p>More</p></div>`;
    const upgraded = enhanceDigitalgateVisualHtml(
      legacy,
      "intelligent-business-more-than-a-brain",
    );
    assert.match(upgraded, /connected operating system/);
    assert.ok(!upgraded.includes("A business as a living system"));
  });

  it("injects Part 3 closed loop + intelligence rail", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const html = enhanceDigitalgateVisualHtml(
      `<header class="hero"><h1>Signal</h1></header><p>Prose</p>`,
      "from-signal-to-action",
    );
    assert.match(html, /data-dg-story="closed-loop"/);
    assert.match(html, /data-dg-story="intelligence-rail"/);
  });

  it("injects Part 4 flow comparison", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const html = enhanceDigitalgateVisualHtml(
      `<header class="hero"></header>`,
      "business-software-should-tell-you-what-needs-doing",
    );
    assert.match(html, /data-dg-story="proactive-compare"/);
    assert.match(html, /Human asks/);
    assert.match(html, /Business signals/);
  });

  it("injects Business Brain and Automation visuals", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const brain = enhanceDigitalgateVisualHtml(
      `<div class="dg-bb"><section class="hero"><h1>Brain</h1></section><section class="alt"></section></div>`,
      "business-brain",
    );
    assert.match(brain, /data-dg-story="business-brain-network"/);
    const auto = enhanceDigitalgateVisualHtml(
      `<div><section class="hero"><h1>Automation</h1></section><section></section></div>`,
      "automation",
    );
    assert.match(auto, /data-dg-story="automation-timeline"/);
    assert.match(auto, /Quiet opportunity/);
  });

  it("refreshes stale Coming soon chrome on Part 1", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const html = enhanceDigitalgateVisualHtml(
      `<section class="hero"></section><p>03 · Coming soon</p>`,
      "from-dumb-businesses-to-smart-businesses",
    );
    assert.match(html, /03 · Intelligence Loop/);
    assert.match(html, /data-dg-story="intelligence-rail"/);
  });
});
