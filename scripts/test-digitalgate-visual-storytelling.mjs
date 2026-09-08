/**
 * Issue #48 — DigitalGate Insights visual STAGES (render-time, no Neon).
 *
 * Verifies, against a fixture shaped like CURRENT production Website Studio HTML
 * (hero + series nav + semantic sections + legacy dg-story-visual + legacy
 * <style data-dg48-uplift> + data-dg48-visual blocks + unrelated article CSS):
 *  - all legacy presentation layers are removed (no double-render),
 *  - unrelated CSS / prose / headings / series nav survive,
 *  - the new individual scenes are woven through the article (not stacked),
 *  - each scene appears exactly once and re-runs are byte-identical.
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

const count = (s, re) => (s.match(re) || []).length;

/** Production-shaped Part 1 article carrying both legacy #48 layers. */
const PROD_PART1 = `<article>
  <header class="hero"><p class="eyebrow">DigitalGate Insights · 01</p><h1>From dumb businesses to smart businesses</h1>
    <nav class="series"><a href="/insights/from-dumb-businesses-to-smart-businesses">Part 1</a><a href="/insights/intelligent-business-more-than-a-brain">Part 2</a><a href="/insights/from-signal-to-action">Part 3</a><a href="/insights/business-software-should-tell-you-what-needs-doing">Part 4</a></nav>
  </header>
  <style data-dg48-uplift="v2">.dg48-fragmented{color:#f00}.dg48-visual{padding:2rem}</style>
  <style>.article-callout{border:1px solid #333}</style>
  <section><h2>Most businesses aren’t dumb. They’re fragmented.</h2><p>PROSE_FRAGMENTED must survive.</p></section>
  <section data-dg48-visual="fragmented-business"><div class="dg48-frag">LEGACY_VISUAL_FRAG</div></section>
  <section><h2>The evolution of business software</h2><p>PROSE_EVOLUTION must survive.</p></section>
  <section><h2>What “connected” actually means</h2><p>PROSE_CONNECTED must survive.</p></section>
  <aside class="dg-story-visual" data-dg-story="intelligence-rail"><span class="dg-story-label">The DigitalGate intelligence loop</span></aside>
  <section><h2>The intelligence model</h2><p>PROSE_MODEL must survive.</p></section>
  <section data-dg48-visual="operating-layers"><div>LEGACY_OPERATING_LAYERS</div></section>
  <section><h2>The vision: software → systems → intelligence</h2><p>PROSE_VISION must survive.</p><a class="cta" href="/demo">Book a Demo</a></section>
</article>`;

