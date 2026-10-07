# #991 physical-schema remediation preparation — complete isolated rehearsal; STOP for review

Scope: preparation and isolated PostgreSQL 18 rehearsal only. No Production access,
queries, credentials, schema/data mutations, Prisma reconciliation, deployment,
#993 merge, provisioning-window activation, worker provisioning or Slice 4 work.
No canonical migration or #993 implementation was edited. No Git commit was made.

Authoritative Git head: `13205f181e274e155ac9a94c8a50c1f1df7d4517`
on `fix/991-one-shot-reconciliation`.
Canonical migration: `packages/database/prisma/migrations/20261007_ai_worker_provisioning_boundary/migration.sql`.
SHA-256: `55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d`.
Runner verifies HEAD, Git migration bytes/hash, working-copy equality, and the exact
SQL/expectations extracted from unchanged `src/lib/reconcile-991.ts` physicalSchema().

## Recovered work

Before edits, inspected Git status, all recovered remediation files and the saved
prior user instructions/catalogue supplied before the disconnect. Recovered:

- `scripts/sql/991-observed-constraints.json`: six supplied names/definitions/OIDs.
- `scripts/sql/991-physical-catalogue.sql`: exact #993 catalogue query.
- `scripts/sql/remediate-991-checks.sql`: guarded transactional draft.
- `scripts/rehearse-991-check-remediation.py`: isolated A–J runner.
- `scripts/test-ai-worker-provisioning-db.mjs`: retained 21-line exact-catalogue regression.
- This report: stale incomplete report predating supplied catalogue evidence.
- `docs/ai/991-rehearsal-results.json`: version/hash and empty cases, no successful matrix.

Original copies preserved at `/private/tmp/dg991-recovered-20261007/`, retaining
relative paths. Valid work retained; report/results updated only after successful
rehearsal. Added explicit checksum refusal gate to draft SQL and corresponding
missing/mismatch cases to runner; strengthened incompatible-row and forced-failure
error assertions. The first sandboxed attempt failed allocating PostgreSQL shared
memory; approved execution outside the sandbox retained socket-only isolation.
A checksum test found psql quit did not provide the intended failing exit status;
corrected to an ON_ERROR_STOP error before BEGIN. Final full run passed.

## Exact minimal delta

Names/OIDs below come from the independently supplied user catalogue, not inferred
names or a new Production inspection. OIDs are provenance only: recreated isolated
environments allocate different OIDs. Guards use qualified table identity, explicit
names, exact definitions/types and catalogue flags, without hardcoding Production OIDs.

| Constraint | Observed OID | Observed definition | Canonical replacement |
|---|---:|---|---|
| ai_worker_provisioning_receipts_nonce_check | 1581068 | length 16–128 | nonce ~ '^[a-f0-9]{64}$' |
| ai_worker_provisioning_receipts_fingerprint_check | 1581066 | length = 64 | fingerprint ~ '^[a-f0-9]{64}$' |
| ai_worker_provisioning_receipts_window_id_check | 1581067 | length 1–80 | window_id ~ '^[a-f0-9]{32}$' |
| ai_worker_provisioning_receipts_outcome_check | 1581065 | verified, succeeded, rejected, mutation_failed, window_closed | attempt, succeeded, duplicate, identity_mismatch, mutation_failed, window_closed |

Exactly four old definitions differ from canonical; exactly four new definitions
replace them. Operation CHECK `ai_worker_provisioning_receipts_operation_check`
(OID 1581064) and PK `ai_worker_provisioning_receipts_pkey` (OID 1581078)
already match canonical. They retain catalogue identity.
All three relevant indexes remain unchanged:
`ai_worker_provisioning_window_idx`, `ai_worker_pinned_name_unique`, and the
`ai_worker_provisioning_receipts_pkey` backing index. No table/index recreation.

## Exact proposed SQL and guards

Complete reviewable psql SQL: `scripts/sql/remediate-991-checks.sql`.
Catalogue query: `scripts/sql/991-physical-catalogue.sql`.
Only mutating statements are the four explicit DROP/ADD CHECK pairs shown below;
each ADD validates immediately within the same transaction.

```sql
ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_nonce_check, ADD CONSTRAINT ai_worker_provisioning_receipts_nonce_check CHECK (nonce ~ '^[a-f0-9]{64}$');
ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_fingerprint_check, ADD CONSTRAINT ai_worker_provisioning_receipts_fingerprint_check CHECK (fingerprint ~ '^[a-f0-9]{64}$');
ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_window_id_check, ADD CONSTRAINT ai_worker_provisioning_receipts_window_id_check CHECK (window_id ~ '^[a-f0-9]{32}$');
ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_outcome_check, ADD CONSTRAINT ai_worker_provisioning_receipts_outcome_check CHECK (outcome IN ('attempt','succeeded','duplicate','identity_mismatch','mutation_failed','window_closed'));
```

