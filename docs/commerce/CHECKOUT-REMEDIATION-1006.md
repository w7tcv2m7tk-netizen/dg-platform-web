# PR #1006 checkout remediation

Base reviewed commit: `79f1eb042c0983fc48551d85d94748c3a06c2191`.
Worktree: `/Users/okcomputers/Documents/dg-commercial`.
Branch: `work/commercial-readiness`.

## Findings and corrections

1. **Completed checkout lifecycle:** the coordinator unconditionally blocked
   AWAITING_WEBHOOK attempts and completed legacy pointers, even after the exact
   webhook-provisioned subscription had been cancelled. Retries now reconcile
   completed sessions. Retirement requires matching organisation, customer,
   original provider mode, platform subscription marker, terminal Stripe status,
   matching cancelled canonical subscription and the exact checkout.provisioned
   webhook event. Fenced retirement preserves the session, key and history in
   EXPIRED with reason completed_subscription_terminal. Confirmed retired history
   supports old legacy pointers after canonical billing moves to another purchase;
   Stripe ownership and terminal status are still checked again. Existing
   subscription inventory and gate admission continue to govern replacement.
   Completion racing with expiry still blocks without sufficient evidence.

2. **Account origin:** checkout event mapping dropped the signed Stripe event's
   account field, and checkout routing had no connected-account guard. The parser
   now retains connectAccountId. The webhook returns connected_account_checkout
   before any platform, booking or payment provisioning for connected-account
   checkout events, regardless of copied platform metadata or checkout mode.
   Existing checkout receipt identity is preserved.

3. **Zero-trial projection:** checkout provisioning always wrote TRIALING and
   fabricated default trial dates. The webhook now retrieves and verifies the
   exact provider subscription before canonical or derived writes. ACTIVE and
   TRIALING use provider status and trial dates, including explicit null dates.
   Organisation status and billing JSON agree. Unconfirmed ownership/mode,
   missing platform marker and non-active/non-trialing subscriptions fail closed
   and leave the receipt retryable instead of granting entitlements.

## Files changed

- packages/platform-core/src/billing/checkout-coordinator.ts
- packages/platform-core/src/billing/platform-stripe.ts
- packages/platform-core/src/billing/billing-service.ts
- packages/platform-core/src/commerce/connectors/stripe/index.ts
- src/app/api/webhooks/stripe/route.ts
- scripts/test-checkout-coordinator-db.mjs
- scripts/test-checkout-compatibility-db.mjs
- scripts/test-checkout-webhook-origin.mjs
- package.json
- docs/commerce/PLATFORM-CHECKOUT-COORDINATION.md
- docs/commerce/CHECKOUT-REMEDIATION-1006.md

## Regression evidence

The existing independent-review regression files were inspected before code
changes and run against the reviewed implementation. Local before logs:
- /private/tmp/remediation-coordinator-before.log: 2 lifecycle regressions fail.
- /private/tmp/remediation-origin-before.log: 3 provenance/routing regressions fail.
- /private/tmp/remediation-projection-before.log: 2 status/date regressions fail.

Expanded coverage includes terminal current and legacy completion, missing
webhook evidence, mismatched tenant/customer/mode/canonical state, replacement
denial while closed, legacy retirement after canonical identity changes, zero-trial
ACTIVE, exact trial dates and provider ownership/activation rejection. The
account-origin tests exercise signed parsing and the actual HTTP POST with
isolated dependency stubs. They are registered in test:checkout-compatibility.

## Validation

- 51 focused compatibility, inventory, provider and account-origin tests pass.
- 44 coordinator PostgreSQL integration tests pass.
- 37 compatibility/creator/projection PostgreSQL integration tests pass.
- Both owned disposable local PostgreSQL clusters stopped and destroyed;
  migration application and Prisma schema parity pass. No external database or
  actual Stripe request is used by these suites.
- 46 security certification tests pass.
- Full npm run prebuild regressions pass.
- TypeScript npx tsc --noEmit passes.
- Changed-file ESLint has 0 errors and 1 pre-existing unused-argument warning
  in the Stripe connector.
- Full repository lint remains the unchanged independent-review baseline:
  144 errors and 149 warnings. No lint rules or checks were disabled.
- Final Turbopack production build passes with the complete route summary.
- Both browser/server artifact boundary checks pass. Existing Prisma export,
  file-tracing, cache-header and middleware-deprecation warnings remain.

Evidence logs: /private/tmp/remediation-*.log.
The initial expanded gate-denial test used the wrong error property; its assertion
was corrected to the established CheckoutTemporarilyUnavailable error class name.
The existing completion/expiry race regression exposed a placement error during
remediation, corrected before final validation.

## Readiness and remaining risks

The three reported defects are corrected and regression covered. Code readiness
is ready for renewed independent review;
full repository lint remains a disclosed baseline limitation. Production release,
payment activation and checkout reopening remain HOLD.

Production blockers remain legacy deployment isolation, measured execution drain,
complete Stripe inventory reconciliation, approved production migration sequencing,
real restricted-key permissions, independent release approval and controlled
reopening. No production configuration, migration, Stripe payment activation,
merge or deployment was performed.

Unconfirmed historical completions and uncertain requests beyond replay retention
still fail closed; there is no administrative unlock. Terminal or otherwise
non-activatable provider subscriptions received through delayed checkout webhooks
require lifecycle/recovery handling and do not receive fresh checkout entitlements.
Local mocks do not certify real restricted-key permissions or external Stripe
delivery behavior. Both existing migrations and all gate admission, replay key,
provider scope, tenant ownership and lease fencing boundaries are preserved.
