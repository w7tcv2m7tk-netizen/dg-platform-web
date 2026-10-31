# Runtime identity diagnostic — local durable-control revision, 31 October 2026

## Current status and preserved history

LOCAL ONLY; uncommitted; Production and publication HOLD. Base `f859bbc56aba2e1322dccd6c18661cff1c1b7cf0`.
The recovered original 14-file patch remains preserved separately with SHA-256
`b16f1bc00359ffc550ab82be638fa7fafce3de311eb508167beaf37739053e88`.
This revised candidate does not inherit that patch's certification or its four real Clerk acceptance results.
The previous implementation notes follow below as historical evidence, superseded where inconsistent.

## Write-free invocation and authentication

The old Command Centre action always refuses. Its page, link and client component are removed.
The standalone Node POST route `/api/admin/runtime-database-identity` does not render a shell/layout,
resolve a platform page context, grant demo access or provision application records.
It is disabled unless `DG_RUNTIME_IDENTITY_ENABLED=1`; requires the exact Production origin/path,
empty body, no query string, no API-key header, Clerk session-token authentication and fresh
server-side platform authority verification. Non-POST and all refusal outcomes return fixed no-store 403.
No automatic invocation or polling exists. Invocation requires a separately issued private token header.
Untrusted request data cannot choose a target URL, SQL statement, role or deployment binding.

The target uses the checkout-serving `@dg/database` shared Prisma singleton and a read-only transaction.
It performs only membership, session identity and limited catalogue SELECTs; it has no target lifecycle
connect/disconnect calls, writes, migrations or grants. The synthetic database deliberately lacks
Command Centre/demo schemas, proving successful probes need no page initialization or provisioning.

## Durable one-use control and audit

`scripts/sql/runtime-identity-control.sql` is NOT an application migration. It is a proposed, atomic
setup for a separate empty `dg_identity_control*` database, requiring an explicit setup setting.
It has only been installed in owned disposable localhost databases. No external resources or roles were created.
The issuer, executor and object owner are separate authorities. The executor has only schema usage
and exact claim/finish function execution, no tables, grant options, ownership, role memberships,
CREATE/TEMP or other accessible non-system SECURITY DEFINER paths. Function search paths are pinned.
The issuer can issue/revoke; it is never a web-route capability or application-runtime credential.
Owner/administrator DDL remains a trusted authority and can alter protections; immutability is not claimed against that authority.

A 32-byte random private token is represented durably only by its SHA-256 digest. Issuance binds actor,
project, exact deployment, source revision, operation, target role/database/endpoint/Neon branch,
fresh provider-evidence receipt hash and a maximum 15-minute window. Atomic compare-and-set consumption
and claimed-audit insertion commit together BEFORE target-client import or access. Audit evidence is
actor/deployment/request-bound, append-only and unique per final outcome. Twelve separate worker
processes produce exactly one claim and one target probe; restart replay fails.

Final audit persistence is required before returning identity. Unknown claim/commit or final-audit outcomes
fail closed without automatic retries; a consumed token stays consumed. A crash may leave a claimed
record without a final outcome, requiring operator inspection, never token reset. `verified` records probe
verification, not proof that the HTTP response reached the operator. Pre-claim refusals do not write target
or control records; no durable authenticated grant exists for arbitrary invalid requests.

## Layered containment and credentials

The one-per-worker slot remains occupied until surviving work settles. The 6.5-second response budget
is not universal cancellation and is not a deployment-wide concurrency limiter. The durable claim, not
the slot, prevents cross-worker token replay. Shared target pool and SQL transaction limits remain;
control operations use a separate worker singleton with connect_timeout=3, pool_timeout=1,
connection_limit=1, transaction maxWait=1000ms/timeout=2500ms, statement=1500ms/lock=500ms.
No per-request Prisma client/disconnect is introduced. Authentication can survive a response timeout;
it cannot proceed to consumption or target access afterwards. An already running database operation
may survive the HTTP response until its underlying pool/query/transaction limits settle.
The route's source maxDuration=25 is not evidence of an effective hosted execution limit.

Control credentials use `DG_RUNTIME_IDENTITY_CONTROL_URL`, constrained to the executor and a separate
control database; no application URL fallback. The target uses DATABASE_URL; configured unpooled,
direct, shadow and reconciliation aliases, when present, must match the expected restricted role,
database and endpoint. URLs are inspected only inside application memory and never returned/logged.
Prisma Option B structured redaction remains; control Prisma emits no raw logs. Sentry drops diagnostic
request events/transactions and strips the token header from other events. Hosted platform/proxy logging
policies still need verification before a secret token is transmitted.

## What identity evidence proves — and does not prove

