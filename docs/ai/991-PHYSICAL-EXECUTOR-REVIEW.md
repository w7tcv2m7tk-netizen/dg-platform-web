# Controlled one-shot #991 physical-schema executor — BUILD/TEST ONLY

STOP FOR REVIEW. No Production execution or deployment occurred. The executor is
implemented, isolated tests pass, and the normal supported `npm run build` completed
with exit 0 after the narrow EnabledAppsProvider client-boundary fix. This branch
inherits draft #993; release preparation does not authorise deployment or execution.

## Architecture and separation

Temporary server-only Node route: POST `/api/admin/remediate-991-physical` at
`https://app.digitalgate.com.au`. It creates a lazy Prisma client using the existing
application server database configuration, with query/error logging disabled. It
never reads, returns or logs DATABASE_URL. No global connector/session provisioning,
subprocess, Neon API, migration CLI, worker creation or history reconciliation.

Dedicated identity: `remediate_991_physical`. The #993 reconciliation implementation,
route, checksum semantics and tests remain unchanged. A separate advisory-lock key
and separate enablement/hash configuration prevent authority coupling. No new
permanent tables, migrations, history records or durable audit schema are added.

Branch `fix/991-physical-remediation-executor` was created from unchanged HEAD
`13205f181e274e155ac9a94c8a50c1f1df7d4517`. The reviewed changes are prepared for an authorised commit and separate draft PR. This is a
local branch based on draft #993, not a Production deployment branch; a future
physical-only rollout must avoid deploying/merging the inherited draft #993 code.

## Exact changed/new files

Executor changes:

- `src/app/api/admin/remediate-991-physical/route.ts` — new server-only Clerk session route; lazy silent Prisma client; fixed unsupported methods.
- `src/lib/remediate-991-physical.ts` — dedicated activation/authentication/secret gates, platform authority, transaction/advisory lock and safe outcomes.
- `src/lib/remediate-991-request.ts` — exact envelope, fixed responses, allowlisted audit events and Clerk redirect/error/rewrite refusal.
- `src/lib/remediate-991-sql.ts` — runtime hashes, mechanical extraction of unchanged SET LOCAL and DO statements.
- `src/lib/remediate-991-sql-generated.ts` — generated complete reviewed SQL and canonical migration bytes, server-only.
- `src/middleware.ts` — narrow exact-path handling before normal redirect logic; Clerk still authenticates; no auth.protect redirect on this operation; handshake/error/rewrite responses become fixed refusals.
- `scripts/generate-remediate-991-sql.mjs` — pinned source/hash checks and deterministic binding generation/verification, with no environment or DB access.
- `scripts/run-remediate-991-physical-tests.mjs` — dedicated disposable PostgreSQL 18 cluster, stripped environment, local identity marker, cleanup evidence.
- `scripts/test-remediate-991-physical.mjs` — 63 executor/security/preservation/rollback/binding cases.
- `package.json` — build requires generated-binding/source verification and the client module-graph regression before Next compilation; existing prebuild checks retained unchanged.
- `src/components/platform/EnabledAppsProvider.tsx` — existing browser-safe direct imports replace mixed root-barrel imports; refreshed prop state is adopted during render to satisfy focused lint while localStorage remains in the effect. File line endings were normalized; no other provider behavior was edited.
- `scripts/test-enabled-apps-client-boundary.mjs` — transitive runtime module-graph regression; passes with the fix and fails against unchanged HEAD.
- `docs/ai/991-BUILD-INVESTIGATION.md`, `991-BUILD-BASELINE-FAILURE.log` — exact baseline failure and import chains.
- `docs/ai/991-release-evidence/` — retained final successful build/regression logs and expected unchanged-HEAD negative result.
- `docs/ai/991-PHYSICAL-EXECUTOR-REVIEW.md` — this report/procedure.
- `docs/ai/991-PHYSICAL-EXECUTOR-results.json` — checks, hashes, logs, versions and safety evidence.

