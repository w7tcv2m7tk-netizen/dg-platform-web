import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function load() {
  return import(
    pathToFileURL(path.join(__dirname, "../src/lib/public-host-slugs.ts")).href
  );
}

describe("knownSlugForPublicHost", () => {
  it("maps DigitalGate apex hosts to the published website slug", async () => {
    const { knownSlugForPublicHost } = await load();
    assert.equal(knownSlugForPublicHost("digitalgate.com.au"), "digitalgate");
    assert.equal(knownSlugForPublicHost("www.digitalgate.com.au"), "digitalgate");
    assert.equal(knownSlugForPublicHost("DIGITALGATE.COM.AU:443"), "digitalgate");
    assert.equal(
      knownSlugForPublicHost("audit.digitalgate.com.au"),
      "digitalgate-audit",
    );
  });

  it("maps Wantd hosts to the published website slug", async () => {
    const { knownSlugForPublicHost } = await load();
    assert.equal(knownSlugForPublicHost("wantd.co.nz"), "wantd");
    assert.equal(knownSlugForPublicHost("www.wantd.co.nz"), "wantd");
    assert.equal(knownSlugForPublicHost("wantdproperty.com.au"), "wantd");
  });

  it("returns null for unknown hosts so DB lookup can run", async () => {
    const { knownSlugForPublicHost } = await load();
    assert.equal(knownSlugForPublicHost("example.com"), null);
    assert.equal(knownSlugForPublicHost(""), null);
  });
});