Source path and synthetic restricted-role checks PASS. Actual Production serving role, effective full
83-table permissions, memberships/PUBLIC ACLs, endpoint/TLS and Neon provider branch binding remain
UNVERIFIED: no Production connection, credential inspection or remote operation was performed.
The limited session guard rejects privileged attributes, membership/SET ROLE, public object ownership,
CREATE authority and effective migration-ledger access; it does NOT replace the complete approved manifest.
The exact metadata SELECT is SHA-pinned in the scanner; altered SQL/path cannot use this exception.
No approved application privilege manifest, application migration or runtime grant was widened.

The branch response is explicitly `provider-attested-configuration`: a trusted issuer records independently
verified provider evidence, not a live Neon API result from this diagnostic. URL labels alone are not branch
proof. Provider evidence must be genuinely obtained and reviewed before any future grant issuance.
Control TLS settings require strict certificate validation, but hosted hostname/trust behaviour and all
captured deployment credentials require independent operational verification. No hosted identity is certified here.

## CI and historical-reference remediation — 31 October 2026

This section supersedes the earlier 30-file publication inventory below. Current candidate: 35 files
against base f859bbc56aba2e1322dccd6c18661cff1c1b7cf0, still detached/uncommitted/unpublished.
Production deployment, invocation, merge and publication remain HOLD. Existing requirement IDs:
platform.auth / detach.portal_billing. No diagnostic runtime, authentication, token, audit, credential,
logging or application permission implementation changed in this follow-up.

### Exact changes from the reviewed 30-file candidate

Five additional files in the local diff:
- `.github/workflows/checkout-release.yml`: exact PR-head/dispatch-SHA checkout, vercel.json path trigger,
  and both owned runtime identity PostgreSQL harnesses in the existing database stage. No deployment
  command, provider credentials or expanded GitHub permission introduced; contents remains read-only.
- `scripts/run-checkout-release-tests.mjs`: logging, identity, one-use/credential-boundary, actual-route
  mocks, retired-action and PostgreSQL discovery suites; module-mock flag required for route/action mocks.
- `scripts/lib/owned-postgres-tools.mjs`: complete executable toolset discovery, argument > PG_BIN > PATH;
  invalid explicit paths fail closed, no platform-specific fallback, credential inspection or connection.
- `scripts/test-owned-postgres-tools.mjs`: five positive/negative path-selection and executable tests.
- `STAGE3-RUNTIME-PERMISSIONS-SELECT-ONLY.md`: explicitly labels the original 247eef proposal historical
  and superseded; preserves the entire original body and embedded SQL without replacement. Identifies
  the later d15310c70223ed7cd543bf254ebe95f1e8a1deae5795de2d3878a1bd9b8ca558 supplement separately.

Four existing candidate files necessarily updated:
- `scripts/test-runtime-identity-db.mjs`: portable discovery and explicit absent PGPASSFILE.
- `scripts/run-runtime-identity-control-db-tests.mjs`: same portable discovery.
- This report and `docs/ROADMAP.md`: current evidence, scope and approval gates.
The remaining 26 files of the reviewed 30-file candidate remain byte-identical, including vercel.json.
No Prisma schema, migration, runtime grants, lockfile or application source changed in this follow-up.
The selected review branch is unchanged; it has not been created.

### Validation and limitations

Owned local PostgreSQL 18.6, synthetic fixtures only; no ambient credentials/URLs or Production access.
- Expanded release runner: 559/559 PASS, including the new suites and five discovery tests.
- Security: 84/84; manifest: 35/35; deployment boundaries: 9/9 PASS.
- Pairing: 34/34 PASS.
- Disposable coordinator: 44/44 PASS; compatibility: 57+142+27+6+3 PASS; permissions: 56/56 PASS.
- Shared-client/read-only/pool recovery: 7/7 groups PASS; durable cross-worker control: 33/33 PASS.
- TypeScript PASS; all 29 changed JavaScript/TypeScript files lint PASS; workflow YAML parse and exact-head,
  test-stage, trigger and read-only-permission assertions PASS; git diff --check PASS.
- Full canonical npm run build with NODE_ENV=production PASS, including prebuild and 457 pages.

Initial discovery test assertions failed on macOS /var versus canonical /private/var aliases; corrected
expectations now explicitly require realpath output and all five pass. An initial build used NODE_ENV=test;
its successful output is retained separately and is not the canonical build certification. The complete
build was rerun successfully with NODE_ENV=production. No failing check was suppressed.

Logs/receipts are local ignored artifacts under coverage/runtime-identity-ci-20261031, not publication
content. Ubuntu PostgreSQL 16 is configured in GitHub Actions with an explicit tool directory; that OS/
version combination has NOT been executed here or certified remotely. Exact-head CI remains pending
publication approval. No claim of real Clerk acceptance for the new route is made: existing real Clerk
acceptance applied to the retired original action. The enabled new route still needs separately approved
isolated real-session acceptance and webhook containment.

The corrected d15310 supplement was found at the previously approved local security-worktree path and
its complete hash was verified read-only. No SQL was executed, no historical result was replaced, and
the standalone supplement/test harness were not copied into this candidate. Its local availability is
not fresh Production permission evidence.

