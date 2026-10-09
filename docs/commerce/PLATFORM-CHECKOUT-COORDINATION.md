# Platform subscription checkout coordination

Standard billing, standard onboarding and custom-offer onboarding checkout use
`coordinatePlatformCheckout`. Merchant/Connect commerce checkouts are separate.
The coordinator never writes subscription activation, onboarding activation or
entitlements. Existing verified webhook processing remains the authority.

The checkout entry functions live in `billing/platform-checkout.ts`, marked
`server-only`, and are imported directly by the API routes. They are not runtime
exports of the client-reachable platform-core barrel. Offer parsing and webhook
processing keep their existing modules. After a production build, run
`npm run test:checkout-client-boundary` to verify the actual browser artifacts
exclude coordinator code while the server artifacts contain it.

## Reservation and uniqueness

The additive `20261009_platform_checkout_attempt` migration creates only
`platform_checkout_attempts` and its constraints/indexes. It changes no existing
table data. `Organisation.platformCheckoutAttempts` is a Prisma relation only.

`current_organisation_id` is nullable and unique. Every current attempt contains
its owning organisation ID; retired attempts contain NULL. PostgreSQL checks
enforce matching ownership, the allowed states, and that only EXPIRED rows can
release the current slot. `session_id` and `idempotency_key` are independently
unique. History remains in the table when the current slot is released.

A short transaction locks the organisation row with `FOR UPDATE`, reserves or
loads the current attempt, reads canonical billing IDs and claims a 60-second
lease. Stripe calls happen after the transaction commits. Each write checks the
lease token and owner, fencing workers whose leases have been taken over. An
unexpired lease returns HTTP 409; customers can retry shortly. A crash leaves
the durable request and a lease that another request can reclaim.

## State transitions

| State | Meaning and next action |
| --- | --- |
| PREPARED | Request persisted; no create call has been authorised yet. Reconcile legacy sessions and authoritative subscription IDs before sending. |
| UNCERTAIN | Send marker committed before Stripe I/O. Retry exactly the stored body, API version and key within the replay window. Never replace merely because a call failed. |
| OPEN | Stripe returned an owned open session. Matching commercial terms resume it. Different terms require Stripe-confirmed expiry before replacement. |
| AWAITING_WEBHOOK | Stripe reports completion, including a legacy session. Block new checkout; activation still requires existing webhook processing. |
| EXPIRED | Stripe confirmed expiry, or a fenced PREPARED reservation was provably never sent and became stale/mismatched. Release the current slot and preserve history. |
| RECOVERY_REQUIRED | Outcome remains unknown past the replay window, or a session cannot safely resume. Block automated replacement pending separately authorised investigation. |

Expiry errors, missing sessions, provider failures and database errors do not
release the slot. An open session stays usable on a cancellation return URL.
The coordinator trusts Stripe's session status, not a local expiry clock, to
retire a session that may already have completed. If checkout completes while
expiry is attempted, the current attempt remains blocked.

## Immutable replay and privacy

The commercial fingerprint includes prices/line items, plan/app/support/offer
metadata and trial terms. It normalises unordered app selections and line item
order. Actor email and return URLs do not change the purchase fingerprint.
The full persisted Stripe body is immutable even when a retry supplies another
email, return URL or purchase. An uncertain mismatched purchase must first
recover the original session, then expire it before starting another attempt.

No credentials, Stripe responses, customer details, session URLs or business-name
and contact-email metadata copies are stored. Customer email is retained only
when the existing checkout flow requires it for Stripe customer creation.
Existing customer IDs are retained when available. Checkout return URLs and
the necessary commercial/product labels remain in the request body.