Preconditions/fail-closed checks:

1. psql ON_ERROR_STOP; verified canonical_sha256 must be supplied and equal the
   pinned hash. Missing/mismatched value errors before BEGIN. This is a caller
   attestation; the runner independently hashes authoritative Git bytes.
2. PostgreSQL server_version_num must be 18.x.
3. Qualified public receipt/principal/history relations must exist; all three
   ordinary permanent tables, with RLS disabled.
4. Exact ordered receipt columns, types, NOT NULL flags and defaults match #993.
   PostgreSQL 18 NOT NULL catalogue rows are excluded from #993's CHECK/PK array;
   column attnotnull is checked and constraint flags are still inspected.
5. Exact six non-NOT-NULL constraint names, definitions, types for CHECK identities,
   validation, non-deferrability, non-deferred state, local identity, no inheritance,
   and enforcement. Reject additional/missing/renamed/nonvalidated constraints.
6. Reject receipt inheritance and unexpected relevant noninternal triggers/rules
   on receipts, principals or migration history.
7. Exact three required index definitions and validity/readiness/liveness match #993;
   any required missing/reordered/invalid index refuses.
8. Under the exclusive receipt lock, canonical incompatibility count must be zero.
9. Snapshot receipt rows, every Prisma history row, receipt/principal table catalogue
   identity, indexes and untouched receipt constraints before DDL.
10. After DDL, re-read the complete exact #993 catalogue query and compare all columns,
    six canonical definitions, three index definitions and safe=true before COMMIT.
11. Pre/post preservation snapshots must equal. Errors abort the transaction; only a
    successful exact postcondition reaches COMMIT. Already-canonical state refuses
    at the starting-variant gate without destroying canonical checks.

No migration-history writes, migrate deploy/resolve, or older migration edits exist.
Synthetic rehearsal history has two representative records, including an unresolved
record; every field remains unchanged. Real Production history was neither read nor
copied. All migration files and the four older unresolved migrations remain untouched.

## Canonical compatibility query

Executed after acquiring the write-fencing lock, before any constraint replacement:

```sql
SELECT count(*) AS incompatible_rows
FROM public.ai_worker_provisioning_receipts
WHERE (nonce ~ '^[a-f0-9]{64}$'
  AND fingerprint ~ '^[a-f0-9]{64}$'
  AND window_id ~ '^[a-f0-9]{32}$'
  AND operation IN ('provision', 'recover')
  AND outcome IN ('attempt', 'succeeded', 'duplicate', 'identity_mismatch',
    'mutation_failed', 'window_closed')) IS NOT TRUE;
```

Any nonzero count raises before DDL. There is no insert race: ACCESS EXCLUSIVE on
receipts is acquired before checks and held through COMMIT/ROLLBACK. This lock is
required for DROP CONSTRAINT. SHARE locks on principal/history tables stabilize
relevant catalogue/history preservation checks. No long-lived lock is acquired outside
the bounded transaction.

LOCAL limits: lock_timeout=2s, statement_timeout=15s,
idle_in_transaction_session_timeout=5s, transaction_timeout=25s.

## PostgreSQL 18 isolated rehearsal

Runner: `scripts/rehearse-991-check-remediation.py`.
Reproducible invocation (creates only its own temporary cluster):

```sh
python3 scripts/rehearse-991-check-remediation.py /opt/homebrew/opt/postgresql@18/bin --evidence /private/tmp/dg991-rehearsal.json
```

PostgreSQL 18.6 (Homebrew), fresh owned cluster with listen_addresses empty and a
private Unix socket. No TCP listener, env files, existing database URLs or credentials.
Only synthetic receipts, principal schema, unrelated sentinel table/index/view and
Prisma history fixtures. Canonical reference database uses verbatim Git migration;
variant uses exact supplied names/definitions/flags, independently verified before DDL.
Owned cluster stopped and temporary data/socket directory destroyed after final run.

