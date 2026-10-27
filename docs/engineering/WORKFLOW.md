# DigitalGate engineering operating model
Status: proposed operating procedure (not a Production release authorisation)
Established: 2026-10-23

## Roles and source of truth
- Owner: sets business priorities and signs off consequential releases and customer billing changes.
- ChatGPT: planning, GitHub read-only reconciliation, acceptance criteria, independent review and milestone reports. ChatGPT does not automatically receive Codex session outputs and cannot promise unattended orchestration.
- Codex: execution within an explicit repository checkout/worktree, code review, implementation, local tests, documentation and draft PRs. Codex must verify actual working directory, git status, branch and latest remote refs before edits.
- GitHub: durable source of truth for code, tests, decisions, release evidence and handoffs. A Codex chat session is not authoritative.
- Mac mini: local engineering runtime. MacBook Air and phone: coordination. Remote execution requires a running authorised agent/environment; this document does not establish a background service.

## Work item contract
Every work item needs: objective, base commit, working branch/worktree, scope, acceptance criteria, dependencies, risks, test evidence and a single accountable PR.
- Start by reading this document, the active handoff and the relevant release runbooks.
- Reconcile the latest remote state and existing PRs before new implementation; avoid duplicating work.
- One engineering objective per dedicated session and isolated branch/worktree. Never reuse a read-only/locked session or edit a different worktree by accident.
- Prefer independent review and tests before new features. Keep diffs narrowly scoped; do not rewrite unrelated areas.
- Codex may make local changes, run isolated tests, commit to its own branch and open a draft PR. Do not automatically merge.
- Report phase completion in GitHub with exact commit SHA, tests, artifacts, verified findings, remaining blockers and owner decisions.
- Do not claim a test passed unless its command and result are captured. Historical passing tests are not current CI results.
- When blocked, pursue other independent safe tasks and document the blocker.
- Never embed credentials in prompts, logs or committed files.

## Mandatory release gates
Production release is NO-GO unless each is independently evidenced and authorised:
1. Current main/head reconciliation and independent code review.
2. Authenticated sandbox checkout and entitlement acceptance on a verified isolated environment.
3. Fresh read-only Production schema/ledger preflight; signed, correctly ordered migration plan. No speculative migration history.
4. Historical Stripe webhook invocation termination and endpoint/alias isolation, hold and event configuration sequencing.
5. Canonical subscription and legacy entitlement reconciliation, access enforcement and rollback.
6. Controlled deployment and post-release smoke/replay evidence.
7. Explicit owner approval for each protected Production operation and for opening checkout/customer invitations.

No autonomous Production deployments, Production DB writes, live Stripe changes, hold activation, real customer billing, or customer invitations. Approval of an engineering assignment is NOT release approval.

## Milestone reporting
Report on meaningful completion rather than each shell command:
- Milestone, status (verified / in progress / blocked), exact SHA, evidence, blockers, next action, owner decision.
- Keep a single updated handoff document; avoid percentages inferred from counts of milestones.
- For owner-assisted terminal operations, provide ONE pasteable command at a time, with expected output.