### Ancestry and publication recommendation

Fresh read-only GitHub metadata still reports main at 8d639743352b9e980afb7e156fc9ac9cff1308b2.
The same 28 inherited commits affect 73 files. The current effective diff against main is 100 files
(previously 98; the portable discovery module and its tests add two previously absent paths). No history,
branch, ref or commit was rewritten. Current main is an ancestor: zero behind; 28 committed ahead before
any new local commit. The 28 commits include the admission migration/runtime, permission manifest and
P1 repairs, onboarding completion/save fixes, release SQL/tools and historical evidence. They are related
release dependencies, but they are not part of a narrowly scoped diagnostic-only approval.

Recommendation: independently approve the inherited stack through the existing review/dependency
process before any main-targeted diagnostic publication. Do not present a 100-file combined diff as a
35-file diagnostic PR. Do not mechanically transplant the patch onto clean main: the current CI and
permission checks depend on inherited files absent there. A clean-base isolation would require separate
approval and renewed dependency/compatibility validation, not an unapproved rebase or dropped safeguards.
No history manipulation was performed here.

Proposed sequence, requiring separate owner approval: review this exact 35-file patch and inherited
scope; approve the target/base and publication scope; create the selected exact review branch; commit
only accepted content; verify the first committed vercel.json rule, source tree and remote branch absence;
push once non-force and open a draft PR; require exact-head tests and verify no Vercel deployment or
alias change. Do not merge, deploy or invoke as part of publication. If any unexpected deployment is
observed, stop and request a separate containment decision; no automatic remote action is authorised.

Read-only Vercel review established Production branch main, automatic ignored-build behaviour, no deploy
hooks and unrestricted manual deployment sources. The exact branch rule suppresses automatic Git
creation for that name, not manual CLI/API deployment. Unobserved external automation remains a stated
limitation. Actual serving-role/full ACL/credential and Neon branch/TLS verification, control-resource
provisioning and feature activation all retain their own separate operational approvals. No credential
or secret value was accessed. Local remediation PASS; publication and Production HOLD.

## Local branch suppression preparation — 31 October 2026

Selected exact branch: `review/runtime-identity-one-use-20261031-46926786`.
No local or remote branch was created. Local refs and a read-only GitHub exact-branch lookup
confirmed absence at inspection time; uniqueness must be rechecked immediately before any approved publication.
`vercel.json` now contains this exact branch with `deploymentEnabled: false`, preserving the existing
nine rules and all cron entries. There are no overlapping true rules. Strict JSON/no-duplicate-key checks,
nine preservation/scope assertions, actual minimatch checks (exact branch, main, sibling), branch-name
validation and git diff --check PASS. Configuration SHA-256:
`681d76a1c82c54f513ff26c50fe4a76bf63ebb213f9441a34008affbd5cf3f88`.

Official Vercel semantics: branch false suppresses automatic Git deployments, not just Production;
unspecified branches default true and any matching true rule can enable deployment. This candidate
has no such overlapping true rule. Reference: https://vercel.com/docs/project-configuration/git-configuration.
The rule must be present in the very first commit published to the exact named branch, not added by
later push. No commit exists yet; only the proposed working-tree content is verified. A renamed branch
or a manual CLI/API deployment is outside this rule's guarantee. An ignored-build command is not used
as the suppression mechanism and was not changed.

Read-only remote reassessment: repository w7tcv2m7tk-netizen/dg-platform-web, linked Vercel project
prj_RzOMts2AdqpKtbAgZ72GLKs55AJ2 in digitalgate-projects. Current main remains
8d639743352b9e980afb7e156fc9ac9cff1308b2; latest READY Production deployment remains
dpl_2bpF6uUfYhe1xB8ytCHAmjVfzikN. Provider discovery reports one linked project for this repository
in the accessible team. GitHub repository webhook inventory is empty (0 entries). GitHub lists three
active workflows. Current main/candidate checkout-release workflow uses pull_request and workflow_dispatch,
with verification/build/disposable database steps and no deployment command. The other two active
workflow records are absent from current main/candidate; their previously inspected last-run revisions
are validation-only. Their last-run evidence is historical, not proof about every possible external actor.
No current-main/candidate push, tag, repository_dispatch or deployment_status workflow was found.
The repository's .vercel-deploy-trigger is inert text; no inspected workflow consumes it.

Remaining non-secret evidence gaps: the management connector omits the effective ignored-build command
and explicit configured Production-branch field. Serving deployment source/main and repository release
documentation corroborate main but do not replace that missing setting. Earlier Vercel Git settings
showed no deploy hooks; that observation is not refreshed by this API capture. Additional unobserved
GitHub App/external automation, manual deployment permissions and other accounts cannot be certified
absent from repository webhooks or workflow files. SSO protection limits access, not deployment creation.
No secret values, environment files or Production endpoints were accessed.