| Matrix | Result and evidence |
|---|---|
| A | Exact observed six names/definitions/flags matched starting fixture. |
| B | Repaired catalogue == independently migrated canonical catalogue == unchanged #993 expectations. |
| C | Two compatible receipts survive, including nullable fields and precise timestamps. |
| D | Five old-valid/canonical-invalid cases: nonce, fingerprint, window_id, verified, rejected. Each raises Incompatible rows: 1 before DDL; normalized full dump and catalogue/data identity unchanged. |
| E | Six drift cases: constraint rename, index order, default, RLS, NOT VALID CHECK, history rule. Each refuses and retains full dump/identity. |
| F | Concurrent ROW EXCLUSIVE holder confirmed acquired before remediation; 2s lock timeout, no changes. |
| G | Injected exception after first CHECK replacement rolls back all DDL; dump and identities restored. |
| H | Successful replacement followed by explicit ROLLBACK fully restores original variant/data/identities. |
| I | Already canonical state refuses one-shot remediation without unnecessary replacement. |
| J | User pg_class/pg_attribute/pg_constraint/pg_index/pg_rewrite identities, unrelated table/index/view/rows, receipt rows and all synthetic Prisma history preserved. |
| Additional | Missing/mismatched checksum refuse before transaction. Forced final postcondition failure rolls back all four replacements. Canonical-only attempt/duplicate/identity_mismatch outcomes accepted. |

Observed lock timeout elapsed: 2.016s.

21 recorded rehearsal cases passed (some records combine B/C/J). Prior unchanged
regression run: 57 existing + 13 provisioning tests = 70 passing, 0 failures,
including exact CHECK catalogue coverage. Retained log:
`/private/tmp/dg991-check-regression.log`; this session did not rerun that unchanged suite.

Machine evidence: `docs/ai/991-rehearsal-results.json`, including starting catalogue,
final catalogue, constraint flags, expected-refusal errors, dump hashes and cleanup.
Failure-case dumps normalize only pg_dump's random restrict/unrestrict tokens.
No live Production result is claimed by synthetic rehearsal.

## Final canonical pg_catalog comparison

Exact object below equals both the independently migrated canonical database result
and unchanged #993 physicalSchema expectations (not a weakened substitute):

```json
{
  "columns": [
    "nonce:text:true:",
    "fingerprint:text:true:",
    "window_id:text:true:",
    "operation:text:true:",
    "outcome:text:true:",
    "worker_id:text:false:",
    "deployment_id:text:false:",
    "created_at:timestamp with time zone:true:clock_timestamp()",
    "completed_at:timestamp with time zone:false:"
  ],
  "constraints": [
    "CHECK ((fingerprint ~ '^[a-f0-9]{64}$'::text))",
    "CHECK ((nonce ~ '^[a-f0-9]{64}$'::text))",
    "CHECK ((operation = ANY (ARRAY['provision'::text, 'recover'::text])))",
    "CHECK ((outcome = ANY (ARRAY['attempt'::text, 'succeeded'::text, 'duplicate'::text, 'identity_mismatch'::text, 'mutation_failed'::text, 'window_closed'::text])))",
    "CHECK ((window_id ~ '^[a-f0-9]{32}$'::text))",
    "PRIMARY KEY (nonce)"
  ],
  "indexes": [
    "CREATE INDEX ai_worker_provisioning_window_idx ON public.ai_worker_provisioning_receipts USING btree (window_id, created_at)",
    "CREATE UNIQUE INDEX ai_worker_pinned_name_unique ON public.ai_worker_principals USING btree (name) WHERE (name = 'dg-mac-1'::text)",
    "CREATE UNIQUE INDEX ai_worker_provisioning_receipts_pkey ON public.ai_worker_provisioning_receipts USING btree (nonce)"
  ],
  "safe": true
}
```

## Working tree and review boundary

`git diff --check` passed. Migration directory and `src/lib/reconcile-991.ts` have no
Git differences from HEAD. Branch/head unchanged. Status:

```text
 M scripts/test-ai-worker-provisioning-db.mjs
?? docs/ai/991-REMEDIATION-PREPARATION.md
?? docs/ai/991-rehearsal-results.json
?? scripts/rehearse-991-check-remediation.py
?? scripts/sql/
```

Tracked diff: 21 added regression lines. Untracked preparation files are intentional,
retained for review and not committed. No preexisting changes discarded.

Remaining limits: Production compatibility count and current catalogue were not
requeried. Supplied evidence can become stale; guarded SQL must refuse any drift in
its checked contract. Supplied evidence did not state conenforced; SQL additionally
requires true and the PostgreSQL 18 fixture uses true. Rehearsal validates the supplied
variant and exact #993 contract, not a complete Production clone. Execution would
briefly block receipt traffic and hold SHARE locks on principal/history tables;
real scan cost/traffic was not measured. The checksum parameter attests externally
verified Git bytes; SQL alone cannot verify a filesystem Git migration. Four replaced
CHECK OIDs change on success; table/index/PK/operation identities remain unchanged.
Scope does not remediate other schema differences or unresolved migration history.

STOP FOR REVIEW. Preparation and isolated rehearsal are complete. No authorization
for Production execution is inferred from this report.
