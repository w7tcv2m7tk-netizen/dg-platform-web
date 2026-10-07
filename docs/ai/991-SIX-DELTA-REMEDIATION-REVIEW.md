# Complete #991 physical remediation — preparation only

This replacement supersedes the four-CHECK remediation contract. It is based on
main `24c2ac312b46ef2a0ea4659d92880f2dc2bd7df5`, contains no #993 implementation,
and must remain unmerged pending review. No Production access, configuration,
deployment, remediation, reconciliation or provisioning was performed in preparing it.
The previous four-CHECK executor must not be executed.

## Authoritative artifacts and timestamp DDL

Canonical migration SHA-256 remains
`55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d`.
The canonical migration and Prisma schema are unchanged.
Replacement `scripts/sql/remediate-991-checks.sql` SHA-256:
`c6ad8dbd875bd289eb82d7a37f041daff006b38a6ab9643fffc0711d1f4644f1`.
The historical filename is retained so the existing guarded executor remains the
only server mutation path; its content now repairs six deltas.

```sql
ALTER TABLE public.ai_worker_provisioning_receipts
  ALTER COLUMN created_at TYPE timestamptz USING (created_at AT TIME ZONE 'UTC'),
  ALTER COLUMN completed_at TYPE timestamptz USING (completed_at AT TIME ZONE 'UTC');
```

The mandatory empty-table invariant is checked after ACCESS EXCLUSIVE acquisition,
before this DDL, and again after mutation. No existing timestamp value can reach
the conversion expressions. Explicit UTC avoids any dependence on connection
timezone; it does not assert that hypothetical historical naive values were UTC.
Unqualified `timestamptz` exactly matches canonical Git typmod -1 and PostgreSQL
datetime precision 6, also meeting Prisma `@db.Timestamptz(6)` semantics.
The clock_timestamp() default, created_at NOT NULL and completed_at nullability
are preserved and independently checked afterward.

PostgreSQL can replace the empty heap/TOAST storage, the created_at NOT NULL
catalogue entry, and the dependent window index during ALTER TYPE. Rehearsal
confirmed these internal changes. The window index definition and keys stay
unchanged; its timestamp operator class correctly changes to timestamptz_ops.
Operation CHECK and PK constraint identities remain unchanged. Preservation checks
allow these specific internal consequences, while checking canonical logical
shape and unrelated schema/data/history. No extra application schema objects are added.

## Starting-state gate

All conditions are enforced inside one transaction with bounded LOCAL timeouts:

- PostgreSQL 18; nonblocking transaction advisory lock (991,20261008).
- ACCESS EXCLUSIVE receipt lock; SHARE locks on principals, deployments,
  approvals, inference jobs, claim receipts, accounting outbox and Prisma history.
- All eight relations are ordinary permanent, unpartitioned tables without RLS
  or forced RLS. All seven execution-state tables are empty.
- #991 history is absent; the four older conflicting history names are absent;
  no unfinished or rolled-back migration-history record is accepted.
  Every field of every existing history row is snapshotted and must be unchanged.
- Exact nine receipt columns in order: nonce/fingerprint/window_id/operation/outcome
  text NOT NULL; worker_id/deployment_id nullable text; created_at timestamp(3)
  without time zone NOT NULL DEFAULT clock_timestamp(); completed_at timestamp(3)
  without time zone nullable with no default. No other column defaults.
- No dropped, generated, identity, inherited, array or missing-value columns;
  text collation is the PostgreSQL default.
- Exact existing named CHECKs: nonce length 16–128, fingerprint length 64,
  window_id length 1–80, outcome verified/succeeded/rejected/mutation_failed/window_closed;
  operation provision/recover. Exact PRIMARY KEY(nonce).
- Exact six PostgreSQL 18 NOT NULL names, column keys, definitions and flags:
  nonce/fingerprint/window_id/operation/outcome/created_at. They must be validated,
  enforced, local, nondeferrable, nondeferred, uninherited and not NO INHERIT.
  Additional or renamed NOT NULL identity refuses rather than being repaired.
- Exact canonical PK/window/pinned-name index definitions, all valid/ready/live
  and explicitly unclustered (`indisclustered=false`);
  exactly two receipt indexes and no additional receipt constraint.
- Every receipt constraint is validated, enforced, local, nondeferrable and
  noninherited. No receipt inheritance in either direction, triggers, rules or
  policies; no user triggers/rules on principal/history relations.
- Receipt table uses heap/default replica identity with no relation options.
- Canonical incompatibility count is zero, independently of mandatory emptiness.

Any mismatch in these catalogue contracts refuses and rolls back. No request values become SQL. The SQL artifact
is embedded mechanically, hashed at build and runtime, and executed verbatim by
the existing Clerk-session/platform-authority executor. Activation, dedicated
secret hash, exact Origin/path/method, API-key rejection, no-body envelope,
membership fencing, safe allowlisted audit, no retries and disabled-by-default
behavior are preserved. Route and middleware code are unchanged.