Current-main compatibility is source ancestry only: current main is an ancestor of base f859bbc5,
with 28 inherited commits ahead and zero behind. The local change does not alter main's deployment
rule or its workflows. The eventual draft diff against main will include inherited dependency commits,
not only the local runtime-identity changes; explicitly review that stack before publication. No merge
or full runtime compatibility certification was performed in this suppression-only task.

Inventory reconciliation: previous 29-file candidate verified byte-for-byte before changes. Current
candidate has 30 changed/untracked files against base: the same 29 plus vercel.json; existing diagnostic
report and ROADMAP receive documentation-only status updates. All 27 prior non-documentation files
remain byte-identical to the recorded validation receipt. No application source/test, migration,
package or workflow changed during this task. Reuse the prior passing 457-page build, TypeScript,
lint and regression evidence for those unchanged files; no full-suite repeat is warranted for the
one-entry configuration/documentation change. These are not exact-head CI results for a future commit.

Decision: local suppression preparation PASS. Publication, Production deployment and invocation HOLD.
The exact rule is suitable for inclusion in an owner-approved first review-branch commit. It is not proof
of suppression of every manual/external deployment mechanism. Before publication approval, reconcile
remaining non-secret automation/settings evidence and obtain fresh independent candidate review. Any
later commit/push/draft PR requires separate explicit owner approval; no settings change is made here.
No publication plan is represented as authorised or universally safe. The repository is public; do not
publish private operational reports or credentials in its draft PR.

## Remaining approval gates and publication boundary

1. Review the new complete diff/hash and obtain fresh independent security acceptance.
2. Read-only suppression inspection and the exact local branch rule are now prepared (see above).
   Close the recorded settings/external automation evidence gaps and verify first-commit content,
   branch uniqueness and inherited dependency history before separately approving any publication.
3. Approve an isolated built-route real Clerk/session test with webhook containment and no Production access.
   Unit route mocks, real disposable PostgreSQL and disabled built-route refusal are distinct evidence.
4. Separately approve any control-resource/role provisioning, secret injection, feature enablement and deployment;
   establish actual least-privilege serving identity and full manifest compliance beforehand.
5. Any Production invocation requires its own attended, actor/deployment-bound one-use approval and current
   recovery/provider/logging evidence. Checkout remains globally blocked; no admission or billing action is included.

---

## Historical implementation notes (superseded by the current contract above)

# Runtime identity diagnostic — layered local containment, 29 October 2026

Existing requirements: `platform.auth` / `detach.portal_billing`. Base
`f859bbc56aba2e1322dccd6c18661cff1c1b7cf0`; isolated detached worktree
`/private/tmp/dg-runtime-identity-20261029`. No commit or publication.

## Approved revised contract and connection provenance

The owner explicitly replaced universal authentication-to-cleanup cancellation
with demonstrated layered resource containment. Prisma 6.19.3 cancellation is
not claimed. Checkout persistence and the diagnostic now import the exact same
`@dg/database` singleton, whose datasource is `DATABASE_URL`. There is no
diagnostic-owned Prisma constructor, connect, disconnect, URL override or pool.
This establishes the source connection path, not any deployed session identity.

`/command/platform-health` links to `/command/runtime-identity`. The new page uses
the existing Command Centre layout and requires platform operator context. Its
button explicitly invokes a server action; no effects, polling, prefetch probe or
automatic identity query exists. The action independently authenticates Clerk
session tokens only, excludes API-key principals, then freshly reads active
memberships and applies the existing canonical platform-authority policy inside
the read-only transaction. UI visibility is not the action's security boundary.
No identity evidence is returned to an unauthorised principal. Membership reads
are capped at 100; excessive memberships can cause a safe denial.

## Layered limits and surviving work

- One diagnostic operation at a time per module/worker, including authentication.
  This is not a deployment-wide rate limiter; separate workers each have a slot.
- 6,500ms response deadline using a monotonic clock and timer. Event-loop scheduling
  can delay timer delivery; this is not a hard process execution deadline.
- Prisma interactive transaction acquisition `maxWait=1000ms`, execution
  `timeout=4000ms`; PostgreSQL `statement_timeout=1500ms`, `lock_timeout=500ms`.
- `SET TRANSACTION READ ONLY` precedes every membership/identity query.
- Timeout returns only `unavailable`; it does NOT release the slot while the
  underlying work survives. Subsequent diagnostic requests fail closed rather
  than accumulate pending auth/database work. Expiry is checked after auth,
  transaction acquisition, membership lookup, identity lookup and before response.
- Stalled auth or lazy engine startup may survive the response and retain the
  slot indefinitely. If auth settles late, it cannot begin database work. Late
  acquisition cannot begin diagnostic SQL. Late query results cannot yield success.
- Normal settlement, query errors and observed SQL/lock/pool timeouts release the
  slot and transaction resources. A permanently stuck phase disables only this
  worker's diagnostic until settlement or worker recycle. No forced recycle,
  connection termination or cancellation API is implemented or claimed.
