# Final single-use admission remediation — 27 October 2026

Requirement: existing P0 `platform.auth` / `detach.portal_billing`.
Worktree: `/private/tmp/dg-single-use-checkout-admission-20261027`.
Branch: `fix/single-use-checkout-admission-20261027`.
Exact base and HEAD: `8d639743352b9e980afb7e156fc9ac9cff1308b2`.
All implementation/remediation changes remain local and uncommitted. No Production
connection, Live Stripe request, actual Checkout Session, grant, invitation,
migration, deployment, push or merge was performed.

## Corrections

1. Removed `allowUnscopedReservation`. A blocked gate requires matching admission
   before reservation, recovery or OPEN-session resumption. Every returned OPEN
   session gets a final transactional gate check, even for formerly unscoped
   attempts. A return-phase permit must already be bound to the same attempt.
   Existing open-gate resumption and same authorised attempt/key recovery remain.
   A previously issued direct Stripe URL is NOT revoked by these checks.
2. Added a composite FK `(attempt_id,organisation_id)` referencing checkout attempt
   `(id,organisation_id)` with RESTRICT on update/delete, plus the corresponding
   Prisma relation/unique key. Nonexistent/cross-tenant binding is rejected by
   PostgreSQL independently of route checks. Bound attempts cannot move tenants
   or be deleted. Existing Organisation and Company relations are untouched.
3. Database UPDATE/DELETE/TRUNCATE guards preserve grant/audit evidence. Runtime
   cannot INSERT grants, revoke/change authority, forge audit rows, disable
   triggers or change global gate controls. Audit appends via a qualified-table,
   fixed-search-path SECURITY DEFINER trigger. PUBLIC privileges are revoked.
4. A separately reviewed operator privilege script targets an EXISTING non-owner
   runtime role. It grants SELECT + UPDATE(attempt_id), audit SELECT, and gate
   SELECT + UPDATE(last_admission_expires_at) only; other baseline application
   permissions are separate. It rejects privileged roles, ownership, unsafe
   effective privileges, NOINHERIT/SET-role escalation, audit-definer EXECUTE,
   protected TRIGGER rights and global-gate control mutation. It never creates
   roles, retrieves credentials or silently strips unsafe inherited grants.
5. The new, unapplied migration owns BEGIN/COMMIT with local lock_timeout 3s and
   statement_timeout 10s. It seeds no admissions, changes no subscription/purchase
   values and does not open checkout/activate the webhook hold. Historical files
   remain unchanged. The branch is explicitly deployment-suppressed in vercel.json;
   all earlier rules and main behaviour are preserved.

## Current validation — supersedes the earlier 647-test report

- `npm run test:checkout-release`: **400/400** (includes admission units, pricing,
  onboarding, tenant/auth, entitlements, receipt/hold and deployment-rule checks).
- `node scripts/run-checkout-coordinator-db-tests.mjs /opt/homebrew/opt/postgresql@18/bin`:
  **44/44**.
- `node scripts/run-checkout-compatibility-db-tests.mjs /opt/homebrew/opt/postgresql@18/bin`:
  **57/57 admission**, **128/128 checkout/lifecycle**, **27/27 reconciliation**,
  **6/6 atomic webhook**, **3/3 operator SQL**.
- **665 passed, 0 failed, 0 skipped** across these commands. Earlier subset runs
  and build prebuild assertions are not counted again.
- Five SQL-rehearsal phases additionally passed: mid-transaction error rollback;
  disconnect/EOF before COMMIT rollback; lock timeout rollback; explicit retry
  after verified rollback; duplicate committed migration rejection with state
  unchanged. The rehearsal checks absence of partial tables/indexes/functions and
  final empty grant/audit state; Prisma schema parity is checked after application.
- `prisma validate --schema packages/database/prisma`: PASS with dummy localhost
  configuration only. Prisma 6.19.3 generation and schema parity: PASS.
- `npx tsc --noEmit`: PASS. Changed-TypeScript ESLint: PASS.
- `git diff --check`: PASS. vercel.json JSON structure/branch checks: PASS.
- Canonical `npm run build`, including prebuild: **exit 0**, compiled successfully,
  TypeScript passed, **457/457 pages** generated. Production/provider URL, Stripe
  and Clerk secrets were unset. Existing middleware/Edge/cache/module-type warnings
  remain; no unrelated dependency or build-boundary correction was made.

