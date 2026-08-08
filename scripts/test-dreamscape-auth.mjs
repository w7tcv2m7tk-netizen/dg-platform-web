import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dreamscapeDir = path.join(
  __dirname,
  "../packages/platform-core/src/infrastructure/providers/dreamscape",
);

/**
 * Load auth.ts directly (only depends on node:crypto).
 * @see https://doc-reseller-api.ds.network/
 */
async function loadAuth() {
  return import(pathToFileURL(path.join(dreamscapeDir, "auth.ts")).href);
}

describe("dreamscapeSignature", () => {
  it("matches Dreamscape REST docs example", async () => {
    const { dreamscapeSignature } = await loadAuth();
    const requestId = "7fd755f2390745071051fca4924831cd";
    const apiKey = "202cb962ac59075b964b07152d234b70";
    const expected = "774d61236130b6ae545240613aca2716";
    assert.equal(dreamscapeSignature(requestId, apiKey), expected);
  });
});

describe("buildDreamscapeAuthHeaders", () => {
  it("defaults to official Accept + Api-Request-Id + Api-Signature only", async () => {
    const { buildDreamscapeAuthHeaders, dreamscapeSignature } = await loadAuth();
    const result = buildDreamscapeAuthHeaders(
      "202cb962ac59075b964b07152d234b70",
    );
    assert.deepEqual(
      Object.keys(result.headers).sort(),
      ["Accept", "Api-Request-Id", "Api-Signature"].sort(),
    );
    assert.equal(result.headers.Accept, "application/json");
    assert.equal(result.resellerIdHeadersSent.length, 0);
    assert.equal(
      result.headers["Api-Signature"],
      dreamscapeSignature(
        result.headers["Api-Request-Id"],
        "202cb962ac59075b964b07152d234b70",
      ),
    );
  });

  it("sends Reseller ID headers only when sendResellerId is true", async () => {
    const { buildDreamscapeAuthHeaders } = await loadAuth();
    const result = buildDreamscapeAuthHeaders(
      "202cb962ac59075b964b07152d234b70",
      { sendResellerId: true, resellerId: "25735" },
    );
    assert.equal(result.headers["X-Reseller-Id"], "25735");
    assert.equal(result.headers["Reseller-Id"], "25735");
    assert.equal(result.headers["Api-Reseller-Id"], "25735");
    assert.equal(result.resellerIdHeadersSent.length, 3);
  });

  it("does not send Reseller ID when id present but sendResellerId false", async () => {
    const { buildDreamscapeAuthHeaders } = await loadAuth();
    const result = buildDreamscapeAuthHeaders(
      "202cb962ac59075b964b07152d234b70",
      { sendResellerId: false, resellerId: "25735" },
    );
    assert.equal(result.headers["X-Reseller-Id"], undefined);
    assert.equal(result.resellerIdHeadersSent.length, 0);
  });
});

describe("client.ts policy (source contracts)", () => {
  const clientSrc = readFileSync(path.join(dreamscapeDir, "client.ts"), "utf8");

  it("isDreamscapeConfigured requires only apiKey", () => {
    assert.match(
      clientSrc,
      /export function isDreamscapeConfigured\(\): boolean \{\s*const \{ apiKey \} = resolveDreamscapeConfig\(\);\s*return Boolean\(apiKey\);\s*\}/,
    );
  });

  it("Reseller ID send is gated by DREAMSCAPE_SEND_RESELLER_ID", () => {
    assert.match(clientSrc, /DREAMSCAPE_SEND_RESELLER_ID/);
    assert.match(clientSrc, /function shouldSendDreamscapeResellerId/);
    assert.match(
      clientSrc,
      /if \(sendResellerId && resellerId && !mergedParams\.has\("reseller_id"\)\)/,
    );
  });

  it("availability path matches docs /domains/availability", () => {
    const providerSrc = readFileSync(
      path.join(dreamscapeDir, "domain-provider.ts"),
      "utf8",
    );
    assert.match(providerSrc, /dreamscapeFetch<unknown>\("\/domains\/availability"/);
    assert.match(clientSrc, /domain_names\[\]/);
  });
});
