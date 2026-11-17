# DigitalGate engineering operating model

Status: current operating procedure. It is not a Production release authorisation.  
Refreshed: 2026-11-16  
Production baseline recorded at refresh: `79cc1353ff2002a8fe5587dcfd0b61a7a0c571b4`

This document replaces the stale 23 October handoff authority. It does not preserve historical release status as current fact; use the current repository, CI and published milestone reports.

## Roles and source of truth

- **Owner:** sets commercial priorities and approves consequential releases, Production operations, billing changes, provider activation and customer-impacting activation.
- **Planning/review assistant:** performs read-only reconciliation, defines acceptance criteria, conducts independent review and publishes sanitised milestone reports. It must not claim access to another session's private context.
- **Implementation agent:** works only inside an explicit repository checkout/worktree, verifies cwd, git status, branch and remote refs before editing, implements scoped changes, runs tests, commits to its own branch and opens draft PRs.
- **GitHub:** durable source of truth for code, tests, decisions, release evidence and handoff state. A chat session is not authoritative.
- **Mac engineering runtime:** local execution environment. Coordination devices do not imply a running background agent. An unattended service exists only when separately installed, authorised and verified.

## Work-item contract

Every work item must record:

1. objective and owner priority;
2. exact base commit and isolated branch/worktree;
3. scope and explicit non-goals;
4. acceptance criteria and required evidence;
5. dependencies, risks and rollback;
6. one accountable draft PR or one documented read-only outcome;
7. exact commit SHA, test commands/results, artifacts, blockers and owner decisions.

Operating rules:

- Reconcile remote state and open PRs before implementing; do not duplicate completed work.
- Use the owner-approved local development root exclusively. Never use Documents, Desktop or iCloud for worktrees.
- One engineering objective per branch/worktree. Do not edit another worktree by accident.
- Preserve uncommitted work and never rewrite another branch's history.
- Keep diffs narrow. Reuse existing architecture; do not create parallel systems.
- Never embed credentials, customer identifiers, database URLs or provider secrets in prompts, logs, reports or committed files.
- Do not claim a test passed unless the command and result are captured for the relevant commit.
- When blocked, continue independent safe work and record the blocker.
- Stop at approval boundaries for Production, deployments, migrations, billing, grants, provider activation or customer communication.

## Release and safety gates

A Production release remains NO-GO unless each applicable gate is independently evidenced and explicitly authorised:

1. Current main/head reconciliation and independent code review.
2. Exact-head CI, TypeScript/build and relevant disposable-database tests.
3. Authenticated sandbox or protected hosted acceptance for customer-visible changes.
4. Checkout, billing, entitlement, tenant and access preservation checks.
5. Fresh read-only Production schema/ledger preflight when schema or runtime authority changes.
6. Signed, ordered migration plan; no speculative migration history.
7. Historical Stripe webhook invocation termination, endpoint/alias isolation, hold and event configuration sequencing where applicable.
8. Controlled deployment, post-release smoke and rollback evidence.
9. Explicit owner approval for each protected Production operation and for opening checkout or customer invitations.
10. For owner-assisted terminal operations, provide one pasteable command at a time with the expected result.

Approval to implement is not approval to deploy. Approval to merge is not automatically approval to release. Provider activation and local-worker provisioning require separate approvals.

## Milestone reporting

Publish meaningful milestones, not every shell command:

- milestone and status (`verified`, `in progress`, `blocked`);
- exact commit SHA and PR/report links;
- commands and test results;
- evidence paths;
- guarantees preserved and non-changes;
- blockers and residual risks;
- the single next owner decision.

Reports are sanitised and published to the reporting repository. They must not contain secrets, raw customer data, database URLs or private environment identifiers.

## Draft PR and review rules

- Implementation may push its own branch and open a draft PR.
- Do not merge, force-push, delete branches, deploy or activate providers without explicit approval.
- Fix genuine review defects; do not expand scope for style preferences.
- Re-run exact-head gates after any change.
- Keep historical PRs closed with functional evidence rather than merging superseded stacks.

## Current authority boundaries

- Preserve the certified Production baseline and business access; checkout remains fail-closed until separately approved.
- Do not modify billing, grants, entitlements, tenant boundaries or customer data outside an approved migration.
- Do not deploy to Production or activate local/cloud providers without separate owner approval.
- Do not close a historical PR until any approved unique improvement is preserved in a focused branch/PR.