## Target and independent rehearsal

Final gate requires canonical column types/precision/defaults/nullability,
all five canonical CHECKs, all six named NOT NULL constraints and the canonical
PK/index definitions including unclustered state; the same
table-safety conditions remain enforced. Receipt rows remain zero. Before/after
history and unaffected columns/constraints/principal catalogue/index definitions
must match. Locked execution-state tables remain empty throughout the transaction.

The fresh socket-only PostgreSQL 18 fixture recreates the observed naive
timestamp(3) columns and all four incorrect CHECKs. It uses synthetic history and
unrelated sentinel data, inherits no database URL, and is stopped/destroyed.
A separate reference database executes the unchanged canonical migration itself.
`991-receipt-shape.sql` independently compares all column properties, CHECK/NOT
NULL/PK definitions and flags, index definitions/flags/operator classes, persistence,
access method, replica identity, RLS, inheritance, triggers, rules and policies.
The canonical full shape is retained once in `991-six-delta-rehearsal-results.json`,
with the observed starting catalogue/timestamp deltas, final-equality assertion,
case outcomes and unchanged-dump digests. Repeated full shapes and SQL error
query bodies are omitted; the executable rehearsal regenerates them independently.

The matrix covers success of all six corrections, three different session timezones,
missing/mismatched canonical hash, nonempty compatible and incompatible data,
timestamp type/precision drift, all four CHECKs, operation, PK, index/extra index,
columns/default/nullability, trigger/rule/inheritance/RLS/policy drift, history
presence/unresolved/conflicting history, all nonzero execution states, lock contention,
forced failure after timestamp DDL, explicit rollback, final-postcondition rollback,
already-canonical/repeated execution and unrelated schema/data/history preservation.
Executor tests additionally exercise authenticated security boundaries, concurrency,
authority revocation, kill-switch rollback, safe responses/audit and artifact tampering.

## Correction to earlier rehearsal interpretation

Read-only investigation found that Neon branch
`temporary-991-canonical-rehearsal-20261007` (`br-jolly-cake-a7ltbfje`) currently
contains the same noncanonical physical receipt table as Production, plus a #991
Prisma resolve-shaped history row (canonical checksum, zero applied steps, empty logs).
Its current physical catalogue does **not** prove canonical #991 DDL was applied.
That branch was not used as reference, changed, or deleted.
The historical local four-CHECK fixture applied canonical SQL first and altered
only CHECKs, so it omitted the actual Production timestamp discrepancy.
Historical logs are retained as historical evidence, not validation of this replacement.

## Final-review catalogue blockers and corrections

The prior head `3c2bfa1b8dfb929c2c171443b2bdada295d275fa` passed its supplied
suites but failed independent exact-catalogue review: renaming fingerprint's NOT
NULL constraint and setting a window-index CLUSTER marker were both accepted.
The previous SQL hash was
`4388e9711c1a0214ba373d0bf49c092035f0a3c8efea7f60e1e34f6ae27e9090`.

Both starting and final gates now enumerate all six NOT NULL identities and their
column numbers, definitions and flags. The created_at constraint may acquire a
new internal OID during ALTER TYPE, but its name and logical properties must stay
canonical. Renamed/additional identity is never normalized or repaired.

Both exact index catalogues and before/after preservation include
`indisclustered`; the independent canonical shape query includes it too.
Canonical indexes must remain unclustered. No CLUSTER marker is cleared.

Regressions cover each of six NOT NULL renames, an additional completed_at NOT
NULL object, both receipt-index CLUSTER markers before DDL, six NOT NULL renames
and both markers injected after all six DDL statements before final verification.
Starting regressions add a test-only trap immediately before the first DDL;
the expected catalogue error must occur before the trap. Final regressions compare
the complete original fixture after rollback.

`scripts/test-991-catalogue-counterexamples.py` independently creates another
socket-only PostgreSQL 18 fixture, executes the exact reviewed SQL for both
original counterexamples, checks unchanged dumps, tests both final-drift rollbacks,
and verifies ordinary success against freshly applied unchanged canonical DDL.
It does not import the rehearsal/executor helpers or derive canonical expectations
from the remediation literals. The six mutation statements, lock order, timeouts,
executor/session/secret boundary and canonical migration bytes are unchanged.

## Repaired CHECK identity correction

Independent review of `e6e43b5a21f5ef948f18790f55ac703ffd2c41fc` found
that swapping nonce/fingerprint CHECK names after the six changes committed a
noncanonical catalogue. Its SQL hash was
`1c07112091af372cfad73488c822cd98fab271b05896458495369c3b0c8f1b6e`.
Definitions alone could not detect the permutation, and preservation excluded
both repaired names.