- The shared pool remains owned by the application. A diagnostic can occupy one
  transaction connection per worker; a one-connection pool can temporarily block
  ordinary work. Tests demonstrate recovery with an owned two-connection pool;
  deployed pool sizes and traffic impact have not been verified.

## Logging and output

The shared client emits error events to a fixed `Database operation failed`
message; raw engine payloads and development warn output are not logged by its
constructor. This deliberately reduces error detail for all shared-client users.
No global console filter or raw error logging is introduced. Other callers' own
error handling is outside this diagnostic's guarantee. A cold process is required
for the new logging policy; a development hot-reload singleton may retain its old
configuration until restart.

Responses expose only sanitised role/session-role/database identifiers and an
optional exact 40-hex deployment revision, never URLs, passwords, hosts, settings,
SQL error text or customer records. noStore and force-dynamic disable caching.
No endpoint-to-Neon-branch claim or retrospective old-deployment identity is made.

## Reproduced validation of this local diff

- 28/28 diagnostic, platform-authority and API-key tests, zero skips/failures.
  Includes stalled auth/acquisition/query, retained slot, no late success,
  recovery, fresh authority, redaction and shared-client wiring.
- 2/2 tests importing the actual server-action module with mocked Clerk/Next/
  database module boundaries: session/API-key denial before database access and
  fresh operator authority/revocation. These are NOT real Clerk session tests.
- 6/6 disposable PostgreSQL integration checks on a newly owned loopback cluster:
  exact shared client and authority; actual read-only rejection; statement timeout
  rollback/recovery; lock timeout/recovery; two-connection pool exhaustion and
  recovery; schema fault redaction including actual Prisma error-event logging.
  Only synthetic data used; cluster stopped and removed after each run.
- `git diff --check`: PASS after normalising the edited shared-client source to LF.
- Full TypeScript and changed-file ESLint started, stalled with no result and were
  interrupted (exit 130). ESLint had a non-resident eslintrc-universal.cjs open.
- `npm run build` started with a deliberately minimal environment and no external
  credentials. Prebuild stalled on two Stripe tests with non-resident
  stripe/esm/resources/OAuth.js open. Interrupted these local processes; build
  exited 1 before Next compilation. The pending-promise test failures in its log
  followed interruption; no application build or built-route verification passed.
- Actual Clerk authentication, browser invocation and denial against the built
  application remain UNVERIFIED. No Development or Production secrets retrieved.
- Prebuild unit summary before termination: 540 tests, 538 passed, 2 cancelled,
  zero failed assertions; these counts do not certify the interrupted build.
- Final self-review performed; separate independent review remains outstanding.

Commands:

```
node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs --test scripts/test-runtime-identity.mjs scripts/test-platform-authority.mjs scripts/test-api-key-authority.mjs
node --experimental-test-module-mocks --experimental-strip-types --import ./scripts/register-ts-resolver.mjs --test scripts/test-runtime-identity-action.mjs
node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/test-runtime-identity-db.mjs
./node_modules/.bin/tsc --noEmit --incremental false
npm run build
```

## Status and next gate

Local implementation and tested containment are complete; integrated deployment
readiness remains HOLD pending local dependency residency, successful TypeScript,
lint and full build, built authenticated/unauthorised invocation, and independent
review. Existing work and unrelated audit files preserved. No Production access,
secret retrieval, migrations, grants, merge, deployment or checkout activation.
Production remains HOLD / NO-GO. No publication or release approval is implied.

## Exact changed-file inventory

- `docs/ROADMAP.md`
- `packages/database/src/index.ts`
- `src/app/(shell)/command/platform-health/page.tsx`
- `docs/commerce/release-1025/LOCAL-RUNTIME-IDENTITY-DIAGNOSTIC.md`
- `scripts/test-runtime-identity-action.mjs`
- `scripts/test-runtime-identity-db-child.mjs`
- `scripts/test-runtime-identity-db.mjs`
- `scripts/test-runtime-identity.mjs`
- `src/app/(shell)/command/runtime-identity/IdentityProbe.tsx`
- `src/app/(shell)/command/runtime-identity/actions.ts`
- `src/app/(shell)/command/runtime-identity/page.tsx`
- `src/lib/runtime-identity.ts`

The Command Centre layout/page reuse existing context checks; those page-render
checks are not claimed to be covered by the diagnostic action response timer.
The new containment scope starts at explicit action invocation.


## Local certification continuation — 2026-10-29T22:50:10.146629+10:00

This section supersedes the earlier incomplete static/build results. Tested base
remains `f859bbc56aba2e1322dccd6c18661cff1c1b7cf0` plus the uncommitted candidate.
Original preserved patch SHA-256:
`0e5303920cf395b577319355258d42326c51166c9bf9e84235b85626fe61c448`.
It matched all 12 files byte-for-byte before this continuation. No original patch
was overwritten. Only existing stalled-phase assertions were strengthened; no
new application functionality was introduced in this continuation.

