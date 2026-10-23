# Stripe cutover — PR #1025

## VERIFIED — implementation, not Production execution

Raw body signature verification precedes ownership classification. Platform
customer/subscription mappings corroborate signed metadata; conflicting identities
and unresolved platform ownership fail closed before receipt claiming. Legacy
customer-only invoice mappings and corroborated Checkout email fallback are covered.
Explicit commerce markers cannot override canonical ownership. Shared customers
require a corroborated distinct commerce subscription. Connected-account events
remain isolated from platform provisioning.

Guarded Stripe event coverage:
- `checkout.session.completed`, `checkout.session.async_payment_succeeded`:
  `checkout.completed`, including sessions created before hold activation.
- `customer.subscription.created`, `.updated`, `.deleted`:
  `subscription.created`, `.updated`, `.cancelled`.
- `customer.subscription.paused`, `.resumed`: `subscription.updated`.
- `invoice.payment_failed`, `invoice.payment_action_required`, `invoice.paid`:
  corresponding invoice failure/action/recovery paths.
Unhandled subscription events cannot reach a platform mutation handler. Confirmed
non-platform commerce follows its separate handler; uncertain ownership retries.

PostgreSQL FOR SHARE on the singleton and insert/reclaim share one transaction.
Operator UPDATE conflicts, so a claim cannot overtake committed activation.
Handlers execute after commit. Held events return 503/Retry-After, no receipt.
Duplicate/stale claims retain existing semantics. Receipt exhaustion is not success:
failed/poison events require operator recovery even if HTTP acknowledgment stops retries.

## NOT VERIFIED — serving topology and old invocation termination

Project Fluid Compute/default 300 seconds was operator-observed historically.
This is not proof of deployment-specific hard limits. Source does not override
webhook maxDuration. Confirm effective limits for old AND new deployed functions,
including any overrides and aliases. Receipt age, stale threshold, missing logs or
an empty drain do not prove old invocations ended.

## REQUIRES OWNER APPROVAL — exact staged sequence

1. Recheck database preflight/recovery, checkout blocked and hold false. Confirm
   guard merged on main 8b01687f is actually serving or approve a guard-only
   deployment from the reviewed main source. Do not deploy full #1025 first:
   its entitlement gates become active when it serves, not through a feature flag.
2. Verify all Production aliases and Stripe's exact endpoint route to guard-capable
   source; prevent alternate old URLs receiving relevant deliveries. Compare
   immutable deployment/source metadata; do not equate Git merge with deployment.
3. Capture provider invocation IDs/start/end or expiry evidence for every pre-guard
   execution across instances. Verify no old deployment receives new deliveries.
   After the last old invocation is proven terminal, wait at least one additional
   VERIFIED maximum runtime. If evidence incomplete, STOP; obtain provider/operator
   evidence rather than substitute a fixed sleep.
4. Owner separately approves hold activation. Use private authenticated DB tooling,
   a short transaction with local timeouts and compare-and-set expected gate
   revision; UPDATE the singleton only. Capture affected row/state/revision. No
   customer API or environment bypass can activate it. Checkout remains blocked.
   Exact proposed command (private libpq environment; revision must be freshly
   reviewed, not guessed):

```sh
psql -X -v ON_ERROR_STOP=1 -v expected_revision=0 \
  -f docs/commerce/release-1025/hold-activate-approved.sql
```

   This proposed write is NOT authorised by this package. The SQL requires blocked
   checkout, false hold and exact revision; zero affected rows aborts/rolls back.
   Lock timeout/connection interruption => STOP; inspect outcome read-only before
   any retry. Do not automatically execute the release script as a recovery action.
5. While held, run read-only drain using secure operator connection injection:

```sh
node --conditions=react-server --experimental-strip-types \
  --import ./scripts/register-ts-resolver.mjs \
  scripts/report-platform-subscription-webhook-drain.mjs
```

   Require zero active claimed handlers across all seven normalized event classes;
   preserve legacy null-claimedAt rows as separate historical evidence. Failed and
   stale receipts require explicit resolution/replay tracking. Never mark them
   complete merely because they are old. Require old-invocation proof separately.
6. Separately approve live endpoint event additions listed above. Confirm existing
   selection first, preserve unrelated selections and signing secret; do not edit
   the WordPress endpoint. Confirm it cannot write canonical DigitalGate billing
   state or obtain exact owner confirmation before relying on isolation. Additions
   can deliver immediate failures/recoveries, hence only after guard/hold/drain.
7. Run production legacy reconciliation DRY-RUN (separate provider-read approval):

```sh
node --conditions=react-server --experimental-strip-types \
  --import ./scripts/register-ts-resolver.mjs \
  scripts/reconcile-legacy-app-entitlements-production.mjs \
  --report=/private/operator/unique-dry-run.json
```

   Inject required target/account/live read credentials privately. Validate line
   items, account/mode/customer/organisation/status/currency/interval/catalogue.
   No profile selections are purchase evidence. Exemptions must be unchanged.
   Review signed-plan evidence, approve exact plan with separate Ed25519 approval.
   Only separately authorised application may add `--apply` and
   `--approval=/private/operator/approved-plan.json`. Approval binds target,
   evidence hash and expiry; compare-and-set conflict => STOP and new plan.
8. Require every legitimate paid legacy purchase reconciled or explicitly resolved
   BEFORE deploying #1025. Empty arrays deny access; no runtime toggle protects
   customers after full deployment. Then separately approve merge/deployment of
   the combined reviewed head, preserving coordinator + guard + projection/gates.
9. While hold remains active, verify routing, operator access and read-only checks.
   Run a fresh reconciliation dry-run for concurrent changes/catch-up; new writes
   always need a new signature. Confirm no blocked unresolved paid customer.
10. Separately approve hold release, verify false on shared DB, then verify actual
    Stripe automatic retries/manual replay delivery, processed receipts and latest
    canonical state. Exact release command requires a fresh reviewed held revision
    (1 only if activation was the sole revision change):

```sh
psql -X -v ON_ERROR_STOP=1 -v expected_revision=1 \
  -f docs/commerce/release-1025/hold-release-approved.sql
```

    Separately approved only; never paste both commands as an unattended batch.
    Manually replay exhausted events only under separate approval;
    account for idempotency, stale claims and out-of-order provider updates.
11. Fresh post-release dry-run sweep detects catch-up candidates; do not apply
    with old approval. Monitor invoice/dunning/recovery and cross-tenant failures.
12. Only after smoke/acceptance sign-off approve checkout opening; then separately
    approve individual invitations. No live charge/session is authorised by this doc.

## Hold duration and emergency recovery

Plan a <=30-minute hold, below Stripe's retry horizon; monitor deferred event count,
oldest deferred timestamp, 503 rate, handler errors and failed receipts continuously.
At 20 minutes escalate to release owner; at 30 minutes stop cutover work and execute
an owner-approved release/rollback decision. Do not leave a hold unattended or
silently extend it. Stripe retry retention and dashboard replay eligibility must
be verified for the actual account; local signed replay is not hosted replay proof.
Never rollback to code that ignores an active hold. Preserve guard-capable routing,
keep checkout closed, and follow `ROLLBACK-PLAN.md` on uncertainty.
