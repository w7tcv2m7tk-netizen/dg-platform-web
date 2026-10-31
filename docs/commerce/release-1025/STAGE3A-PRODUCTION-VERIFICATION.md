# DigitalGate — Stage 3A Production Read-Only Verification

Prepared: 2026-10-28  
Stage 2C certification: `b7633016e89309d0bc21a31e92a06a7c50e537b1` — PASS with limitations  
Stage 3 readiness: NO-GO / HOLD  
Stage 3 documentation commit: `22a3ed00746837b34af185e4310ce18efac14f39`  
Worktree: `review/production-preflight-sql-20261028`  
Production checkout: **CLOSED**

## 1. Decision

**Stage 3A release readiness: NO-GO / HOLD.**

Stage 2C database certification remains valid, but Production release readiness is
not established. The serving application is not the security candidate, provider
metadata and runtime identity are not verified, default ACL/RLS evidence remains
incomplete, Live Stripe access is unavailable, and current recovery/PITR readiness is
unverified.

No Production database connection, SQL execution, deployment, migration, grant,
Stripe mutation, snapshot operation or checkout activation was performed.

## 2. Vercel Production identity

Verified from GitHub deployment records and public routing:

- Latest Vercel-bot Production deployment record: source
  `8d639743352b9e980afb7e156fc9ac9cff1308b2`, environment Production, status success,
  created 2026-10-26.
- Public `app.digitalgate.com.au` resolves through Vercel DNS and returned HTTP 200
  with Vercel/Next.js headers. No customer content was retrieved.
- The security release candidate is PR #1032 at
  `e10b24752db743447d9456c94577c54fb36cdb3d`: open, draft, based on a feature branch,
  and not retargeted, merged or deployed.
- Stage 2C commit `b7633016` is review/evidence code, not serving application source.

**Critical identity mismatch:** serving source `8d639743` is not candidate
`e10b2475`. The 26th migration and gate revision 2 exist in Production, but the
matching admission, coordinator, entitlement and onboarding code is not serving.

Vercel CLI/API authentication was unavailable. The actual Vercel deployment ID,
alias-to-deployment mapping, READY state, effective build settings and captured
environment-variable metadata remain **UNVERIFIED**.

## 3. Runtime configuration

Code-level review of `package.json`, `vercel.json` and `scripts/verify-env.mjs`:

- `postinstall` runs Prisma generation only.
- `build` runs generation/client checks and `next build --webpack`.
- `prebuild` runs the static/unit/security test suite.
- No Vercel build/install hook runs migrations, seeds or Production reconciliation.
- `vercel.json` contains crons and branch deployment suppression; main is not
  deployment-suppressed.
- Required environment-variable names are declared; no values were read or published.

**UNVERIFIED:** effective Vercel build configuration, captured environment-variable
version, serving `DATABASE_URL` role/endpoint, `DATABASE_URL_UNPOOLED` scope and the
actual serving runtime identity. The runbook records `dg_app_runtime` as absent and
the serving credential/role as unverified; `dg_preflight_reader` is not the
application runtime role.

## 4. Database security and default privileges/RLS

The approved procedure is committed at
`docs/commerce/release-1025/STAGE3-DEFAULT-PRIVILEGES-RLS-READONLY.md`
(SHA-256 `d26e99255e6b9fe3cb49a0d95a98d32999b3f8c22ebe0f40e49852825a34829f`,
Stage 3 documentation commit `22a3ed00`).

Review confirms it is strictly read-only:

- One `BEGIN READ ONLY` transaction with local statement/lock timeouts.
- Catalog `SELECT` only: `pg_default_acl`, `pg_class`, `pg_policy`,
  `aclexplode`, target relation ACL/owner/RLS metadata.
- No `SET ROLE`, no temporary tables, no writes, no grants, no DDL, no customer rows.
- No credentials are embedded.

It was syntax-validated only on disposable/review PostgreSQL 18.6 with synthetic
objects; it was **not executed against Production**.

No appropriately restricted Production credential was available to this session.
Consequently the procedure was not executed. Production default-ACL results and RLS
for all public tables remain **UNVERIFIED**. Admission-table RLS remains PASS from the
Stage 2C expected-catalog/receipt. Any unexpected default ACL, policy or target-table
RLS is a STOP condition.

## 5. Neon recovery readiness

Existing evidence:

- A 26 October Production snapshot receipt reports SUCCESS, source Production,
  inventory present, no requested/reported expiry, retention “until deleted,” and
  documented protected restore/candidate finalisation. No restore was performed.
- The snapshot predates the 27 October admission migration and later writes; it is
  not a current recovery point for the certified 26-row/gate-revision-2 state.
