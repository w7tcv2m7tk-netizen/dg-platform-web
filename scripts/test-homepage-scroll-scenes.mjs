/**
 * Homepage flagship scroll scenes — structural guarantees.
 * Does not require Neon / Website Studio.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const homepage = readFileSync(path.join(root, "marketing/pages/homepage.html"), "utf8");

describe("DigitalGate homepage scroll scenes", () => {
  it("exposes exactly three signature data-dg-scene tracks", () => {
    const ids = [...homepage.matchAll(/data-dg-scene="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(ids)].sort(), [
      "architecture-product",
      "gateway-formation",
      "governed-action",
    ]);
  });

  it("keeps approved hero copy and OPEN gateway", () => {
    assert.match(homepage, /AI-Powered Business Operating Platform/);
    assert.match(homepage, /The Gateway to Your Digital World/);
    assert.match(
      homepage,
      /One intelligent platform for running, understanding and growing your business\./,
    );
    assert.match(
      homepage,
      /Connect your customers, operations, digital presence, AI and automation in one Business Operating Platform\./,
    );
    assert.match(homepage, /OPEN GATEWAY/);
    assert.match(homepage, /dg-hp-gateway/);
  });

  it("defines the 14 DigitalGate Apps as one family", () => {
    for (const id of [
      "crm",
      "websites",
      "brain",
      "advisor",
      "automation",
      "seo",
      "ai-visibility",
      "marketing",
      "reporting",
      "communications",
      "property",
      "accommodation",
      "finance",
      "services",
    ]) {
      assert.match(homepage, new RegExp(`id="dg-app-${id}"`));
    }
    assert.match(homepage, /id="dg-app-family"/);
  });

  it("uses exact intelligence terminology in crawlable HTML", () => {
    assert.match(homepage, /<dt>DigitalGate<\/dt>/);
    assert.match(homepage, /<dt>Digital Twin<\/dt>/);
    assert.match(homepage, /<dt>Business Brain<\/dt>/);
    assert.match(homepage, /<dt>AI Advisor<\/dt>/);
    assert.match(homepage, /<dt>Automation<\/dt>/);
    assert.match(homepage, /<dt>AI Visibility<\/dt>/);
    assert.ok(!/anatomical brain|human body organ/i.test(homepage));
  });

  it("includes reduced-motion settled states and real product assets", () => {
    assert.match(homepage, /prefers-reduced-motion:\s*reduce/);
    for (const shot of [
      "dashboard-overview.png",
      "crm-contacts.png",
      "ai-assistant.png",
      "website-health.png",
      "vendor-pipeline.png",
      "ai-visibility.png",
    ]) {
      assert.match(homepage, new RegExp(`/marketing/screenshots/${shot}`));
    }
  });

  it("wires progress CSS variable and mobile step mode", () => {
    assert.match(homepage, /--dg-scene-p/);
    assert.match(homepage, /data-dg-scene-mobile="step"/);
  });

  it("does not alter Insights visual storytelling behaviour", async () => {
    const mod = await import(
      pathToFileURL(path.join(root, "src/lib/digitalgate-visual-storytelling.ts")).href
    );
    assert.equal(mod.digitalgateVisualPageKind("pricing"), null);
    assert.equal(
      mod.digitalgateVisualPageKind("from-dumb-businesses-to-smart-businesses"),
      "insights-part-1",
    );
  });
});
