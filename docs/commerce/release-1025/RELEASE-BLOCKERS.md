# DigitalGate launch recovery — authoritative blocker register

Updated 7 November 2026 (Australia/Brisbane). Requirements: `platform.auth`, `crm.companies`, `detach.portal_billing`, `platform.roadmap`.
This register supersedes the operational ordering in the historical PR #1025 register; historical evidence remains in Git. Roadmap remains the requirements authority.

**Production checkout: HOLD. Release candidate: existing PR #1039, continued from dc843d58. Serving main: 8d639743. No second PR.**
Neither local results nor GitHub CI certify Production access or authorize deployment.

## Completed code corrections

- Preserved #1039 tenant-bound profile sync, verified operator role, Growth order, canonical exemptions and Creator Coming Soon gates.
- Integrated single-use tenant/user/purchase-bound admission and additive migration from #1038, restricted-role manifest and exhaustive effective-privilege verifier. No Production migration or role provisioning executed.
- Restored unpaid onboarding state saves with serialized profile/state/completion writes. Completion now requires strict exact-tenant canonical subscription evidence, never legacy settings; expired trials, failed reads and missing Stripe identity deny completion.
- Replaced slug-only operator setup authority with verified platform operator authority.
- Verified checkout provisioning enrolls only enabled industry beta flags and preserves explicit false revocations.
- Clerk middleware uses the existing trusted-origin resolver. Commercial contract and restricted-role tests run in exact-head CI. Diagnostic routes/control database are excluded.

## Mandatory remaining gates and responsible action

1. **Exact-head CI — Codex.** Push this normal follow-up to #1039 and require checkout-release plus commercial reconciliation on the actual resulting head. No readiness claim until both complete. Do not reuse dc843d58 checks.
2. **Serving runtime identity/effective permissions — operator/deployment custodian.** The connected Neon inspection session is neondb_owner (CREATEROLE, CREATEDB, BYPASSRLS), not serving evidence. dg_app_runtime is absent in the inspected Production catalog. Establish the actual serving DATABASE_URL role/database/endpoint privately, execute scripts/sql/runtime-role-verify.sql through that same effective identity, and review its failures. Provision only the reviewed restricted role after explicit approval; do not broaden PUBLIC or grant owner rights. A successor runtime witness requires separate deployment approval.
3. **Migration/cutover/rollback — operator with Codex.** Review the additive 20261027 admission SQL, protected recovery access and explicit RPO/RTO; approve exact role/migration/cutover separately. Rehearse recovery in an approved isolated target before Production. Snapshot inventory is evidence of existence only, not successful restoration or retention. Preserve current alias map and serving deployment dpl_2bpF6uUfYhe1xB8ytCHAmjVfzikN. Revert code to 8d639743 with checkout blocked if needed; do not drop additive admission/audit tables as code rollback. See PRODUCTION-RUNTIME-CUTOVER-RUNBOOK.md.
4. **Hosted Clerk/Stripe test acceptance — operator provides existing private test connection; Codex executes.** Current Stripe connector exposes live only. Operator confirmed they will connect existing test credentials. Run normal signup/sign-in, all three Core choices, saved Finance selection, exact 14-day trial, signed webhook provisioning/replay, cancellation/failure/recovery, cross-tenant denial and existing-business access against the exact candidate. No live charge or automatic Preview/Neon branch.
5. **Existing-business authenticated acceptance — operator + Codex.** Read-only Production inspection confirms all eight existing organisations, active Clerk-linked memberships and preserved saved selections. DigitalGate has active dg:staff membership; removed owner membership is not authority. Verify actual sign-in and Command Centre separately. Roe selected only real-estate; CVH short-stay; Aëtherra creator/music-artists must remain selected and Coming Soon. No data correction is justified by current selected-template evidence. Names alone never confer exemption.
6. **Live provider/account pairing and catch-up — operator/provider custodian + Codex read-only.** Live DigitalGate webhook endpoint is enabled at https://app.digitalgate.com.au/api/webhooks/stripe with checkout completed/async succeeded/expired, subscription created/updated/deleted/paused/resumed, invoice paid/failed/action-required and payment failure. This verifies subscriptions, not signature delivery. Verify signing/account/environment pairing privately, accepted receipts, old invocation drain and authorized replay disposition before opening admissions.
7. **AIM acceptance — Nathan chooses; operator authorizes activation.** Existing AIM record has Finance/mortgage-finance-broking, saved professional draft, active linked owner, and no canonical subscription. Saved Growth is not consent. Nathan reviews Starter $99, Growth $249 or Scale $499 plus chosen add-ons; confirm displayed AUD total and 14-day trial before test/live acceptance. Preserve Finance selection and any saved extras pending his confirmation. After all gates pass, request separate approval for controlled AIM admission and Production release; observe canonical trial/entitlement and Finance access. No assumed $398 contract.

