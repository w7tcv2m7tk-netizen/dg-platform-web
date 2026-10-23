# Customer acceptance — AIM Financial and My Venue Clean

## VERIFIED — reusable evidence and local decision tests

21 October external-provider certification: 22/22 synthetic assertions, genuine
Clerk Development login, Stripe sandbox Checkout, actual signed CLI delivery,
canonical trial/purchases and purchased app/dashboard access; pairing 67/67.
See `../CUSTOMER-CHECKOUT-CERTIFICATION.md`, report SHA-256
`78c6feade32d5be5b74be0cb60bd94dac505443c0713637ada9477110f7f23d9`.
That source predates integrated d71be3b9: retain provenance, do not label it a new
hosted run on this head. Current disposable runtime suites exercise the integrated
coordinator, saved-progress scenarios, strict prices, trial and projection.

AIM synthetic acceptance: same organisation ID/progress; stale 947/month zero-day
proposal ignored; professional/Growth AUD249 + Finance AUD149 = AUD398 monthly;
14-day trial; separate exact recurring items; signed webhook creates TRIALING/FULL;
Finance requires verified purchase + selected app + beta + role; unpaid app denied.
No manual payment link, customer exemption or customer-specific pricing required.

My Venue Clean synthetic acceptance: saved ID/progress retained; standard selected
platform + Services/premium basket, full add-on price, 14-day trial and dashboard.
Historical synthetic Scale + bundled Growth Suite/Services AUD998 is an example,
NOT the real customer's approved selection. Confirm current selected basket before
showing payment; never hardcode this synthetic amount as their commercial contract.

## NOT VERIFIED — final deployed customer journey

For each customer privately verify existing Clerk membership/organisation, saved
onboarding step and current basket. Never create a new organisation to recover a
checkout. Authorised logged-in onboarding/resumption must recompute standard terms;
no unauthenticated organisation-ID or stale customer-editable offer may authorize it.
No actual customer records were read or changed during this preparation.

## BLOCKED / REQUIRES OWNER APPROVAL — Production acceptance

After migration/guard/reconciliation/full-release checkpoints, verify:
- Production alias/source, rotated credential connectivity, blocked checkout,
  operator authentication and unauthorised API rejection without writes.
- Correct published catalogue and any configured Stripe Price ID: active, AUD,
  exact amount, month interval/count1, quantity1. Invalid mappings must reject.
- Live endpoint subscribed to all required events, signed event delivery and
  canonical ownership. No synthetic Production write without specific approval.
- Separately approve controlled checkout opening and one customer action; observe
  same organisation/progress, standard basket, complete disclosure and 14-day trial.
- Retry/resume open session reuses it; expiry replacement requires confirmed Stripe
  expiry; uncertain outcome blocks duplicate creation; existing subscription blocks
  second purchase. Do not create a second session to fix an unknown outcome.
- Subscription items, trial dates, latest webhook receipt and verified canonical
  apps agree; beta/selection/roles/tenant isolation still mandatory.
- Authenticated dashboard/purchased page/API succeeds; unpurchased API denied;
  duplicate signed delivery has no second activation/charge.
- Confirm recovery/cancel UX, monitor dunning and invoices. Trial extension capability
  remains operator-controlled and is not a prerequisite for standard onboarding.

Optional Finance connectors and cleaning integrations can follow activation.
They do not block standard checkout. New Clerk user-created webhook provisioning
is a separate requirement if a journey needs new-user provisioning; existing-member
acceptance did not require that webhook. Do not declare it tested by the 22 checks.

Both live invitations: NO-GO until these checkpoints receive approval and pass.
Current engineering preparation: ready for review subject to recorded test results.
