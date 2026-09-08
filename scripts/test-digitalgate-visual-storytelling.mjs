/**
 * DigitalGate Insights — dedicated four-chapter presentation system (#48).
 *
 * Verifies the production Insights renderer re-composes each Website Studio
 * article into ONE approved shell: shared renderer, correct series metadata,
 * one H1, 1–4 progression, prev/next navigation, canonical terminology, the
 * Part-3 governance order (Advisor → Human Authority → authorised Action) with
 * NO green action before authority, shared layout tokens, no per-part geometry,
 * reduced-motion safety, and no broken series links. Content authority stays in
 * Website Studio; only presentation is renderer-owned.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const load = () =>
  import(
    pathToFileURL(
      path.join(root, "src/lib/digitalgate-visual-storytelling.ts"),
    ).href
  );

const count = (s, re) => (s.match(re) || []).length;

/** Real Website Studio source files (content authority) for each chapter. */
const ARTICLES = {
  1: { file: "from-dumb-businesses-to-smart-businesses", slug: "from-dumb-businesses-to-smart-businesses" },
  2: { file: "intelligent-business-more-than-a-brain", slug: "intelligent-business-more-than-a-brain" },
  3: { file: "from-signal-to-action", slug: "from-signal-to-action" },
  4: { file: "software-that-tells-you-what-needs-doing", slug: "business-software-should-tell-you-what-needs-doing" },
};

const ROUTES = {
  1: "/from-dumb-businesses-to-smart-businesses/",
  2: "/intelligent-business-more-than-a-brain/",
  3: "/from-signal-to-action/",
  4: "/business-software-should-tell-you-what-needs-doing/",
};

function readArticle(part) {
  return fs.readFileSync(
    path.join(root, `marketing/pages/${ARTICLES[part].file}.html`),
    "utf8",
  );
}

async function renderPart(part) {
  const { enhanceDigitalgateVisualHtml } = await load();
  return enhanceDigitalgateVisualHtml(readArticle(part), ARTICLES[part].slug);
}

