/**
 * Issue #48 — DigitalGate Insights visual STAGE suites (render-time, no Neon).
 * Verifies slug selection, substantial stage injection, idempotency, legacy
 * upgrade, content preservation and required story beats for Parts 1–4.
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

const SLUGS = {
  "insights-part-1": "from-dumb-businesses-to-smart-businesses",
  "insights-part-2": "intelligent-business-more-than-a-brain",
  "insights-part-3": "from-signal-to-action",
  "insights-part-4": "business-software-should-tell-you-what-needs-doing",
};

describe("digitalgate insights visual stages (#48)", () => {
  it("maps canonical Insights slugs to their part", async () => {
    const { digitalgateVisualPageKind } = await load();
    for (const [part, slug] of Object.entries(SLUGS)) {
      assert.equal(digitalgateVisualPageKind(slug), part);
    }
    assert.equal(
      digitalgateVisualPageKind("software-that-tells-you-what-needs-doing"),
      "insights-part-4",
    );
    assert.equal(digitalgateVisualPageKind("pricing"), null);
    assert.equal(digitalgateVisualPageKind(null), null);
  });

  for (const [part, slug] of Object.entries(SLUGS)) {
    it(`injects the ${part} stage suite after the hero, idempotent + content preserved`, async () => {
      const { enhanceDigitalgateVisualHtml } = await load();
      const body = `UNIQUE_ARTICLE_BODY_${part.toUpperCase()}`;
      const article = `<article><header class="hero"><h1>${part}</h1></header><section class="body"><p>${body}</p></section></article>`;
      const out = enhanceDigitalgateVisualHtml(article, slug);

      // Substantial, recomposed stage suite (not a small dg-story card).
      assert.match(out, new RegExp(`data-dg-stage-suite="${part}"`));
      assert.match(out, /class="dg-stage[ "]/);
      assert.doesNotMatch(out, /class="dg-story-visual"/);

      // Placed after the hero, before the article body; body preserved.
      assert.ok(out.indexOf("</header>") < out.indexOf("dg-stage-suite"));
      assert.ok(out.indexOf("dg-stage-suite") < out.indexOf(body));
      assert.match(out, new RegExp(body));

      // Idempotent — no duplicate suite, byte-identical on re-run.
      const again = enhanceDigitalgateVisualHtml(out, slug);
      assert.equal(
        (again.match(new RegExp(`data-dg-stage-suite="${part}"`, "g")) || []).length,
        1,
      );
      assert.equal(again, out);
    });
  }

  it("upgrades a legacy small dg-story-visual card to the new suite without duplicating", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const legacy = `<div><section class="hero"></section><aside class="dg-story-visual" data-dg-story="living-system"><span class="dg-story-label">A business as a connected operating system</span></aside><p>KEEP_ARTICLE_COPY</p></div>`;
    const out = enhanceDigitalgateVisualHtml(legacy, SLUGS["insights-part-2"]);
    assert.match(out, /data-dg-stage-suite="insights-part-2"/);
    assert.ok(!out.includes('data-dg-story="living-system"'), "legacy small card removed");
    assert.match(out, /KEEP_ARTICLE_COPY/);
  });

  it("tolerates an already-enhanced document (no re-insertion)", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const once = enhanceDigitalgateVisualHtml(
      `<header class="hero"></header><p>x</p>`,
      SLUGS["insights-part-3"],
    );
    const twice = enhanceDigitalgateVisualHtml(once, SLUGS["insights-part-3"]);
    assert.equal(
      (twice.match(/data-dg-stage-suite="insights-part-3"/g) || []).length,
      1,
    );
  });

  it("expresses the required story beats visually", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const hero = `<header class="hero"></header>`;

    const p1 = enhanceDigitalgateVisualHtml(hero, SLUGS["insights-part-1"]);
    assert.match(p1, /integration layer/i); // fragmented: owner is the integration layer
    assert.match(p1, /data-dg-stage="convergence"/);
    assert.match(p1, /data-dg-stage="intelligence-stack"/);
    assert.match(p1, /data-dg-stage="operating-system"/);
    assert.match(p1, /Business Brain/);
    assert.match(p1, /data-dg-brain/); // recognisable Business Brain object

    const p2 = enhanceDigitalgateVisualHtml(hero, SLUGS["insights-part-2"]);
    assert.match(p2, /Immune system/); // full living-system relationships
    assert.match(p2, /Nervous system/);
    assert.match(p2, /data-dg-brain/);

    const p3 = enhanceDigitalgateVisualHtml(hero, SLUGS["insights-part-3"]);
    assert.match(p3, /data-dg-stage="intelligence-loop"/);
    assert.match(p3, /Human approval/); // explicit human gate
    assert.match(p3, /dg-journey__gate/);

    const p4 = enhanceDigitalgateVisualHtml(hero, SLUGS["insights-part-4"]);
    assert.match(p4, />47</); // passive number
    assert.match(p4, /prepared the priority follow-up list/i);
    assert.match(p4, /data-dg-stage="governance"/);
    assert.match(p4, /Decision stays here/);
  });

  it("leaves unrelated pages untouched", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const html = `<header class="hero"></header><p>Pricing details</p>`;
    assert.equal(enhanceDigitalgateVisualHtml(html, "pricing"), html);
    assert.equal(enhanceDigitalgateVisualHtml("", SLUGS["insights-part-1"]), "");
  });

  it("keeps Business Brain / Automation on existing primitives (later PRs)", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const brain = enhanceDigitalgateVisualHtml(
      `<div class="dg-bb"><section class="hero"></section><section></section></div>`,
      "business-brain",
    );
    assert.match(brain, /data-dg-story="business-brain-network"/);
    const auto = enhanceDigitalgateVisualHtml(
      `<div><section class="hero"></section><section></section></div>`,
      "automation",
    );
    assert.match(auto, /data-dg-story="automation-timeline"/);
  });
});
