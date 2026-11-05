# DigitalGate — Stage 3B Production Access and Evidence Recovery

Prepared: 2026-10-28  
Stage 2C certification: `b7633016e89309d0bc21a31e92a06a7c50e537b1` — PASS with limitations  
Stage 3A documentation: `33778c1f02cb69dad6bbbd326446fa0c6dab45d6` — NO-GO / HOLD  
Stage 3 documentation: `22a3ed00746837b34af185e4310ce18efac14f39`  
Worktree: `review/production-preflight-sql-20261028`  
Production checkout: **CLOSED**

## 1. Decision

**Stage 3B: NO-GO / HOLD — access recovery required.**

No authoritative provider access was available for Vercel, Neon or Live Stripe, and
no approved restricted Production database credential was available. The missing
evidence is primarily an access blocker, not a newly observed Production defect.

The serving-source mismatch is an actual release-state blocker: Production serves
`8d639743`, not the security candidate PR #1032 at `e10b2475`.

No Production writes, grants, migrations, deployments, Stripe mutations,
configuration changes or checkout actions were performed.

## 2. Access discovery

| Provider | Installed | Authenticated | Read-only scope | Result |
| --- | --- | --- | --- | --- |
| Vercel | No CLI | No auth file/token | Not established | UNVERIFIED |
| Neon | No CLI | No config/token | Not established | UNVERIFIED |
| Stripe | CLI 1.50.8 | Live key needs re-configuration | Not established | UNVERIFIED for Live |
| Production DB | `psql` installed | No approved restricted credential | Not established | UNVERIFIED |

No token, key, password, connection string or secret value was printed, copied or
repurposed. No unrelated credential store was searched. The unavailable Live Stripe
access was not substituted with test-mode data.

## 3. Verified facts available without provider access

- Remote main: `8d639743352b9e980afb7e156fc9ac9cff1308b2`.
- PR #1032: open, draft, head `e10b24752db743447d9456c94577c54fb36cdb3d`, base
  `feat/restricted-runtime-permissions-20261027`; exact-head `checkout-release` CI
  passed.
- Latest Vercel-bot Production deployment record: source `8d639743`, environment
  Production, status success. This is not the PR #1032 candidate.
- Public `app.digitalgate.com.au` resolves through Vercel and returned HTTP 200 with
  Vercel/Next.js headers. No customer content was retrieved.
- Stage 2C database evidence: 26 finished migrations, admission catalog present,
  gate blocked with hold inactive at revision 2, 6 subscriptions/6 exemptions, zero
  admissions/audit.
- Build/install lifecycle has no migration or seed hook: `postinstall` runs Prisma
  generation; `build` runs checks and Next build; `prebuild` runs tests.
- A 26 October Production snapshot receipt exists, source Production, no requested
  expiry, retention “until deleted,” protected restore documented. It predates the
  27 October admission migration.
- The default-privileges/RLS procedure is committed and reviewed as strictly
  read-only. It was not executed against Production.

## 4. Unverified facts requiring provider access

### Vercel

- Actual Vercel deployment ID and alias-to-deployment mapping.
- Production READY state and current serving project.
- Effective project/build settings.
- Environment-variable names, targets and captured version metadata.
- Whether the serving deployment corresponds to main `8d639743` or another source.

### Neon and database security

- Current Production project/branch/endpoint identity.
- Current snapshot inventory, retention/expiry, PITR availability and latest recovery
  point.
- Protected-branch restore/finalisation route and RPO acceptance.
- Production default ACLs.
- RLS flags/policies for all public tables beyond the certified admission-table
  evidence.
- Current runtime role, serving credential/endpoint and `DATABASE_URL_UNPOOLED`
  scope.

### Stripe Live

- Live customer, subscription and Checkout Session inventory.
- Open/expired session reconciliation.
- Duplicate subscriptions or payment attempts.
- The two named founding-customer account states; prior evidence records both as
  NO-GO/unresolved.
- Live Price/amount/trial reconciliation.

### Release and smoke

- Onboarding continuation, billing and checkout smoke against the candidate.
- Old invocation/alias termination.
- Post-deployment gate and zero-admission verification.

## 5. Release matrix

| Gate | Status |
| --- | --- |
| Stage 2C database certification | PASS with limitations |
| Gate blocked, hold inactive, revision 2 | PASS |
| Latest Vercel-bot Production deployment record | PASS (metadata only) |
| Public Production alias responds via Vercel | PASS (limited) |
| Serving source matches PR #1032 candidate | FAIL |
| Actual Vercel deployment/alias/READY/env identity | UNVERIFIED |
| Vercel effective build settings | UNVERIFIED |
| Neon branch/endpoint/snapshot/PITR/retention | UNVERIFIED |
| Runtime role/credential/endpoint/`UNPOOLED` | UNVERIFIED |
| Default privileges | UNVERIFIED |
| RLS — admission tables | PASS |
| RLS — other/all public tables | UNVERIFIED |
| Live Stripe access/identity | UNVERIFIED |
| Live subscription/open-session reconciliation | UNVERIFIED |
| Duplicate subscription/payment-attempt inventory | UNVERIFIED |
| Two named founding-customer states | UNVERIFIED (prior NO-GO) |
| Onboarding/billing/checkout smoke | UNVERIFIED |
| Consolidated candidate on main | FAIL |

## 6. Minimal safe operator actions

### Vercel

- Owner/operator authenticates the Vercel CLI with viewer access to the DigitalGate
  project, or injects a project-scoped read-only token through the approved private
  secret mechanism.
- Collect deployment ID/source/READY, production aliases, project settings and
  environment-variable names/targets/captured version metadata. Never retrieve values.
- Confirm whether the alias currently serves `8d639743` or another source.

### Neon and database

- Owner/operator provides read-only Neon Console/API access or installs and
  authenticates an approved read-only Neon CLI.
- Collect branch/endpoint identity, snapshots, PITR/retention and recovery limits.
- Provide the existing restricted `dg_preflight_reader` credential through an
  approved private path, or have an authorised operator run the committed read-only
  default-privilege/RLS procedure and return sanitised aggregates.
- Do not grant elevated privileges, alter the reader role or use an owner credential.

### Stripe

- Owner re-authenticates Live mode (`stripe login`) or injects a restricted Live
  read-only key through the approved private secret mechanism.
- Confirm `livemode=true` with a read-only balance/account check before inspecting
  records.
- Perform read-only Checkout Session, subscription and customer inventory; return
  only sanitised counts and pseudonymous status. Do not create sessions, change
  subscriptions or use test-mode data.

## 7. Recommended next release action

Do not advance the release. The next separately approvable action is a read-only
provider/operator evidence collection under the three access paths above, followed by
owner review of the default-privilege/RLS and recovery evidence. Candidate merge,
deployment and checkout activation remain separate approvals.

## 8. Handoff

- Stage 3B: **NO-GO / HOLD — access recovery required.**
- Actual blockers: missing Vercel/Neon/Live Stripe access, missing restricted DB
  credential evidence, serving source mismatch, unverified runtime/recovery/default
  ACL/Live billing/smoke.
- Stage 2C certification remains PASS with documented limitations.
- No secrets, customer identifiers, raw captures or private database captures were
  published.
- Production checkout remains **CLOSED**.