Exact tested source/test manifest SHA-256 (sorted path-to-SHA JSON):
`be9e895337de4284d37bb367af0fd96025cbf1585d5a75e495e084e1cd7cd532`. The accompanying local JSON receipt contains each file hash.

### Dependency recovery and build evidence

The old shared dependency target was partly non-resident and had Next 16.2.12,
React DOM 19.2.4, inconsistent with the candidate lockfile. An existing isolated
checkout installation had an identical lockfile SHA-256
`0df05e3601a4089c9b61dca84ded184d83e5b1a6329cb67d28a8340c12f05991`.
All installed package manifests were checked against the lock: no required package
missing, no version mismatch, no non-resident package manifest. Its node_modules
was APFS-cloned into an owned private dependency directory; only this worktree's
untracked node_modules symlink was changed. No shared dependency source or Git
store was modified. No install/download, dependency upgrade or lockfile change.

Prisma 6.19.3 generated successfully from this candidate's schema into the private
copy. Versions: Next 16.4.1, React/React DOM 19.3.1, TypeScript 5.9.3.

- Full TypeScript: PASS, exit 0, 13.40 seconds.
- Changed-code lint: PASS, exit 0, 1.96 seconds.
- Full `npm run build`, including complete prebuild: PASS, exit 0, 90.13 seconds.
  457/457 pages generated. Node test summaries in the complete build report total
  987 tests, with zero failures/cancellations; custom assertion scripts also ran.
  Existing Next middleware deprecation, cache-header and Next Edge API warnings
  remain warnings; no migration/configuration changes were made to suppress them.
- Focused unit/security: 28/28 PASS. Actual action with mocked SDK boundaries:
  2/2 PASS. Owned disposable PostgreSQL: 6/6 PASS, including shared pool recovery
  and actual sanitised engine error logging. Whitespace: PASS.
- Built app-path manifest includes `/command/runtime-identity`; exactly one action
  entry has that page as its sole worker. This resolves the action-discovery gap.
- Built app was started on loopback with a minimal environment containing no
  database URL or authentication secret. Anonymous page, anonymous action and
  synthetic API-key action each returned HTTP 500 due missing Clerk publishable
  configuration, with no identity result. These are configuration failures, NOT
  successful authentication/authorisation acceptance tests. Server was stopped.
  Real Clerk operator, unauthorised user and API-key HTTP denial remain UNVERIFIED.
  A separately approved operator-attended Development auth setup is required;
  no authentication secret was retrieved or invented to manufacture a pass.

### Independent review and remaining findings

A separate read-only reviewer found no confirmed P0/P1 implementation defect under
layered containment. P2 late-auth coverage was corrected with an explicit zero
late-database-invocation assertion and no-SQL-after-late-acquisition assertion;
reviewer rechecked and accepted that correction. All focused tests passed again.

**P2 logging observability remains unresolved:**
`packages/database/src/index.ts:9-11` removes raw engine details and development
warn events from ALL shared-client consumers. It protects secrets but weakens
unrelated diagnostics; unchanged checkout observability cannot be certified.
A minimal reviewed safe classification/correlation change or explicit owner
acceptance of this tradeoff is required. No logging functionality was changed
merely to force certification to pass.

### Limiter precision and one-use comparison

The slot is one in-flight operation per created limiter instance. The exported
singleton provides one slot per loaded module instance; separate workers,
processes, independently loaded bundles, factory instances and restarts have
independent slots. Completion releases it for another use. Timeout retains it
until underlying settlement; it is not an invocation counter or durable permit.

No authoritative separate one-use control-model document was located in the
candidate or existing runtime-identity reports; its exact requirements remain
UNVERIFIED pending the owner's document path. Clear functional differences:

- Existing control: session plus fresh operator authority. Missing one-use
  control: explicit per-operation approval bound to actor/deployment/purpose.
- Existing control: 6.5s response budget. Missing: durable approval activation,
  expiry and revocation independent of process memory.
- Existing control: per-instance concurrency. Missing: global atomic consumption,
  replay prevention across workers/restarts and a one-use total count.
- Existing control: response sanitisation. Missing: durable operator execution
  receipt/audit trail bound to a consumed approval.

These gaps were documented only; no durable store or new control model was added.
Do not equate this diagnostic's limiter with checkout admission's durable controls.

### Certification decision

**HOLD for complete local/release certification.** Static checks, full build and
layered disposable containment passed. Remaining blockers: real built-app Clerk
session validation, the P2 shared observability disposition, and authoritative
one-use requirements comparison. Production stays HOLD/NO-GO. No secrets,
Production connections, migrations, grants, commits, merge, deployment or checkout
activation occurred. The candidate is still uncommitted on the original base.


### Owner-specified one-use source lookup

