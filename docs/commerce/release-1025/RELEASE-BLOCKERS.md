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

Detailed customer identities, provider mappings and operational security evidence belong in the private operator handoff, not this public repository.

1. **Exact-head CI — release engineer.** Require checkout-release and commercial reconciliation on this PR's actual head.
2. **Effective serving authority — deployment/database custodian.** Privately establish the actual serving identity, verify required/prohibited effective privileges and approve only the reviewed least-privilege cutover. Inspection sessions do not prove serving authority.
3. **Migration and recovery — operator with release engineer.** Review additive admission migration and explicit recovery objectives; validate rollback and approve cutover separately. Preserve audit history; code rollback must not drop additive data.
4. **Hosted acceptance — operator provides existing private test connection; release engineer executes.** Run signup/sign-in, plan choices, exact trial duration, signed webhook/replay, lifecycle recovery, tenant denial and existing-business access against this exact candidate. No automatic previews or unrelated database branches.
5. **Existing business acceptance — operator with release engineer.** Verify authenticated access, configured industry selections and operator authority without fabricating billing or provisioning by name. Preserve Coming Soon controls.
6. **Provider pairing and catch-up — provider custodian.** Verify signing/account/environment pairing, accepted receipts, old invocation drain and authorized replay disposition privately.
7. **Customer acceptance — customer chooses; operator authorizes.** Saved draft selections are not consent. Confirm plan, add-ons, displayed total and trial before separately approved activation.

Checkout remains HOLD until all mandatory evidence is accepted and explicit release authorization is given. No irreversible customer changes, provider credential rotation, live charges or Production deployment are authorized by this PR.

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
