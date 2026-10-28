# DigitalGate — Stage 3 Production Release Readiness

Prepared: 2026-10-28  
Stage 2C certification: `b7633016e89309d0bc21a31e92a06a7c50e537b1` (PASS, 19/19 tests)  
Worktree: `review/production-preflight-sql-20261028`  
Scope: owner-approved read-only Stage 3 verification only  
Production checkout: **CLOSED**

## 1. Decision

**NO-GO / HOLD for Production release.**

The Production database migration and Stage 2C evidence are certified, but the
serving application is not the security release candidate. Production routing,
effective deployment configuration, runtime identity, default privileges, recovery
and Live billing/smoke evidence remain insufficient for release.

No Production database connection, SQL execution, deployment, migration, grant,
Stripe mutation or checkout activation was performed.

## 2. Serving deployment and routing

Verified from GitHub/Vercel records and public routing:

- Latest Vercel-bot Production deployment record: source `8d639743352b9e980afb7e156fc9ac9cff1308b2`, environment Production, status success, created 2026-10-26.
- Public `app.digitalgate.com.au` resolves through Vercel DNS and returned HTTP 200
  with Vercel/Next.js headers.
- The security release candidate is PR #1032 at
  `e10b24752db743447d9456c94577c54fb36cdb3d`. It is open, draft and based on a
  feature branch; it has not been retargeted to main, merged or deployed.
- Stage 2C commit `b7633016` is review/evidence code, not deployable application
  source.

**Critical mismatch:** the serving source `8d639743` is not the certified security
candidate `e10b2475`. The 26th migration and gate revision 2 are in Production, but
the matching admission, checkout-coordinator, entitlement and onboarding code is not
serving.

Provider API/CLI access was unavailable. Consequently the exact Production alias →
deployment ID mapping, READY state, captured environment-variable version and actual
serving project configuration remain **UNVERIFIED**.

## 3. Runtime configuration

Code-level review:

- `postinstall` runs `npm run db:generate` only.
- `build` runs SQL-generation checks, client/retired checks and `next build --webpack`.
- `prebuild` runs a large static/unit/security test suite.
- No `vercel-build`, `prisma migrate`, `db push`, seed or Production reconciliation
  runs from the build/install lifecycle.
- `vercel.json` defines crons and branch deployment suppression; it does not define
  an install/build command or migration hook.
- Required environment-variable names are declared in `scripts/verify-env.mjs`
  (`DATABASE_URL`, Clerk keys, `DG_NEON_ENV`, production encryption/operator/cron
  keys); no values were read or published.

**UNVERIFIED:** effective Vercel build settings, captured environment-variable
version, Production database URL role/endpoint, `DATABASE_URL_UNPOOLED` exposure,
serving runtime role and whether the serving deployment matches `8d639743`. The
runbook records `dg_app_runtime` as absent and the actual serving credential/role as
unverified; `dg_preflight_reader` is not the application runtime role.

## 4. Checkout release integration

| Requirement | Status | Assessment |
| --- | --- | --- |
| Production migration ledger (26 finished, zero unfinished) | PASS | Stage 2C certified |
| Admission migration/catalog/gate revision 2 | PASS | Stage 2C certified; gate blocked, hold inactive |
| PR #1032 candidate exact-head CI | PASS | `checkout-release` success on `e10b2475` |
| Candidate serving on Production | FAIL | Serving source is `8d639743`, not `e10b2475` |
| Admission/coordinator code effectively serving | UNVERIFIED | Candidate code is not deployed |
| Entitlements/checkout guard runtime behaviour | UNVERIFIED | DB gate is certified; serving code does not match candidate |
| Subscription reconciliation | UNVERIFIED | No reconciliation execution evidence; no Live Stripe mutation authorised |
| Onboarding continuation | UNVERIFIED | Candidate changes are not serving; no deployed smoke |
| Live Stripe open-session inventory | UNVERIFIED | Not performed; no Stripe access |
| Billing smoke and customer checkout smoke | UNVERIFIED | Checkout closed; not run |

PR #1034 is merged into #1032. PR #1028 and #1029 remain open/draft; #1033 remains
open/draft and is not required for this consolidated stack, but disposition requires
separate approval.

## 5. Default privileges and RLS

Existing evidence:

- Stage 2C expected-catalog and independent receipt certify RLS disabled/not forced
  for the two admission tables.