Preserved preexisting preparation changes, not discarded or overwritten:
`M scripts/test-ai-worker-provisioning-db.mjs` (21 added regression lines), and
untracked `docs/ai/991-REMEDIATION-PREPARATION.md`, `docs/ai/991-rehearsal-results.json`,
`scripts/rehearse-991-check-remediation.py`, and the three files in `scripts/sql/`.
The reviewed SQL itself was not edited; previous 21-case SQL evidence was retained.

## Artifact binding and psql translation

Authoritative `scripts/sql/remediate-991-checks.sql` is still 139 lines, SHA-256
`8ec224c121ee3612a45b52e1f00b988db99d1b507e231fbb7dcb1815cb6ae96c`.
Canonical Git migration SHA-256 remains
`55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d`.
The full artifacts are embedded mechanically; no handwritten second remediation.

`node scripts/generate-remediate-991-sql.mjs --check` checks both actual repository
artifact hashes and exact generated-file equality. `--write` is an explicit
maintenance mode that also refuses changed source hashes. npm build requires check
mode. Three negative tests alter remediation, migration or generated output in owned
scratch copies and prove verification fails. The generator output is not a secret.

Runtime independently hashes the embedded full SQL and migration bytes before
request execution can obtain a DB client. Only after both pinned hashes match does
it mechanically extract the exact five SET LOCAL statements and entire DO block.
Tests verify byte equality for the extracted DO block/settings and compare repaired
catalogue with the canonical result retained from the earlier rehearsal.

The psql checksum attestation (\set/\if/\gset) becomes verified application-side
hashing; it is not sent to PostgreSQL. The pinned artifact structure/hash is required.
Outer BEGIN/COMMIT become Prisma's single interactive transaction. ON_ERROR_STOP
becomes propagated exceptions/transaction rollback. Every PostgreSQL precondition,
DDL and postcondition inside DO is retained verbatim; only constant generated SQL
uses $executeRawUnsafe. No request or environment value becomes SQL text.

## Authority and activation

All of the following are required:

- NODE_ENV=production AND VERCEL_ENV=production; preview/development/missing runtime fails.
- DG_REMEDIATE_991_PHYSICAL_OPERATION=remediate_991_physical; absent/wrong value disables.
- AI_WORKER_PROVISIONING_ENABLED must not equal true (the established provisioning enablement value).
- Dedicated DG_REMEDIATE_991_PHYSICAL_SECRET_SHA256 must be exactly 64 lowercase hex characters.
- X-DG-Operation must be remediate_991_physical.
- X-DG-Remediate-991-Physical-Secret must be a 64-character lowercase hex one-time secret; its SHA-256 is compared using timingSafeEqual to the configured hash.
- Exact URL equals https://app.digitalgate.com.au/api/admin/remediate-991-physical; exact Origin header; no query, trailing path, alternate origin, body or X-API-Key.
- Clerk auth explicitly accepts session_token only; a valid human user_ identity is required; API-key identities fail.
- Active database membership must satisfy existing hasPlatformAuthority: dg:staff, or owner of allowlisted operator organisation; tenant admin/member/inactive/unallowlisted owner fails.

No JSON/body payload is defined: operation and raw secret exist only in the two
request headers above. Even an empty body stream is refused. Middleware rejects
unsupported verbs before Clerk redirects; all supported non-POST Next methods also
export the same 403/no-store route handler. Unexpected TRACE is refused by middleware.

Membership authority is checked before remediation locks, then protected with a
SHARE membership-table lock and rechecked before DDL and before commit. Activation
and secret checks are also repeated before DO and before commit. Separate #993,
worker and provisioning credentials are never read or accepted.

Disabling/removing the dedicated operation value disables new calls in runtimes
that receive the configuration. Vercel environment edits alone must not be assumed
to change already-running deployments: a reviewed disabled rollout/removal is needed
for operational shutdown. Canonical starting-state refusal provides durable replay
protection independently of configuration. No Production settings were inspected.

## Transaction, replay and preservation

