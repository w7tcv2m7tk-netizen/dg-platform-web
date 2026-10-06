# AI Gateway Slice 3 final review

SLICE 3 READY TO PUSH: YES

Reviewed on 2026-10-07. This verdict covers repository implementation and the mandatory merge gates, not deployment or provisioning. This records the verified implementation state before repository delivery. The existing Slice 3 implementation was continued in place; delivery is tracked in the PR.

## Pre-delivery repository snapshot

- Branch: `feat/ai-gateway-slice-3-local-routine`
- Base (local `origin/main` merge-base): `7301af172417c07773db935f6e10b7c7dc7fd937`
- HEAD: `7301af172417c07773db935f6e10b7c7dc7fd937` (Slice 2 merge)
- All Slice 3 changes remain uncommitted: 42 files, 13 modified tracked files and 29 untracked files, including this report.

## Security fixes

1. Completion now locks the unrevoked worker, active deployment belonging to that worker, active recipient approval and job in worker-first order. It re-reads the job after lock waits. Shared authority locks remain held through the result/outbox commit and conflict with revocation/disable writes. The atomic completion update proves leased status, worker identity, token hash, generation, cancellation absence, lease/deadline/job validity, current worker/deployment/approval state and tenant approval relationship. Task, classification ceiling, policy, output contract and model/digest are validated under those locks. No transaction spans inference.
2. Completion uses database `NOW()` plus current `CLOCK_TIMESTAMP()` in the authoritative write, explicitly normalized to UTC. `NOW()` alone freezes transaction-start time in PostgreSQL. A deferred constraint trigger also validates the old lease/deadline/job expiry at transaction end, after outbox insertion; expiry during the transaction rolls back both result and outbox. Heartbeat also checks current database wall time, so waiting on a row lock cannot resurrect an expired lease. The real tests cover transaction-start versus wall-clock time and expiry after the result mutation but before commit.
3. Completion saves a durable worker ID, hashed lease token and generation with the operation/request hash. Duplicates require that saved identity/context and the current generation, and current worker/deployment/approval authority. Wrong worker/token/generation, changed body, revoked authority, and a prior retry generation are rejected. A job lock serializes identical simultaneous completions; exactly one outbox event persists. Receipt fields are protected by database consistency constraints and terminal immutability.

Additional verification-driven fixes: UTC comparisons in Slice 3 claim/recovery/retention/outbox SQL avoid dependence on the PostgreSQL server timezone. Mac worker constructors use explicit fields instead of TypeScript parameter properties, allowing the documented Node 24 strip-only startup; a regression loads and instantiates the actual runtime classes.

## Disposable PostgreSQL architecture and isolation

- PostgreSQL 18.6 was installed for isolated testing. No existing service was altered, and no production or Homebrew service was enabled.
- Final run: a dedicated `dg-slice3-pg-*` cluster in the operating system temporary directory, bound only to a random non-default loopback port, with its Unix socket inside that temporary directory, database `dg_slice3_test`, role `slice3_test`, UTC server timezone.
- The runner ignores inherited DATABASE_URL, DIRECT_URL, SHADOW_DATABASE_URL and all libpq PG* connection settings. Tests verify host, database, role URL, non-default port and a unique server nonce before mutations. All data and encryption keys are synthetic/test-only. No existing DigitalGate database, production URL, production credentials or production secrets were used.
- Repository history has no initial empty-database schema migration. The test baseline is generated from the pinned Slice 2 Prisma schemas at commit `7301af172417c07773db935f6e10b7c7dc7fd937` using `prisma migrate diff --from-empty`, then the exact `20261007_ai_gateway_slice3_local_routine/migration.sql` is applied with psql in a transaction. The Slice 3 SQL itself, including every partial index, foreign key, CHECK constraint and trigger, is exercised. This is not a replay certification of historical production migration history.
- Final DB run completed `2026-10-06T21:47:20.235Z`. Cleanup stopped the owned server and destroyed its directory. Follow-up process/listener inspection found no PostgreSQL process or listener on its port; the directory no longer exists. Earlier test attempts were also cleaned up. Cleanup evidence is generated outside the repository in the operating system temporary directory.
- Reproduce: `npm run test:ai-local-db -- "$PG_BIN"`. Set `PG_BIN` to the installed PostgreSQL 18 binary directory. The runner installs nothing and accepts no external database URL.

## Final verification results

| Gate | Result / count |
| --- | --- |
| Real PostgreSQL integration | PASS: **57/57**, 0 failures, 0 skipped |
| Slice 2 policy regression | PASS: 34/34 |
| Slice 1 Gateway / AI Assist regression | PASS: 26/26; covers lead summary, follow-up, identity, output validation, deterministic fallback and legacy actions |
| Local crypto | PASS: 2/2 |
| Worker authentication | PASS: 3/3 |
| Mac worker contract / runtime | PASS: 5/5 |
| AI Visibility monitoring | PASS: 13/13 |
| AI Visibility model observations | PASS: 4/4 |
| Prisma format | PASS; new Slice 3 models formatted and verified against formatter output; untouched baseline/model formatting preserved |
| Prisma validate | PASS against repository schema; explicit non-production URL supplied, no database connection |
| Prisma client generation | PASS: Prisma 6.19.3 |
| Main `npx tsc --noEmit` | PASS, exit 0 |
| Mac `npx tsc --noEmit -p workers/mac-ai/tsconfig.json` | PASS, exit 0 |
| Fresh `npm run build` | PASS, exit 0; Next.js 16.2.12 production compile, TypeScript and route generation |
| Full prebuild chain | PASS: 97 npm test-script invocations, 870 node:test test executions across 26 batches, plus direct script assertions and required ESLint checks; repeated suites included in these totals |
| `git diff --check` | PASS, exit 0 |
| Final hostile security review | PASS; the three findings are closed with DB regression coverage; no unresolved blocking finding |