The owner supplied the authoritative package location after the preceding capture:
`/Users/aetherra/Documents/ChatGPT/DigitalGate – Strategy & Planning/DigitalGate-runtime-db-identity-diagnostic`.
That user home and exact directory do not exist on this Mac. Metadata-only search
found the exact package-name directory under the current user's matching Documents
path, but it is a real, empty directory. DESIGN.md, reference-controls.mjs,
reference-controls.test.mjs, README.md and VERCEL-SUPPORT-ENQUIRY.md are all absent.
No original 15-test control model was read or executed. Therefore the exact
comparison is **BLOCKED — source unavailable**. The preceding differences are
observations about this implementation only, not a certification against an
invented replacement specification. Restore or provide the original package through
an approved local source before that exact comparison; no new model/store created.


## Option B implementation and independent certification — 30 October 2026

Owner-approved local implementation replaces the fixed-text sink. This section
supersedes the previous logging-isolation STOP and unresolved observability P2.
Original base and 12-file patch were verified unchanged before editing; input
patch SHA-256 `20ebf80cf1fbba72654259da9685f0cb12c628a49448004e939465691cedfdaa`.
No candidate reconstruction, unrelated changes, commits or publication.

### Final structured logging contract

`packages/database/src/safe-logging.ts` emits exactly event, eventId, timestamp,
severity, source and category. IDs are fresh Web Crypto UUIDs; timestamps are
created locally. No input identifier, raw message, SQL, parameters, target,
connection string, hostname, username, certificate, token, stack, environment or
error metadata is copied into the event.

Both warnings and errors are registered as event-only Prisma logs in all
runtimes; no raw console-output mode is enabled. Public Prisma log-event payloads
are ignored completely. Their source label `engine_unattributed` denotes the
unattributed shared Prisma emitter (including native engine and request-handler
emissions); it does not establish the precise native origin or a request identity.
They receive category unknown and independent event IDs. No AsyncLocalStorage
attribution, global suppression window or fabricated transaction/request ID.

A supported query extension records operation errors using public Prisma error
classes and own scalar code fields, never message parsing. It passes original
arguments/results unchanged and rethrows the identical error to the caller.
The supported client extension forwards the existing public $on API; a localised
cast retains the generated PrismaClient public type for existing injected-client
and transaction callers. No model/result extensions or callsite changes. The
extended exported singleton and underlying base client share one engine/pool;
checkout and diagnostic both use that exported singleton. No connection settings,
per-request lifecycle, billing, entitlement, authentication or tenant logic changed.

Diagnostic database-phase catches also use the same safe logger, covering cold
transaction-start failures before query hooks run. Authentication failures are not
mislabelled by that database-phase catch. Sink/UUID/clock failures have no raw
fallback and do not replace the original database result or error.

Allowlisted code classifications:

- P1000 authentication; P1001 connection_unavailable; P1002 connection_timeout.
- P1003 database_missing; P1008 operation_timeout; P1010 access_denied.
- P1011 tls; P1017 connection_closed; P2002 unique_constraint.
- P2003 foreign_key; P2010 raw_query_failure; P2021/P2022 schema_missing.
- P2024 pool_timeout; P2025 record_missing; P2028 transaction_failure.
- P2034 transaction_conflict.
- Supported validation and Rust panic classes: validation / engine_failure.
- Unsupported code/class, spoofed ordinary objects, ambiguous or malformed input:
  unknown. Categories are observability only, never billing or ownership authority.

### Tests and validation

Tested base `f859bbc56aba2e1322dccd6c18661cff1c1b7cf0` plus this uncommitted local
candidate. Exact source/test SHA-256 manifest aggregate:
`0c6237b5b7ce0258a7057835eb8549e7ad5c6df6a86dda29f6585c4087b5badc`. Individual hashes and machine-readable results are in
`/private/tmp/dg-option-b-certification-20261030.json`.

- Logging/security: 22/22 PASS (17 code cases plus startup/error classes, unknown
  and malicious getters, native-payload disclosure attempts, concurrency/unique
  event IDs, severity and sink-failure containment).
- Existing runtime/platform/API-key tests: 28/28 PASS; existing actual-action mocked
  boundary tests: 2/2 PASS. Total focused tests: 52, zero failures/skips/cancellations.
- Existing 6/6 disposable PostgreSQL checks PASS. The final schema-fault check now
  interleaves diagnostic and unrelated shared-client failures, verifies classified
  records, unique event IDs, no fabricated correlation and no raw log disclosure.
- Additional cold transaction-start test: 1/1 PASS against an intentionally missing
  database on the SAME newly owned loopback cluster. database_missing classified,
  unavailable response, no unsafe logs. Total disposable groups: 7/7.
- Full TypeScript: PASS, exit 0, 16.82s.
- Changed-file lint: PASS, exit 0, 1.38s.
- Full npm run build including prebuild: PASS, exit 0,
  74.8s; all 457 pages generated.
