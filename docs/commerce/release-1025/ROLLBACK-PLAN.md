# Rollback and recovery — PR #1025

## VERIFIED — safe boundaries

Checkout is blocked and hold inactive in the captured Production state. Schema is
additive and all 25 migration entries are finished. Application rollback must leave
these tables, indexes and ledger intact. Never undo verified purchase arrays or
restore customer-editable purchase claims as authority. Never roll back credentials
to the exposed password; any previous deployment must receive current credentials
through an approved same-source deployment, not reuse revoked environment values.

## REQUIRES OWNER APPROVAL — response procedure

1. Keep or re-close checkout with an approved compare-and-set gate operation;
   record revision/admission horizon. Closing creation does not revoke already
   issued Stripe sessions or stop pre-gate invocations. Inventory/recover them.
2. If hold active, retain guard-capable deployment and routing. Never route to an
   old binary that ignores the hold. Stop full cutover, preserve receipts/plan/audit.
3. If full application fails, rollback only to the reviewed guard-capable source,
   with current credentials and compatible additive schema. Verify all aliases,
   old/new invocation termination and normal commerce isolation. No automatic
   rollback is authorised by tests or this document.
4. Separate owner approval releases hold only after in-flight drain/recovery and
   Stripe retry/replay plan. Preserve failed/exhausted events; do not delete/reset
   receipts or automatically rerun reconciliation. New plan/evidence needs new
   Ed25519 approval. Failed compare-and-set is not permission to overwrite.
5. Diagnose database failure read-only; uncertain migration/write completion =>
   ledger/catalog inspection first. No rerun, destructive reversal or migration
   ledger deletion. Existing completed stages are not repeatable operations.

## NOT VERIFIED — protected-branch recovery finalisation

Manual snapshot inventory contains 23 October `snap-sweet-grass-a7pwcypq` and
21 October `snap-twilight-feather-a7onb67v`, both sourced from protected Production
`br-old-shadow-a7ffezls`. No expiry metadata was returned; obtain retention/recovery
confirmation and acceptable RPO at the window. A snapshot predates later writes;
restoring loses those writes unless separately recovered, never automatically merges.

Candidate-branch restore is the fallback: separately approve creation/restore,
wait for provider operation completion, inspect isolated candidate catalog/data
and integrity, then separately approve compute/connection/integration cutover.
Candidate has a different branch ID; endpoint/connection changes and protected
branch restrictions must be planned with Neon/Vercel owner permissions. Validate
candidate before directing Production traffic; account for connection pools,
compute restart, maintenance downtime and post-snapshot writes. Do not copy
customer records into local certification fixtures.

Direct finalised restore onto the protected root has NOT been independently
confirmed. Provider confirmation of protection/finalisation, branch-ID and endpoint
behaviour is required before treating it as an executable path. Do not disable
protection, restore, finalise or repoint connections implicitly. If no approved
recovery path fits downtime/RPO, release stays HOLD. Snapshot restore is last
resort, not the default remedy for an application deployment failure.
