# Production read-only preflight — 26-row migration baseline

Prepared: 2026-10-28
Stage 2C correction: 2026-10-28
Scope: read-only evidence collection only. No SQL writes, migrations, role/grant
changes, secret retrieval, Vercel changes, Stripe mutations, deployments or checkout
opening are authorised by this procedure.

Final reviewed SQL SHA-256:
`8c9cd9a317be3d804b04e62d109cf77ac67c3d42291f52b084159ebf6310b063`.
Final execution-wrapper SHA-256:
`3316f97b7afa886032370dae5d65cad2cdb938d7caf49633c9148ec21b71828a`.

## Preconditions

- PR #1032 exact head: `e10b24752db743447d9456c94577c54fb36cdb3d`.
- Current main: `8d639743352b9e980afb7e156fc9ac9cff1308b2`.
- Historical migration baseline: 25 independently captured rows plus the certified
  `20261027_single_use_checkout_admission` addition = 26.
- The pending descriptor is `production-readonly-evidence-26-pending.json`; it is
  **not** a current capture. `production-readonly-evidence.json` remains the
  reviewed 25-row base.
- `scripts/verify-checkout-release-preflight.mjs` explicitly rejects a 25-row
  capture as stale, rejects missing/unexpected/duplicate/unfinished/rolled-back
  entries, and requires the exact certified addition name/checksum/completion.
- The offline CLI refuses to verify a current capture while `freshCapturePending`
  is true.


## Executable SQL (authoritative)

The complete executable statement set is
`docs/commerce/release-1025/production-readonly-preflight-26.sql`.
The SQL snippets below are explanatory excerpts and must not be run as separate
files. Do not use the older `production-readonly-preflight.sql` for the 26-row
capture; it lacks full ledger fields, admission catalog, aggregate and runtime
identity queries.

Proposed execution command for later separate approval. The production branch is
the default; do not set `PREFLIGHT_ENVIRONMENT` for an approved production run.
Credentials come only from an approved private `PGPASSFILE` or `PGPASSWORD`
environment source and are never placed in arguments or output.

```sh
PREFLIGHT_PROJECT=gentle-sky-35028642 \
PREFLIGHT_BRANCH=br-old-shadow-a7ffezls \
PREFLIGHT_PGHOST=ep-bold-tree-a7bny92m.ap-southeast-2.aws.neon.tech \
PREFLIGHT_PGPORT=5432 \
PREFLIGHT_PGDATABASE=neondb \
PREFLIGHT_PGUSER=<approved-read-only-operator-role> \
PGPASSFILE=/private/operator/<approved-pgpass-file> \
PREFLIGHT_DEST_DIR=/private/operator/dg-production-preflight \
sh scripts/run-production-readonly-preflight-26.sh
```

The wrapper rejects any project, branch, host, port or database other than the
fixed production identity above. `dg_app_runtime` is not an approved substitute for
this operator capture; the operator role and its privileges are checked by the SQL.

## Execution wrapper and mandatory gates

The reviewed wrapper is `scripts/run-production-readonly-preflight-26.sh`. It:

- Verifies the pinned SQL SHA-256 immediately before execution.
- Requires explicit project, branch, host, port, database and role inputs and
  rejects any mismatch against the fixed production identity.
- Rejects `neondb_owner` as the operator role before connecting.
- Removes inherited host, port, database, user, host-address, service, options,
  `.psqlrc`, history, connection-URL, target-session, SSL and related PostgreSQL
  environment variables from the child process.
- Uses `psql -X`, `ON_ERROR_STOP`, an explicit `-h/-p/-U/-d` connection, a
  five-second connect timeout and `sslmode=verify-full`.
- Requires an approved private `PGPASSWORD` or `PGPASSFILE`; it never prints the
  credential and never places it in arguments.
- Performs a read-only database/role identity query before the main capture and
  aborts on any actual `current_database()`/`current_user` mismatch.
- Writes only to a private `0700` directory and `0600` capture/error/metadata files.
- Records timestamp, environment, project, branch, database, role, SQL SHA-256,
  exit status, byte count and completion-marker state.
- Requires both a zero psql exit status and a final `DG_PREFLIGHT_COMPLETE` marker
  occurring after the final `COMMIT`.
- Stops on SQL error, lock timeout, interruption, partial output, missing/misordered
  marker or connection uncertainty.
- Never retries and never prints captured database output.
- Has a `disposable-test` branch only for a loopback local cluster and the
  `dg_preflight_test` database; it cannot use that branch for a non-loopback host.

The SQL assertions stop before evidence output if the operator is superuser, owns
public objects, has elevated membership or write authority, the transaction is not
read-only, the ledger is not exactly 26 finished/unique entries, the certified
admission checksum is missing, the gate is not blocked at revision 2 with hold
inactive, the subscription/exemption baseline changed, or attempt/admission/audit
baselines changed. Full 25-row base identity/checksum parity remains subject to the
offline verifier and a fresh reviewed expected-evidence file; `freshCapturePending`
remains true.

The successful `DG_PREFLIGHT_COMPLETE` marker is now emitted only after `COMMIT`.
A SQL error, failed transaction/interruption, or capture missing the post-COMMIT
marker cannot pass the wrapper.

## Metadata disclosure

Function metadata no longer returns raw `pg_proc.proconfig`. The capture returns only
`proconfig_null`, `proconfig_entries` and a boolean indicating whether the exact
expected `search_path=pg_catalog` setting is present. This preserves the security
check without disclosing configuration values. The remaining catalogue output was
reviewed and contains role/table/index/constraint/trigger/sequence/lock metadata and
aggregate counts only: no passwords, tokens, connection strings, customer PII,
function bodies or raw migration logs.

## A. Serving deployment and routing

