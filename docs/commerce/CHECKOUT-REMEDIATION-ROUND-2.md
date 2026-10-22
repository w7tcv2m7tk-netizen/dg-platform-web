# Checkout remediation round 2 — PR #1006

Reviewed baseline: `092cb6952d053d05fda3c86b1e3c611bb310c66b`. Corrected code is ready for renewed independent review. Production rollout and checkout reopening remain **HOLD**.

## Root causes and corrections

1. Cancellation-first delivery projected CANCELLED before completion. Completion rejected the terminal provider subscription, so the coordinator could never find checkout evidence to retire the completed attempt. Completion now retrieves the subscription and checks its organisation, customer, mode and platform marker. An exact CANCELLED canonical projection plus a recorded Stripe cancellation webhook permits an idempotent `checkout.terminal_observed` event. This event records terminal observation, not payment or provisioning. The coordinator accepts this evidence for fenced retirement while retaining provider terminal checks, subscription inventory, historical session/key records and gate admission for every replacement/replay. Missing evidence remains blocked. Lifecycle evidence now records provider subscription/customer IDs; legacy status-only evidence is accepted only with exact canonical and retrieved provider ownership checks.
2. Expiry and payment-failure parsing omitted connected-account provenance, allowing attacker metadata to select a victim payment request. All normalized Stripe event mappings now preserve account provenance. The verified HTTP handler rejects connected-account completion, expiry and payment failure before receipt/database writes; the production payment processor independently rejects them before importing the database. Metadata never authorizes a connected-account mutation. Local commerce requests currently originate on the platform account; connected-account commerce processing remains unsupported and fails closed. Platform-account expiry/failure behavior is regression covered.
3. Checkout projection ignored `cancel_at_period_end` and current period dates, overwriting scheduled cancellation with ACTIVE. It now projects CANCEL_AT_PERIOD_END and dates from the retrieved subscription. Existing ACTIVE, TRIALING and terminal cancellation behavior remains covered. Only webhook processing grants checkout entitlements.

## Regression evidence and validation

Tests were added before corrections. Against the baseline, focused tests reproduced two provenance failures and disposable PostgreSQL tests reproduced four failures: cancellation-first completion rejection, scheduled cancellation becoming ACTIVE, and victim expiry/failure mutations. Logs: `/private/tmp/checkout-r2-focused-red.log` and `/private/tmp/checkout-r2-db-red.log`.

Final validation passed, with zero skipped tests:

| Check | Result |
| --- | --- |
| Focused checkout | 56 passed |
| Disposable coordinator PostgreSQL | 44 passed |
| Disposable compatibility/lifecycle/security PostgreSQL | 50 passed |
| Security certification | 54 passed |
| Full prebuild | 888 test executions passed |
| TypeScript | Passed |
| Changed-file ESLint | 0 errors; 1 existing unused `_organisationId` warning |
| Production build | Passed |
| Checkout client boundary / compatibility artifact checks | 1 passed each |

Counts overlap where prebuild invokes individual suites. PostgreSQL runners created, migrated and destroyed disposable local clusters, clearing inherited database/Stripe configuration. Provider calls were mocked; no live Stripe queries or production databases were used. Tests exercise production parser, HTTP POST, payment processor, lifecycle handler, provisioning and coordinator functions. Coverage includes both webhook orders, missing/foreign cancellation evidence, historical compatibility evidence, terminal replay, closed-gate denial and replacement replay without duplicate provider creation. Existing build warnings remain; the previously documented full-repository lint baseline was not re-certified by this changed-file lint run.

## Compatibility and release boundaries

#1008 remains OPEN at `1d010d151fb5c54aeccdf4c479227f44d006969f`. Both migrations are unchanged. Its gate migration and read-only legacy inventory tooling remain byte-identical in #1006; coordinator admission preserves its closed default and bounded expiry horizon. Status-only lifecycle records from the compatibility release are regression covered.

A read-only three-way merge simulation of baseline #1006 and #1008 reports textual conflicts in shared rollout documentation, package scripts, gate imports, checkout creators, test harnesses, and billing/onboarding routes. Compatibility is integrated behaviorally, not merge ancestry: do not merge both branches blindly. #1008's branch-specific Vercel configuration is not part of this remediation. Resolve any eventual release-order integration explicitly, preserving coordinator imports and both migration histories.

Remaining production blockers: independent review, legacy deployment/alias/preview execution isolation, measured old execution drain, complete existing-session inventory reconciliation, approved migration order, real restricted-key sandbox permission checks, webhook continuity verification, and separately approved controlled reopening/monitoring. Uncertain attempts beyond retention and unconfirmed historical completions continue to fail closed. These tests do not prove external network/provider behavior or arbitrary out-of-order subscription snapshot convergence.

No merge, deployment, production migration/configuration change, Stripe/Vercel modification or checkout reopening was performed. Local test gate changes were confined to disposable fixtures. Next action: independent review of the corrected PR; do not execute the release plan.