describe("digitalgate insights visual stages (#48)", () => {
  it("(12) maps canonical Insights slugs; unrelated slugs are null", async () => {
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

  it("removes both legacy layers, preserves content, weaves scenes (production shape)", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const out = enhanceDigitalgateVisualHtml(PROD_PART1, SLUGS["insights-part-1"]);

    // (1) old renderer dg-story visuals removed
    assert.ok(!out.includes("dg-story-visual"), "dg-story-visual removed");
    assert.ok(!out.includes('data-dg-story="intelligence-rail"'), "old story marker removed");
    // (2) dg48 uplift style removed (tag + its contents)
    assert.ok(!out.includes("data-dg48-uplift"), "dg48 uplift style removed");
    assert.ok(!out.includes(".dg48-fragmented"), "dg48 style contents removed");
    // (3) dg48 visual stages removed
    assert.ok(!out.includes("data-dg48-visual"), "dg48 visual attr removed");
    assert.ok(!out.includes("LEGACY_VISUAL_FRAG"), "legacy visual block removed");
    assert.ok(!out.includes("LEGACY_OPERATING_LAYERS"), "legacy layers block removed");
    // (4) unrelated CSS preserved
    assert.ok(out.includes(".article-callout"), "unrelated article CSS preserved");
    // (5) prose preserved
    for (const p of ["PROSE_FRAGMENTED", "PROSE_EVOLUTION", "PROSE_CONNECTED", "PROSE_MODEL", "PROSE_VISION"]) {
      assert.ok(out.includes(p), `${p} preserved`);
    }
    // (6) headings preserved
    assert.ok(out.includes("The evolution of business software"));
    assert.ok(out.includes("The intelligence model"));
    // (7) series navigation preserved
    assert.ok(out.includes('class="series"'));
    assert.ok(out.includes("/insights/from-signal-to-action"));
    assert.ok(out.includes(">Book a Demo<"), "CTA preserved");

    // (8) correct individual new stages inserted, each tagged for this kind
    for (const name of ["fragmented", "convergence", "intelligence-stack", "operating-system"]) {
      assert.match(out, new RegExp(`data-dg-stage="${name}"`));
    }
    assert.equal(count(out, /data-dg-stage-of="insights-part-1"/g), 4);
    assert.ok(!out.includes("data-dg-stage-suite"), "no monolithic suite wrapper");

    // (9) scenes are distributed across the article (READ -> SEE -> READ)
    assert.ok(
      out.indexOf("PROSE_FRAGMENTED") <
        out.indexOf('data-dg-stage="fragmented"'),
      "fragmented scene follows its section prose",
    );
    assert.ok(
      out.indexOf('data-dg-stage="fragmented"') < out.indexOf("PROSE_EVOLUTION"),
      "fragmented scene precedes the next section (woven, not stacked)",
    );
    assert.ok(
      out.indexOf('data-dg-stage="convergence"') < out.indexOf("PROSE_MODEL"),
      "convergence scene appears before the intelligence-model prose",
    );
    assert.ok(
      out.indexOf("PROSE_MODEL") < out.indexOf('data-dg-stage="intelligence-stack"'),
      "intelligence-stack scene appears after the model prose",
    );
    assert.ok(
      out.indexOf("PROSE_VISION") < out.indexOf('data-dg-stage="operating-system"'),
      "operating-system scene lands late, near the synthesis",
    );

    // (10) each scene exactly once
    for (const name of ["fragmented", "convergence", "intelligence-stack", "operating-system"]) {
      assert.equal(count(out, new RegExp(`data-dg-stage="${name}"`, "g")), 1, `${name} once`);
    }

    // (11) second enhancement is byte-identical
    assert.equal(enhanceDigitalgateVisualHtml(out, SLUGS["insights-part-1"]), out);
  });

  it("(8/9/10/11) weaves Parts 2–4 scenes at their anchors, idempotently", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();

    const p2 = enhanceDigitalgateVisualHtml(
      `<header class="hero"><h1>Part 2</h1></header><section><h2>Opening</h2><p>P2_OPEN</p></section><section><h2>The DigitalGate body map</h2><p>P2_MAP</p></section><section><h2>A business operating system</h2><p>P2_OS</p></section>`,
      SLUGS["insights-part-2"],
    );
    assert.match(p2, /data-dg-stage="living-system"/);
    assert.match(p2, /data-dg-stage="living-flow"/);
    assert.match(p2, /Immune system/);
    assert.equal(count(p2, /data-dg-stage-of="insights-part-2"/g), 2);
    assert.equal(enhanceDigitalgateVisualHtml(p2, SLUGS["insights-part-2"]), p2);

    const p3 = enhanceDigitalgateVisualHtml(
      `<header class="hero"><h1>Part 3</h1></header><section><h2>1. Connect</h2><p>P3_CONNECT</p></section><section><h2>3. Advise</h2><p>P3_ADVISE</p></section><section><h2>4. Act</h2><p>P3_ACT</p></section>`,
      SLUGS["insights-part-3"],
    );
    assert.match(p3, /data-dg-stage="intelligence-loop"/);
    assert.match(p3, /data-dg-stage="scenario"/);
    assert.match(p3, /Human approval/);
    assert.match(p3, /dg-journey__gate/);
    // scenario should land around Act (after the loop), not stacked at the top
    assert.ok(p3.indexOf('data-dg-stage="intelligence-loop"') < p3.indexOf('data-dg-stage="scenario"'));
    assert.ok(p3.indexOf("P3_CONNECT") < p3.indexOf('data-dg-stage="scenario"'));
    assert.equal(enhanceDigitalgateVisualHtml(p3, SLUGS["insights-part-3"]), p3);

    const p4 = enhanceDigitalgateVisualHtml(
      `<header class="hero"><h1>Part 4</h1></header><section><h2>Business software should tell you what needs doing</h2><p>P4_OPEN</p></section><section><h2>The problem with dashboards</h2><p>P4_DASH</p></section><section><h2>Human control is part of the intelligence</h2><p>P4_HUMAN</p></section>`,
      SLUGS["insights-part-4"],
    );
    assert.match(p4, /data-dg-stage="maturity"/);
    assert.match(p4, /data-dg-stage="passive-vs-intelligent"/);
    assert.match(p4, /data-dg-stage="governance"/);
    assert.match(p4, />47</);
    assert.match(p4, /prepared the priority follow-up list/i);
    assert.match(p4, /Decision stays here/);
    // governance lands around the human-control section
    assert.ok(p4.indexOf("P4_HUMAN") < p4.indexOf('data-dg-stage="governance"'));
    assert.equal(enhanceDigitalgateVisualHtml(p4, SLUGS["insights-part-4"]), p4);
  });

  it("falls back gracefully when semantic anchors are absent (no drop, no dup)", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    // Headings present but none match anchors -> even distribution across sections.
    const out = enhanceDigitalgateVisualHtml(
      `<header class="hero"><h1>P1</h1></header><section><h2>Alpha</h2><p>A</p></section><section><h2>Beta</h2><p>B</p></section><section><h2>Gamma</h2><p>C</p></section><section><h2>Delta</h2><p>D</p></section>`,
      SLUGS["insights-part-1"],
    );
    // all four scenes present exactly once
    for (const name of ["fragmented", "convergence", "intelligence-stack", "operating-system"]) {
      assert.equal(count(out, new RegExp(`data-dg-stage="${name}"`, "g")), 1);
    }
    // and spread out (not all at the same spot) — content survives between them
    assert.ok(out.includes("Alpha") && out.includes("Delta"));

    // No headings at all -> insert after hero, in order, still no duplication.
    const bare = enhanceDigitalgateVisualHtml(
      `<header class="hero"></header>`,
      SLUGS["insights-part-1"],
    );
    assert.equal(count(bare, /data-dg-stage-of="insights-part-1"/g), 4);
    assert.equal(enhanceDigitalgateVisualHtml(bare, SLUGS["insights-part-1"]), bare);
  });

  it("(13) leaves unrelated pages untouched", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const html = `<header class="hero"></header><p>Pricing details</p>`;
    assert.equal(enhanceDigitalgateVisualHtml(html, "pricing"), html);
    assert.equal(enhanceDigitalgateVisualHtml("", SLUGS["insights-part-1"]), "");
  });

  it("(14) keeps Business Brain / Automation on existing primitives", async () => {
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

  it("weaves Platform Overview architecture scenes at section anchors, idempotently", async () => {
    const { enhanceDigitalgateVisualHtml, digitalgateVisualPageKind } = await load();
    // slug mapping (both aliases)
    assert.equal(digitalgateVisualPageKind("platform-overview"), "platform-overview");
    assert.equal(digitalgateVisualPageKind("platform"), "platform-overview");

    const src = `<div class="dg-platform" data-dg-motion-root>
      <section class="hero"><div class="container"><h1>One operating system for your business.</h1><p>POV_HERO</p></div></section>
      <section><div class="container"><h2>The core everything shares.</h2><p>POV_CORE</p></div></section>
      <section><div class="container"><h2>The important part is what the software shares.</h2><p>POV_SHARED</p></div></section>
      <section><div class="container"><h2>A living representation of the business.</h2><p>POV_TWIN</p></div></section>
      <section><div class="container"><h2>Context becomes understanding.</h2><p>POV_BRAIN</p></div></section>
      <section><div class="container"><h2>Reasoning on top of real business context.</h2><p>POV_ADVISOR</p></div></section>
      <section><div class="container"><h2>Automation with context and boundaries.</h2><p>POV_AUTO</p></div></section>
      <section><div class="container"><h2>Apps specialise the platform. They do not fragment it.</h2><p>POV_APPS</p></div></section>
      <section><div class="container"><h2>Same platform. Different operating models.</h2><p>POV_INDUSTRY</p></div></section>
      <section><div class="container"><h2>The platform does not stop at your internal operations.</h2><p>POV_PRESENCE</p></div></section>
      <section><div class="container"><h2>One platform. One business context.</h2><p>POV_RECAP</p></div></section>
    </div>`;
    const out = enhanceDigitalgateVisualHtml(src, "platform-overview");

    // All eleven architecture scenes present, exactly once each.
    for (const name of [
      "hero-architecture", "platform-core", "shared-context", "digital-twin",
      "business-brain", "ai-advisor", "governed-automation", "apps",
      "industry", "digital-presence", "architecture-recap",
    ]) {
      assert.equal(
        count(out, new RegExp(`data-dg-stage="${name}"`, "g")),
        1,
        `expected one ${name} scene`,
      );
    }
    assert.equal(count(out, /data-dg-stage-of="platform-overview"/g), 11);

    // SEO-critical prose is preserved (content authority stays in the HTML).
    for (const p of ["POV_HERO", "POV_CORE", "POV_BRAIN", "POV_RECAP"]) {
      assert.ok(out.includes(p), `expected ${p} preserved`);
    }
    // Non-negotiable terminology + colour semantics carried in the visuals.
    assert.match(out, /Business Brain/);
    assert.match(out, /AI Advisor/);
    assert.match(out, /Digital Twin/);
    assert.match(out, /PLATFORM CORE/);
    assert.match(out, /AUTHORITY/);
    assert.match(out, /Auto-approved within policy/);

    // Narrative order: hero first, recap last.
    assert.ok(
      out.indexOf('data-dg-stage="hero-architecture"') <
        out.indexOf('data-dg-stage="platform-core"'),
    );
    assert.ok(
      out.indexOf('data-dg-stage="platform-core"') <
        out.indexOf('data-dg-stage="architecture-recap"'),
    );
    // Idempotent — a second pass is byte-identical.
    assert.equal(enhanceDigitalgateVisualHtml(out, "platform-overview"), out);
  });
});
