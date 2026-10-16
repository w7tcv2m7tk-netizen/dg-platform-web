# PR #994 completion review — 2026-10-16

## Decision

The work is complete through subsequent merged PRs. PR #994 is superseded and
must not be merged or its historical four-CHECK executor executed. Recommend
closing #994 as superseded after final human review, rather than replaying,
retargeting or resolving its obsolete implementation into main. No application
fix remains to deliver in this PR. This review adds documentation/evidence only;
no application source, SQL, migration, schema, configuration or dependencies change.
No push, remote PR edit, merge, deployment or Production access was performed.

## Exact recovered state

- GitHub PR: https://github.com/w7tcv2m7tk-netizen/dg-platform-web/pull/994
- Remote head: `5b5a5f5d009c480161790ec60652062415f58189`.
- Existing branch: `fix/991-physical-remediation-executor`.
- Base remains the now-merged `fix/991-one-shot-reconciliation`, not main.
- OPEN, draft, CONFLICTING / DIRTY. Both historical Vercel contexts passed on
  2026-10-07. They certify that historical head only, not current main or this
  unpublished documentation commit. There is no fresh hosted verification.
- Current fetched main: `d5b24a718f98dd5fb56e660ccec04c5571b067c1`.
- PR's original diff has 30 files. Its full tree comparison against current main
  has 76 changed files (402 insertions, 5968 deletions); it is not a safe replacement
  for current main. That comparison is not the PR's merge-base diff.
- Exact hosted diff, metadata/check contexts, comparison stat and byte-identity
  results are retained in `994-completion-evidence/`.

## Already delivered

| PR | Completed responsibility | Merge commit |
| --- | --- | --- |
| #995 | Main-based physical executor and client import fix originally proposed in #994 | `24c2ac312b46ef2a0ea4659d92880f2dc2bd7df5` |
| #996 | Six-delta SQL, exact CHECK/NOT NULL/CLUSTER and persistent physical-policy guards | `8c9f91551bac296e5905de77baf3bb6f144ff8c8` |
| #998 | Next.js genuinely empty POST stream validation | `064b6e374dfd7f5b445643c86978ae78d26c8277` |
| #999 | Gated, authenticated physical operator action | `1a54005406f24eb1d83b7b3d81f9a9b641799b69` |
| #993 | Guarded history reconciliation, including outbox/history fences | `aeb1068a4a21914197021ed5449dcaf793df7d72` |
| #1000 | Authenticated reconciliation operator action | `0bca41dc3a9371df02ae951ade4667362f511e4f` |
| #1001 | Retirement of completed reconciliation execution surfaces | `92bb0851514aae189401c3c6d8c3a98d540b3e52` |

Thirteen original executor, request, generated SQL, catalogue, fixture/rehearsal,
and client-provider files are byte-identical between #994 and #995's delivered
commit; the manifest is in `comparison.json`. Middleware also differs because
#994 was stacked on the reconciliation code that #995 deliberately excluded.
Do not restore #994's old middleware or reconciliation routes over later retirement.

## Six approved semantic deltas

| Delta | Implementation and retained database status |
| --- | --- |
| nonce CHECK -> 64 lowercase hexadecimal characters | Complete |
| fingerprint CHECK -> 64 lowercase hexadecimal characters | Complete |
| window_id CHECK -> 32 lowercase hexadecimal characters | Complete |
| outcome CHECK -> attempt, succeeded, duplicate, identity_mismatch, mutation_failed, window_closed | Complete |
| created_at -> timestamptz, preserving default and NOT NULL | Complete |
| completed_at -> timestamptz, preserving nullability | Complete |

The six deltas are five ALTER statements; the timestamp statement covers two
columns. #994's historical version only covered the first four deltas. Current
main contains the complete contract. Canonical migration SHA-256 remains
`55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d`.
No delta is outstanding and none should be repeated.

## Database, migration history and RLS evidence

The committed `991-reconciliation-completed.json` records independent read-only
verification at `2026-10-08T21:33:52.022Z`. An exact copy is preserved here as
`994-completion-evidence/retained-database-verification-20261008.json`.
It confirms the six canonical changes, safe catalogue, seven empty protected
tables, and exactly 13 completed migration records with exactly one canonical
`20261007_ai_worker_provisioning_boundary` record. All metadata for the original
12 rows remained unchanged (SHA-256
`f57059be8b625e31d8504805c22af61fd8b9b51d343c9efb0757ecfdef471693`).
This is historical Production evidence, not a fresh claim about today's live
state. No live database or deployment was queried during this review.

