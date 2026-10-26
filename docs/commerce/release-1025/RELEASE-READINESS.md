# PR #1025 — consolidated checkout release readiness

Requirements: `platform.auth`, `detach.portal_billing`, `crm.companies`.
Prepared 23 October 2026 on separate branch
`fix/checkout-release-readiness-20261023`, starting at release
`d71be3b9b13a2aeb4fe0fb02e0dfbb6a77c17048`, reviewed against main
`8b01687fc235d16db6467a91551247e3f69444f9`. Existing candidate is untouched.

## 26 October security-update addendum

On detached worktree `/private/tmp/dg-checkout-next-security-20261026`, the pinned
candidate at `e9f6b865b098f44db4d0449c46d33a159fe83964` received a targeted update
to Next.js 16.4.1 for GHSA-p3m5-59mp-jv5r, with React and React DOM aligned to
19.3.1 for the existing authenticated shell's stable ViewTransition API.
Local evidence: 389/389 checkout-release tests, TypeScript, the
declared Webpack production build with all 457 pages, and whitespace validation
passed. See `NEXT-SECURITY-UPDATE-20261026.md` for the exact dependency closure,
image advisory disposition, warnings and remaining operational gates.

The final React 19.3.1 compatibility validation ran the complete `npm run build`,
including prebuild, and generated all 457 pages. Authenticated local synthetic
AppShell navigation and a CRM hard-reload/hydration check passed with zero browser
errors. Exact-head GitHub CI must pass on the updated commit after publication.
Current deployment/runtime, webhook invocation
termination, recovery-point acceptance, live Stripe readiness and signed purchase
reconciliation remain unverified operational gates; this local change does not
authorize Production release.

## VERIFIED — implementation, local validation and GitHub CI

PR #1025 remains draft, mergeable, with no check runs at review. Its 177-path delta
integrates coordinator, verified Stripe purchase projection/shared enforcement,
Finance beta/selection gates and guarded webhook handling. Main already contains
merged #1016 guard. Do not repeat the historical #1016/#1006/#1015 merge instructions;
#1025 is the combined candidate, with guard-only deployment still an operational
prerequisite if it is not yet serving. No force-push or direct main publication.

Scope inspection: pages/APIs/integrations enforce canonical purchases and retain
roles/tenant/beta/selection restrictions; customer profile/onboarding selections do
not independently grant paid access. Lifecycle/trial/grace/cancellation and failed
lookups are fail-closed. Checkout checks configured actual price/currency/interval,
persists immutable requests and scopes idempotency/recovery to provider/account.
Verified webhook projection reads current Stripe state under organisation locking;
custom offer checks remain separate and strict. Reconciliation defaults dry-run,
requires exact target/evidence-bound Ed25519 approval for writes, and uses CAS/audit.

Broader-looking delta includes leaf import boundary fixes in Founding/partner/
referral/website/navigation components, shared Industry/premium gates and Finance
product-limit copy. Those are integration/access/build compatibility changes,
not new Prospecting/Aida features. The large Roadmap diff includes historical
formatting; it is not application behaviour. No unrelated feature changes were
added during this readiness work. The final full build checks existing features.
No new confirmed application P0/P1 was identified in the reviewed release paths;
operational gaps remain explicit below. This is engineering preparation, not an
independent certification or permission to release.

Fresh checks: 362 focused + 14 new preflight checks; 44 coordinator DB + 126
checkout/lifecycle DB + 27 reconciliation DB + 6 atomic DB + 3 operator SQL tests; 2 built-browser
boundary tests. **584 passed, 0 failed** across these final groups; required full
prebuild regressions also passed (overlap not double-counted). Standalone TypeScript
exit0. Full npm run build exit0, Next16.2.12, existing Webpack command, generated
Prisma6.19.3, all457 static pages; 100seconds. No bundler/lockfile changes.
Exact logs/hashes/timestamps and reused external evidence: `validation-evidence.json`.
Initial coordinator runner failure and an artifact test run before artifacts existed
were diagnosed and corrected; final results above supersede those attempts.

GitHub CI [run 39910874550](https://github.com/w7tcv2m7tk-netizen/dg-platform-web/actions/runs/39910874550)
passed on `efe48949baf66334003504e218aaeeb04952193e`, completing
2026-10-23T06:25:17Z. Every job step succeeded: 376 focused checks, 206 disposable
PostgreSQL checks and 2 browser-boundary checks (584 total), standalone TypeScript,
full npm build including prebuild and 457-page static generation, schema/lockfile
integrity and whitespace checks. This is isolated GitHub runner evidence, not a
Production cutover. Run 39910633041 was cancelled by the newer head's run.
The subsequent integration-safety config/test/documentation delta must also pass
its PR checks; report that exact run and commit at integration approval.

Production read-only: 25/25 ledger/checksums match certified corrected runner,
attempt/gate constraints and entitlement columns exist; blocked=true, hold=false,
revision0, no outstanding admission. Thus missing schema is no longer a current
blocker. No DDL, ledger resolution or customer data write was performed.

## NOT VERIFIED / BLOCKED

Final deployed routing/source/env identity, old invocation
termination, live Stripe event/catalogue readiness, signed legacy purchase cutover,
catch-up/replay and Production smoke/customer activation. Previous provider acceptance
22/22 is valid historical evidence, not a run against the newly integrated deployed
source. Existing npm audit findings require explicit security disposition; no
unreviewed dependency update was made.

## REQUIRES OWNER APPROVAL — minimum controlled sequence

1. Review this separate commit and publish/integrate through #1025 without losing
   reviewed dependencies; require passing CI on the final head and recheck no
   Preview/Neon provisioning. Both the review branch and integration target are
   explicitly deployment-suppressed; Production deployment rules are unchanged.
2. Reverify current database/recovery preconditions. **No migration execution now.**
3. Verify/deploy only reviewed guard-capable main, routing and old invocation
   completion plus verified-runtime safety margin, keeping checkout closed.
4. Approve hold, drain and required live Stripe event selection. Dry-run legacy
   reconciliation; independent exact-plan review/signature before any write.
5. Only after verified purchases are reconciled approve #1025 full deployment.
   Gates become active immediately when it serves. Run fresh catch-up dry-run,
   release hold, verify actual retries/replay and final sweep.
6. Pass Production smoke and acceptance, separately approve checkout opening and
   individual invitations. AIM uses standard AUD398 monthly/14-day trial; My Venue
   Clean confirms its actual standard basket. Both preserve existing organisation
   and saved progress. Optional integrations can follow.

Executable operator checkpoints and recovery limits:
- `PRODUCTION-MIGRATION-RUNBOOK.md`
- `STRIPE-CUTOVER-RUNBOOK.md`
- `CUSTOMER-ACCEPTANCE-CHECKLIST.md`
- `ROLLBACK-PLAN.md`
- `RELEASE-BLOCKERS.md`

**GO for review/local integration preparation. HOLD for Production release and
customer invitations pending the listed evidence and separate approvals.**
