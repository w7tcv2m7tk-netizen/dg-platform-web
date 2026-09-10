/**
 * Public-site tab icons must prefer the business profile mark, not DigitalGate.
 * Run: node --experimental-strip-types --test scripts/test-public-site-icons.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { publicSiteIcons } from "../src/lib/brand.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("publicSiteIcons", () => {
  it("uses the business profile icon when provided", () => {
    const icons = publicSiteIcons("wantd", "https://cdn.example/wantd-profile.png");
    assert.ok(icons);
    assert.equal(icons.icon[0]?.url, "https://cdn.example/wantd-profile.png");
    assert.equal(
      icons.icon.some((i) => i.url.includes("favicon.ico")),
      false,
    );
  });

  it("falls back to the Wantd static mark when profile icon is missing", () => {
    const icons = publicSiteIcons("wantd");
    assert.ok(icons);
    assert.ok(icons.icon.some((i) => i.url.includes("wantd-icon") || i.url.includes("wantd-favicon")));
  });
});

describe("public-host favicon rewrite", () => {
  it("rewrites /favicon.ico to the host-aware /icon route", () => {
    const source = readFileSync(
      path.join(__dirname, "../src/middleware.ts"),
      "utf8",
    );
    assert.match(source, /path === "\/favicon\.ico"/);
    assert.match(source, /url\.pathname = "\/icon"/);
  });
});