Single ReadCommitted Prisma interactive transaction: maxWait=2000ms, timeout=25000ms.
Exact LOCAL PostgreSQL settings: protected search_path=pg_catalog,public;
lock_timeout=2s, statement_timeout=15s, idle_in_transaction_session_timeout=5s,
transaction_timeout=25s. PostgreSQL 18 only.

Nonblocking pg_try_advisory_xact_lock(991,20261008) is distinct from #993's
(991,20261007). Another in-flight executor call refuses immediately. Lock is released
by commit/rollback, including crashes; it adds no permanent state. Successful final
canonical CHECKs are the durable one-shot marker: later invocations fail the exact
incorrect-starting-catalogue gate. A refusal/rollback does not consume the authority.

The original DO block acquires ACCESS EXCLUSIVE on receipts before compatibility
validation and retains it through all four replacements and commit/rollback. It
also SHARE-locks principals/history. This fences external writes/DDL and avoids any
compatibility-check/insertion race. No replacement gets a separate transaction.

Starting gate verifies exact columns/types/nullability/defaults, six constraint
names/definitions, validated/nondeferrable/nondeferred/local/noninherited/enforced
flags, receipt inheritance, relevant triggers/rules/RLS, table kind/persistence and
three valid/ready/live index definitions. Missing/drifting/already-canonical state
refuses. Zero incompatible rows is required before DDL using the canonical nonce,
fingerprint, window_id, operation and outcome conditions; NOT TRUE catches NULL.

Exactly these constraints are replaced:

1. ai_worker_provisioning_receipts_nonce_check
2. ai_worker_provisioning_receipts_fingerprint_check
3. ai_worker_provisioning_receipts_window_id_check
4. ai_worker_provisioning_receipts_outcome_check

Operation CHECK, primary key, backing PK index, window index and pinned-name index
are never dropped/recreated. No row/history writes. Before/after snapshots compare
receipt rows, every history field, relevant relation/index/untouched constraint
identities. The exact canonical #991/#993 final pg_catalog expectation is re-read
and checked before COMMIT. Any failure, postcondition mismatch, lost authority or
kill-switch change before commit throws and rolls back.

Replay relies on durable canonical schema, not on mutating Prisma history. If a
privileged external actor deliberately restores the incorrect schema, that would
restore the starting gate; disabling/removing this temporary route remains required.

## Safe response and audit

Only JSON is returned: {ok:true,operation:"remediate_991_physical"} on 200 or the
same fixed shape with ok:false on 403. All responses have Cache-Control:no-store,
X-Content-Type-Options:nosniff, and a server-generated X-DG-Request-ID. No redirect,
SQL, catalogue, row, migration contents, credentials, secret or driver error.
Clerk handshake redirects/errors/rewrites are converted to the same fixed refusal.

Allowlisted structured audit goes to the server log: operation, generated requestId,
timestamp, authenticated actor (or null before authentication), outcome
attempt/success/refused. No request object/error/SQL/header/URL is logged by this code.
The deployment's normal server-log retention must be confirmed during rollout review;
this introduces no permanent audit table. Audit transport errors are suppressed so
a committed transaction cannot be incorrectly returned as refused due to logging.

A network/commit-acknowledgement failure can leave the caller uncertain about commit;
fixed refusal/error is not a substitute for independent catalogue verification.
Do not automatically retry on a lost response. Canonical replay refusal prevents a
second repair after a committed first attempt.

## Verification and full totals

PostgreSQL: 18.6 (Homebrew). Dedicated runner accepts an installed absolute bin path,
verifies major version, creates only its own loopback cluster on a nondefault port,
and asserts DB name/host/random cluster marker before fixtures. It allowlists only
PATH/HOME/TMPDIR plus C locale, supplies its own synthetic URL, does not load env
files or Vercel configuration, and blocks libpq password/service-file fallback with
owned nonexistent paths. Prisma generated client has null environment-file paths.
Owned executor cluster was stopped/destroyed; other DB suites owned separate clusters.

Reproduce: node scripts/run-remediate-991-physical-tests.mjs /opt/homebrew/opt/postgresql@18/bin