Targeted suites total 144 tests (57 DB + 87 other). Prebuild counts include repeated execution of several targeted suites and are not unique-test counts. Production-build diagnostics include middleware deprecation, custom Cache-Control, Turbopack filesystem-path analysis and dynamic-rendering messages; build completed successfully. Test and build logs remain outside the repository and are not committed.

## DB coverage

The suite executes every requested DB-backed category: enqueue idempotency (including conflicts and nullable actors), tenant/recipient isolation, revocation/disable at claim/heartbeat/completion, concurrent claiming and one-live-lease uniqueness, generation/sequence fencing, deadline/expiry limits, wrong worker/token/generation rejection, retry/recovery, both orderings of cancellation/revocation/disable versus completion, simultaneous duplicate completion, result/outbox atomicity and rollback, ciphertext persistence, tenant-scoped result access, retention/purge/restoration and terminal immutability. Row locks, pg_blocking_pids and an advisory-lock outbox barrier establish contention; wall-clock polling is used only to cross an actual expiry boundary. Expected database constraint/trigger rejections appear as Prisma error messages in the passing test log.

There are **no remaining unexecuted mandatory DB-backed merge gates**. Production deployment and real Mac/Ollama smoke checks remain operational steps.

## Scope and profile verification

AI Visibility production implementation, schema module, monitoring and observer files have no diff. Only `lead_summary` and `lead_follow_up` may use `local_routine`. Policy rejects `local_specialist`; database constraints and worker validation exclude `dg-coder` execution. Restricted/local-required policy excludes cloud inference/fallback; local failures retain deterministic templates.

The fixed worker request remains: `dg-fast:latest`, `num_ctx:4096`, `think:false`, `stream:false`, `temperature:0.2`, `top_k:20`, `top_p:0.9`, `presence_penalty:1.5`, `keep_alive:"5m"`, authorised `num_predict`, concurrency one, loopback-only Ollama, exact verified model/digest. No profile tuning, model substitution, Advisor or Support Aida migration was introduced.

## Migration and remaining production operations

The repository migration was applied **only inside owned disposable test databases**, now destroyed. At the pre-delivery snapshot it was an untracked repository addition and has not been applied to production or any existing DigitalGate database. No production secrets were provisioned. No production Mac worker or launchd service was installed.

After normal review/approval, production still needs dedicated cloud `AI_JOB_ENCRYPTION_KEY_V1`, reviewed migration deployment, controlled worker principal/deployment provisioning with verified model digest, tenant owner/admin recipient approval, and maintenance cron authentication/configuration verification. Mac setup still needs the approved Qwen3.5 9B Q4_K_M `dg-fast:latest` deployment/digest verification, Node >=24 worker installation, credential in Keychain, gateway/worker/digest configuration, launchd installation and an end-to-end operational smoke check. Follow `AI-GATEWAY-SLICE-3-RUNBOOK.md`.

## Exact changed-file inventory

`M` means modified tracked file; `??` means untracked addition. This includes the entire recovered Slice 3 implementation and the additional fixes/tests/report, not only this resumed session.

```text
 M docs/ai/AI-ARCHITECTURE.md
 M package.json
 M packages/database/prisma/schema.prisma
 M packages/platform-core/src/ai/gateway.ts
 M packages/platform-core/src/ai/generate.ts
 M packages/platform-core/src/ai/index.ts
 M packages/platform-core/src/ai/policy.ts
 M packages/platform-core/src/ai/usage.ts
 M scripts/test-ai-gateway-policy.mjs
 M src/app/api/v1/ai/assist/route.ts
 M src/components/crm/CrmAiAssistPanel.tsx
 M tsconfig.json
 M vercel.json
?? docs/ai/AI-GATEWAY-SLICE-3-REVIEW.md
?? docs/ai/AI-GATEWAY-SLICE-3-RUNBOOK.md
?? packages/database/prisma/migrations/20261007_ai_gateway_slice3_local_routine/migration.sql
?? packages/platform-core/src/ai/local-crypto.ts
?? packages/platform-core/src/ai/local-jobs.ts
?? packages/platform-core/src/ai/local-worker-auth.ts
?? scripts/provision-ai-local-worker.mjs
?? scripts/revoke-ai-local-worker.mjs
?? scripts/rotate-ai-local-worker.mjs
?? scripts/run-ai-local-db-tests.mjs
?? scripts/test-ai-local-crypto.mjs
?? scripts/test-ai-local-db.mjs
?? scripts/test-ai-worker-auth.mjs
?? src/app/api/cron/ai-gateway-maintenance/route.ts
?? src/app/api/internal/ai-worker/_shared.ts
?? src/app/api/internal/ai-worker/claim/route.ts
?? src/app/api/internal/ai-worker/complete/route.ts
?? src/app/api/internal/ai-worker/heartbeat/route.ts
?? src/app/api/v1/ai/jobs/[id]/route.ts
?? src/app/api/v1/ai/local-recipient-approvals/[id]/route.ts
?? src/app/api/v1/ai/local-recipient-approvals/route.ts
?? workers/mac-ai/package.json
?? workers/mac-ai/src/client.ts
?? workers/mac-ai/src/config.ts
?? workers/mac-ai/src/index.ts
?? workers/mac-ai/src/ollama.ts
?? workers/mac-ai/src/worker.ts
?? workers/mac-ai/test/contract.test.ts
?? workers/mac-ai/tsconfig.json
```
