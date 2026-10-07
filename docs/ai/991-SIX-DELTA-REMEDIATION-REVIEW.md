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
`4388e9711c1a0214ba373d0bf49c092035f0a3c8efea7f60e1e34f6ae27e9090`.
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
- Exact canonical PK/window/pinned-name index definitions, all valid/ready/live;
  exactly two receipt indexes and no additional receipt constraint.
- Every receipt constraint is validated, enforced, local, nondeferrable and
  noninherited. No receipt inheritance in either direction, triggers, rules or
  policies; no user triggers/rules on principal/history relations.
- Receipt table uses heap/default replica identity with no relation options.
- Canonical incompatibility count is zero, independently of mandatory emptiness.

Any drift refuses and rolls back. No request values become SQL. The SQL artifact
is embedded mechanically, hashed at build and runtime, and executed verbatim by
the existing Clerk-session/platform-authority executor. Activation, dedicated
secret hash, exact Origin/path/method, API-key rejection, no-body envelope,
membership fencing, safe allowlisted audit, no retries and disabled-by-default
behavior are preserved. Route and middleware code are unchanged.

## Target and independent rehearsal

Final gate requires canonical column types/precision/defaults/nullability,
all five canonical CHECKs and the canonical PK/index definitions; the same
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
Full starting/canonical/final shapes are retained in `991-six-delta-rehearsal-results.json`.

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

## Final validation

All checks passed on this main-based release:

| Check | Result |
|---|---|
| Fresh PostgreSQL 18 SQL rehearsal | 50 passed, 0 failed |
| Physical executor / security / binding | 89 passed, 0 failed |
| AI local DB regression | 57 passed, 0 failed |
| Provisioning DB regression | 13 passed, 0 failed |
| Focused worker/security/client-boundary regressions | 48 passed, 0 failed |
| TypeScript, focused ESLint, generated binding, diff whitespace | exit 0 |
| Normal supported npm run build, including existing prebuild | exit 0 |

Logs, runtime-source hashes and results are retained in `991-six-delta-evidence/`.
The sandboxed build initially stalled during Turbopack compilation with zero CPU;
it was stopped, and the same normal build succeeded outside the sandbox. No build
flags, source workaround or deployment command were introduced.
Fixture column/constraint/index definitions and table safety were also mechanically
compared with the retained read-only Production catalogue from the investigation.

Browser/Clerk invocation remains a separate unresolved execution prerequisite:
the supported bridge reported that the browser client was not trusted. No workaround
was attempted. Snapshot `snap-odd-hall-a7p1296b` was not touched.

STOP FOR REVIEW. No merge, deployment, authority configuration or execution is authorised here.
