/**
 * H-2 regression — every server-to-server endpoint must reach its own auth.
 *
 * Clerk's auth.protect() returns 404 for API requests, so an endpoint missing
 * from the public allowlist never executes its webhook-secret / CRON_SECRET /
 * OAuth-state check. Four integration endpoints were in that state:
 * dg-leads, dg-stay-booking, microsoft-365/callback and cron/billing-dunning.
 *
 * This test also guards the opposite failure: a wildcard broad enough to
 * expose authenticated surface area.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Clerk's createRouteMatcher cannot be imported outside the Next runtime (its
 * server entry pulls in next/navigation), so this mirrors its matching for the
 * pattern shapes we actually use: literal segments plus a trailing/inline
 * "(.*)" wildcard. Any pattern outside that vocabulary fails the shape
 * assertion below rather than being silently mis-approximated.
 */
const SUPPORTED_SHAPE = /^\/(?:[A-Za-z0-9\-_./]|\(\.\*\))*$/;

function toRegExp(pattern) {
  const source = pattern
    .split("(.*)")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("(?:.*)");
  return new RegExp(`^${source}$`);
}

async function publicMatcher() {
  const { PUBLIC_ROUTE_PATTERNS } = await import(
    pathToFileURL(path.join(__dirname, "../src/lib/public-routes.ts")).href
  );

  const unsupported = PUBLIC_ROUTE_PATTERNS.filter(
    (p) => !SUPPORTED_SHAPE.test(p),
  );
  assert.deepEqual(
    unsupported,
    [],
    `unsupported route pattern shape — verify against Clerk before trusting this test: ${unsupported.join(", ")}`,
  );

  const regexes = PUBLIC_ROUTE_PATTERNS.map(toRegExp);
  return (pathname) => regexes.some((re) => re.test(pathname));
}

/** Endpoints that authenticate themselves and must bypass Clerk. */
const MUST_BE_PUBLIC = [
  // Webhooks — signature or shared secret in handler
  "/api/webhooks/stripe",
  "/api/webhooks/clerk",
  "/api/webhooks/dreamscape",
  "/api/webhooks/elevenlabs",
  "/api/webhooks/elevenlabs/tools",
  "/api/webhooks/dg-discovery",
  "/api/webhooks/dg-onboarding-sync",
  "/api/webhooks/dg-leads",
  "/api/webhooks/dg-stay-booking",
  // OAuth callbacks — signed state, no Clerk cookie guaranteed
  "/api/connectors/google/callback",
  "/api/connectors/google-gmail/callback",
  "/api/connectors/linkedin/callback",
  "/api/connectors/domain/callback",
  "/api/connectors/rea/callback",
  "/api/connectors/microsoft-365/callback",
  // Cron — CRON_SECRET in handler
  "/api/cron/lead-followups",
  "/api/cron/pagespeed",
  "/api/cron/ota-ical-sync",
  "/api/cron/scheduled-emails",
  "/api/cron/billing-dunning",
  "/api/cron/property-report-followups",
  // Operator utility — X-API-Key in handler
  "/api/indexnow",
  // Public capture
  "/api/public/website-form",
  "/api/health",
];

/** Authenticated surface that must never be exempted. */
const MUST_BE_PROTECTED = [
  "/api/v1/contacts",
  "/api/v1/command/clients",
  "/api/v1/command/growth/proposals",
  "/api/v1/command/growth/reports",
  "/api/v1/command/growth/prospects/abc/transition",
  "/api/v1/org/create",
  "/api/v1/org/switch",
  "/api/v1/billing/checkout",
  "/api/v1/accommodation",
  "/api/v1/platform/api-keys",
  "/api/connectors/google/connect",
  "/api/connectors/microsoft-365/connect",
  "/dashboard",
  "/apps/crm/contacts",
  "/command/growth-engine/proposals",
];

describe("H-2: middleware public route allowlist", () => {
  it("exempts every endpoint that authenticates itself", async () => {
    const isPublic = await publicMatcher();
    const missing = MUST_BE_PUBLIC.filter((p) => !isPublic(p));
    assert.deepEqual(
      missing,
      [],
      `these endpoints would be blocked by Clerk before their own auth runs: ${missing.join(", ")}`,
    );
  });

  it("does not exempt authenticated surface", async () => {
    const isPublic = await publicMatcher();
    const leaked = MUST_BE_PROTECTED.filter((p) => isPublic(p));
    assert.deepEqual(
      leaked,
      [],
      `these routes are unexpectedly public: ${leaked.join(", ")}`,
    );
  });

  it("keeps webhook exemptions to exact paths, not a subtree wildcard", async () => {
    const isPublic = await publicMatcher();
    // A "/api/webhooks/(.*)" style rule would exempt anything added later.
    assert.equal(isPublic("/api/webhooks/some-future-endpoint"), false);
    assert.equal(isPublic("/api/cron/some-future-job"), false);
  });
});
