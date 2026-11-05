# Local checkout consolidation certification — 3 November 2026

Requirements: `platform.auth`, `detach.portal_billing`, `platform.roadmap`.
Owner authority: local-only consolidation, two targeted P1 fixes, normal local merge of certified #1037, isolated tests and independent review. **No publication/PR merge/deployment/Production authority.**

## Decisions

- P1 AUTHENTICATION FIXES: **PASS locally**.
- COMMERCIAL INTEGRATION: **PASS locally**.
- CHECKOUT RELEASE CANDIDATE: **PASS for local certification**.
- READY FOR INDEPENDENT REVIEW: **YES**; fresh scoped review completed PASS, final whole-candidate hosted acceptance still gated.
- PRODUCTION: **HOLD**.

## Exact source and preservation

Original auth base `3c0281ef724682c76b14adb66a5600e1f10b2a74`.
All six unpublished auth commits are retained by ancestry:38759e36,45590711,c7e1dbc0,c67df401,2ba5e5ba,3c0281ef.
Original remote heads verified read-only before work: #1036 `470f3a3c4b8788f12a5d138e2cf196f827fe9000`, #1037 `4928b8ea6fe994ad398fedd68c183a55f95dcfb0`; neither modified.

Isolated branch: `integration/checkout-consolidation-20261103`.
Worktree: `/Users/okcomputers/Developer/DigitalGate/Worktrees/dg-checkout-consolidation-20261103`.

- Local P1 fix: `8cccff1bfbdb11a96e81a6cbff73419a9702fe2f`.
- Normal local merge: `a8e0484fd0c52b824d3df2ee569a564145d84d39`, parents exactly the P1 fix and certified commercial4928b8ea.
- Final tested source: **`15f3a96ccb5bcee4dd1bba1385bd91cfeb338076`** (two query-format corrections after the first real DB test).
- A later documentation-only commit records this report/Roadmap; source under test remains byte-identical.

Only expected conflict was docs/ROADMAP.md. Both complete original histories were preserved (each original line checked present); no unexpected conflict/source drift occurred. package.json and Finance2099 fixture auto-merged, then were tested on combined source.
Certified commercial detector/helper/mutations/public pricing/staff lock are byte-identical to4928b8ea. Checkout admission/coordinator/hold/Finance/provisioning/role-verifier/schema and lockfile match3c0281ef. Admission migration SHA-256 remains `a60c03ab49b4b1969e52c4edccb06f73117faac577271400c63eea9e2ec472f6`. No migration SQL changed or applied to Production.

Final source before documentation touches160 paths relative to current main8d639743: this is the disclosed full inherited stack, not just two fixes or commercial files. The new report adds one path; inventory/fingerprints are retained with local certification evidence. No existing worktree/branch was reset, rebased, overwritten or deleted.

## P1 changes and exact local file inventory

1. `src/components/PlatformShellLoader.tsx`: intercept only stale selection with actual memberships. A signed-in memberless user (including stale-cookie case) reaches existing first-business onboarding children. No tenant fallback, auto-provisioning, cookie reassignment or access grant occurs. Existing first-business POST refuses existing memberships and signed-out requests.
2. `scripts/lib/auth-acceptance-database.mjs`: new strict owned-fixture guard: PostgreSQL scheme, exact127.0.0.1, explicit ephemeral expected port (not5432), dg_checkout_test database, checkout_test username/current role, server address/port/database and exact database-side marker. Missing/mismatched/ambiguous rows and query faults fail closed with a generic message.
3. `scripts/test-auth-clerk-browser-acceptance.mjs`: check real DB identity before browser/provider access and before every membership mutation, including restore/cleanup. Require DG_AUTH_ACCEPTANCE_DB_PORT. Keep the exact-user/tenant/same-origin protections. Do not execute this harness against an unverified app fixture.
4. `scripts/test-auth-acceptance-database.mjs`:18 tests cover positive fixture, rejected host/port/db/role/marker, no query on malformed settings, no mutation on server mismatch, sanitisation and guarded cleanup wiring.
5. `scripts/test-auth-acceptance-database-db.mjs`:3 real owned PostgreSQL tests (full identity accepted, wrong marker denied, missing marker cannot query).
6. `scripts/test-session-recovery.mjs`: existing4 plus7 executable server-shell/first-business tests: memberless stale cookie preserves onboarding, normal chooser remains scoped, no signed-out tenant, explicit first-business creation only, existing members/session rejected, signed-out creation rejected.
7. `scripts/run-checkout-release-tests.mjs`: new fixture guard included in release/security regression execution.
8. `scripts/run-checkout-compatibility-db-tests.mjs`: real fixture identity test included in existing owned runner.
9. `.env.example`: documents expected ephemeral fixture port; no credential or provider setting changed.

The commercial merge brings its11-file existing PR scope, including the accepted six-file safeguard correction; existing auth/security stack remains intact. Report/Roadmap documentation is additional evidence only.

## Actual validation (Node24.4.1, Prisma6.19.3, owned PostgreSQL18)

All below are actual executions on the integrated source, with minimal subprocess environments excluding provider credentials. Counts overlap; do not sum as distinct assertions.

