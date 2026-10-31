> Historical pre-remediation evidence. The final remediation report supersedes
> its closed-gate and audit limitations; do not treat 647 passes as current certification.

# Scoped admission validation — 27 October 2026

Local worktree: `/private/tmp/dg-single-use-checkout-admission-20261027`.
Branch: `fix/single-use-checkout-admission-20261027`.
Base/HEAD: deployed merge `8d639743352b9e980afb7e156fc9ac9cff1308b2`.
Implementation is uncommitted. No push, PR, migration, deployment, Live API call,
customer invitation, real Checkout Session or Production mutation was performed.
The new worktree has its own npm-ci installation and generated Prisma 6.19.3
client; the certified source worktree and frozen recovery package were preserved.

## Actual local checks

- `npm run test:checkout-release`: **399/399** (includes 10 new admission units).
- `node scripts/run-checkout-coordinator-db-tests.mjs /opt/homebrew/opt/postgresql@18/bin`: **44/44**.
- `node scripts/run-checkout-compatibility-db-tests.mjs /opt/homebrew/opt/postgresql@18/bin`:
  **40/40 admission**, **128/128 checkout/lifecycle**, **27/27 legacy entitlement
  reconciliation**, **6/6 atomic webhook**, **3/3 approved-operator-SQL** tests.
- Total across these commands: **647 passed, 0 failed, 0 skipped**. Build/prebuild
  assertions and the separately run 10-unit/40-admission subsets are not added again.
- Each DB run creates an owned non-default-port loopback cluster, clears provider
  credentials, uses synthetic records and mocked Stripe, verifies the random
  cluster marker, applies the new SQL once, checks Prisma datamodel parity, then
  stops and deletes its cluster. No Preview or Production database was used.
- `prisma validate --schema packages/database/prisma`: PASS with a dummy localhost
  URL, no connection. `npm run db:generate`: Prisma 6.19.3 PASS.
- `npx tsc --noEmit`: PASS.
- Changed-TypeScript ESLint: PASS, no errors/warnings.
- `git diff --check`: PASS.
- Canonical `npm run build`: **PASS, exit 0**, including prebuild, compilation,
  TypeScript and **457/457** static pages. Existing middleware/Edge/cache and
  module-type warnings remain; no new build correction was made. Production/provider URL,
  Stripe and Clerk secrets were explicitly unset; no environment files copied.

New regressions cover org/user/active membership, pricing/currency/quantity/seat/
trial/apps/cadence/discount changes, real standard builder evidence, provider
scope, missing schema/gate, active webhook hold, expiry/revoke (including during
I/O), immutable authority/audit, single-attempt exhaustion, legacy and uncertain
attempt adoption, stable idempotent recovery, concurrent clients/stale workers,
lock timeout and accidental root-client transaction misuse.

## Independent review

Separate read-only reviewer: initial FAIL found one P1 (current approval could
replay different persisted uncertain terms) and a seat-evidence gap. Both were
corrected and regression-tested. Also added hold-inactive validation and explicit
revocation operator/reference audit. Final code re-review: **PASS, no remaining
confirmed P0/P1**. Final transaction-guard/runbook review: **PASS**.

Other initial validation failures were closed-gate response/resumption compatibility
and a narrow source-contract assertion after admission arguments were added;
legacy no-permit behaviour and retryable error contract are now preserved. The
combined DB runner also exposed a new test's global-empty fixture assumption;
its assertion now verifies existing admissions are unchanged by read-only plan
preparation. A syntax error in the newly written unit test was corrected before
its passing run. Failed intermediate runs are not represented as passing evidence.

## Remaining limitations and approval boundary

Read-only code review and local synthetic tests are not Live certification.
The exact private Production issuance/revocation runner and approval artifact
remain to be prepared/reviewed before any grant. Do not hand-edit a Live grant.
No grant is seeded by the migration. Existing unscoped OPEN sessions retain
certified resumption behaviour under the globally blocked creation gate; a pilot
requires inventory and approved containment of such sessions first. Revocation
cannot cancel an already-admitted provider request or link: retain the durable
attempt/session and obtain separate exact session-expiry/recovery approval.

Customer fixture A$947/month, five users and 14 days is provisional/synthetic only;
Nathan's actual latest selection remains his choice. No custom commercial offer
or pricing override has been created or imposed. Standard builder fixture also
verifies current Growth + Finance A$398/month and five canonical Growth seats.

Publication requires owner approval and branch-specific deployment suppression
before first push. Migration, deployment, Live target/account verification, actual
customer identity/progress/selection verification, grant and invitations remain
separate approvals. See [controlled procedure](SINGLE-USE-CHECKOUT-ADMISSION.md).

## Complete changed-file inventory

- `docs/ROADMAP.md`
- `docs/commerce/release-1025/SINGLE-USE-CHECKOUT-ADMISSION-VALIDATION.md`
- `docs/commerce/release-1025/SINGLE-USE-CHECKOUT-ADMISSION.md`
- `packages/database/prisma/migrations/20261027_single_use_checkout_admission/migration.sql`
- `packages/database/prisma/schema.prisma`
- `packages/platform-core/src/billing/checkout-admission.ts`
- `packages/platform-core/src/billing/checkout-coordinator.ts`
- `packages/platform-core/src/billing/checkout-creation-gate.ts`
- `packages/platform-core/src/billing/platform-checkout.ts`
- `scripts/run-checkout-compatibility-db-tests.mjs`
- `scripts/run-checkout-release-tests.mjs`
- `scripts/test-checkout-admission-unit.mjs`
- `scripts/test-checkout-compatibility-boundaries.mjs`
- `scripts/test-checkout-compatibility-db.mjs`
- `scripts/test-single-use-checkout-admission-db.mjs`
- `src/app/api/v1/billing/checkout/route.ts`
- `src/app/api/v1/onboarding/gen2/route.ts`