| Suite | Passed | Failed |
|---|---:|---:|
| Dedicated executor (including redirect guard) | 63 | 0 |
| Existing unchanged #993 reconciliation | 28 | 0 |
| Existing AI local DB | 57 | 0 |
| Existing provisioning DB, retained exact-catalogue assertion | 13 | 0 |
| Focused worker/provisioning/crypto/gateway/authority/middleware security | 121 | 0 |
| Complete existing unit suite | 569 | 0 |

851 passing tests across these runs; suites overlap, so this is not a unique-test
count. All have zero failures/cancellations/skips. Existing full npm prebuild also
passed: 880 node:test cases across 26 reported groups, plus its additional contract
scripts and existing lint checks. Those are overlapping runs, not added to 851.

Dedicated coverage maps the requested matrix as follows:

- 1–8: exact variant names/definitions, canonical convergence, exactly four changed constraint OIDs, operation/PK/index/table identity, receipt microseconds/nulls, all four synthetic unresolved migration records and unrelated table/index/view/rows preserved.
- 9–11: five incompatible-row refusals, seven catalogue drift refusals, canonical replay refusal.
- 12–13: canonical/remediation hash changes fail verification; generated binding drift also fails.
- 14–25: operation disabled/wrong, non-Production/missing runtime, provisioning enabled, missing/API/nonoperator/inactive/unallowlisted identities, wrong/malformed/missing secret/hash, wrong operation/origin/URL/query/body, seven unsupported methods.
- 26–30: concurrent invocation (exactly one success), 2s lock contention, first-DDL exception, final postcondition rejection, exact-state rollback; also post-DDL kill-switch and pre-lock authority-revocation checks.
- 31–32: fixed/no-store/no-redirect responses, safe audit, injected SQL/secret/credential/error leakage sentinel, Clerk handshake guard and logger-failure semantics.
- 33–38: unchanged #993, worker/provisioning/security and full unit regressions; TypeScript, focused lint and git diff --check passed.
- 39: full prebuild and normal production compilation passed after the narrow client-boundary fix below.

Normal supported `npm run build` passed on the final application bytes: compilation
14.2s, TypeScript 14.2s, and all 456 static pages completed. The saved successful
build snapshot matches every current application/build input byte for byte. Final
executor, reconciliation, AI DB, focused/security and negative regression logs
postdate source edits. No expensive suite or build was rerun merely for disconnect.

The initial unchanged-HEAD build failed because EnabledAppsProvider imported the
mixed `@dg/platform-core` runtime barrel, exposing server Node modules to its client
graph. Direct existing browser-safe modules remove those edges; exact five import
chains are recorded in 991-BUILD-INVESTIGATION.md. No shims, server-check weakening,
externals or build-error suppression were added. The graph regression passes on
current bytes and correctly fails against unchanged HEAD.

Final retained runs: executor 63, unchanged #993 28, AI DB 57 + provisioning DB 13,
security 121, focused 17: 299 passing tests, zero failures/cancellations/skips.
Normal build contains 880 prebuild node:test cases across 26 reported groups, plus
1 client-boundary case (881 total), all passing; contract scripts also succeeded.
Existing full unit suite 569 is included in prebuild, not added again. The earlier
SQL rehearsal retains 21 passing cases. Counts overlap across runs.
Focused lint and standalone TypeScript were rerun after disconnect, both exit 0.
Final staged standard diff check reports only the two whitespace-only lines 33/98
in the immutable, SHA-pinned remediation SQL. Those bytes must remain unchanged.
With only blank-at-eol disabled, the complete staged check passes. Retained log
copies normalize trailing whitespace/terminal blank lines; original log hashes
and retained-copy hashes are recorded separately. No application source was edited
during this release-preparation resume.

Logs and exact per-file hashes: docs/ai/991-PHYSICAL-EXECUTOR-results.json.

## Safety and source control