describe("DigitalGate Insights — dedicated four-chapter renderer (#48)", () => {
  it("(1) all four canonical slugs use the shared Insights renderer", async () => {
    for (const part of [1, 2, 3, 4]) {
      const out = await renderPart(part);
      assert.ok(
        out.includes('data-dg-insights-article="v2"'),
        `part ${part} uses the dedicated renderer`,
      );
      assert.ok(out.includes('class="insights-article"'), `part ${part} shell`);
      assert.match(out, new RegExp(`data-part="${part}"`));
    }
  });

  it("(2) resolves correct series metadata; unrelated slugs are untouched", async () => {
    const { digitalgateVisualPageKind, enhanceDigitalgateVisualHtml } = await load();
    assert.equal(digitalgateVisualPageKind("from-signal-to-action"), "insights-part-3");
    assert.equal(digitalgateVisualPageKind("software-that-tells-you-what-needs-doing"), "insights-part-4");
    assert.equal(digitalgateVisualPageKind("pricing"), null);
    const html = `<header class="hero"><h1>Pricing</h1></header><p>x</p>`;
    assert.equal(enhanceDigitalgateVisualHtml(html, "pricing"), html);
  });

  it("(3) renders exactly one H1 per article", async () => {
    for (const part of [1, 2, 3, 4]) {
      const out = await renderPart(part);
      assert.equal(count(out, /<h1\b/gi), 1, `part ${part} has a single H1`);
    }
  });

  it("(4) shows the four-part progression 1–4 with the current chapter active", async () => {
    for (const part of [1, 2, 3, 4]) {
      const out = await renderPart(part);
      assert.match(out, new RegExp(`Part ${part} of 4`), `part ${part} indicator`);
      assert.equal(count(out, /insights-progress-dot/g), 4, `part ${part} four dots`);
      assert.equal(
        count(out, /insights-progress-dot active/g),
        1,
        `part ${part} exactly one active dot`,
      );
      // The active numeric label matches the part.
      assert.match(out, new RegExp(`<span class="active">0${part}</span>`));
    }
  });

  it("(5) provides previous / current / next navigation via real routes", async () => {
    for (const part of [1, 2, 3, 4]) {
      const out = await renderPart(part);
      assert.match(out, new RegExp(`<span class="insights-current">Part ${part}</span>`));
      if (part > 1) assert.ok(out.includes(`href="${ROUTES[part - 1]}"`), `part ${part} prev`);
      if (part < 4) assert.ok(out.includes(`href="${ROUTES[part + 1]}"`), `part ${part} next`);
      if (part === 4) assert.match(out, /insights-complete/, "part 4 resolves the series");
    }
  });

  it("(6) keeps canonical DigitalGate terminology machine-readable in HTML", async () => {
    const p1 = await renderPart(1);
    // Definitions live in HTML (prose/labels), never only inside decorative SVG.
    const proseOnly = p1.split('aria-hidden="true"').join(" ");
    for (const term of ["Digital Twin", "Business Brain", "AI Advisor"]) {
      assert.ok(p1.includes(term), `${term} present`);
    }
    assert.ok(proseOnly.includes("Digital Twin"), "Digital Twin is not SVG-only");
    // Part 2 production copy distinguishes Brain (context layer) from Advisor (reasoning).
    const p2 = await renderPart(2);
    assert.match(p2, /Business Brain/);
    assert.match(p2, /AI Advisor/);
  });

  it("(7)(8) Part 3 governance order: Advisor → Human Authority → Action, no green action before authority", async () => {
    const p3 = await renderPart(3);
    const iAdvise = p3.indexOf("ADVISE");
    const iAuthority = p3.indexOf("HUMAN AUTHORITY");
    const iAct = p3.search(/>ACT</);
    assert.ok(iAdvise >= 0 && iAuthority >= 0 && iAct >= 0, "all three stages present");
    assert.ok(iAdvise < iAuthority, "advise precedes human authority");
    assert.ok(iAuthority < iAct, "human authority precedes action");
    // No green (#34d399/#10b981) authorised-action node appears before the amber
    // Human Authority gate in the static semantic model.
    const beforeAuthority = p3.slice(0, iAuthority);
    assert.ok(
      !/>ACT</.test(beforeAuthority),
      "no ACT node before the human authority gate",
    );
  });

  it("(9)(10) uses one shared token system, no per-part geometry / repair mechanisms", async () => {
    const cssMod = await import(
      pathToFileURL(
        path.join(root, "src/components/websites/digitalgate-visual-storytelling-css.ts"),
      ).href
    );
    const css = cssMod.digitalgateVisualStorytellingCss;
    for (const token of [
      "--insights-prose-max: 760px",
      "--insights-stage-max: 1100px",
      "--insights-gutter-desktop: 48px",
      "--insights-section-gap: 80px",
    ]) {
      assert.ok(css.includes(token), `frozen token present: ${token}`);
    }
    // Rejected repair mechanisms are gone.
    assert.ok(!/\.dgp[1-4]-/.test(css), "no per-part dgpN stage CSS");
    assert.ok(!css.includes("data-dg-stage-of"), "no per-part stage :has() scoping");
    assert.ok(!/insights-part-1"\]\) \.hero/.test(css), "no per-part hero selectors");
    // The renderer output carries no per-part geometry classes.
    for (const part of [1, 2, 3, 4]) {
      const out = await renderPart(part);
      assert.ok(!/dgp[1-4]-|dg-stage--wide|dg-insights-hero/.test(out), `part ${part} clean markup`);
    }
  });

  it("(11) signature diagrams are reduced-motion safe (no SMIL animation)", async () => {
    for (const part of [1, 2, 3, 4]) {
      const out = await renderPart(part);
      assert.ok(!/<animate\b/i.test(out), `part ${part} has no SMIL <animate>`);
      // Decorative SVGs are hidden from assistive tech; figures carry aria-label.
      assert.match(out, /<svg[^>]*aria-hidden="true"/);
      assert.match(out, /role="figure" aria-label=/);
    }
  });

  it("(12) series navigation has no broken links (no href=\"#\")", async () => {
    for (const part of [1, 2, 3, 4]) {
      const out = await renderPart(part);
      assert.ok(!/href="#"/.test(out), `part ${part} has no placeholder links`);
    }
  });

  it("is idempotent — a second render pass is byte-identical", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const once = await renderPart(2);
    assert.equal(enhanceDigitalgateVisualHtml(once, ARTICLES[2].slug), once);
  });
});

describe("DigitalGate Platform Overview visual stages", () => {
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

  it("does not alter Insights presentation when Platform wiring is present", async () => {
    const out = await renderPart(3);
    assert.ok(out.includes('data-dg-insights-article="v2"'));
    assert.ok(!out.includes("dgpov-scene"));
    assert.ok(!out.includes('data-dg-stage-of="platform-overview"'));
  });
});
