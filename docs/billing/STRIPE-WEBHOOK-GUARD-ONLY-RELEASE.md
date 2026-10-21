# Stripe webhook cutover guard-only release

This candidate is based on the Production source commit
`f26e3e4761e8af66707919589a5ee883bb5d3ef8`. It contains only the additive
subscription-webhook hold, atomic hold/receipt coordination, a read-only drain
report, focused tests, and this operational procedure. It intentionally does
not contain PR #1015's entitlement projection, custom-offer validation,
reconciliation writer, or Finance changes.

The guard must be deployed and verified before any legacy entitlement
reconciliation or entitlement cutover begins. The hold remains inactive by
default. No customer-facing route can activate or release it.

The hold covers the normalized event paths that can change platform billing
state: `subscription.created`, `subscription.updated`,
`subscription.cancelled`, `checkout.completed` (Stripe
`checkout.session.completed` and `checkout.session.async_payment_succeeded`),
`invoice.payment_failed`, `invoice.payment_action_required`, and
`invoice.paid`. In this reconciled combined candidate, Stripe
`customer.subscription.paused` and `customer.subscription.resumed` normalize to
`subscription.updated` and use the same guard. Other unhandled subscription
events cannot mutate platform state. Connected-account events and
verified non-platform subscriptions remain on their normal path. Checkout and
invoice ownership must be corroborated by an existing canonical Stripe
subscription/customer mapping or by a signed platform marker plus an existing
organisation and non-conflicting customer/subscription ownership. Missing or
conflicting ownership evidence returns retryable 503 before receipt claiming.

## Preconditions

1. Independently verify that the serving application and database are the
   intended Production targets. Do not infer applied migration state from the
   source commit alone.
2. Verify the prior additive migrations for the receipt state machine and
   `platform_checkout_creation_gate` have been applied. Back up and confirm the
   documented rollback/recovery procedure.
3. Apply the additive
   `20261019_platform_subscription_webhook_hold` migration. Confirm the
   singleton row exists with `subscription_webhooks_held = false`.
4. Confirm the webhook function's effective maximum execution duration and
   monitoring access from the deployed Vercel configuration/metadata. The source
   does not declare `maxDuration`; do not use an assumed runtime limit to clear
   an in-flight receipt.

## Guard deployment and verification

1. Deploy this guard-capable build with the hold false. Verify webhook health,
   normal checkout and billing event handling, signature rejection, and that
   unrelated and connected-account events retain their existing behavior.
   Confirm the Production alias routes new webhook traffic only to this build.
2. Establish the effective maximum runtime of the old webhook function from
   deployed Vercel metadata/configuration and identify the old deployment's
   invocation records. Do not infer this value from source or a plan limit.
3. Using Vercel execution evidence, verify that every pre-guard webhook
   invocation has completed or expired, including invocations that had not yet
   claimed a receipt. After the last such invocation is confirmed terminal,
   wait an additional conservative safety margin at least as long as the
   verified maximum runtime, and confirm no old deployment remains eligible to
   receive webhook traffic. A fixed sleep without invocation evidence is not
   sufficient. If logs, runtime limits, alias routing, or completion state are
   unavailable or ambiguous, stop and obtain provider/operator evidence; do
   not activate the hold or begin reconciliation.
4. Verify the shared hold state through more than one serving instance. The
   state is read from PostgreSQL on each guarded event; it is not cached per
   process. Confirm old invocations are drained before requesting separate
   authorisation to activate the hold.
5. Only after the previous conditions and explicit authorisation, use an
   operator-only database update of the singleton row to set the hold true and
   increment its revision/change timestamp together. Its row update conflicts
   with webhook claims' `FOR SHARE` lock. Never expose this operation through
   customer APIs.
6. Run `node --conditions=react-server --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/report-platform-subscription-webhook-drain.mjs` against
   the verified target. It reports all guarded normalized event types. Do not
   proceed while any claimed receipt is `processing`; failed receipts also
   require an explicit recovery/replay disposition. Receipts with
   `status = processing` and `claimedAt = null` are reported separately as
   legacy post-handler receipts: the pre-claim-state handler inserted them only
   after successful processing. The report is read-only and is not proof that
   old-version invocations ended. Recheck it and verify invocation/log evidence
   across all serving instances. Age alone is not proof that a handler stopped.
   Once termination is proven, resolve only the exact stale receipt with an
   audited conditional transition to retryable `failed`; preserve its event ID
   and attempt count.

## Relationship to PR #1015 and cutover

Only after the guard is deployed, verified and the in-flight receipt drain is
clear may the separately approved entitlement cutover begin. Activate the hold,
run and review a fresh dry-run reconciliation, obtain separate signed
authorisation for any writes, and apply only that exact plan. Deploy the
entitlement projection only after reconciliation succeeds. Keep the hold active
until all serving instances run the new projection and health checks pass.
Then release the hold with an operator-only row update and verify Stripe retries
and replay outcomes. Stripe may stop automatic retries after its delivery
window; inspect delivery status and manually replay unresolved events where
required, preserving event IDs and receipt idempotency. Run a new
post-deployment dry-run; it is a new evidence snapshot and requires a new
approval before additional writes.

If the guard deployment or migration fails, do not activate the hold. If the
entitlement deployment fails after activation, keep the hold active while
restoring the verified guard-only deployment. Never roll back to a deployment
that ignores an active hold: it could process held events during reconciliation.
If no guard-capable deployment is healthy, keep the hold active and events
retrying until the guard is restored; do not release the hold as a shortcut.
Preserve additive columns and receipt history during rollback.