No Production connection/query occurred. No Production DB credential was retrieved,
read by the executor implementation, exposed or used in development. No Production
schema/data/history changed. No Prisma history reconciliation occurred; tests
created/mutated only their own synthetic fixtures, and the physical SQL preserved
every history row. The existing #993 tests necessarily exercised reconciliation only
inside their separate disposable database. #993 was not merged, deployed or executed
against Production. No worker/window/Slice 4 operation occurred. No Neon API or
Vercel Production configuration was accessed. Existing recovery snapshot untouched.

The user-supplied latest Production row counts (0 total, 0 incompatible) remain
external evidence; the executor repeats compatibility under lock when eventually
authorised. There was no new Production read to confirm those counts.

HEAD stays 13205f181e274e155ac9a94c8a50c1f1df7d4517. Branch is
fix/991-physical-remediation-executor. This pre-commit report accompanies the authorised commit/push and separate draft PR;
final commit/PR identifiers are reported to the reviewer. Working tree contains
only the explicitly listed executor files plus preserved preparation evidence.
Canonical migration directory and #993 core/route have no differences from HEAD.

## Future Production procedure — NOT executed

1. Review this executor, pinned hashes, audit/retention, independent current catalogue/data evidence and existing recovery snapshot. The client-boundary baseline limitation is fixed and the current normal build passed; obtain a passing physical-only release build on the final approved rollout base and review its exact source diff. Because this branch inherits draft #993, prepare the approved physical-only rollout on the appropriate Production base without merging or deploying #993. Rerun pinned-binding and isolated suites on that final release. None of this authorises reconciliation.
2. Obtain explicit authorisation for the disabled code rollout and, separately, the physical execution. Deploy only reviewed physical-executor changes with dedicated operation enablement absent. Keep #993 reconciliation and worker provisioning disabled. Do not run migrate deploy/resolve. The application's existing server DB connection stays in place; do not retrieve/copy its credentials.
3. Generate an independent cryptographically random 32-byte secret, encoded as 64 lowercase hex characters, in the operator's approved secret store. Store only its SHA-256 as Production-scoped DG_REMEDIATE_991_PHYSICAL_SECRET_SHA256. Do not reuse any #993/provisioning/worker secret and do not put the raw secret in env config, URLs, shell arguments, reports or logs.
4. After explicit physical-execution authorisation, enable only DG_REMEDIATE_991_PHYSICAL_OPERATION=remediate_991_physical in the authorised runtime rollout. Verify correct Production runtime, provisioning disabled, operator authority, exact app origin and log capture. Configuration changes must reach the serving deployment; never assume an env edit instantly changes an existing deployment.
5. From a signed-in Clerk human platform-operator session on https://app.digitalgate.com.au, send exactly one POST to /api/admin/remediate-991-physical, no query/body, with X-DG-Operation:remediate_991_physical and X-DG-Remediate-991-Physical-Secret containing the independently held raw secret. Browser sends the exact Origin header. Use same-origin credentials, no redirects, no automatic retries, and no logging of request headers. Record only fixed response/status and X-DG-Request-ID.
6. On 403 or any ambiguous/lost response, stop and independently verify catalogue before deciding what happened; do not infer rollback solely from transport failure and do not automatically retry. No direct tool bypass or generic SQL executor is part of this procedure.
7. Independently verify all five canonical CHECKs, PK/index definitions and untouched identities, table/rows/history preservation, no unrelated schema changes, and exact #993 physicalSchema catalogue acceptance. Retain independent evidence; do not invoke #993 or reconcile history as part of physical verification.
8. Disable the operation, revoke/remove its hash, and remove the temporary route/core/middleware carve-out/embedded artifacts in a reviewed rollout. Confirm the serving deployment has the disabled/removal state. STOP for a separate review before any #993 reconciliation, deployment or worker provisioning.

No step above was executed against Production. STOP FOR REVIEW.
# Superseded four-CHECK executor review

This historical stacked-branch report does not validate the complete observed
Production schema. See [six-delta replacement review](991-SIX-DELTA-REMEDIATION-REVIEW.md).
The old four-CHECK contract must not be executed; historical results below are retained.
