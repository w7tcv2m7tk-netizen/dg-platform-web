# AIM Financial and My Venue Clean — checkout evidence reconciliation

Requirement IDs: `platform.auth`, `detach.portal_billing`, `crm.companies`.
Issue: #1013. Evidence review: 20 October 2026. This records a verification result;
it does not certify a payment or authorise billing activation.

## Serving revision and release order

Production source is `fedbd97ec47dc842401a65cc31d9c76062a8a4b9` (main).
#1008 compatibility is merged. #1006 coordinator (`666f4533`), #1016 independent
webhook guard (`2c9a18ec`) and #1015 entitlement/Finance cutover (`b9963e93`)
are unmerged candidates. #1011 governance must not import their implementation.
The #1016 guard has a prerequisite on the existing creation-gate migration;
#1015 requires the guard deployed and verified before reconciliation/cutover.

Read-only metadata against the verified Production project/branch/compute found
no `platform_checkout_creation_gate`, no checkout-attempt table, and no staged
webhook-hold column. This is not an instruction to run bulk migrations. Current
compatibility code denies a new platform checkout if the gate is missing; the
review did not create a Checkout Session or change any admission flag.

## AIM Financial — HOLD

Read-only canonical records show organisation status `trial`; no canonical
PlatformSubscription row or Stripe subscription reference is recorded there.
An agreed commercial-offer record selects internal tier `professional`, Priority
support and zero trial days. Those are stored configuration, not payment proof.
No current industry value is recorded on the organisation. The review does not
infer Finance app entitlement from the customer name or tier.

Remaining acceptance evidence: validate the exact accepted offer and included
apps/amount/cadence against the customer's approved agreement, then exercise a
synthetic equivalent through authenticated signup, hosted Stripe test Checkout,
signed test webhook processing and resulting company/contact/app access. Confirm
no unintended trial is created and retries do not duplicate a purchase. Do not
edit the real organisation merely to obtain a passing test.

## My Venue Clean — HOLD

Read-only canonical records show organisation status `trial`; no canonical
PlatformSubscription row or Stripe subscription reference is recorded there.
No agreed commercial-offer record was found in the recognised settings path.
No current industry value is recorded on the organisation. The review does not
substitute the Core catalogue or assume an agreed price, support package or app set.

Remaining acceptance evidence: confirm the approved commercial configuration,
then test a synthetic equivalent through the same authenticated checkout,
webhook and access checks. Preserve existing organisation identity, contacts,
communication history and any external payment history.

## Evidence limits and exact blockers

Prior dated evidence includes mocked provider tests and disposable PostgreSQL
coordinator/lifecycle/security suites. These establish code behaviour within
those fixtures, not current hosted success for either customer. The 12 October
record identifies a Stripe sandbox and Clerk development instance, but that does
not establish a configured isolated authenticated application environment.

The owner confirms that no isolated test login is configured. Automatic Vercel
Preview deployments are disabled and Neon preview branches/database variables
have been removed by owner instruction. Do not recreate them. Use a separately
configured local synthetic environment with Clerk test authentication, test-only
Stripe routing and disabled unrelated communications. No live credentials or
customer data may be copied into that environment.

No live Checkout Session, charge, customer update, entitlement write, webhook
reconfiguration, Production migration, gate opening or billing deployment was
performed for this review. Do not represent the absence of a platform reference
as proof that no external payment or historic subscription exists.

Issue #1013's reminder/evidence-review task is fulfilled by this record. Product
certification remains HOLD and is tracked by the staged checkout PRs and the
canonical Roadmap, rather than by a second reminder issue.
