# Legacy Industry App entitlement cutover

The fixture-only reconciliation command remains restricted to Stripe test mode
and a marked disposable local PostgreSQL database. The production command
defaults to a read-only dry-run. No production reconciliation or webhook hold
has been run while preparing this procedure.

## Hold mechanism and limits

`platform_checkout_creation_gate.subscription_webhooks_held` is the shared,
operator-controlled switch. The atomic hold/receipt transaction covers platform
subscription created/updated/cancelled, checkout completion (including async payment
success), invoice failure/action-required and invoice recovery. The combined release
also normalizes subscription paused/resumed into the guarded update path. Ownership
is established from verified event data and canonical ownership mappings; uncertainty
fails closed. Connected-account and verified non-platform commerce remain unaffected.
The singleton row is locked FOR SHARE inside the same transaction as receipt claim;
activation's UPDATE conflicts with that lock. Held events return 503 before a receipt
is claimed. Handlers run after the transaction ends. Missing hold state fails closed.
No customer-facing route controls the hold.

Use [the consolidated release approval package](../commerce/CHECKOUT-RELEASE-APPROVAL.md)
for the current dependency order, old-deployment execution evidence and migration
source. This document does not authorize any Production operation. Receipt drain is
not evidence that pre-guard invocations have terminated. Reconciliation cannot start
until guard deployment, old-invocation termination and hold/drain are verified.

The hold has no automatic expiry. The maximum planned active window is 30
minutes. Alert the release owner at 15 minutes. If the final projection cannot
be deployed by 30 minutes, keep the hold active and escalate; do not release it
to an old projection merely to meet the window. Continued 503s are safer than
allowing stale projection writes. Confirm that the Stripe endpoint is still
enabled and that its delivery retry horizon is not at risk before starting.

## Required release sequence

1. Verify a recent independent production backup/PITR recovery point and a
   tested restoration procedure. Record the recovery owner and rollback window.
2. Execute only the separately approved complete recovery migration manifest,
   including prerequisite gate, attempts, entitlement and hold-column migrations.
   Verify checkout blocked=true and the singleton hold is `false`.
   Old code remains compatible with these additive schema changes.
3. Before any hold activation, deploy a **guard-only compatibility build** that
   includes the pre-receipt hold check but retains the currently serving
   entitlement decisions. Verify every serving instance is on that build,
   the hold lookup is healthy, and ordinary webhook traffic still processes.
   Do not run reconciliation if this guard-only stage cannot be deployed
   independently from the new entitlement gates. An equivalent, independently
   verified edge mechanism returning retryable 503 before the application
   handler may be used instead.
4. Prove all pre-guard invocations terminal using provider execution evidence and
   the verified effective hard runtime, then wait the documented safety margin.
   Verify old immutable routes cannot receive webhook traffic. Activate the hold
   with a reviewed operator-only database action, incrementing the gate revision
   and `changed_at` in the same update. After activation, drain all already-claimed
   guarded billing handlers and resolve failed receipts before reconciliation.
   Read the committed state back through
   more than one application instance. Do not activate it from customer paths.
5. Run the production reconciliation command in dry-run mode against the
   explicitly allowlisted Neon host/database and verified live Stripe account.
   The mode is read-only and the report is created with mode `0600`.
6. Independently review the exact report: target, plan digest, outcomes,
   proposed entitlements and redacted Stripe evidence for each retrieved
   subscription. Confirm every catalogue mapping and investigate every blocked
   or unmatched line. Do not approve a changed or regenerated report implicitly.
7. Obtain a separate Ed25519 signature over the exact plan digest, production
   Stripe account, Neon host/database, approver, change ticket, approval time
   and expiry (maximum 24 hours). Keep the private key outside the application
   environment. The approval is valid only for the reviewed evidence and target.
8. Apply only that signed plan. The writer rechecks the signature and exact
   digest, authorises the precise row set, and uses compare-and-set on identity,
   exemption state, timestamps and existing entitlement arrays. Do not edit the
   report or reuse the approval for another run.
