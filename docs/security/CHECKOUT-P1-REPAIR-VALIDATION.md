# Checkout security P1 correction — review evidence

Baseline: PR #1032, `fb7a9594bd398cf66d735585c3d68e7f179d9cbd`.
Branch: `fix/checkout-security-p1-20261027`. The correction is stacked on #1032;
it does not change existing PR heads, main, dependencies or migration SQL.

## Security correction

- Validate every effective SELECT/INSERT/UPDATE/REFERENCES column privilege and
  grant option on both permitted and excluded relations, including PUBLIC.
- Validate the manifest's table/column, exclusion, role, function and sequence
  security fields against reviewed source policy. Source analysis handles exact
  INSERT columns and rejects unscoped operations when only columns are permitted.
- Provisioning receipts: SELECT; INSERT(nonce,fingerprint,window_id,operation,outcome);
  UPDATE(outcome,worker_id,deployment_id,completed_at). No runtime identity edits.
- Read-only identity diagnostics detect column authority, not just table grants.
- Selectively recover #1015's exact unpaid onboarding state-save exemption,
  canonical billing completion checks, ordered/supersedable save queue and tests.
  No pricing, trial, entitlement enforcement, Stripe, coordinator or webhook
  business logic was changed. Existing custom offers and customer choices remain.

## Reproductions and negative controls

Disposable PostgreSQL tests reproduce the original admission-column INSERT,
PUBLIC audit-column INSERT, excluded-ledger column SELECT and provisioning
identity UPDATE cases. Unsafe ACLs are rejected by the verifier before acceptance;
clean runtime authority cannot forge admissions/audit, read excluded columns or
rewrite replay/budget identity. Direct/PUBLIC column operations and allowed-column
grant options are covered. The real local provisioning service inserts/completes
successfully and rejects replay under the restricted role. No external service is
contacted, and synthetic worker credentials are not logged.

## Actual local validation

- Focused manifest/deployment/onboarding: 58/58.
- Security certification: 84/84 + manifest 34/34 + deployment boundaries 8/8.
- Checkout release: 450/450.
- Disposable PostgreSQL permissions: 48/48; coordinator: 44/44.
- Disposable admission/compatibility/reconciliation/guard/operator SQL: 57/57,
  128/128, 27/27, 6/6, 3/3. Owned clusters stopped and destroyed.
- Prisma validation/generation and owned-DB datamodel parity: passed, 6.19.3.
- TypeScript: passed. Canonical full npm build: exit 0, 457/457 static pages.
- New-code ESLint: passed. Full onboarding-component ESLint: two pre-existing
  set-state-in-effect errors, reproduced at #1032 with the exact same effect
  bodies. No rule suppression or unrelated React refactor was introduced.
- Git diff checks: passed. No dependency/lockfile or historical migration changes.

The first build attempt stopped in an old source-shape assertion expecting
parallel autosaves. Recovering #1015's matching UX assertion plus behavioral
save-queue tests fixed the test contract; the complete build was then rerun and
passed. No build command or safety check was bypassed.

## Publication and remaining gates

The first commit pushed must include the repair branch's explicit
`git.deploymentEnabled=false` rule in vercel.json. Existing suppression entries
and main behavior remain unchanged. A draft PR targets #1032's integration branch;
exact-head CI must pass before acceptance. No force push or merge is authorised.

Local/CI results do not establish the actual Production runtime role, safe Neon
integration synchronization, existing Live session containment or a real Live
subscription lifecycle. The owner-pinned AI provisioning API configuration guard
is unchanged; DB-level service tests are not approval to enable that endpoint
under a different Production identity. Production remains on HOLD pending separate
Stage 0 identity evidence, role/credential approvals, controlled release and pilot.

## Final onboarding reconciliation — 27 October 2026

Compared #1033 `fc7b7c44eb733de2ec5af11af69ac86eb6715a26` against its
main base `8d639743352b9e980afb7e156fc9ac9cff1308b2`, and #1034
`14919a519805d1104b21dae16cc0c686c6386577` against #1032
`fb7a9594bd398cf66d735585c3d68e7f179d9cbd`. All production onboarding
changes and save-queue coverage were already identical. The only missing test
was #1033's explicit expired/unpaid Stripe-return completion rejection. That
exact five-line test is now recovered; all seven onboarding code/test files
match #1033 byte-for-byte. Roadmap records differ by workstream, as expected.

No production code, permissions, manifest, SQL, migration, dependencies, CI or
deployment suppression changed in this follow-up. All P1 security corrections
remain in the parent commit. The restored test runs in existing checkout CI.

Coverage distinguishes mocked route/queue behavior from disposable integration:

- Route tests: exact-path unpaid save, forged-field removal, canonical paid/exempt
  completion, expired/unpaid return rejection, authentication, permission/demo
  checks, tenant targeting and adjacent-path entitlement denial.
- Queue tests: serialized profile/state saves, superseded-draft cancellation,
  failed-save reporting and network-failure/retry recovery.