## Fresh operational evidence (read-only)

- Vercel still serves main 8d639743 at the same Production deployment and aliases.
- Neon protected Production branch ready; checkout blocked=true, revision=2, webhook hold=false.
- Six canonical exempt subscriptions remain; AIM and My Venue Clean have no canonical subscription.
- All four named restored businesses retain active Clerk-linked memberships and saved industries. This is data integrity evidence, not authenticated hosted acceptance.
- Newest listed manual snapshot: dg-growth-pre-release-dc843d58-20261107, created 6 November 2026 15:00:56 UTC. Retention/restore acceptance unverified.
- No Production data, schema, role, credential, Stripe configuration or charge was mutated during this recovery.

## Validation

The commit carrying this register records local source validation; final GitHub results are authoritative at the linked PR head.
Local Node24: checkout regression634/634 passed after final guard additions. Strict completion actual-route tests61/61. Disposable PostgreSQL: coordinator44; admission64; lifecycle147; reconciliation27; webhook hold6; operator SQL3; provisioning18; effective permissions56, all passed, owned clusters destroyed. Commercial safeguard44/44 and reconciliation57/57. Full prebuild/build457 pages and TypeScript passed after final guard. Changed-file lint exposes two pre-existing set-state-in-effect errors in AdaptiveOnboardingJourney and three pre-existing unused-variable warnings; confirmed the same two errors against dc843d58 baseline; these are disclosed existing lint debt, not a checkout regression. Do not relabel these as a clean lint pass.

## All 12 PR dispositions

Ancestry and per-file blob comparisons are recorded in PR-RECONCILIATION-20261107.json. None of these 12 heads is an ancestor of serving main: main incorporated checkout through a different integration history, so ancestry alone cannot classify supersession.

- #1006: durable coordinator runtime is integrated/superseded by main #1025 and current stronger coordinator. Preserve current webhook/entitlement security; never merge the obsolete tree backward.
- #1015: main contains entitlement work; its outstanding ordered onboarding recovery is integrated here with stronger canonical completion and tenant guards.
- #1026: two engineering/handoff docs deferred; no runtime blocker and no implementation imported. Preserve as proposed operational documentation.
- #1028: admission runtime/schema/migration and negative tests integrated from later reviewed stack; Production migration remains gated.
- #1029: restricted-role manifest/generator/grants/verifier/tests integrated from later reviewed stack; zero Production grants applied.
- #1032: admission/role integration superseded by this candidate; retain current cutover/rollback docs, no need to import stale historical evidence as current certification.
- #1033: exact eight-path onboarding recovery accounted for; runtime and test fixes integrated with stronger completion authority. Historical Roadmap preserved by Git. Candidate must pass updated CI before closure.
- #1035: necessary inherited checkout controls selected; runtime identity diagnostic and separate control database deliberately deferred, not falsely marked merged.
- #1036: onboarding/operator/Finance beta fixes selected, inherited admission/role controls selected. Diagnostic infrastructure deferred.
- #1037: approved price presentation already present in #1039; commercial detector/safeguard and exact-head workflow integrated. No new pricing rule.
- #1038: source for bounded admission/permission/onboarding/Finance corrections. Do not merge wholesale: would regress #1039 role authority, Creator controls and stronger profile sync. Diagnostic/control DB and historical documentation excluded.
- #1039: single continued candidate. Earlier isolated-restoration-only scope is superseded by this explicit launch-recovery request; Production HOLD remains.

Older PRs may close only after the linked candidate checks and file accounting support their individual disposition. Deferred diagnostic/docs work must remain identifiable, not described as deployed.
