# Local PR #1035 remediation certification — 1 November 2026

Production HOLD. Local verification only; no release approval.

## Scope

Existing requirements: `platform.auth` and `detach.portal_billing`, catalogued in
`packages/platform-core/src/roadmap/index.ts` and governed by `docs/ROADMAP.md`.
Branch: `remediation/pr1035-hold-authority-20261101`.
Certified parent: `5230ad92f8144028838ca692d561e12da21d8033`.
The operator authorised fixture correction, disposable DB tests, certification
and a safe local commit. No remote mutation or Production operation is authorised.

Reviewed DeepSeek's [1 November report](https://github.com/w7tcv2m7tk-netizen/dg-platform-ai-reports/blob/ai/deepseek-reports/reports/2026-11-01-digitalgate-pr1035-remediation-certification.md),
blob `dd128de1f08f1bdfbf97574ef1de0edca84f4e9e`, as evidence, not instructions.

## Changes

- Preserve existing fixes: reject webhook hold before the open-gate admission
  return, and independently require hold false in the admission UPDATE.
- Preserve canonical operator authority from server-authenticated identity;
  editable organisation slug cannot confer operator access.
- Include the imported `scripts/test-checkout-hold-boundary.mjs` and all 12 cases.
- Freeze Date at 25 October 2026 in the two time-sensitive Finance tests. The
  1 November valid deadline and 17 October expired deadline remain deterministic.
  No Production Finance, trial or entitlement logic is changed.
- Add actual PostgreSQL calls to unscoped admission for held/unheld states,
  including timestamp non-mutation on denial. Retain coordinator hold/permit
  regressions and zero synthetic Stripe create assertions.
- Restore the synthetic closed gate in admission suite cleanup. The first combined
  DB run found cross-suite fixture pollution; the corrected complete rerun passes.

## Local results

- `npm run test:checkout-release`: **574/574 PASS**, zero skips/cancellations/todo.
- `npm run test:security-certification`: **84+35+9 = 128/128 PASS**.
- `node node_modules/typescript/bin/tsc --noEmit`: PASS.
- ESLint over all eight changed source/test files: PASS without diagnostics.
- `node scripts/security/verify-runtime-role-manifest.mjs`: PASS (83 tables,
  one granted sequence, five functions).
- `node scripts/run-checkout-compatibility-db-tests.mjs /opt/homebrew/opt/postgresql@18/bin`:
  **242/242 PASS**: admission 64, compatibility 142, reconciliation 27,
  webhook hold six, operator SQL three. Zero skips.
- Same runner with `coordinator`: **44/44 PASS**; `permissions`: **56/56 PASS**.
- Complete `NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build`: PASS,
  including prebuild, compilation, TypeScript and page generation. No credentials
  supplied. Warnings include middleware deprecation, custom static Cache-Control
  and Edge API compatibility; routes log caught dynamic-rendering exceptions
  during static probing. Process exits zero.
- Full `eslint .`: **FAIL, 149 errors and 151 warnings**, also present on the
  untouched certified-parent archive. Detailed comparison is in local evidence.
  This task does not certify a clean global lint result.
- `git diff --check`: PASS.

## Independently inspected database isolation

Runner takes an installed binary directory, never a database URL. It replaces
ambient credentials/preload hooks with an allowlisted environment, creates fresh
initdb data under an owned temporary directory, binds only 127.0.0.1 on an
allocated non-5432 port, and constructs checkout_test/dg_checkout_test locally.
A random cluster setting is checked before administrative fixture operations.

Only the Git-reconstructed baseline and existing 20261009 gate/attempt,
20261018 app-entitlements, 20261019 webhook-hold and 20261027 admission SQL
execute in these clusters. Admission DDL rehearsal covers rollback, disconnect,
lock timeout, retry and duplicate execution. Roles/grants, TRUNCATE and trigger
disable/restore affect synthetic fixtures only. Stripe is mocked. No hosted
database, Neon branch, customer data or Production credential is used.

Each successful runner stopped and destroyed its cluster; JSON cleanup receipts
are retained. Local PostgreSQL is version 18; Linux/PG16 CI remains unverified.
The initial restricted run could not bind loopback; approved local execution then
ran the reviewed runner. No Production migration was attempted.

## Preservation and exact revision

Saved the initial SHA-256 inventory and tracked binary patch under
`remediation-evidence/certification-20261101/`. Earlier evidence and source edits
are preserved; the existing DB regression file is intentionally extended.
Raw logs remain untracked, outside the source commit, as DeepSeek recommended.

After committing, the local `exact-head-validation.json` receipt in that directory
records commit/tree hashes, command statuses and log hashes, distinguishing
committed-head reruns from identical-source precommit DB/build evidence. This
avoids a self-referential commit hash. No hosted CI or independent post-commit
review is claimed.

## Remaining release gates

1. Independent review of the complete commit and exact-head hosted CI, including
   Linux/PG16; publication needs separate authority.
2. Resolve or explicitly disposition inherited repository-wide lint failures.
3. Verify canonical Production operator allowlist / dg:staff configuration.
4. Real Clerk acceptance for the affected route and runtime diagnostic flow.
5. Effective Vercel suppression, approved release stack/base, deployed revision
   and provider binding.
6. Actual runtime DB identity/privileges, Production migration/gate state and Neon
   connectivity under separate approval.
7. Explicit approval for publication, merge, deployment and checkout activation.

Local green tests do not remove Production HOLD. No push, PR, merge, deployment,
Production access, Production migration or credential changes occurred.