| Check | Actual result |
|---|---|
| Commercial reconciliation |57 checks / zero findings|
| Commercial mutation safeguards |44/44 PASS; all5 independently found counterexample families rejected|
| Real checkout-builder matrix |24 synthetic scenarios within the safeguard suite; real builder, fake Stripe and coordinator boundaries|
| Checkout release |657/657 PASS|
| Security |84+35+9 =128/128 PASS|
| Environment pairing |34/34 PASS|
| Focused auth/recovery/origin/tenant/fixture guard |71/71 PASS|
| Initial targeted P1 fixes |29/29 PASS|
| Disposable coordinator |44/44 PASS|
| Disposable compatibility + schema parity |256/256 PASS (64+147+27+6+3+6+3)|
| Disposable permission tests |56/56 PASS|
| Shared checkout-client/read-only/pool identity |7 PASS groups|
| Durable one-use control database |33/33 PASS|
| Mock compatibility |171/171 PASS|
| Compatibility artifacts / client boundary |1/1 +1/1 PASS|
| Marketing/Roadmap/Brain |21/21 PASS|
| Pricing/entitlement |five assertion groups PASS|
| Prisma validate |PASS; no database connection (dummy local datasource for validation)|
| TypeScript |PASS, incremental output disabled|
| Lint |PASS across53 changed JS/TS files vs #1036;0 errors,2 inherited automation-page warnings|
| Full NODE_ENV=production npm run build,4GB heap |PASS including complete prebuild, TypeScript,457/457 pages|
| Whitespace / integrity |PASS; migration and commercial/source fingerprints preserved|

### Failure preserved, diagnosed and corrected

First integrated compatibility run passed its earlier253 cases but the new positive fixture check failed; the other2 new negative checks passed. The runner stopped and destroyed its cluster; remaining database suites were halted.
A separate owned diagnostic cluster established `inet_server_addr()::text` returns127.0.0.1/32 while `host(inet_server_addr())` returns127.0.0.1. It was stopped/destroyed. Commit15f3a96c changes only those two read-only query expressions, keeping exact address equality. Compatibility was rerun256/256, followed by all remaining suites. No automatic Production retry or external connection occurred. Initial red logs are retained, not discarded.

### Independent review

A fresh read-only reviewer inspected both targeted fixes, actual server-shell/first-business test execution, database/cleanup boundaries, merge ancestry and commercial/role/schema preservation; independently reran29 focused tests. Updated review of15f3a96c and the real256-case DB result returned **PASS, no new P0/P1/P2 finding in this scope**. The reviewer did not modify files. This does not substitute for hosted exact-head CI or whole-release owner acceptance.

## Remaining risks / release gates

- Real Clerk/browser and hosted Stripe sandbox flows were **not run**; no credentials retrieved or live provider operations performed. Prepared harness requires an owner-attested isolated application using the exact same marked disposable DB, correct Development instance and contained webhook before running. DB guard proves the harness connection; it does not remotely attest the web application's captured credential.
- Existing global first-organisation concurrent-request race behaviour is unchanged and not certified by these mocked sequential POST tests. No auto-create was introduced. Do not infer account-wide seat/business guarantees from local constants alone; complete final selected-plan hosted acceptance.
- Ubuntu/PostgreSQL16 and exact published-head CI remain pending publication authority. Local tests use PostgreSQL18 and inherited exact-lock dependencies; no install/upgrade or dependency lock change.
- Existing dependency advisory disposition, actual Production runtime role/effective privileges, pooled/unpooled credential isolation, Neon branch/TLS,26-entry ledger, open Live sessions/containment, recovery/PITR, current gates/hold/drain, signed reconciliation and customer activation remain separately gated. No historical observation is represented as fresh Production proof.
- Current inherited AGENTS/handoff references to old PR candidates remain historical; this report identifies the current local source without rewriting old evidence or approvals.
- All changes are LOCAL. No GitHub branch/PR metadata update, PR merge/closure, deployment, provider config/secret change, Production role/grant/migration, admission or invitation.

## Separately authorised publication sequence (NOT EXECUTED)

After owner approval, reverify final local hashes/clean worktree, remote #1036 still470f3a3c and #1037 still4928b8ea, main/base state and automatic Preview suppression. Existing #1036 branch has an explicit deploymentEnabled:false rule; also freshly check provider settings. STOP on divergence or suppression uncertainty.

Use the final documentation-inclusive local SHA from the certification receipt; do not publish a moving/unreviewed HEAD. Non-force push only to existing `review/pr1035-finance-beta-20261101`. No new remote PR/branch required. If remote branch diverged, STOP; never force.

```bash
cd /Users/okcomputers/Developer/DigitalGate/Worktrees/dg-checkout-consolidation-20261103
git status --porcelain
git ls-remote origin refs/heads/review/pr1035-finance-beta-20261101
# Compare against470f3a3c4b8788f12a5d138e2cf196f827fe9000 before proceeding.
git push origin <FINAL_ACCEPTED_SHA>:refs/heads/review/pr1035-finance-beta-20261101
gh workflow run commercial-contract.yml --repo w7tcv2m7tk-netizen/dg-platform-web --ref review/pr1035-finance-beta-20261101
gh workflow run checkout-release.yml --repo w7tcv2m7tk-netizen/dg-platform-web --ref review/pr1035-finance-beta-20261101
```

Require exact-head commercial/checkout CI, security, owned PostgreSQL16 suites, TypeScript and full build; verify no deployment/alias change. Retargeting #1036 to main requires explicit approval for that metadata operation. Do not mark ready/merge/deploy or close superseded PRs under publication-only authority. Main is Production-linked; merge requires a separate controlled release approval. Keep global checkout blocked and Production HOLD.

Local logs/inventory: `/private/tmp/dg-checkout-consolidation-evidence-20261103`.
