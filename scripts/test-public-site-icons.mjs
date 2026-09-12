/**
 * Public-site tab icons must prefer the business profile mark, not DigitalGate.
 * Run: node --experimental-strip-types --test scripts/test-public-site-icons.mjs
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { publicSiteIcons } from "../src/lib/brand.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("publicSiteIcons", () => {
  it("leads with host-aware /icon so Add to Dock does not pick DigitalGate favicon.ico", () => {
    const icons = publicSiteIcons("wantd", "https://cdn.example/wantd-profile.png");
    assert.ok(icons);
    assert.equal(icons.icon[0]?.url, "/icon");
    assert.equal(icons.icon[0]?.sizes, "512x512");
    assert.ok(icons.icon.some((i) => i.url === "https://cdn.example/wantd-profile.png"));
    assert.ok(icons.apple.some((i) => i.url === "/apple-icon" && i.sizes === "180x180"));
    assert.equal(
      icons.icon.some((i) => i.url.includes("favicon.ico")),
      false,
    );
  });

  it("falls back to the Wantd static mark when profile icon is missing", () => {
    const icons = publicSiteIcons("wantd");
    assert.ok(icons);
    assert.equal(icons.icon[0]?.url, "/icon");
    assert.ok(icons.icon.some((i) => i.url.includes("wantd-icon") || i.url.includes("wantd-favicon")));
    assert.ok(icons.apple.some((i) => i.url === "/apple-icon"));
  });
});

describe("public page Apple web-app title", () => {
  it("overrides the DigitalGate apple-mobile-web-app-title on public sites", () => {
    const source = readFileSync(
      path.join(__dirname, "../src/lib/public-website-seo.ts"),
      "utf8",
    );
    assert.match(source, /appleWebApp:\s*\{/);
    assert.match(source, /title:\s*input\.siteName/);
  });
});

describe("public-host favicon rewrite", () => {
  it("does not ship a static DigitalGate app/favicon.ico", () => {
    assert.equal(
      existsSync(path.join(__dirname, "../src/app/favicon.ico")),
      false,
      "src/app/favicon.ico is served at the Vercel edge and skips middleware",
    );
  });

  it("rewrites /favicon.ico to the host-aware /icon route on every host", () => {
    const source = readFileSync(
      path.join(__dirname, "../src/middleware.ts"),
      "utf8",
    );
    assert.match(source, /path === "\/favicon\.ico"/);
    assert.match(source, /url\.pathname = "\/icon"/);
    assert.match(source, /"\/favicon\.ico"/);
  });

  it("also rewrites /favicon.ico in next.config so the matcher cannot skip it", () => {
    const source = readFileSync(
      path.join(__dirname, "../next.config.ts"),
      "utf8",
    );
    assert.match(source, /source:\s*"\/favicon\.ico"/);
    assert.match(source, /destination:\s*"\/icon"/);
  });
});