- Existing disposable checkout tests: persisted synthetic onboarding selections,
  saved/expired-session resumption, one owned Checkout Session, canonical payment
  activation, duplicate delivery and verified entitlement authority.
- Permission tests: real local provisioning service success/replay rejection and
  direct/PUBLIC column privilege and grant-option negative controls.

This is local/CI evidence, not new authenticated-browser or Live Stripe evidence.
The previous two full-component set-state-in-effect lint errors remain baseline
debt; component code is unchanged, no rules are suppressed.

Review handoff: the previous independent review target `14919a5` is superseded
for final acceptance by this follow-up head. Do not alter the independent review
worktree. Rerun independent certification on the published exact head. Preserve
#1033 until that review passes and the owner explicitly approves supersession.

Dependency order remains: independently accept #1034, then owner-approved merge
into #1032; explicitly choose consolidated #1032 retarget-to-main or the runbook's
separate #1028 → #1029 → #1032 sequence, with fresh merge-base checks and separate
merge/deployment approvals. Verify suppression before any integration merge.
No merge, retarget, closure, deployment or runtime cutover is authorised here.

Refreshed local validation for this follow-up: route/queue **17/17**; security
**84/84 + 34/34 + 8/8**; checkout **451/451**; disposable PostgreSQL permissions
**48/48**, compatibility/admission/reconciliation/guard/operator
**57/57 + 128/128 + 27/27 + 6/6 + 3/3**, with both owned clusters destroyed
and datamodel parity showing no differences. TypeScript and changed-test lint
passed. Full canonical `npm run build` passed (Next 16.4.1, existing Webpack
command, **457/457** pages). Existing middleware/cache-control/module-type and
dynamic-render diagnostics remain nonfatal; no build configuration was changed.
Git diff checks passed. Exact-head CI must pass after the normal push; these
results are not independent security acceptance or Production certification.

## Completion-authority bypass repair — 27 October 2026

The independent review of `67025243` found that legacy `/gen2` PATCH accepted
VIP completion and implementation markers despite the state route guard. That
head is not final security acceptance. This repair applies one shared canonical
completion policy at both routes and the single Gen2 persistence helper.

Trace: `/gen2` PATCH, `/gen2/state` PATCH and `/gen2/operator` POST all write
through `saveGen2OnboardingProgress`; the only canonical Gen2 settings assignment
is in that helper. `markGen2SubscriptionActivated` already requires verified
Stripe billing and continues to do so. Founding intake writes a separate
`foundingOnboarding` record, not Gen2 completion. PlatformShellLoader reads Gen2
root/VIP timestamps; it is not a completion writer. No subscription or paid
entitlement is granted by these onboarding timestamps.

`assertGen2OnboardingCompletionAllowed` requires the organisation-scoped canonical
billing resolver to confirm verified Stripe billing or both `kind=platform_exempt`
and explicit `platformExempt=true`. Slug, operator status, profile flags, customer
ID alone, checkout-return URLs and submitted timestamps do not confer authority.

The legacy route checks before profile/goal/progress side effects; both state
and operator routes use the same rule. The persistence helper independently
checks all callers and derived completion. Guarded inputs include root/VIP
completion, handover/activation timestamps, implementation navigation, completed
steps/checklist markers, Stripe proof and the checklist step that advances to
implementation. Accepted completion timestamps are assigned server-side, retaining
an existing completion time on legitimate retries. Unpaid profile, basket and
pre-checkout navigation saves remain permitted. No retrospective data cleanup or
Production assessment was performed.

Regression coverage now exercises both PATCH routes and operator setup, expired
checkout, absent/unverified billing, forged timestamps/markers, failed lookups,
canonical exemptions, tenant boundaries and legitimate unpaid saves. Disposable
DB tests exercise the real persistence helper, canonical billing, server timestamps
and unchanged settings on rejection. Additional committed permission negatives
cover PUBLIC admission INSERT, broad direct/PUBLIC provisioning UPDATE, direct/
PUBLIC SECURITY DEFINER EXECUTE and runtime table/function ownership.

First validation exposed test-fixture-only failures: the POST route harness
needed its new import mapped, and synthetic ownership transfer replaced existing
ACL entries. The harness now imports the real policy, and negative-test cleanup
restores the exact reviewed grant script. No verifier or policy was weakened.

Validation at this repair: route tests **42/42**, checkout **480/480**; security
**84/84 + 34/34 + 8/8**; owned disposable permissions **56/56**; compatibility
**57/57 + 142/142 + 27/27 + 6/6 + 3/3**, with schema parity and owned-cluster
cleanup. Organisation settings authority **6/6**. TypeScript passed; changed-code
ESLint has zero errors and three unchanged unused-variable warnings in the
persistence helper. The two pre-existing component lint errors remain separately
disclosed; no component change or rule suppression. Canonical full `npm run build` passed: compilation, TypeScript and **457/457**
static pages; exact-head CI must pass after publication.

No migration, grant policy, manifest, dependencies or deployment configuration
changes. Production remains HOLD. DeepSeek must independently certify the new
exact published head; prior-head reviews are superseded for final acceptance.
