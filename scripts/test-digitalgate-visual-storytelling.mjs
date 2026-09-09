/**
 * DigitalGate Insights — Website Studio is the source of truth (WYSIWYG).
 *
 * The four Insights article pages render their Website Studio HTML live and
 * UNMODIFIED: whatever HTML is pasted into Studio is reflected verbatim, with no
 * render-time re-composition, content stripping, or injected visuals. These
 * tests lock that contract so the pages never silently transform pasted content.
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

/** Real Website Studio source files (content authority) for each chapter. */
const ARTICLES = {
  1: { file: "from-dumb-businesses-to-smart-businesses", slug: "from-dumb-businesses-to-smart-businesses" },
  2: { file: "intelligent-business-more-than-a-brain", slug: "intelligent-business-more-than-a-brain" },
  3: { file: "from-signal-to-action", slug: "from-signal-to-action" },
  4: { file: "software-that-tells-you-what-needs-doing", slug: "business-software-should-tell-you-what-needs-doing" },
};

function readArticle(part) {
  return fs.readFileSync(
    path.join(root, `marketing/pages/${ARTICLES[part].file}.html`),
    "utf8",
  );
}

describe("DigitalGate Insights — Website Studio is the source of truth (WYSIWYG)", () => {
  it("(1) resolves the four Insights slugs; unrelated slugs are null", async () => {
    const { digitalgateVisualPageKind } = await load();
    assert.equal(digitalgateVisualPageKind("from-dumb-businesses-to-smart-businesses"), "insights-part-1");
    assert.equal(digitalgateVisualPageKind("intelligent-business-more-than-a-brain"), "insights-part-2");
    assert.equal(digitalgateVisualPageKind("from-signal-to-action"), "insights-part-3");
    assert.equal(digitalgateVisualPageKind("software-that-tells-you-what-needs-doing"), "insights-part-4");
    assert.equal(digitalgateVisualPageKind("business-software-should-tell-you-what-needs-doing"), "insights-part-4");
    assert.equal(digitalgateVisualPageKind("pricing"), null);
  });

  it("(2) each Insights page renders its Studio HTML verbatim (WYSIWYG)", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    for (const part of [1, 2, 3, 4]) {
      const html = readArticle(part);
      assert.equal(
        enhanceDigitalgateVisualHtml(html, ARTICLES[part].slug),
        html,
        `part ${part} is returned unmodified`,
      );
    }
  });

  it("(3) does NOT inject the retired renderer shell / signature diagrams", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    for (const part of [1, 2, 3, 4]) {
      const html = readArticle(part);
      const out = enhanceDigitalgateVisualHtml(html, ARTICLES[part].slug);
      // Nothing the old renderer used to add may appear unless the pasted source
      // already contained it.
      for (const marker of [
        "data-dg-insights-article",
        'class="insights-article"',
        "insights-progress-dot",
        "insights-figure-stage",
        "insights-definitions",
      ]) {
        assert.equal(
          out.includes(marker),
          html.includes(marker),
          `part ${part}: renderer must not inject ${marker}`,
        );
      }
    }
  });

  it("(4) arbitrary pasted HTML — custom markup, diagrams, styles — is reflected live", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const pasted = [
      '<header class="hero"><h1>Brand new headline</h1></header>',
      "<style>.my-diagram{color:#0ff}</style>",
      '<section class="my-custom-section">',
      '  <svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>',
      '  <div class="my-diagram" data-x="1">Pasted diagram</div>',
      '  <p style="font-size:22px">Pasted paragraph with <a href="/x">a link</a>.</p>',
      "</section>",
    ].join("\n");
    for (const part of [1, 2, 3, 4]) {
      const out = enhanceDigitalgateVisualHtml(pasted, ARTICLES[part].slug);
      assert.equal(out, pasted, `part ${part} reflects pasted HTML verbatim`);
      for (const frag of [
        "Brand new headline",
        "my-custom-section",
        "my-diagram",
        "Pasted diagram",
        "<svg",
        "<style>",
        'href="/x"',
        'style="font-size:22px"',
      ]) {
        assert.ok(out.includes(frag), `part ${part} preserves ${frag}`);
      }
    }
  });

  it("(5) idempotent — a second pass is byte-identical", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    for (const part of [1, 2, 3, 4]) {
      const once = enhanceDigitalgateVisualHtml(readArticle(part), ARTICLES[part].slug);
      const twice = enhanceDigitalgateVisualHtml(once, ARTICLES[part].slug);
      assert.equal(twice, once, `part ${part} stable`);
    }
  });

  it("(6) unrelated slugs and empty input pass through unchanged", async () => {
    const { enhanceDigitalgateVisualHtml } = await load();
    const html = `<header class="hero"><h1>Pricing</h1></header><p>x</p>`;
    assert.equal(enhanceDigitalgateVisualHtml(html, "pricing"), html);
    assert.equal(enhanceDigitalgateVisualHtml("", "from-signal-to-action"), "");
  });
});