Each database run uses an owned, random-marker-verified loopback cluster and
synthetic data, then stops and deletes it. No Preview/Neon resource is used. The
privilege tests use a REAL non-owner localhost runtime role, not a Prisma mock;
Stripe alone is mocked. Marker-verified test-only administrator teardown disables
USER triggers inside one transaction, truncates synthetic fixtures and restores
triggers before commit. That path is absent from runtime/operator SQL. Runtime
cannot disable those triggers. Privileged administrators remain trusted and can
alter/drop objects; append-only triggers are not protection against a hostile DBA.

Deliberately failing constraint/privilege/timeout cases produce expected PostgreSQL
errors while the tests pass. Initial legacy tests expecting closed-gate resumption
were updated to assert denial, retained provider OPEN state and same-session
resumption after explicit open-gate setup. No failure was silenced or skipped.

## Independent security review

A fresh reviewer used the exact worktree/base and inspected all current tracked
and untracked implementation files without writes/tests/providers. Core P1/FK/
audit/atomic fixes passed inspection. Reviewer found one further P2: leaf-role
privilege checks missed SET-role and audit-definer EXECUTE paths. Those were
corrected and covered by real NOINHERIT membership/EXECUTE/TRIGGER/gate-escalation
negative tests. Final fresh review: **PASS; publication GO subject to owner approval, no remaining confirmed P0/P1/P2**. Production remains HOLD pending actual role and operational checks.
The earlier review and 647 tests are historical evidence only.

## Migration, containment and publication boundary

Local tests do NOT establish actual Production runtime-role safety. Before any
release, independently verify current_user, role memberships/ownership, default
and effective privileges. A table-owner/superuser credential fails the policy;
using a suitable existing non-owner role or creating/configuring one requires
separate owner approval. No role, credential or Production policy was changed here.

Separately approve publication (with suppression in its first pushed commit),
exact additive migration, runtime privilege provisioning, deployment and pilot
admission. Apply the reviewed migration once after fresh recovery/ledger/catalog
checks; then apply/verify the runtime policy before deployment/issuance. Unknown
completion means STOP and read-only ledger/catalog reconciliation. Never rerun or
mark applied automatically. SQL failure rehearsal does not authorise Prisma failed-
ledger recovery: any migrate resolve/rollback/retry requires its own reviewed
operator decision. The final migration directory inventory must be verified, not
inferred from a historical Production ledger count.

Keep checkout globally blocked. Inventory/contain pre-issued unscoped/direct
Stripe URLs and old-deployment invocation exposure before claiming a one-customer
pilot. Code cannot revoke those links. Grant exact org/user/terms/expiry only after
latest customer selection and identity review. Nathan's A$947/five-user/14-day
fixture remains synthetic/provisional; no Live offer is imposed.

Rollback retains additive schema, immutable attempt bindings and audit evidence.
Revoke admissions/contain issued or uncertain sessions under separate approval
before an application rollback; old code can resume unscoped OPEN sessions even
when creation is blocked. No automatic Stripe expiry/refund/subscription change,
DB restore, hold change or global opening is part of this remediation.

Current controlled procedure: [single-use admission runbook](SINGLE-USE-CHECKOUT-ADMISSION.md).

## Final diff inventory

- `docs/ROADMAP.md`
- `docs/commerce/release-1025/SINGLE-USE-CHECKOUT-ADMISSION-REMEDIATION.md`
- `docs/commerce/release-1025/SINGLE-USE-CHECKOUT-ADMISSION-VALIDATION.md`
- `docs/commerce/release-1025/SINGLE-USE-CHECKOUT-ADMISSION.md`
- `packages/database/prisma/migrations/20261027_single_use_checkout_admission/migration.sql`
- `packages/database/prisma/schema.prisma`
- `packages/platform-core/src/billing/checkout-admission.ts`
- `packages/platform-core/src/billing/checkout-coordinator.ts`
- `packages/platform-core/src/billing/checkout-creation-gate.ts`
- `packages/platform-core/src/billing/platform-checkout.ts`
- `scripts/rehearse-checkout-admission-migration.mjs`
- `scripts/run-checkout-compatibility-db-tests.mjs`
- `scripts/run-checkout-release-tests.mjs`
- `scripts/sql/checkout-admission-runtime-privileges.sql`
- `scripts/test-checkout-admission-unit.mjs`
- `scripts/test-checkout-compatibility-boundaries.mjs`
- `scripts/test-checkout-compatibility-db.mjs`
- `scripts/test-checkout-coordinator-db.mjs`
- `scripts/test-single-use-checkout-admission-db.mjs`
- `src/app/api/v1/billing/checkout/route.ts`
- `src/app/api/v1/onboarding/gen2/route.ts`
- `vercel.json`
