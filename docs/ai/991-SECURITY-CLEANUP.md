# #991 security clean-up

The human platform operator submitted PR #1000's action exactly once. Independent
read-only verification confirmed 13 completed migration-history records, one target
record with canonical checksum `55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d`,
and completion time `2026-10-08T21:31:43.611Z`. The original 12 records' full-record
SHA-256 remained `f57059be8b625e31d8504805c22af61fd8b9b51d343c9efb0757ecfdef471693`.
All seven protected tables remained empty and the recorded catalogue was unchanged.

Retained evidence: `991-reconciliation-preflight.json` and
`991-reconciliation-completed.json`. These contain no database credentials.

## Disablement and retirement

`DG_RECONCILE_991_OPERATION` was changed to `disabled` in Production before code
removal, with a redeployment of the reviewed #1000 merge commit
`0bca41dc3a9371df02ae951ade4667362f511e4f` to apply the new runtime environment.
Disablement rollout: `dpl_t8seGQfPyRkvy6nWRqcFU5zTTNky`.
The reconciliation flag and its dedicated secret hash are deleted before the final
clean-up rollout. Worker provisioning stays absent/disabled; physical remediation
stays `disabled`. No worker, reconciliation or migration operation is part of cleanup.

Removed: `/command/reconcile-991`, its form and Clerk Server Action,
`/api/admin/reconcile-991`, the application reconciliation execution module and
middleware exceptions. Permanent migrations, database constraints and indexes are
unchanged. Existing schema/provisioning security tests and audit evidence remain.

The 36 historical PostgreSQL regression tests still run through their disposable
loopback-cluster runner. Their historical implementation is now isolated at
`scripts/fixtures/reconcile-991.ts`, outside the application dependency graph. It
refuses Vercel execution and imports without the isolated database/runner marker.
Retirement tests verify that no application execution path or fixture import remains;
they run in the Production build. The remaining physical-remediation form's success
message now has explicit dark background and contrasting text.

## Verification

36 isolated PostgreSQL 18 reconciliation tests, 7 physical envelope tests, 11 physical
Server Action tests, 2 retirement tests, middleware tests and focused ESLint passed.
The credential-free full Production build passed, including the complete prebuild
suite, TypeScript and optimized compilation/page generation. Build manifests contain
no retired reconciliation routes or `runReconcile991Action` export. The pre-existing
untracked dependency symlink was preserved/restored and the build used an 8 GB Node
heap, as established during #1000 verification.

The disabled-gate deployment became READY and served `app.digitalgate.com.au`;
a credential-free negative HTTP POST returned the fixed 403 refusal. The disabled
Server Action gate was verified to refuse before auth/database access in the isolated
regression suite. A live authenticated UI denial was unavailable because the browser
bridge was not trusted; retirement is additionally checked in built route/action
manifests. Both reconciliation-specific project environment entries were deleted.

After Preview checks pass, merge and verify Production readiness/alias and both
health endpoints. Independently compare all 13 migration rows with the retained
post-reconciliation baseline and verify seven empty protected tables and unchanged
catalogue. Probe retired routes without invoking any retired action. Keep final
deployment and database verification evidence with the release report.