Both starting and final comparisons now bind every CHECK/PK name to its type,
definition, constrained column numbers and validated/enforced/deferrable/deferred/
local/inheritance/no-inherit flags. Repaired CHECK keys are nonce `{1}`,
fingerprint `{2}`, window_id `{3}` and outcome `{5}`. Operation `{4}` and PK `{1}`
remain canonical. Any unexpected name, binding, additional CHECK or flag refuses.
No rename or normalization is executed.

Each SQL/executor suite adds 20 cases: before-mutation refusal and post-DDL full
rollback for nonce/fingerprint and window_id/outcome name swaps, nonce/window_id
column rebinding, all four repaired CHECK renames, an extra CHECK and NO INHERIT.
Before-DDL traps prove the catalogue gate fires first; final cases compare the
entire fixture after rollback. Independent SQL cases compare normal success to a
fresh canonical PostgreSQL 18 database. The original NOT NULL and CLUSTER
counterexamples still refuse, and their final-drift rollback regressions pass.

A separate disposable-cluster reproduction executed the exact prior Git SQL and
the corrected SQL with the identical nonce/fingerprint swap: prior SQL committed
and failed canonical equality; corrected SQL refused with an unchanged dump.
Its seven cases passed. Reproduce the corrected case using
`scripts/test-991-catalogue-counterexamples.py`; retrieve the prior artifact with
`git show e6e43b5a:scripts/sql/remediate-991-checks.sql` for comparison.

All five mutation statements (six semantic deltas), locks and timeouts are
byte-for-byte unchanged from that reviewed head. Canonical migration, Prisma
schema, route, middleware, request/authority boundaries and NOT NULL/CLUSTER
gates are unchanged. Generated SQL was rebound to the new hash above.
The normal build passed with 881/881 node:test cases and 456 generated pages;
nonfatal warnings also included Prisma CommonJS exports and NFT tracing.
No bulky logs were restored. No Production or operational action occurred.

## Evidence retention review

Before deleting transcripts, all files were inventoried, scanned again for secret
material, and reviewed for unique observations. No secret material was found;
`api_key:operator` was a negative-test label. Retained permanent evidence includes
security/locking/timestamp rationale, historical misleading-Neon interpretation,
the failed-review counterexamples above, canonical catalogue, all rehearsal case
outcomes/rollback digests, source hashes and exact validation commands/totals.
No executable tests or canonical fixtures were removed.

Removed `991-six-delta-evidence/*.log`: ai-db (685 lines), binding (1), executor
(138), normal-build (2,765), rehearsal (51), security (91), and three empty logs
(diff-check/lint/typescript). Test names and synthetic-error diagnostics are
reproducible from the retained suites; full SQL errors duplicated the reviewed SQL.
The full JSON duplicated starting/final canonical properties; it now keeps one
canonical full shape, starting differences and verified final equality.

Unique diagnostic context retained: PostgreSQL 18.6 Homebrew fixtures were owned
and destroyed; original suites were SQL 50/executor 89/AI DB 57/provisioning 13/
focused security 48/build 881. Existing Node module-type warnings, middleware
convention/cache-header warnings and expected dynamic-render diagnostics did not
fail the normal build. Synthetic Prisma failures belonged to negative regressions.
The restricted build stalled with zero CPU; the same normal build passed outside
the sandbox with no flags or source workaround. Updated totals are below.

## Final validation

All decisive checks passed on this main-based catalogue correction:

| Check | Result |
|---|---|
| Fresh PostgreSQL 18 SQL rehearsal | 87 passed, 0 failed |
| Physical executor / security / binding | 126 passed, 0 failed |
| AI local DB regression | 57 passed, 0 failed |
| Provisioning DB regression | 13 passed, 0 failed |
| Focused worker/security/client-boundary regressions | 58 passed, 0 failed |
| Independent original counterexamples and final-drift rollback | 25 passed, 0 failed |
| TypeScript, focused ESLint, generated binding, diff whitespace | exit 0 |
| Normal supported npm run build, including existing prebuild | exit 0; 881/881 node:test cases |

Runtime-source hashes, exact rerun commands and compact results are retained in
`991-six-delta-evidence/results.json`. Raw runner/build transcripts are regenerated
locally rather than stored permanently in source control.
Earlier restricted builds stalled during Turbopack compilation with zero CPU.
This correction used the normal build outside the sandbox in an isolated staged-tree
copy, with no environment files, dummy Clerk values and an unreachable loopback
database. It compiled, completed TypeScript and generated 456 pages; 880 prebuild
node:test cases plus the build client-boundary case passed. No build flags, source
workaround or deployment command were introduced.
Fixture column/constraint/index definitions and table safety were also mechanically
compared with the retained read-only Production catalogue from the investigation.

Browser/Clerk invocation remains a separate unresolved execution prerequisite:
the supported bridge reported that the browser client was not trusted. No workaround
was attempted. Snapshot `snap-odd-hall-a7p1296b` was not touched.

STOP FOR REVIEW. No merge, deployment, authority configuration or execution is authorised here.