Use provider/GitHub read-only metadata only:

- Confirm project, production alias and current serving deployment ID.
- Confirm immutable source commit and readiness state.
- Confirm the exact captured environment-variable version used by that deployment
  for `DATABASE_URL` and `DATABASE_UNPOOLED`; do not retrieve values.
- Record alias/route ownership and whether any older deployment/alias can still
  receive checkout or webhook traffic.
- Do not promote, redeploy, roll back or alter aliases.

## B. Database endpoint, branch and runtime identity

Using the approved private operator mechanism and the exact captured serving
credential (not an owner/admin substitute):

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';
SELECT current_user, session_user, current_database();
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls
FROM pg_roles WHERE rolname = current_user;
SELECT r.rolname FROM pg_roles r
WHERE pg_has_role(current_user, r.oid, 'MEMBER') ORDER BY r.rolname;
COMMIT;
```

Record only role/session identity, endpoint classification (pooled/direct), branch
and non-secret compatibility booleans. Confirm the hostname privately against
verified Neon endpoint metadata. Do not return URL, password, userinfo, token or
screenshot values. If the exact captured serving credential is unavailable, record
UNKNOWN; do not substitute a management credential.

## C. Migration ledger and 26-entry baseline

Capture the full precision ledger without writes:

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';
SELECT id, migration_name, checksum, applied_steps_count,
       started_at::text, finished_at::text, rolled_back_at::text,
       logs IS NULL AS logs_null, md5(coalesce(logs, '')) AS logs_fingerprint
FROM public._prisma_migrations
ORDER BY migration_name;
COMMIT;
```

Required outcome:

- Exactly 26 rows; 26 unique migration names.
- The original 25 rows match the reviewed base exactly.
- Exactly one `20261027_single_use_checkout_admission` row.
- Addition checksum `a60c03ab49b4b1969e52c4edccb06f73117faac577271400c63eea9e2ec472f6`.
- Addition finished, non-rolled-back; no failed/unknown/duplicate entries.
- No unexpected future migration is silently accepted.

Do not use the pending descriptor as current evidence. A fresh reviewed 26-row
expected capture must be supplied before the CLI can verify current evidence.

## D. Gate, hold and aggregate state

Use the complete read-only preflight `production-readonly-preflight-26.sql`.
Do not use the older 25-row SQL file. All statements are inside one `BEGIN READ ONLY`
transaction with local timeouts.

Record the singleton gate (`blocked`, `subscription_webhooks_held`, `revision`,
`last_admission_expires_at`), subscription count, exemption count, checkout
attempt/admission/audit counts, relevant indexes/constraints/columns, and active
locks. Require blocked=true and hold=false at this gate; no admission/audit writes.
Do not use the runtime credential for operator evidence.

## E. Subscriptions and purchase records

Read-only aggregate only, with identifiers kept private:

- Canonical subscriptions, status, entitlement, trial/current-period dates,
  platform exemption and Industry/premium purchase arrays.
- Verified Stripe receipt/subscription identity correlation.
- Checkout attempts, admissions and audit counts; preserve all records.
- No customer PII, secret values, mutation or reconciliation write.

AIM and My Venue Clean require their actual existing organisation/membership and
saved onboarding progress to be confirmed; do not create a replacement organisation.

## F. Stripe Live inventory

Use the read-only Live Workbench Shell/API Explorer, not sandbox credentials:

- `GET /v1/checkout/sessions?status=open&limit=100`, paginate with
  `starting_after` until `has_more=false`; no created-date filter.
- Filter sessions unexpired relative to the capture UTC.
- Correlate platform/commerce/unresolved ownership using canonical customer,
  organisation, attempt/legacy-session references; metadata alone is insufficient.
- Verify Live Price IDs: active, AUD, exact amount, month interval/count 1,
  quantity 1 for the intended platform/Industry items.
- Record only account/mode, page count/completeness, aggregate counts, expiry range
  and pseudonymous conflicts. No URLs, client secrets, customer details or keys.
- Do not expire, replay, refund, create or modify any Stripe object.

## G. Old invocation and legacy checkout containment

- Capture deployment/alias/invocation evidence for old and current serving code.
- Confirm whether any pre-guard invocation can still receive checkout or webhook
  traffic and whether it has terminated; absence of logs or an empty drain is not
  proof.
- Inventory legacy/open sessions from the Stripe read-only procedure and correlate
  them to canonical attempts/records. Do not assume zero simply because no
  coordinator attempt exists.
- Any unresolved session, conflicting ownership, unexpected open session or
  unproven invocation => STOP. No expiry, replay, refund or containment write.

## H. Recovery and PITR

- Record current snapshot ID/source/creation/retention and the six-hour PITR
  eligibility.
- Confirm protected-branch restore/finalisation route and any ability to inspect a
  candidate before cutover.
- Do not create a snapshot, restore, finalise, repoint a connection, restart compute
  or change Neon/Vercel configuration.
- Owner must accept recovery-point age, data-loss window and restore route.

## Output

Produce a sanitised JSON capture matching the reviewed evidence shape plus a
separate reviewed 26-row expected file. Run only:

```sh
node scripts/verify-checkout-release-preflight.mjs <sanitised-capture.json>
```

Until the expected 26-row file is supplied and `freshCapturePending` is cleared,
the verifier must refuse. A passing local/offline result never authorises a
Production write or deployment.

## STOP conditions

Any wrong project/branch/endpoint, missing serving credential, admin substitute,
incomplete pagination, 25-row or 27+-row ledger, checksum mismatch, missing/
unexpected/duplicate/rolled-back migration, open gate, active hold, unexpected
subscription/exemption state, unresolved session, unknown old invocation, or
unaccepted recovery point => STOP and report HOLD.