9. Immediately deploy the verified webhook projection and entitlement gates.
   Keep the hold active until all serving instances run the new projection and
   its health checks pass. If deployment fails, roll back to the guard-only
   compatibility build and leave the hold active. Never release events into an
   old projection after reconciliation.
10. Verify pending deliveries in Stripe Workbench, then release the hold with a
    reviewed operator-only database action, incrementing the revision. Confirm
    the released state through multiple instances. Allow automatic retries to
    drain; use Stripe Dashboard **Resend** (up to 15 days) or Stripe CLI
    `events resend` (up to 30 days) for any remaining undelivered events. The
    receipt claim and normal idempotency path must process each event once.
11. Run a new read-only reconciliation dry-run. This is a new inventory and
    evidence snapshot, not a continuation of the old approval. Investigate every
    newly eligible/catch-up candidate and every blocked, failed, conflicting or
    unmatched result.
12. Obtain a new independent review and a new signed approval for any remaining
    changes. Never extend or reuse the prior signature for post-deployment
    candidates.

Stripe documents automatic retries for up to three days in live mode and three
attempts over several hours in sandbox mode. Manual Dashboard resend is
available for 15 days after event creation; Stripe CLI resend for 30 days.
Manually resending does not stop scheduled automatic retries, so keep the
receipt-based duplicate check active and monitor retries until resolved. These
windows are recovery limits, not permission to exceed the 30-minute planned
hold without escalation.

## Monitoring and emergency recovery

During the hold, alert on any lifecycle event receiving a non-503 response,
any subscription projection write, a missing hold-state read, a hold duration
over 15 minutes, failed/exhausted receipts, or a deployment that is not fully
serving. Record the gate revision, activation/release timestamps, deployment
IDs, pending Stripe event IDs, reconciliation report digest, approved ticket,
and post-release receipt outcomes. Do not record secrets or full webhook
payloads in the cutover log.

If the hold-state read fails, the route intentionally keeps returning 503. Fix
the shared database/read path; do not add an instance-local or environment
fallback. If reconciliation conflicts or fails, stop and retain the hold while
investigating; do not force rows. If the final deployment fails, leave the hold
active and restore the guard-only build. Release only after either the new
projection is confirmed everywhere or a separately reviewed recovery plan
restores a consistent entitlement state and processing strategy. Do not drop
the additive columns or delete audit rows as rollback.

## Concurrency, retries and reconciliation safety

The atomic pre-receipt hold prevents new guarded platform billing handlers from
racing the reconciliation window. Pre-guard invocations must terminate before activation; already-claimed guarded
handlers must drain after activation and before reconciliation. Other Stripe event
types continue normally. Stripe retains
undelivered webhook events for automatic/manual retry; the application receipt
table stores event IDs and processing state, not payloads, so it is not itself
an event replay queue.

The signed reconciliation plan includes subscription status, mode,
cancellation/trial/period state, relevant commercial metadata, item quantities
and full price/product/catalogue evidence. Any change to that evidence changes
the plan digest and invalidates approval. At write time, compare-and-set detects
a changed canonical row; report it as a conflict and leave it untouched. Obtain
a fresh dry-run and approval for conflicts.

Each row projection and its audit event commit atomically. A failed row is
reported blocked while independent rows may finish. Preserve the partial report
and audit events. Reconcile remaining rows only with a fresh dry-run and new
signed approval; already-applied rows are idempotently recognised.

If migration or reconciliation fails, stop before deploying entitlement gates
and investigate the report and database audit trail. If the application
deployment fails, roll back the application version while retaining the
additive columns and verified entitlement values. Restore data only through
the verified backup/recovery procedure and an independently reviewed plan.

The report contains no payment-card data, credentials, email addresses or raw
organisation identifiers. It includes the Stripe subscription ID, a hashed
customer reference, line-item price/product identifiers, quantity, amount,
currency, interval, catalogue mapping, proposed app entitlements and an
evidence fingerprint. The signed plan digest covers this evidence; a changed
line item, mapping or proposal requires a new review and signature.
