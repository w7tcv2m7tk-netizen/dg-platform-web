# Isolated application-access restoration — 5 November 2026

Owner authority: P0 Production Restoration & Controlled Release request, 5 November. Requirements `platform.auth`, `crm.companies`, `detach.portal_billing`, `platform.roadmap`. Status: local preparation; Production HOLD.

## Selected route: Option A, conditional

Start from the actual serving/main source `8d639743352b9e980afb7e156fc9ac9cff1308b2`, not the 51-commit PR #1038 stack. Branch `release/access-restoration-only-20261105`. Extract the reviewed application-access correction and essential tenant/session/demo safety dependencies. Do not merge or cherry-pick the consolidated stack wholesale.

The direct correction applies to main apart from governance, branch suppression and a test file absent on main. Those are reconciled explicitly. Actual tests exposed indispensable dependencies: membership reads must not seed staff access; stale tenant selections must fail closed and use explicit recovery; profile identity must be Clerk-user-and-active-organisation bound; first-business recovery must not create duplicate tenants; canonical business limits require concurrency protection. Include their reviewed implementations and regression coverage. Keep legacy `fetchPortalMe` callers working through one exact-active-session compatibility boundary instead of importing unrelated connectors/pages from the larger stack.

Excluded: new admission application paths and migration files, runtime-identity diagnostic/store/UI, runtime role/grant/verifier tooling, provisioning-receipt permission changes, broader onboarding save/completion changes and the wider commercial governance tooling. The restoration adds no database migration, dependency, provider setting, price or Stripe configuration. Main's existing checkout and webhook handlers remain unchanged; checkout stays closed.

The external certified reconciliation detector found four existing main presentation/documentation discrepancies (missing Starter card, incorrect starting-price metadata and two missing bundle definitions). Include only the previously certified public pricing HTML and nine-line bundle documentation correction from #1037; prices and billing are unchanged. The larger safeguard tooling remains in #1037/#1038; its certification does not transfer. This restoration is not certification that all pending checkout work is live or that checkout may open.

## Fresh Production evidence, limited to approved reader

Protected Production provider identity matches approved project/branch/Direct endpoint. Serving alias remains the current main deployment; no restoration deployment is authorised.

`dg_preflight_reader` authenticated with verify-full TLS/hostname verification and required channel binding, read-only transaction, 10-second statement and 3-second lock timeouts. Role has no elevated attributes or memberships. `dg_app_runtime` is absent. Reader identity is not serving application identity.

26 finished migration entries; the original25 recorded checksum/applied-step/finished/rollback fields match the frozen reference. Admission checksum matches the approved capsule. No DDL or ledger operation executed. Current gate: blocked=true, hold=false, revision=2. Admissions=0; audit=0; processing/failed receipt counts=0. Six canonical exempt subscription rows exist.

Reader has no SELECT on organisations, so exact exemption roster identity/Clerk mapping, selected Industry templates, enabled apps and rollout flags remain unverified. No substitution of an owner credential, grant expansion or identity inference from names was performed. No Production record correction is justified until those facts are captured.

## Release gates

1. Exact immutable organisation/Clerk bindings and canonical selections/flags must be attested through an authorised private owner-assisted read-only capture. Do not expand reader privileges merely to complete this task.
2. Actual serving runtime identity must be tied to the exact immutable deployment configuration or runtime session. Catalogue role existence and current Vercel variable names cannot prove it. `dg_app_runtime` absence means the documented intended single non-owner role is not established.
3. Validate the restricted role against the actual deployed module surface before any separate role/credential cutover. This code release does not provision roles or expose owner credentials to runtime.
4. Recovery: current six-hour history and an old manual recovery point do not meet the approved seven-day lookback/15-minute RPO/two-hour RTO. A fresh recovery point, approved retention change and protected-restore capability evidence require separate approvals; do not create or alter them implicitly.
5. Authenticated hosted acceptance on this exact isolated candidate remains required. Earlier Starter/Growth or #1038 results do not certify the new tree. Identity allowance is exhausted; create no additional identities without approval.
6. Full local validation and independent acceptance must be recorded at the exact final candidate. No source publication/deployment is implied by a local commit.

## Deployment and abort plan — not executed

After all gates pass, obtain one explicit owner approval for the pinned restoration source and normal Production deployment. Keep checkout blocked, webhook hold unchanged and Stripe events unchanged. Verify exact source/tree, READY, alias routing, current credential binding, exempt customer navigation and direct/API access, exact selected industries, unauthorised denial, organisation switching, receipt/claim stability and error monitoring. No live payment or customer invitation is part of restoration.

Abort before merge/deployment for source divergence, failing checks, incorrect organisation identity/selection, unknown privileged runtime, missing recovery or uncontained hosted testing. If deployed acceptance fails, require the approved owner rollback action to the current guard-capable source with valid current credentials. No database restore, schema reversal, ledger repair, hold change or automatic checkout opening. Application rollback is the normal containment for this schema-free patch; database recovery is a separately governed contingency.

## Completed local validation

489 checkout assertions (including20 application-policy cases and4 compatibility profile boundary cases);84 security;171 checkout compatibility;14 navigation/Industry tests. Disposable PostgreSQL18:180 compatibility/business cases, including atomic creation, duplicate prevention, lifecycle cancellation locking, tenant selection and a narrow non-owner fixture role. This is not certification of the complete Production runtime grants. Both owned clusters were stopped and destroyed. TypeScript, full prebuild/build457 pages and whitespace checks passed. Changed-code lint passed with eight existing unused-variable warnings. The external previously certified commercial detector read this exact tree:57 checks and zero findings after including only the existing approved pricing presentation/documentation fix. The standalone npm commercial command is absent on serving main; no claim that #1038's hosted certification transfers.

The initial Finance test fixture had expired on1November; copied the previously certified future-boundary fixture without changing runtime trial terms. Old tests requiring implicit staff demo grants were replaced by the existing reviewed negative grant assertions. Initial extraction failures are retained as evidence, not suppressed. The external reconciliation initially reproduced four existing presentation/documentation findings, then passed after the two certified source corrections.

New compatibility boundary verification exercises actual `fetchPortalMe`, proving legacy callers resolve the exact active membership and missing/stale identities never fall back to cached email or another tenant. All other extracted runtime source is byte-identical to the reviewed #1038 source apart from this bounded compatibility adapter and restoration-specific documentation/test/CI wiring. A fresh independent whole-candidate acceptance and hosted authentication remain outstanding. No claim of a fully authorised Production GO.
