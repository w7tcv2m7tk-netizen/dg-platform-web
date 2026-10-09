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
| AWAITING_WEBHOOK | Stripe reports completion, including a legacy session. Reconcile on retry; block until exact webhook and terminal provider evidence permits retirement. Activation still requires webhook processing. |
| EXPIRED | Stripe confirmed expiry, explicitly rejected the initial send for expiry, or a fenced PREPARED reservation was provably never sent and became stale/mismatched. Release the current slot and preserve history. |
| RECOVERY_REQUIRED | Outcome remains unknown past the replay window, or a session cannot safely resume. Block automated replacement pending separately authorised investigation. |

Missing sessions, uncertain expiry outcomes, provider failures and database errors
do not release the slot. A provider expiry rejection of an uncertain replay retains
the slot as RECOVERY_REQUIRED; it cannot prove the earlier send failed. An open session stays usable on a cancellation return URL.
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
before enabling this code, with the compatibility gate migration installed first. Do not overlap checkout-producing old application
instances with the new coordinator: legacy writers do not participate in the
new reservation protocol. No production migration or deployment is performed
as part of development.

Restricted Stripe credentials need read permission for account, balance,
customer and subscription checks, plus checkout retrieve/create/expire access.
Verify those permissions in an isolated Stripe sandbox before rollout. The
behavioural suite simulates Stripe; it does not certify real account permissions
or network behaviour.

Unknown outcomes after the replay cutoff and unconfirmed completed historic
sessions fail closed. A completed session can retire only when its exact
subscription is terminal in the original Stripe mode, ownership matches, and
the canonical subscription and checkout webhook event confirm that purchase.
Retirement uses the existing fenced EXPIRED state and keeps the session/key
history with reason `completed_subscription_terminal`; it does not claim that
Stripe expired a completed session. Recorded retirement remains evidence for
older legacy pointers after a later purchase updates the canonical row, while
provider terminal status and ownership are checked again. Customer subscription
inventory still blocks live subscriptions, and every replacement requires gate
admission. The coordinator never grants entitlements.

There is no administrative unlock endpoint. Unconfirmed records require a
separately approved recovery procedure; deleting attempts or changing keys is
not safe. Legacy sessions absent from both server-owned fields cannot be
discovered without a known Stripe customer ID.

## Verification

Run `npm run test:checkout-coordinator-db -- /absolute/path/to/postgresql/bin`.
The runner clears inherited database/Stripe settings, owns a fresh localhost
cluster on a random non-default port, materialises the pinned PR #1001 schema,
applies the exact new SQL, checks Prisma schema parity, and runs behavioural
tests. The suite verifies a cluster nonce before any mutation. It destroys the
cluster and writes `dg-checkout-db-evidence.json` in the operating system's temp
directory. No existing database or real Stripe objects are used.

Original coordinator verification before gate integration on 2026-10-09:

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


## Durable creation gate integration (#1008)

This branch integrates corrected #1008 commit
`1d010d151fb5c54aeccdf4c479227f44d006969f` without changing that PR.
Both original additive SQL migrations are retained byte-for-byte. The gate seeds
closed. There are no changes to Vercel configuration, Stripe settings, production
migrations, customer data or entitlement activation.

Every initial create and explicit replay updates the singleton admission row in
the same transaction as the fenced send marker. A denied admission rolls back that
marker. The gate records `GREATEST(last_admission_expires_at, stored expires_at)`:
the original coordinator one-hour expiry is covered, never replaced by #1008's
shorter 35-minute default permit. Closure serializes with admission. Already admitted
workers can finish, so operators must drain through the recorded horizon plus the
operational safety margin and verify Stripe statuses. Replay admission never
refreshes expiry or key. Known session retrieval/resumption stays available while
closed; completion still waits for webhook authority.

Stripe accepts a new session only with at least 30 minutes of expiry remaining.
A provably unused PREPARED reservation with insufficient time can be retired before
sending. A confirmed initial provider expiry rejection retires the failed attempt
and returns safe 503 without an automatic replacement. A prior uncertain attempt
receiving an expiry rejection enters RECOVERY_REQUIRED and blocks replacement.
Other lost/failed responses remain UNCERTAIN with their stored key/body. These
failures disclose no raw provider details through checkout routes.

Release sequence: isolate all ungated legacy Vercel deployments and drain old
execution; install/register the compatibility gate migration closed; stage compatible
code closed, wait past the recorded horizon and reconcile Stripe inventory; approve
and apply/register the attempt migration; stage the integrated artifact closed;
verify the integrated artifact is the sole reachable checkout producer, webhook
continuity, schema parity and real restricted-key sandbox permissions; then obtain
separate approval for controlled reopening and monitoring. Retain both migrations,
admission horizons and attempt history on rollback. See
[the detailed rollout](CHECKOUT-COMPATIBILITY-ROLLOUT.md).

Integrated local validation: 48 focused tests, 34 coordinator PostgreSQL tests,
30 compatibility PostgreSQL tests, 46 security tests, full prebuild and TypeScript
passed. Both disposable clusters applied both exact SQL migrations, matched Prisma,
and were stopped and destroyed. Production readiness remains HOLD pending the
operational evidence above. Build, lint and artifact results are recorded with the
final integration evidence in the rollout document.

Final integrated production build and both generated browser/server boundary checks
passed. Final TypeScript and focused ESLint passed without warnings. Full repository
lint retains the baseline 144 errors / 149 warnings in unchanged files. Code is
ready for independent merge review; production deployment and checkout reopening
remain HOLD. No PR merge or deployment was performed.
