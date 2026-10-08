# #991 operator action release checkpoint

> RETIRED: the one-time reconciliation completed and was independently verified on
> 2026-10-09. Execution has been disabled and the temporary reconciliation routes
> and runtime code are removed by the security clean-up. The remainder of this
> document is historical release evidence, not an execution procedure to repeat.
> See `991-SECURITY-CLEANUP.md` and the retained reconciliation JSON evidence.

Branch: `fix/991-reconciliation-operator-action`.
Base: `aeb1068a4a21914197021ed5449dcaf793df7d72` (PR #993).

The temporary `/command/reconcile-991` page submits a Clerk session authenticated
Server Action. The action checks current platform authority and shares the existing
#993 locked transaction with the HTTP endpoint. Confirmation is exactly
`RECONCILE_991_MIGRATION_HISTORY`. Credentials stay server-side. Success, refusal,
and ambiguous completion each remove the submission form; none automatically retry.
Replay and concurrent submissions remain guarded by the database transaction.

## Verification

The interrupted session reported 36 passing isolated PostgreSQL 18 tests and passing
focused TypeScript and ESLint checks. Those completed checks were preserved.
On resumption, no build process remained. The saved successful build transcript
predated these changes and the interrupted `.next` diagnostics stopped at compile;
therefore completion could not be established.

Replacement `npm run build` attempts run sequentially with a scrubbed environment, dummy Clerk
keys and `DATABASE_URL=postgresql://review:review@127.0.0.1:1/review`. No `.env.local`
or Production credentials are present in this worktree. Transcript:
`/private/tmp/991-operator-resume-verified-build.log`. Final result: exit 0 on
2026-10-09, including the complete prebuild suite, optimized compilation, full
TypeScript check and page generation. `/command/reconcile-991` appears as a dynamic
route in the generated route table. Focused ESLint and `git diff --check` also passed
on resumption. Existing warnings concern middleware naming, static Cache-Control,
and broad file tracing from `load-platform-doc.ts`.
The sandbox attempt became idle during compilation and was terminated before any
retry; its `.next` output is preserved at `/private/tmp/991-operator-sandbox-next-preserved`.
A fresh attempt outside the sandbox compiled in 18.2 seconds, then exhausted Node's
default 4 GB heap during TypeScript checking. The final attempt uses an 8 GB heap
and temporarily moves the pre-existing untracked `node_modules 2` symlink outside
TypeScript's file search. The symlink is restored after the build. No source or
TypeScript checking is disabled to work around these environment failures.

## Deployment preparation

Verified Vercel target: `digitalgate-projects` / `dg-platform-web`, team
`team_iPzymtvuRlJYNcgA5Fns8vgI`, project `prj_RzOMts2AdqpKtbAgZ72GLKs55AJ2`.
At preparation, Production was READY at `dpl_2ZWe4Vkczu9m2nCwMkdajWnoQCJY`,
commit `aeb1068a4a21914197021ed5449dcaf793df7d72`, serving
`https://app.digitalgate.com.au`.

Prepare the reviewed PR commit for this project. A branch push can trigger a Preview
build through the existing Git integration; wait for any build to finish before
starting another. Keep Production promotion and activation behind explicit approval.
Do not use the local dummy-credential build as a Production deployment artifact.
No migration command is part of this release.

## Final execution checkpoint — explicit authorisation required

Before any Production merge/promotion, confirm the exact reviewed commit, successful
deployment checks, target project and rollback deployment. Merge may automatically
deploy through Git integration, so it belongs after approval.

Reconciliation requires separate explicit authorisation. Before that checkpoint,
independently verify the recovery snapshot, exact expected database identity,
canonical physical schema, absent target/older conflicting migration history,
unchanged prior history, empty protected worker/provisioning/outbox tables, and
disabled worker provisioning. The action is gated by Production mode and
`DG_RECONCILE_991_OPERATION=reconcile_991`; do not change that flag in preparation.

After authorisation, an authenticated human platform operator submits once from
the canonical Production page. On any result, STOP and independently verify
migration history and protected tables. Ambiguous completion must never be retried
without an independently reviewed recovery decision. Disable the operation gate
and remove this temporary surface after verified completion under separate approval.

This preparation does not execute reconciliation, change Production database records,
change environment flags, or provision/start a worker.
