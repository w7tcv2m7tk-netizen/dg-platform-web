/**
 * Pricing-only Studio sync — pairing gate + architecture lock.
 * Does not open a database or print secrets.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyNeonHost } from "./env-pairing.mjs";
import {
  assertCanonicalPricingArchitecture,
  assertProductionNeonPairing,
  loadCanonicalPricingHtml,
  replacePricingHtmlIsland,
  sha256Short,
} from "./sync-digitalgate-pricing-page.mjs";

const PROD_HOST = "ep-bold-tree-a7bny92m.ap-southeast-2.aws.neon.tech";
const PREVIEW_HOST = "ep-ancient-shape-a71q6o9p.ap-southeast-2.aws.neon.tech";
const DEV_HOST = "ep-round-sunset-a72e5yr8.ap-southeast-2.aws.neon.tech";

function dbUrl(host) {
  return `postgresql://user:secret@${host}/neondb?sslmode=require`;
}

describe("assertProductionNeonPairing", () => {
  it("allows the production allowlist host when DG_NEON_ENV is production", () => {
    const host = assertProductionNeonPairing({
      DATABASE_URL: dbUrl(PROD_HOST),
      DG_NEON_ENV: "production",
    });
    assert.equal(host.class, "production");
    assert.equal(host.endpointId, "ep-bold-tree-a7bny92m");
  });

  it("blocks preview hosts even if DG_NEON_ENV claims production", () => {
    assert.equal(classifyNeonHost(dbUrl(PREVIEW_HOST)).class, "preview");
    assert.throws(
      () =>
        assertProductionNeonPairing({
          DATABASE_URL: dbUrl(PREVIEW_HOST),
          DG_NEON_ENV: "production",
        }),
      /not production|disagrees|class is preview/,
    );
  });

  it("blocks development hosts", () => {
    assert.throws(
      () =>
        assertProductionNeonPairing({
          DATABASE_URL: dbUrl(DEV_HOST),
          DG_NEON_ENV: "development",
        }),
      /must be production/,
    );
  });

  it("blocks missing DATABASE_URL", () => {
    assert.throws(
      () => assertProductionNeonPairing({ DG_NEON_ENV: "production" }),
      /DATABASE_URL missing/,
    );
  });
});

describe("canonical pricing HTML", () => {
  it("matches the agreed architecture without changing prices", () => {
    const html = loadCanonicalPricingHtml();
    assertCanonicalPricingArchitecture(html);
    assert.match(html, /id="ai-communications"/);
    assert.doesNotMatch(html, /data-dg-stripe="addon-voice-ai"/);
    assert.ok(sha256Short(html).length === 12);
  });

  it("refuses HTML that puts AI Communications back in Growth", () => {
    const html = loadCanonicalPricingHtml();
    const broken = html.replace(
      '<details class="individual-growth">',
      '<details class="individual-growth"><div class="dg-app-card">AI Communications</div>',
    );
    assert.throws(
      () => assertCanonicalPricingArchitecture(broken),
      /individual Growth grid/,
    );
  });
});

describe("replacePricingHtmlIsland", () => {
  it("replaces only the html island and leaves other components untouched", () => {
    const html = loadCanonicalPricingHtml();
    const original = [
      { type: "hero", props: { title: "keep" } },
      { type: "html", props: { html: "<p>old</p>" } },
    ];
    const { components, htmlIdx } = replacePricingHtmlIsland(original, html);
    assert.equal(htmlIdx, 1);
    assert.equal(components[0].props.title, "keep");
    assert.equal(components[1].props.html, html);
    assert.equal(original[1].props.html, "<p>old</p>");
  });
});