- Protected-branch finalisation has not been independently executed.
- No current PITR eligibility, current retention/expiry confirmation or accepted RPO
  evidence was available. No Neon API/CLI access was available.

**Recovery readiness: UNVERIFIED / HOLD.** A current read-only snapshot/PITR
inventory, retention confirmation and owner RPO acceptance are outstanding. A
fresher snapshot or restore would require separate authority and is not authorised.

## 6. Stripe Live billing reconciliation

Live Stripe access was unavailable: the configured Stripe CLI reports that the live
mode API key must be re-configured. No live key was derived from another source, no
test-mode result was substituted, and no Live customer, subscription or Checkout
Session query was executed.

Existing Stage 2C database evidence records 6 subscriptions / 6 exemptions, zero
admission permits and zero admission-audit rows. It does not include Live Stripe
customer identities, open/expired Checkout Sessions, duplicate subscription or
payment-attempt inventory, or the two named founding-customer account states.

Prior customer-acceptance evidence records both named founding-customer accounts as
NO-GO/unresolved. Current Live billing reconciliation, duplicate detection and
account-specific status remain **UNVERIFIED**; no customer identifiers are included
in this report.

## 7. Release candidate review

- PR #1032 exact head: `e10b24752db743447d9456c94577c54fb36cdb3d`.
- Exact-head `checkout-release` CI: PASS (completed 2026-10-27).
- Dependencies: #1034 merged into #1032; #1028/#1029 remain open/draft; #1033 remains
  open/draft and is not required for this stack.
- The candidate contains the admission/coordinator/entitlement/onboarding changes,
  but it is not serving. The database has the 26th migration and gate revision 2;
  the old serving application does not match the candidate.
- Runtime role package/credential cutover is not verified; `dg_app_runtime` remains
  absent per the runbook.

**Release candidate deployment readiness: FAIL/HOLD.** The consolidated candidate
must be reviewed, retargeted/merged and deployed under separate approvals only after
the identity, runtime, default ACL/RLS, recovery and billing gates pass.

## 8. Verification gates

| Gate | Status |
| --- | --- |
| Stage 2C 26-migration database certification | PASS with limitations |
| Gate blocked, hold inactive, revision 2 | PASS |
| Public Production alias responds via Vercel | PASS (limited) |
| Actual Vercel deployment ID/READY/alias mapping | UNVERIFIED |
| Serving source matches security candidate | FAIL |
| Build/install does not run migrations/seeds | PASS (code-level) |
| Captured environment/runtime identity/endpoint | UNVERIFIED |
| Serving runtime role and `DATABASE_URL_UNPOOLED` scope | UNVERIFIED |
| Default privileges | UNVERIFIED |
| RLS — admission tables | PASS |
| RLS — other/all public tables | UNVERIFIED |
| Neon current branch identity/retention | UNVERIFIED |
| Recovery snapshot/PITR/RPO/finalisation | UNVERIFIED |
| Live Stripe access/identity | UNVERIFIED |
| Subscription/open-session reconciliation | UNVERIFIED |
| Duplicate subscription/payment-attempt inventory | UNVERIFIED |
| Two named founding-customer states | UNVERIFIED (prior NO-GO) |
| Onboarding/billing/checkout smoke | UNVERIFIED |
| Consolidated candidate on main | FAIL |

## 9. Blockers and corrective actions

1. Provide read-only Vercel/Neon access or an authorised operator evidence return for
   serving deployment, aliases, READY, captured env, endpoint/role and `UNPOOLED`.
2. Approve and execute the default-privilege/RLS read-only procedure, or provide an
   operator-run sanitised evidence return.
3. Reconfirm snapshot/PITR retention and RPO; obtain owner acceptance or separately
   approve a fresher snapshot.
4. Re-authenticate a read-only Live Stripe key and perform customer/subscription/open
   session inventory and reconciliation; no mutations.
5. Complete the consolidated candidate merge/retarget/deployment review; rerun
   exact-head CI at the final base.
6. After deployment, run the approved smoke matrix and keep checkout blocked.

## 10. Approval required

Separate owner approvals are required for:

- Read-only provider/operator evidence collection.
- Default-privilege/RLS procedure execution or evidence return.
- Recovery/PITR/RPO acceptance or fresher snapshot.
- Read-only Live Stripe reconciliation.
- Candidate merge/retarget/deployment and post-deployment smoke.

No Production operation is authorised by this report. Production checkout remains
**CLOSED**.

## 11. Handoff

- Stage 3A: **NO-GO / HOLD**.
- Stage 2C offline certification remains PASS with documented limitations.
- No secrets, customer identifiers, raw captures or private database captures were
  published.
- Stop for owner review.