- Built route present and exactly one corresponding server-action worker entry.
  No built application HTTP invocation performed under this approval.
- git diff --check: PASS. High-confidence live-key/Neon-password/GitHub-token/private
  key scans: zero matches. Synthetic malicious disclosure fixtures are deliberate;
  scans are not claimed to prove the absence of every possible secret format.

Exact commands executed:

```
node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs --test scripts/test-safe-prisma-logging.mjs scripts/test-runtime-identity.mjs scripts/test-platform-authority.mjs scripts/test-api-key-authority.mjs
node --experimental-test-module-mocks --experimental-strip-types --import ./scripts/register-ts-resolver.mjs --test scripts/test-runtime-identity-action.mjs
node --experimental-strip-types --import ./scripts/register-ts-resolver.mjs scripts/test-runtime-identity-db.mjs
./node_modules/.bin/tsc --noEmit --incremental false
./node_modules/.bin/eslint src/lib/runtime-identity.ts 'src/app/(shell)/command/runtime-identity/actions.ts' 'src/app/(shell)/command/runtime-identity/page.tsx' 'src/app/(shell)/command/runtime-identity/IdentityProbe.tsx' 'src/app/(shell)/command/platform-health/page.tsx' packages/database/src/index.ts packages/database/src/safe-logging.ts scripts/test-safe-prisma-logging.mjs scripts/test-runtime-identity.mjs scripts/test-runtime-identity-action.mjs scripts/test-runtime-identity-db.mjs scripts/test-runtime-identity-db-child.mjs
npm run build
```

Static/build commands used bounded process-group wrappers and a minimal environment,
without external credentials. The existing private lockfile-matching dependency
copy was retained; no protected shared installation was modified.

Intermediate findings were corrected, not hidden: initial extension type inference
was incompatible with existing generated transaction interfaces; the local public
API adapter fixed this without modifying callers. An initial build failed because
node:crypto reached an existing client import path; replaced with Web Crypto, then
reran focused tests, disposable tests, TypeScript, lint and full build successfully.
Existing Next Edge/deprecation/cache warnings were not suppressed or redesigned.

### Independent security review

A genuinely separate read-only reviewer inspected the final implementation,
including the Web Crypto change, and returned PASS by inspection: no confirmed
P0/P1 defect or unsafe default log disclosure. Confirmed allowlisted fields/classes,
ignored native payload, preserved warning/error severity, no fabricated attribution,
unchanged query semantics, shared pool, sanitised cold transaction-start failures
and contained logger failures. Reviewer did not edit files or claim to run tests.

### Accepted trade-offs and remaining release gates

- Raw engine detail is intentionally lost; safe classes, severity and event-level
  evidence replace it. This is the owner's accepted Option B trade-off.
- One failure may emit several independent engine/hook/diagnostic-catch records.
  Aggregate by category/severity/source for event volume only; event counts are NOT
  unique failure, request, transaction or charge counts. No deduplication claimed.
- No request-level correlation is fabricated where none is reliably supplied.
- Cold-process startup is required; HMR may reuse a cached client with older policy.
- Future direct raw $on listeners, debug logging or other raw sinks require review.
  Existing callers can still receive original errors; sanitising every unrelated
  caller's own logging is outside this shared-Prisma-sink contract.
- Native warnings are policy-tested with synthetic payloads; no claim that every
  native engine failure variant was generated. Unknown is the safe fallback.
- One-per-loaded-instance limiter remains neither global nor durable one-use.
- Real Clerk-authenticated validation, durable deployment-wide one-use enforcement,
  unavailable authoritative one-use source comparison and deployment-specific
  identity verification remain separate gates. No new durable store was added.

**PASS for local Option B logging remediation; HOLD / NO-GO for Production.**
No Production access, credentials, hosted auth testing, migrations, grants, commits,
merge, deployment, hosted configuration, diagnostic invocation outside disposable
unit/integration tests, support contact, admissions or checkout activation.

### Final exact candidate inventory (14 files; original 12 plus 2 supporting files)
- `docs/ROADMAP.md`
- `packages/database/src/index.ts`
- `src/app/(shell)/command/platform-health/page.tsx`
- `docs/commerce/release-1025/LOCAL-RUNTIME-IDENTITY-DIAGNOSTIC.md`
- `packages/database/src/safe-logging.ts`
- `scripts/test-runtime-identity-action.mjs`
- `scripts/test-runtime-identity-db-child.mjs`
- `scripts/test-runtime-identity-db.mjs`
- `scripts/test-runtime-identity.mjs`
- `scripts/test-safe-prisma-logging.mjs`
- `src/app/(shell)/command/runtime-identity/IdentityProbe.tsx`
- `src/app/(shell)/command/runtime-identity/actions.ts`
- `src/app/(shell)/command/runtime-identity/page.tsx`
- `src/lib/runtime-identity.ts`