Replay is limited to 23 hours from reservation, conservatively before Stripe's
[minimum 24-hour idempotency retention](https://docs.stripe.com/api/idempotent_requests).
Requests also carry an immutable absolute one-hour `expires_at`; a paused
worker cannot create a fresh valid session days later using an old request.
Once a session ID is known, recovery retrieves that session instead of
recreating it, including after the idempotency window ends.

The stored provider scope includes the Stripe account, test/live mode and the
existing SDK API version (`2025-02-24.acacia`). A changed account/mode/version
blocks replay. No SDK, pricing, plan, trial, tax or entitlement configuration
is changed by this implementation.

## Legacy and authoritative billing checks

On first reservation, snapshot both server-owned
`settings.gen2Onboarding.stripeCheckoutSessionId` and
`settings.billing.lastCheckoutSessionId`. Retrieve and verify ownership of
each. Open legacy sessions lack a trustworthy persisted fingerprint, so expire
them before replacement. Completed legacy sessions wait for webhook confirmation;
missing/unretrievable/foreign sessions block creation. Cancellation returns do
not invalidate any of these sessions.

Canonical subscription IDs are retrieved from Stripe regardless of local
status. The coordinator also lists all subscriptions for current and persisted
Stripe customer IDs, including pagination, to catch activation before webhook
projection. Every status except `canceled` and `incomplete_expired` blocks
creation, including incomplete, paused, unpaid and cancellation-at-period-end.
No fallback from a failed customer lookup to creating a new customer is allowed.

## Rollout boundaries and remaining operational work

Apply the additive migration through a separately approved deployment process
before enabling this code. Do not overlap checkout-producing old application
instances with the new coordinator: legacy writers do not participate in the
new reservation protocol. No production migration or deployment is performed
as part of development.

Restricted Stripe credentials need read permission for account, balance,
customer and subscription checks, plus checkout retrieve/create/expire access.
Verify those permissions in an isolated Stripe sandbox before rollout. The
behavioural suite simulates Stripe; it does not certify real account permissions
or network behaviour.

Unknown outcomes after the replay cutoff and completed historic sessions fail
closed. There is deliberately no automatic unlock or recovery administration
endpoint in this bounded change. Support must investigate Stripe and webhook
evidence through a separately approved procedure; deleting attempts or changing
keys is not a safe recovery action. This conservative policy can block a
returning customer with an old completed session after cancellation, and should
be addressed by a separately reviewed recovery lifecycle before that flow is
enabled. Legacy sessions not recorded by either existing server-owned field
cannot be discovered when there is no known Stripe customer ID.

## Verification

Run `npm run test:checkout-coordinator-db -- /absolute/path/to/postgresql/bin`.
The runner clears inherited database/Stripe settings, owns a fresh localhost
cluster on a random non-default port, materialises the pinned PR #1001 schema,
applies the exact new SQL, checks Prisma schema parity, and runs behavioural
tests. The suite verifies a cluster nonce before any mutation. It destroys the
cluster and writes `dg-checkout-db-evidence.json` in the operating system's temp
directory. No existing database or real Stripe objects are used.

Development verification on 2026-10-09:

- Standard `npx next build`: exit 0, completed route summary. Existing Prisma
  CommonJS export, file-tracing, middleware and cache-header warnings remain.
- Generated browser/server artifact boundary: 1 passing test. Initial inspection
  caught coordinator code in browser chunks; the server-only checkout extraction
  removed it. No unrelated client components were changed.
- Disposable PostgreSQL: 24 passing behavioural tests; exact migration applied;
  Prisma schema parity reported no difference; cluster stopped and destroyed.
- Security certification: 46 passing tests after the final build.
- Full `npm run prebuild` regression pipeline: exit 0 after the final build,
  including checkout, onboarding, billing, pricing and entitlement regressions.
- TypeScript: `npx tsc --noEmit` exit 0. Focused lint on every changed TS/JS file:
  exit 0. Repository-wide lint retains 144 errors and 149 warnings in unchanged
  files; none are in the changed files.
- Webpack fallback: failed on existing client barrel paths from
  `DocumentBrandMark.tsx` to API-key, SSRF and document-ingestion Node modules.
  Those paths exist unchanged in the PR #1001 baseline. The standard Turbopack
  build is the verified production-build result; no checks were disabled.

Build and regression logs are retained locally under `/private/tmp/dg-checkout-*`.
