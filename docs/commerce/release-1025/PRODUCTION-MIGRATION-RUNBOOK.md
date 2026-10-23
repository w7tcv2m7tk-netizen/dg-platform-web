# Production migration runbook — PR #1025

Requirements: `platform.auth`, `detach.portal_billing`, `crm.companies`.
Prepared 23 October 2026. This residual plan supersedes the executable migration
instructions in the 21 October checkout approval document. The frozen recovery
manifest at af85b034 is unchanged and retained as history, not a rerun instruction.

## VERIFIED — current residual migration scope is zero

Authorised read-only Neon transaction captured 25 finished, non-rolled-back
entries. All 25 checksums match `/private/tmp/dg-migration-runner-20261021`.
All 23 application migration SQL files match that runner byte-for-byte. All 37
runner files match its preserved checksum inventory. The old shared Git object
af85b034 is currently unreadable (`bad object HEAD`); independent commit-to-file
revalidation of its manifest is unavailable. Its on-disk file was not modified;
observed hash and this limitation are recorded in validation evidence. Preserve
the artifact and recover its Git object before relying on it for future writes. The two
application-tree omissions, `20260805_legacy_schema_baseline` and
`20261020_aida_conversation_schema_alignment`, are already applied recovery
history. Do not reconstruct full history from the application directory.
See `production-readonly-evidence.json` for exact names, checksums, timestamps,
checkout indexes and constraints. This is a sanitised catalog/aggregate capture;
no customer rows or credentials are included.

Completed ordering (never re-execute): initial baseline; transactional Stripe
trust reconciliation; Knowledge baseline; guarded Aida repair/baseline; AI
Visibility baseline; canonical migrations including checkout attempt, gate,
entitlement arrays, hold, and Aida forward alignment. Prospect snapshot and
unified acquisition identity were already applied and were not reapplied.

The gate is id=1, blocked=true, revision=0, last admission=null, hold=false.
The captured subscription aggregate is six subscriptions, all six exempt. This
count is not independent confirmation of each exemption's identity or state.
App arrays exist as NOT NULL text[] DEFAULT ARRAY[]::text[]. Adding them did not
prove paid purchases; activation still requires verified billing reconciliation.

## Read-only window preflight — no migrations authorised

1. Owner verifies the Neon project `gentle-sky-35028642`, protected ready branch
   `br-old-shadow-a7ffezls`, and direct endpoint
   `ep-bold-tree-a7bny92m.ap-southeast-2.aws.neon.tech` using provider metadata.
   A database name is insufficient identity evidence. Privately confirm both
   deployed connection mappings and rotated credential validity.
2. Verify runner hashes against its certified `runner-files-sha256.json` and
   `migration-checksums.json`. Verify recovery commit af85b034 remains frozen.
3. Review snapshot `snap-sweet-grass-a7pwcypq`, named
   `dg-platform-prod-pre-checkout-release-20261023`, source Production, observed
   created 2026-10-23T00:58:51Z; inventory also retains the approved 21 October
   snapshot. No expiry is exposed in inventory; do not interpret this as a
   retention guarantee. Owner accepts freshness/RPO and confirms recovery access.
4. In the private operator shell, securely inject libpq credentials from the
   approved secret source; never put a URL/password in command arguments or
   history. Do not use PGOPTIONS startup settings previously rejected by Neon.
   Execute only a protected read-only query, with ON_ERROR_STOP:

```sh
# Credentials stay in the operator's private environment, never in this command.
psql -X -v ON_ERROR_STOP=1 -f docs/commerce/release-1025/production-readonly-preflight.sql
```

5. Capture sanitised results in the same documented JSON structure as the frozen
   read-only evidence; preserve full microsecond timestamp precision. Verify:

```sh
node scripts/verify-checkout-release-preflight.mjs /private/operator/new-capture.json
```

This verifier never connects and never writes. It checks all ledger fields,
count, checkout indexes/constraints and blocked/inactive gate. Any divergence
requires reviewed explanation; do not overwrite its expected evidence or relax
checks. Separately compare existing authorised exemption identities/statuses in
private operator evidence, Aida catalog and subscription values, and inspect
active lock waits before any later approved operation.

## BLOCKED / REQUIRES OWNER APPROVAL

No `prisma migrate deploy`, `migrate resolve`, DDL or data correction is proposed
now. A missing or new ledger entry, checksum mismatch, unfinished migration,
unexpected schema, gate change, wrong endpoint or uncertain recovery => STOP.
Do not rerun the original baseline or final-five helpers. Future migrations
require a separately reviewed complete canonical tree and explicit approval.
The application build/install must not run migrations or reconciliation; inspect
effective Vercel overrides and hooks at the release window.

## Recovery

No rollback is needed for this read-only procedure. If a prior execution outcome
is uncertain, inspect ledger/catalog read-only before any retry; no automatic
retry, deletion, resolve-as-rolled-back or blind DDL. Preserve receipts. Additive
schema remains on application rollback. Snapshot restoration, candidate-branch
creation, connection changes and compute changes each require approval; see
`ROLLBACK-PLAN.md`. Never use restoration as the default application rollback.
