/**
 * Routes that must be reachable without a Clerk session.
 *
 * These are server-to-server or public entry points that perform their own
 * verification in the route handler (webhook signature, shared secret,
 * CRON_SECRET, signed OAuth state, or genuinely public capture). Clerk's
 * auth.protect() returns 404 for API requests, so anything omitted here fails
 * before its own auth logic can run.
 *
 * Keep patterns as narrow as possible — prefer an exact path over a wildcard,
 * because every wildcard silently exempts future routes beneath it.
 * scripts/test-middleware-public-routes.mjs asserts this list stays in sync
 * with the handlers that need it.
 */
export const PUBLIC_ROUTE_PATTERNS: string[] = [
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/r/(.*)",
  "/opportunity/(.*)",
  "/sites/(.*)",
  "/founding-customers/(.*)",
  "/founding-resellers/(.*)",
  "/delivery-partners/(.*)",
  "/wantd",
  "/wantd/(.*)",
  "/marketing/preview/(.*)",
  "/api/health(.*)",
  "/api/health/db",
  "/api/onboarding(.*)",
  "/api/v1/platform",
  "/api/v1/addresses/resolve",
  "/api/v1/websites/public/(.*)",
  "/api/public/(.*)",
  // Cron endpoints authenticate with CRON_SECRET in the handler
  // (src/lib/cron-auth.ts). They carry no Clerk session, so Clerk must not
  // intercept them — auth.protect() 404s API requests before the handler runs.
  "/api/cron/property-report-followups",
  "/api/cron/lead-followups",
  "/api/cron/pagespeed",
  "/api/cron/ota-ical-sync",
  "/api/cron/scheduled-emails",
  "/api/cron/billing-dunning",
  "/api/v1/wantd/(.*)",
  "/api/webhooks/stripe",
  "/api/webhooks/elevenlabs",
  "/api/webhooks/elevenlabs/(.*)",
  "/api/webhooks/dreamscape",
  "/api/webhooks/dg-onboarding-sync",
  "/api/webhooks/dg-discovery",
  // Server-to-server WordPress bridges — verify their own shared secret in the
  // handler. Exact paths only, no wildcard.
  "/api/webhooks/dg-leads",
  "/api/webhooks/dg-stay-booking",
  // Operator utility, gated by X-API-Key in the handler.
  "/api/indexnow",
  "/commerce/checkout/(.*)",
  "/api/webhooks/clerk(.*)",
  // OAuth provider returns here without a guaranteed Clerk session cookie —
  // must stay public or protect() → login → /dashboard drops the auth code.
  "/api/connectors/google/callback(.*)",
  "/api/connectors/google-gmail/callback(.*)",
  "/api/connectors/microsoft-365/callback(.*)",
  "/api/connectors/linkedin/callback(.*)",
  "/api/connectors/domain/callback(.*)",
  "/api/connectors/rea/callback(.*)",
];
