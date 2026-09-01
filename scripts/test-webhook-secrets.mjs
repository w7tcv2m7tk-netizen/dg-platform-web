/**
 * H-1 regression.
 *
 * The WordPress bridges accepted any of up to five environment secrets
 * (including the general-purpose DG_API_KEY) with a non-constant-time compare,
 * and took organisationId straight from the request body — so one low-value
 * credential could write leads, bookings and prospects into any tenant.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadWebhookAuth = () =>
  import(pathToFileURL(path.join(__dirname, "../src/lib/webhook-auth.ts")).href);

const TENANT_A = "org_tenant_a";
const TENANT_B = "org_tenant_b";

function request(headers = {}) {
  return new Request("https://app.digitalgate.com.au/api/webhooks/dg-leads", {
    headers,
  });
}

const SAVED = {};
const KEYS = [
  "DG_LEADS_WEBHOOK_SECRET",
  "DG_WP_CONNECTOR_API_KEY",
  "DG_API_KEY",
  "DG_LEADS_WEBHOOK_ORG_IDS",
];

beforeEach(() => {
  for (const k of KEYS) {
    SAVED[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (SAVED[k] === undefined) delete process.env[k];
    else process.env[k] = SAVED[k];
  }
});

describe("H-1: webhook secret verification", () => {
  it("fails closed when no secret is configured", async () => {
    const { verifyWebhookSecret } = await loadWebhookAuth();
    const result = verifyWebhookSecret(
      request({ "x-dg-webhook-secret": "anything" }),
      ["DG_LEADS_WEBHOOK_SECRET"],
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "not_configured");
  });

  it("does not accept the general-purpose DG_API_KEY", async () => {
    process.env.DG_API_KEY = "general-purpose-key";
    process.env.DG_LEADS_WEBHOOK_SECRET = "dedicated-leads-secret";
    const { verifyWebhookSecret } = await loadWebhookAuth();

    assert.equal(
      verifyWebhookSecret(request({ "x-dg-webhook-secret": "general-purpose-key" }), [
        "DG_LEADS_WEBHOOK_SECRET",
      ]).ok,
      false,
    );
    assert.equal(
      verifyWebhookSecret(
        request({ "x-dg-webhook-secret": "dedicated-leads-secret" }),
        ["DG_LEADS_WEBHOOK_SECRET"],
      ).ok,
      true,
    );
  });

  it("rejects a wrong secret and a prefix of the right one", async () => {
    process.env.DG_LEADS_WEBHOOK_SECRET = "dedicated-leads-secret";
    const { verifyWebhookSecret } = await loadWebhookAuth();

    assert.equal(
      verifyWebhookSecret(request({ "x-dg-webhook-secret": "nope" }), [
        "DG_LEADS_WEBHOOK_SECRET",
      ]).ok,
      false,
    );
    assert.equal(
      verifyWebhookSecret(request({ "x-dg-webhook-secret": "dedicated" }), [
        "DG_LEADS_WEBHOOK_SECRET",
      ]).ok,
      false,
    );
    assert.equal(
      verifyWebhookSecret(request(), ["DG_LEADS_WEBHOOK_SECRET"]).ok,
      false,
    );
  });
});

describe("H-1: webhook organisation targeting", () => {
  it("uses the server-resolved organisation when the body omits one", async () => {
    const { resolveWebhookOrganisation } = await loadWebhookAuth();
    const result = resolveWebhookOrganisation({ resolved: TENANT_A });
    assert.deepEqual(result, { ok: true, organisationId: TENANT_A });
  });

  it("refuses a body organisationId the credential is not scoped to", async () => {
    const { resolveWebhookOrganisation } = await loadWebhookAuth();

    const result = resolveWebhookOrganisation({
      requested: TENANT_B,
      resolved: TENANT_A,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "forbidden");
  });

  it("accepts a body organisationId that confirms the server answer", async () => {
    const { resolveWebhookOrganisation } = await loadWebhookAuth();
    assert.deepEqual(
      resolveWebhookOrganisation({ requested: TENANT_A, resolved: TENANT_A }),
      { ok: true, organisationId: TENANT_A },
    );
  });

  it("honours an explicit multi-tenant allowlist for the credential", async () => {
    const { resolveWebhookOrganisation } = await loadWebhookAuth();
    assert.deepEqual(
      resolveWebhookOrganisation({
        requested: TENANT_B,
        resolved: TENANT_A,
        allowed: [TENANT_B],
      }),
      { ok: true, organisationId: TENANT_B },
    );
  });

  it("fails when nothing resolves", async () => {
    const { resolveWebhookOrganisation } = await loadWebhookAuth();
    const result = resolveWebhookOrganisation({});
    assert.equal(result.ok, false);
    assert.equal(result.code, "unresolved");
  });
});
