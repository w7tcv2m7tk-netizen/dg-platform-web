# Infrastructure lifecycle and environment ownership

Status: adopted engineering control. This document is subordinate to Production safety, customer access, tenant isolation and explicit owner approval for destructive changes.

## Permanent workspace

- Canonical development volume: `/Volumes/Developer`.
- Authoritative application repository: `/Volumes/Developer/DigitalGate/dg-platform-web`.
- Reporting repository: `/Volumes/Developer/DigitalGate/Reporting/repository`.
- No new development root under Documents, Desktop, iCloud or `/private/tmp`.
- Worktrees must be registered under `/Volumes/Developer/DigitalGate/Worktrees` or be explicitly documented as temporary recovery evidence.

## Environment ownership

Every Vercel environment variable must record:

- owner and accountable workstream;
- purpose and consumer;
- environment scope (`production`, `preview`, staging custom environment or local);
- whether it contains a credential;
- creation date and review/expiry date;
- retirement action.

The machine-readable register is [`environment-register.json`](./environment-register.json). `scripts/environment-lifecycle.mjs` validates ownership, expiry and cleanup actions. Expired temporary projects or custom environments fail closed.

## Credential handling

- Provider credentials, database URLs, webhook secrets, API tokens and operation tokens use Vercel **Sensitive** storage.
- `NEXT_PUBLIC_*` values are public and never contain credentials.
- No credential value is written to source, reports, logs, shell history or chat.
- A storage-class correction must preserve the existing value. Do not rotate a working credential merely to change storage class.
- Production-impacting environment changes require separate approval and a deployment plan.

## Branch and custom-environment lifecycle

- Preview branches are created only for an approved preview purpose.
- A branch with an active Vercel alias, branch-specific database override, local worktree, scheduled job, child branch or unverified evidence is not eligible for deletion.
- Protected names: `production`, `development` and `dg-home-pre-regression-restore (1)`.
- Retire in this order: preserve evidence → retire alias/deployment → retire custom environment and variables → delete the associated Neon branch.
- Use `scripts/neon-branch-cleanup.mjs`; it is dry-run by default and requires an explicit project-id confirmation for `--apply`.
- Never disable preview branching globally just to reduce branch count; use dependency-aware cleanup and isolated branch databases.
- Production-derived preview databases are prohibited. A preview that needs a database must use an isolated branch and explicit scope.

## Vercel build controls

- Keep automatic preview deployments disabled on Production projects where they are not required.
- Use the shortest approved pre-production deployment retention.
- Do not redeploy Production to remove a dormant environment variable. Remove the variable independently only after consumer and rollback verification.
- Custom environments require an owner, purpose and expiry; one-off acceptance environments must be retired with their alias and deployment.

## Measured cost control

- Use Neon Console usage/active-time and Vercel billing evidence; do not infer provider cost from database size or deployment count.
- Do not reduce Production compute resources without measured consumption and workload evidence.
- Staging quota corrections may be applied only to the named staging project after approval.
- Review branch count, storage, compute hours and deployment retention monthly.

## Release governance

- A PR is ready for review only with exact-head CI, focused regression evidence and no unresolved dependency.
- Merge order is documented by the release owner. A merge that would trigger an unauthorised Production deployment is HOLD.
- A successful build or unauth health check is not authenticated acceptance.
- Evidence is sanitised; credentials and customer records are never published.
