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
 * Load auth.ts / soap.ts directly (node:crypto / pure helpers).
 * @see https://doc-reseller-api.ds.network/
 * @see https://soap.secureapi.com.au/wsdl/API-1.3.wsdl
 */
async function loadAuth() {
  return import(pathToFileURL(path.join(dreamscapeDir, "auth.ts")).href);
}

async function loadSoap() {
  return import(pathToFileURL(path.join(dreamscapeDir, "soap.ts")).href);
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

describe("SOAP DomainCheck envelope + parse", () => {
  it("builds Authenticate header with ResellerID + APIKey", async () => {
    const { buildDomainCheckEnvelope } = await loadSoap();
    const xml = buildDomainCheckEnvelope({
      resellerId: "25735",
      apiKey: "202cb962ac59075b964b07152d234b70",
      domains: ["example.com.au", "test.net"],
    });
    assert.match(xml, /<ResellerID[^>]*>25735<\/ResellerID>/);
    assert.match(
      xml,
      /<APIKey[^>]*>202cb962ac59075b964b07152d234b70<\/APIKey>/,
    );
    assert.match(xml, /<ns1:DomainCheck>/);
    assert.match(xml, /example\.com\.au/);
    assert.match(xml, /test\.net/);
    assert.match(xml, /arrayType="xsd:string\[2\]"/);
  });

  it("parses AvailabilityItem rows from SOAP XML", async () => {
    const { parseDomainCheckResponse } = await loadSoap();
    const xml = `
      <APIResponse>
        <AvailabilityList>
          <AvailabilityItem>
            <Item>example.com.au</Item>
            <Available>true</Available>
            <Price>14.95</Price>
            <IsPremium>false</IsPremium>
          </AvailabilityItem>
          <AvailabilityItem>
            <Item>taken.net</Item>
            <Available>false</Available>
          </AvailabilityItem>
        </AvailabilityList>
      </APIResponse>`;
    const rows = parseDomainCheckResponse(xml);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].domain, "example.com.au");
    assert.equal(rows[0].available, true);
    assert.equal(rows[0].price, 14.95);
    assert.equal(rows[0].premium, false);
    assert.equal(rows[1].domain, "taken.net");
    assert.equal(rows[1].available, false);
  });

  it("exports sandbox + prod SOAP endpoints", async () => {
    const soap = await loadSoap();
    assert.equal(
      soap.DREAMSCAPE_SOAP_SANDBOX_ENDPOINT,
      "https://soap-test.secureapi.com.au/API-1.3",
    );
    assert.equal(
      soap.DREAMSCAPE_SOAP_PROD_ENDPOINT,
      "https://soap.secureapi.com.au/server.php?v=1.3",
    );
    assert.equal(
      soap.DREAMSCAPE_SOAP_DOMAIN_CHECK_ACTION,
      "urn:API-1.3#API-1.3Server#DomainCheck",
    );
  });
  it("detects SecureAPI Authenticate Errors as auth failure", async () => {
    const { soapResponseIndicatesAuthFailure, extractSoapFault } =
      await loadSoap();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="https://soap-test.secureapi.com.au/API-1.3">
  <SOAP-ENV:Header>
    <ns1:AuthenticateResponse>
      <return>
        <APIResponse>
          <Errors>
            <item><Item>ResellerID</Item><Message>ResellerID 25735 is invalid</Message></item>
            <item><Item>APIKey</Item><Message>APIKey is invalid</Message></item>
          </Errors>
        </APIResponse>
      </return>
    </ns1:AuthenticateResponse>
  </SOAP-ENV:Header>
</SOAP-ENV:Envelope>`;
    assert.equal(soapResponseIndicatesAuthFailure(xml), true);
    assert.match(extractSoapFault(xml) ?? "", /ResellerID|invalid/i);
  });
});

describe("client.ts policy (source contracts)", () => {
  const clientSrc = readFileSync(path.join(dreamscapeDir, "client.ts"), "utf8");
  const providerSrc = readFileSync(
    path.join(dreamscapeDir, "domain-provider.ts"),
    "utf8",
  );

  it("resolves API mode soap|rest with Reseller ID auto-soap", () => {
    assert.match(clientSrc, /function resolveDreamscapeApiMode/);
    assert.match(clientSrc, /DREAMSCAPE_API_MODE/);
    assert.match(clientSrc, /return "soap"/);
    assert.match(clientSrc, /return "rest"/);
  });

  it("SOAP env resolves via DREAMSCAPE_SOAP_ENV / SOAP_URL / default sandbox", () => {
    assert.match(clientSrc, /function resolveDreamscapeSoapEndpoint/);
    assert.match(clientSrc, /DREAMSCAPE_SOAP_ENV/);
    assert.match(clientSrc, /DREAMSCAPE_SOAP_URL/);
    assert.match(clientSrc, /parseDreamscapeSoapEnv/);
    assert.match(clientSrc, /soapHostFromEndpoint/);
  });

  it("SOAP configured requires apiKey + resellerId", () => {
    assert.match(
      clientSrc,
      /if \(apiMode === "soap"\) return Boolean\(resellerId\)/,
    );
  });

  it("REST path still calls /domains/availability", () => {
    assert.match(
      providerSrc,
      /dreamscapeFetch<unknown>\("\/domains\/availability"/,
    );
    assert.match(providerSrc, /dreamscapeSoapDomainCheck/);
    assert.match(clientSrc, /domain_names\[\]/);
  });

  it("Reseller ID send on REST is gated by DREAMSCAPE_SEND_RESELLER_ID", () => {
    assert.match(clientSrc, /DREAMSCAPE_SEND_RESELLER_ID/);
    assert.match(clientSrc, /function shouldSendDreamscapeResellerId/);
  });
});