- Stage 2C default privileges remain **UNVERIFIED**; no `pg_default_acl` capture
  exists.
- RLS for the other Stage 2C target tables and all public tables was not captured.

A proposed minimal read-only procedure is committed at
`docs/commerce/release-1025/STAGE3-DEFAULT-PRIVILEGES-RLS-READONLY.md`. It is
**PROPOSED, NOT EXECUTED**, and requires separate owner approval. It checks default
ACLs for public schema/global defaults, RLS flags and policy roles, and target-table
ACL/owner metadata. Any unexpected default ACL, policy or target-table RLS is a STOP.

## 6. Recovery and rollback readiness

Existing evidence:

- A 26 October Production snapshot receipt exists. It reports SUCCESS, source
  Production, inventory present, no requested/reported expiry, retention “until
  deleted,” and documented protected restore/candidate finalisation. No restore was
  performed.
- The snapshot predates the 27 October admission migration and later writes. It is
  not a current recovery point for the certified 26-row/gate-revision-2 state.
- Protected-branch finalisation has not been independently executed; the rollback
  plan records it as NOT VERIFIED.
- No current PITR eligibility, current retention/expiry confirmation or accepted RPO
  evidence was available. No Neon API/CLI access was available.

**Recovery readiness: UNVERIFIED / HOLD.** The owner must accept the recovery-point
age/data-loss window or approve a fresher snapshot, and separately approve the
protected restore/finalisation route.

## 7. Release gates

| Gate | Status |
| --- | --- |
| Production migration ledger and admission catalog | PASS |
| Gate blocked, hold inactive, revision 2 | PASS |
| Stage 2C offline certification | PASS with documented limitations |
| Public Production alias responds through Vercel | PASS (limited) |
| Serving source matches certified security candidate | FAIL |
| Vercel deployment/alias/READY/captured env identity | UNVERIFIED |
| Build/install does not run migrations/seeds | PASS (code-level) |
| Serving runtime role/credential/endpoint and `DATABASE_URL_UNPOOLED` | UNVERIFIED |
| Default privileges | UNVERIFIED |
| RLS: admission tables | PASS |
| RLS: other target/all public tables | UNVERIFIED |
| Recovery snapshot/PITR/RPO/finalisation | UNVERIFIED |
| Subscription reconciliation / Live Stripe inventory | UNVERIFIED |
| Onboarding continuation and billing smoke | UNVERIFIED |
| Checkout/customer smoke | UNVERIFIED |
| Consolidated release candidate approved on main | FAIL |

## 8. Blockers

1. Serving source `8d639743` does not match candidate `e10b2475`; candidate is not
   merged, retargeted or deployed.
2. Production alias/deployment/captured environment identity is not provider-verified.
3. Serving runtime role/credential/endpoint and `DATABASE_URL_UNPOOLED` authority are
   unverified; `dg_app_runtime` remains absent per the runbook.
4. Default ACL and non-admission RLS evidence is missing; proposed read-only procedure
   requires owner approval.
5. Recovery snapshot predates the admission migration; PITR/RPO/protected
   finalisation are unverified.
6. Live Stripe session inventory, subscription reconciliation and billing/onboarding
   smoke evidence are outstanding; checkout is closed.
7. Stage 2C exact 26th timestamp and default ACL limitations remain owner-review
   items.

## 9. Required actions before release consideration

1. Approve and execute the proposed default-privileges/RLS read-only procedure, or
   provide an authorised operator evidence return.
2. Provide read-only Vercel/Neon evidence for serving deployment, aliases, READY,
   captured environment version, endpoint/role and `DATABASE_URL_UNPOOLED` scope.
3. Reconfirm snapshot/PITR retention and RPO; obtain owner recovery acceptance or
   approve a fresher snapshot under separate authority.
4. Complete Live Stripe open-session inventory and subscription reconciliation under
   separate read-only approval.
5. Approve the consolidated candidate merge/retarget/deployment sequence; deploy only
   after the above gates pass; rerun exact-head CI at the final base.
6. Verify checkout remains blocked and run the approved smoke matrix after deployment.

## 10. Handoff

- Stage 3 release readiness: **NO-GO / HOLD**.
- Stage 2C offline certification: remains PASS with documented limitations.
- Production checkout remains **CLOSED**.
- No Production connection, deployment, migration, grant, Stripe mutation or checkout
  action occurred.
- Stop for owner review before any Production operation.
