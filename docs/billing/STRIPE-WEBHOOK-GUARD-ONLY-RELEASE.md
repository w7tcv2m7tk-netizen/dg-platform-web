# Stripe webhook cutover guard-only release

This candidate incorporates verified main source commit
`7a10486d00c83adfb8744e4de86c5d9f21ed4ad0`. The original isolated candidate
started at `f26e3e4761e8af66707919589a5ee883bb5d3ef8`; that is historical,
not the current deployment baseline. The reviewed published guard head is
`d20f05bc17f76a861a337a4d063f8587dca73b0c`; subsequent targeted corrections
are uncommitted until separately approved. Reverify the actual serving SHA
and final reviewed guard SHA before release; do not deploy an old PR-body SHA.
Relative to current main, the release contains only the additive
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
`invoice.paid`. Other `customer.subscription.*` events are currently parsed as
ignored and do not mutate platform state. Connected-account events and
verified non-platform subscriptions remain on their normal path. Checkout and
invoice ownership must be corroborated by an existing canonical Stripe
subscription/customer mapping or by a signed platform marker plus an existing
organisation and non-conflicting customer/subscription ownership. Missing or
conflicting ownership evidence returns retryable 503 before receipt claiming.

Legacy invoices also resolve the unique canonical customer mapping when the
subscription ID has not yet been projected. A contradictory subscription ID or
ambiguous owner is retryable, not unrelated. Explicit signed commerce markers,
or a unique commerce subscription corroborated by its stored customer identity,
remain separate. Subscription invoices with no established billing ownership
return 503 rather than permanently acknowledging missing purchase evidence.
An explicit commerce marker does not override canonical platform customer
ownership: a shared customer requires one corroborated commerce record and a
known distinct canonical platform subscription. Missing/partial or conflicting
evidence remains retryable before receipt claiming. The schema does not enforce
cross-table customer exclusivity, so do not assume shared customers are impossible.
Legacy marked Checkout sessions without an organisation ID require the email's
single organisation to match canonical customer ownership. The verified ID is
passed to provisioning, which must not choose the newest membership independently.

## Preconditions

1. Independently verify that the serving application and database are the
   intended Production targets. Do not infer applied migration state from the
   source commit alone.
2. Verify the prior additive migrations for the receipt state machine and
   `platform_checkout_creation_gate` have been applied. Back up and confirm the
   documented rollback/recovery procedure.
   The certified execution runner has **25 directories**, including the accepted
   unified-acquisition identity migration. It is distinct from this guard-only
   branch's migration directory: do not use this branch to reconstruct or deploy
   the complete recovery history. Existing operator evidence records **22 finished
   entries**, including checkout attempts and the creation gate. These are dated
   evidence, not a fresh preflight. The gate is blocked, revision 0, with no
   outstanding admission. Never replay an applied migration or reopen the gate.
   Remaining individually approved stages are
   `20261018_platform_subscription_app_entitlements` (23),
   `20261019_platform_subscription_webhook_hold` (24), and
   `20261020_aida_conversation_schema_alignment` (25). Use only their certified
   staged runner and separate approvals. Additive entitlement columns do not
   authorise deployment/activation of the new entitlement authority.
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

The application release order remains **#1016 guard → #1006 coordinator → #1015
entitlement cutover**. Preserve the deployed guard in each successor. Migration,
deployment, Stripe event-selection changes, hold activation/release, signed
reconciliation writes and checkout opening each retain their separate owner
approval gates. Updating documentation or adding schema columns grants none of
those approvals. The PR body must be reconciled with the final reviewed head,
25-directory runner and current gate evidence before publication; do not repeat
the historical `d5c9f30a`, 24-directory or absent-gate instructions.

After the guard is deployed and verified, and old-deployment invocations are
proven terminal, obtain separate approval and activate the hold. Then run the
read-only receipt drain while the hold is active; all claimed handlers must
complete or be safely resolved, with an explicit disposition for failed receipts.
Only after that drain is clear may the separately approved entitlement cutover
begin. Run and review a fresh dry-run reconciliation, obtain separate signed
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

## Targeted local remediation evidence — 22 October 2026 (Brisbane)

Starting head `d20f05bc17f76a861a337a4d063f8587dca73b0c`, branch
`finish/webhook-guard`, with uncommitted review corrections; no publication.
The focused route/receipt/drain/routing/ownership set passed 123/123;
`npm run test:checkout-compatibility` passed 95/95 (overlapping coverage, not
additional independent cases). Disposable PostgreSQL checkout compatibility
passed 30/30 and guard concurrency passed 6/6; both runners' Prisma datamodel
parity checks passed. The checkout runner reconstructs the singleton gate from
certified SQL so its CHECK constraint is tested, not omitted by schema diff.
`tsc --noEmit --incremental false` passed. The final full `npm run build`,
including prebuild, Next.js 16.2.12 Turbopack, TypeScript and 457/457 static pages,
exited 0; implementation/test hashes remained unchanged during that build.
Build evidence: `/private/tmp/dg-1016-remediation-accepted-build-20261022.json`
and its adjacent `.log`; remaining logs use `/private/tmp/dg-1016-remediation-*`.
Existing module-format, middleware-deprecation, Cache-Control and file-tracing
warnings remain; no unrelated build repair was attempted. No Production or
Stripe connection was used. These local results require independent review and
do not replace the Production routing, execution/drain, retry/replay and
separately approved migration checks above. Unknown legacy ownership deliberately
remains retryable rather than granting access or acknowledging the event.

Follow-up marker/customer review: 144/144 focused tests and 116/116 checkout
compatibility tests passed (overlapping sets), with standalone TypeScript passing.
Cases cover all three invoice events, partial/exact/conflicting platform mappings,
commerce-only and corroborated shared-customer controls, and connected-account
isolation. This supersedes the earlier focused counts, not the unchanged
disposable SQL/concurrency evidence. The follow-up full-build evidence is
`/private/tmp/dg-1016-marker-customer-build-20261022.json` and adjacent `.log`.
It exited 0 with Next.js 16.2.12 Turbopack, TypeScript and 457/457 static pages.
SQL/locking code is unchanged, so disposable database suites were not repeated
for this follow-up. The same external release approvals and checks still apply.
