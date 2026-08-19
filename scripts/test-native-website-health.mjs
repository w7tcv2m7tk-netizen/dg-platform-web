import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function load() {
  return import(
    pathToFileURL(
      path.join(
        __dirname,
        "../packages/platform-core/src/websites/native-health.ts",
      ),
    ).href
  );
}

function site(overrides = {}) {
  return {
    id: "site-1",
    organisationId: "org-1",
    name: "DigitalGate Website",
    slug: "digitalgate",
    status: "published",
    brief: null,
    theme: null,
    seo: {
      title: "DigitalGate",
      description: "Platform",
    },
    metadata: { customHostname: "digitalgate.com.au" },
    publishedAt: "2026-08-16T00:00:00.000Z",
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-18T16:04:21.000Z",
    pages: [
      {
        id: "p1",
        websiteId: "site-1",
        title: "Contact",
        slug: "contact",
        intent: "contact",
        status: "published",
        sortOrder: 1,
        seo: { title: "Contact", description: "Get in touch" },
        components: [
          {
            id: "c1",
            type: "html",
            props: { html: '<form id="dgContactForm"><input name="email"></form>' },
          },
        ],
        createdAt: "2026-08-14T00:00:00.000Z",
        updatedAt: "2026-08-18T16:04:21.000Z",
      },
    ],
    ...overrides,
  };
}

describe("buildNativeWebsiteHealth", () => {
  it("passes Form → CRM for public HTML forms", async () => {
    const { buildNativeWebsiteHealth } = await load();
    const snapshot = buildNativeWebsiteHealth({
      website: site(),
      domain: {
        name: "digitalgate.com.au",
        sslState: "active",
        dnsConfiguredAt: "2026-08-16T14:07:35.203Z",
        aliases: ["digitalgate.com.au", "digitalgate.co.nz"],
      },
    });
    const form = snapshot.checks.find((c) => c.id === "form_crm");
    const custom = snapshot.checks.find((c) => c.id === "custom_domain");
    const ssl = snapshot.checks.find((c) => c.id === "ssl");
    assert.equal(form?.status, "pass");
    assert.match(form?.detail ?? "", /HTML form/i);
    assert.match(custom?.detail ?? "", /digitalgate\.com\.au/);
    assert.match(custom?.detail ?? "", /digitalgate\.co\.nz/);
    assert.equal(ssl?.status, "pass");
    assert.equal(snapshot.fail, 0);
  });

  it("passes Form → CRM and DNS for product funnel capture with live SSL", async () => {
    const { buildNativeWebsiteHealth } = await load();
    const snapshot = buildNativeWebsiteHealth({
      website: site({
        name: "DigitalGate — Free Digital Business Audit™",
        slug: "digitalgate-audit",
        metadata: {
          kind: "funnel",
          capturePath: "gen2_public_business_audit",
          funnelTemplate: "business_audit",
        },
        pages: [
          {
            id: "home",
            websiteId: "site-1",
            title: "Home",
            slug: "home",
            intent: "home",
            status: "published",
            sortOrder: 0,
            seo: { title: "Audit", description: "Free audit" },
            components: [],
            createdAt: "2026-08-17T00:00:00.000Z",
            updatedAt: "2026-08-17T01:45:19.000Z",
          },
        ],
      }),
      domain: {
        name: "audit.digitalgate.com.au",
        status: "connected",
        sslState: "active",
        dnsConfiguredAt: null,
      },
    });
    assert.equal(snapshot.checks.find((c) => c.id === "form_crm")?.status, "pass");
    assert.equal(snapshot.checks.find((c) => c.id === "dns")?.status, "pass");
    assert.equal(snapshot.checks.find((c) => c.id === "ssl")?.status, "pass");
    assert.equal(snapshot.fail, 0);
  });
});