These internal worker/security relations are not an RLS-enabled tenant API.
The approved catalogue explicitly requires no RLS/forced RLS on the protected
relations and no receipt policies; unexpected RLS/policies cause refusal, not
silent alteration. The canonical migration contains no RLS-enabling/grant DDL.
Tenant boundaries are enforced through scoped application access and database
relationships. Local tests cover cross-tenant job/result/cancellation access,
approval/deployment relationships, and tenant-scoped idempotency. This does not
assert that every database relation has RLS, or establish a new RLS requirement.

## Security review

Current-main tests preserve session-token Clerk authentication, exact Origin/URL,
operation/secret validation for HTTP, active human platform authority and API-key
exclusion. The Server Action retains its existing session/confirmation/authority
boundary. Transaction locks, repeated membership/enablement checks, seven-empty-table
preconditions, exact catalogue gates, rollback and canonical artifact hashes remain.
No security control was changed by this completion review. The existing physical
executor also refuses after completed migration-history reconciliation: its
starting-state gate rejects the now-recorded canonical migration. It must not be
reactivated merely because the old PR remains open.

Reconciliation application routes/core/actions are retired; historical tests use
only the guarded non-runtime fixture. Worker provisioning is not enabled here.
There is no remaining #994 implementation security blocker to repair. The blockers
are the obsolete conflicting PR/base and the need for a final human disposition.

## Validation and limits

Validation target is exact current main
`d5b24a718f98dd5fb56e660ccec04c5571b067c1`, in a detached local checkout. This
revalidates the delivered implementation, not a proposed resurrection of #994.

- Physical executor: 147/147, isolated disposable loopback PostgreSQL 18.
- Worker/tenant database suite: 57/57; provisioning database suite: 13/13.
- Historical reconciliation suite: 36/36, isolated disposable PostgreSQL 18.
- Focused envelope/action/retirement/platform/API-key/tenant/client-boundary tests:
  37/37. The action module requires Node's `react-server` condition; the initial
  invocation omitted it and was corrected without changing code.
- Canonical/generated SQL binding: passed.
- Standalone TypeScript: exit 0, using an 8 GB Node heap and scrubbed environment.
- Standard `npm run build`: exit 0 with the unchanged main source, complete
  prebuild suite, optimized Turbopack compilation, TypeScript and 456/456 static
  pages. Transcript: `build-standard-unsandboxed.log.gz`.
- Initial standard build with an external dependency symlink failed because of
  Turbopack root restrictions. The webpack diagnostic failed on pre-existing
  Node imports through `DocumentBrandMark.tsx`; no unrelated code was changed.
  A standard attempt with copied local dependencies became idle in the sandbox
  and was stopped (exit 143). The same standard build passed outside the sandbox.
  Failed/interrupted transcripts are preserved, not counted as passing builds.
- Only documentation and evidence are added on #994's branch; the original
  application tree is unchanged. This does not make the obsolete PR merge-ready.
  No fresh checks can certify an unpublished commit; existing GitHub contexts
  remain historical successes on `5b5a5f5d`.
- `994-completion-evidence/manifest.json` records source, results, artifact hashes
  and the SHA-256 of the exact original hosted diff compressed in
  `github-pr-994.diff.gz`.

Database runners create and destroy only their owned synthetic local fixtures;
no Production credentials or environment files are loaded. Build uses dummy Clerk
keys and an unreachable loopback DATABASE_URL. Its output is validation only and
must not be deployed. Full build/AI logs are gzip-compressed losslessly; other logs are plain text.
Logs are retained beside this review, including failed
build attempts so limitations are not hidden.

## Preservation and final disposition

Neon Preview `br-purple-recipe-a77g53pp`, Vercel Preview configuration, all existing
worktrees and branches were untouched. Documentation commits `3161b652` and
`687a4593` remain present at their original refs. Existing historical evidence was
not rewritten. Two additional local checkouts hold the existing PR branch and
detached current-main validation; no new branch, PR or infrastructure was created.

The only proposed PR-branch change is this completion record and its evidence.
It remains local for final review. Do not merge #994's obsolete code. Closure as
superseded is the recommended completion; closing/editing/pushing the PR was not
performed. No Production remediation, migration, history reconciliation, worker
operation, billing/checkout change, deployment or customer-data operation is needed.
