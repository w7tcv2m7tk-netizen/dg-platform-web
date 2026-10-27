# Production deployment and restricted runtime cutover runbook

Status: **HOLD for Production deployment, role provisioning, credential cutover, merge and checkout activation.**  
Prepared: 27 October 2026  
Scope: PR #1028 (single-use checkout admission) and PR #1029 (restricted runtime database permissions)

This runbook prepares the operator sequence. It does not authorise any Production write, credential change, role grant, deployment, merge, Stripe change or customer action. Each numbered approval gate is separate.

## 1. Current state

- PR #1028: draft, head `f1e199de7d77762183894fe7e0a8d4f72b50bb8c`.
- PR #1029: draft, head `f07ba2a755d2262eaa7b082cde151eb8e46300c2`, stacked on PR #1028.
- PR #1029 exact-head CI: **SUCCESS** — run `40444279801`.
- The admission migration is approved for execution by Codex but execution is **not confirmed**.
- The private Direct database credential injection is unresolved.
- The last verified serving deployment was `dpl_2bpF6uUfYhe1xB8ytCHAmjVfzikN` at source `8d639743352b9e980afb7e156fc9ac9cff1308b2`.
- The actual current serving deployment, captured environment-variable version, endpoint and runtime role are **UNVERIFIED** in this session.
- No Vercel or Neon read-only API token/CLI was available to this session. Do not ask the owner to disclose a secret; an authorised operator must perform the provider-read steps privately.

Global checkout must remain `blocked=true` throughout this runbook.

## 2. Roles and authority

| Role | Responsibility |
|---|---|
| Owner | Approves migration, role provisioning/grants, credential cutover, merges/deployments and later pilot |
| Codex migration operator | Executes only the approved admission migration capsule |
| Runtime cutover operator | Applies role grants, changes the private runtime credential and verifies the serving role |
| Read-only observer | Verifies receipts, deployment identity, logs and rollback readiness; no writes |
| Recovery decision-maker | Owns snapshot/RPO acceptance and any separately approved restore decision |

No overlapping migration, role/ACL or gate change is permitted.

## 3. Preflight checklist

Complete every item read-only before requesting the next write approval.

### 3.1 Source and release identity

- [ ] PR #1028 is still draft/open at `f1e199de`; required CI is green.
- [ ] PR #1029 is still draft/open at `f07ba2a7`; required CI is green.
- [ ] No PR head has changed since this runbook was prepared.
- [ ] Approved migration files are unchanged.
- [ ] No newer `main` commit creates a merge/rebase dependency.

### 3.2 Production database state

- [ ] Confirm Neon project/branch/database and direct/pooled endpoint privately.
- [ ] Confirm the migration ledger count: 25 with target absent, or 26 with target present.
- [ ] If target is present, do not rerun SQL; inspect the exact ledger/catalog state.
- [ ] Confirm gate `blocked=true`, `hold=false`, expected revision and admission horizon.
- [ ] Confirm no active migration/DDL statement and no conflicting lock waits.
- [ ] Confirm six subscription exemptions and no unexpected paid-status changes.
- [ ] Confirm no admission permits or audit rows exist before pilot.
- [ ] Reconfirm the recovery snapshot ID, creation time, source branch, retention/RPO and protected-restore route.
- [ ] Owner accepts the recovery point age/data-loss exposure or approves a fresher snapshot.

### 3.3 Serving Vercel deployment

- [ ] Confirm the Production alias `app.digitalgate.com.au` points to the intended READY deployment.
- [ ] Record deployment ID, source SHA, creation time and target environment.
- [ ] Confirm the deployment's captured `DATABASE_URL` variable version or provider attestation.
- [ ] Confirm the captured `DATABASE_URL` host/database maps to the intended Neon endpoint.
- [ ] Confirm whether `DATABASE_URL_UNPOOLED` is exposed to the serving function.
- [ ] If `DATABASE_URL_UNPOOLED` is owner-valued and exposed, STOP until it is removed/replaced or proven inaccessible under separate approval.
- [ ] Confirm `DATABASE_URL` is the only runtime database URL used by application code.
- [ ] Confirm no Production database credential is visible in build logs, deployment metadata or error output.

Vercel dashboard/API methods that may be used privately:

- Project → Settings → Environment Variables → Production.
- Deployment → Environment Variables / captured configuration, where exposed.
- Read-only Vercel API: project env metadata and deployment metadata with an authorised read-only token.
- If the provider cannot attest the captured variable version, record **UNKNOWN** and do not substitute the current project variable.

### 3.4 Runtime role suitability

- [ ] Confirm the exact existing role name.
- [ ] Role is `LOGIN`.
- [ ] Role is not `SUPERUSER`.
- [ ] Role has no `CREATEDB`, `CREATEROLE`, `REPLICATION` or `BYPASSRLS`.
- [ ] Role has no role memberships, including `NOINHERIT`/`SET ROLE` paths.
- [ ] Role owns no public relation, function or schema.
- [ ] Role has no `CREATE` on schema `public`.
- [ ] Role has no `CREATE` on the current database.
- [ ] Role has no migration-ledger access.
- [ ] Role has no grant option on tables, columns, sequences, schema, database or functions.

### 3.5 Application and worker dependency audit

- [ ] Runtime application code uses `DATABASE_URL` only.
- [ ] `DATABASE_URL_UNPOOLED`, `DIRECT_URL`, `SHADOW_DATABASE_URL` and `RECONCILIATION_DATABASE_URL` are not referenced by `src/`, `packages/` or `workers/` runtime code.
- [ ] The shared Prisma client is the only runtime Prisma client.
- [ ] Operator-only `new PrismaClient` paths are limited to the #991 remediation route/action.
- [ ] No runtime migrations, `db push`, `db execute`, `_prisma_migrations` access or owner-only DDL exist outside the documented operator-only paths.
- [ ] The Mac AI worker uses the HTTPS gateway and has no database credential.
- [ ] Vercel build/prebuild does not run migrations, seeds or Production reconciliation.
- [ ] Vercel build logs show no unexpected database connection or write activity.
- [ ] Cron and webhook routes use the shared runtime client, not an owner credential.

Run the static deployment-boundary test before the cutover window:

```sh
npm run test:runtime-deployment-boundaries
```

## 4. Affected Production services

All of the following use the shared `@dg/database` Prisma client and the runtime `DATABASE_URL`, unless explicitly marked operator-only.

### 4.1 Web application

- Next.js pages, server components/server actions and API routes.
- Authentication/Clerk session resolution.
- Onboarding, CRM, prospecting, communications, support, websites, commerce, billing and industry applications.
- Checkout remains globally blocked; no admission permit is issued.

### 4.2 Vercel cron jobs

- `/api/cron/lead-followups` — daily 08:00
- `/api/cron/pagespeed` — daily 06:00
- `/api/cron/ota-ical-sync` — daily 05:00
- `/api/cron/ai-visibility-monitoring` — daily 05:30
- `/api/cron/seo-monitoring` — daily 05:45
- `/api/cron/scheduled-emails` — daily 09:00
- `/api/cron/billing-dunning` — daily 07:00
- `/api/cron/ai-gateway-maintenance` — every 5 minutes

There is also a `property-report-followups` route; confirm its scheduler/trigger before cutover if it is active.

### 4.3 Webhooks

- Stripe: `/api/webhooks/stripe`
- Clerk: `/api/webhooks/clerk`
- DG discovery: `/api/webhooks/dg-discovery`
- DG leads: `/api/webhooks/dg-leads`
- DG onboarding sync: `/api/webhooks/dg-onboarding-sync`
- DG stay booking: `/api/webhooks/dg-stay-booking`
- Dreamscape: `/api/webhooks/dreamscape`
- Dropbox Sign: `/api/webhooks/dropbox-sign`
- ElevenLabs: `/api/webhooks/elevenlabs` and tools route

### 4.4 External AI worker

- `workers/mac-ai` uses `DG_AI_GATEWAY_URL`, `DG_AI_WORKER_ID`, `DG_FAST_OLLAMA_DIGEST` and a Keychain credential.
- It does **not** connect directly to PostgreSQL.
- Its claim/heartbeat/complete calls depend on the web application's database runtime. Verify those endpoints after cutover.

### 4.5 Operator-only paths — must not use the runtime credential

- `src/lib/remediate-991-physical.ts` — table locks/DDL/migration ledger.
- `src/lib/remediate-991-sql.ts` and `src/lib/remediate-991-sql-generated.ts`.
- `packages/platform-core/src/billing/legacy-app-entitlement-reconciliation.ts`.
- Reconciliation, seed, worker-provisioning/rotation and migration scripts.
- Any use of `RECONCILIATION_DATABASE_URL` or a Direct owner/admin credential.

## 5. Exact deployment and cutover sequence

Each numbered step requires its own approval. Do not batch approvals.

### Step 0 — Read-only preflight

Complete section 3. Record sanitised evidence only.  
**Approval:** none for read-only checks.  
**STOP:** any identity, ledger, role, recovery, endpoint or credential ambiguity.

### Step 1 — Admission migration (Codex)

Codex executes only the already-approved admission migration with the verified capsule and private Direct credential. This runbook does not duplicate those instructions.

Verify:

- Exact SQL hash and capsule manifest.
- Post-SQL catalog/trigger/FK/ACL inspection.
- Zero admissions/audit rows.
- Original 25 ledger rows unchanged.
- Gate/subscriptions/exemptions/receipts unchanged.
- Exactly 26 finished ledger rows after resolve.
- No automatic retry, repair or ledger fabrication.

**Approval:** owner migration approval already recorded; capture the execution receipt.  
**STOP:** any hash, ledger, catalog, lock or uncertainty mismatch.

### Step 2 — Restricted role grants and verification

Use PR #1029's reviewed scripts:

```sh
psql -X -v ON_ERROR_STOP=1 -v runtime_role=<runtime-role> -f scripts/sql/runtime-role-grants.sql
psql -X -v ON_ERROR_STOP=1 -v runtime_role=<runtime-role> -f scripts/sql/runtime-role-verify.sql
```

Use an owner/admin connection and private credential injection. Do not put a URL/password in arguments or history.

Require:

- `runtime_role_grants_applied`
- `runtime_role_verified`
- No missing/extra privilege, unexpected table/sequence, membership, ownership, grant option or schema/database CREATE.

**Approval:** separate owner approval for role provisioning/grants.  
**STOP:** verifier failure; do not broaden the role to fix it.

### Step 3 — Runtime identity and endpoint verification

Using the exact serving deployment credential, privately run:

```sh
psql -X -v ON_ERROR_STOP=1 -f scripts/sql/runtime-identity-readonly.sql
```

Privately use `\conninfo` to classify pooled vs direct and map the host to the intended Neon endpoint. Return only role, pooled/direct classification, endpoint match and booleans.

The `/api/health/db` `SELECT 1` response is not proof of role or endpoint.

**STOP:** owner/privileged role, memberships, wrong endpoint, wrong database, `DATABASE_URL_UNPOOLED` owner exposure, or inability to attest the captured variable.

### Step 4 — Credential cutover on the current deployment

With checkout blocked and no permit:

- Change only the Production runtime `DATABASE_URL` to the approved runtime role on the same pooled endpoint/database.
- Remove/replace any owner-valued `DATABASE_URL_UNPOOLED` binding exposed to the serving function, or prove it is inaccessible. This requires separate approval and Neon/Vercel integration review.
- Redeploy/restart under separate deployment approval.
- Verify the new serving deployment's captured variable version and `current_user`/`session_user`.
- Verify pooled endpoint/database and non-privileged reachability.
- Wait for the verified old invocation/runtime bound before declaring the cutover complete.

Why cut over before #1028 deployment:

- The current known main source `8d639743` already uses the shared database and can run under the restricted role.
- It avoids running admission-capable code under owner credentials.
- It isolates credential/role failures from the #1028 code rollout.

If the owner requires #1028 to deploy first, the owner window is explicit; checkout remains blocked and no permit is issued.

### Step 5 — Deploy PR #1028

Only after Step 4 is verified:

- Merge PR #1028 to `main` under separate approval; do not alter its head.
- Deploy the resulting main source.
- Verify deployment/source/alias and captured runtime role.
- Keep checkout globally blocked.
- Verify admission code fails closed without a permit.
- Verify no permit/audit rows were created.

**Approval:** separate merge/deploy approval.  
**STOP:** any runtime role regression, admission write, gate change or old-instance uncertainty.

### Step 6 — Integrate PR #1029

PR #1029 is a docs/scripts/tests and CI change; it does not add application runtime behaviour.

After PR #1028 is merged:

- Retarget PR #1029's base to `main` as a metadata-only change, or create an equivalent integration PR without modifying either approved head.
- Merge under separate approval.
- Deploy; verify no runtime behaviour change and no database permission regression.
- Do not merge reporting output; PR #1029 is not reporting output.

**Approval:** separate merge/deploy approval.  
**DO NOT** merge #1029 before #1028; it carries #1028 commits as ancestors.

### Step 7 — Post-cutover smoke and observation

Run the smoke matrix in section 6. Keep checkout blocked. No permit, invitation or Live Stripe mutation.

### Step 8 — Pilot gate

Only after all shared gates pass, obtain separate approval for one terms-bound admission and one monitored customer checkout. This runbook does not authorise the pilot.

## 6. Smoke-test matrix

| Area | Check | Expected | Write? |
|---|---|---|---|
| Deployment | Alias/source/deployment ID | Intended READY deployment | No |
| Runtime role | `current_user` / `session_user` with serving credential | Runtime role | No |
| Runtime endpoint | Private `\conninfo` correlation | Intended pooled Neon endpoint/database | No |
| Privileges | `runtime-role-verify.sql` | `runtime_role_verified` | No |
| Health | `/api/health/db` | 200, `ok:true` | No |
| Public site | Home, pricing, public website pages | 200, expected content | No |
| Auth | Login page, existing session | 200, valid redirect | No |
| Dashboard | Existing synthetic/operator organisation | 200, no DB permission error | No |
| CRM | Contacts/companies/leads/tasks read pages | 200, tenant-scoped data | No |
| Prospecting | Prospect/report/audit read pages | 200, expected data | No |
| Industry apps | Finance/accommodation/commercial/PM read pages | 200, expected data | No |
| Onboarding | Resume/read onboarding page | 200, no write | No |
| Commerce | Invoices/quotes read pages | 200, expected data | No |
| Billing | Subscription status/read path | 200, expected state | No |
| Checkout | Attempt creation without permit | Fail closed, no session | No |
| Checkout gate | Gate state | `blocked=true`, no permit | No |
| Stripe webhook | Invalid signature request, if approved | Rejected, no receipt/write | No |
| Clerk webhook | Invalid signature request, if approved | Rejected, no write | No |
| Cron | Scheduled runs/logs after cutover | No permission/Prisma errors | Provider-run |
| AI worker | Existing worker claim/heartbeat logs | No DB permission errors | Worker |
| Logs | Vercel/Neon error logs | No `permission denied`, no owner-only SQL | No |
| Old instances | Neon `pg_stat_activity` / Vercel invocation evidence | No old role after cutoff bound | No |

Do not create a Live Checkout Session, charge, subscription, customer record, permit or gate change for smoke testing.

## 7. Rollback

### 7.1 Role/grant failure before cutover

- Stop. Do not broaden the role.
- Leave the prior runtime credential in place.
- Preserve the admission schema/audit if migration already ran.
- Review the exact failed privilege or unexpected object.

### 7.2 Credential cutover failure

- Revert only the Production `DATABASE_URL` binding/deployment to the prior approved credential under separate approval.
- Keep checkout blocked.
- Do not drop the runtime role or delete audit evidence.
- Do not restore a database snapshot as a credential rollback.
- Verify the serving role and old-instance cutoff again.
- Preserve all receipts.

### 7.3 PR #1028 deployment failure

- Roll back to the previous reviewed deployment source under separate approval.
- Keep additive admission schema and audit; do not delete.
- Admission issuance remains forbidden.
- Old code can resume unscoped OPEN sessions; inventory and contain issued/uncertain sessions before any rollback.
- No automatic Stripe expiry/refund/subscription change.

### 7.4 PR #1029 deployment failure

- PR #1029 is docs/scripts/tests only; roll back to the previous deployment and investigate CI/tooling.
- No database rollback is required.

### 7.5 Snapshot restore

Snapshot restore is a separate last-resort operation. It loses post-snapshot writes, has protected-branch finalisation constraints and requires owner approval. It is never the default application or credential rollback.

## 8. Owner approval checkpoints

1. Migration execution/receipt acceptance.
2. Role provisioning and grants.
3. Runtime credential cutover and `DATABASE_URL_UNPOOLED` handling.
4. PR #1028 merge/deploy.
5. PR #1029 merge/deploy (after #1028).
6. Post-cutover smoke acceptance.
7. Single-customer pilot/admission/contact (separate, later).

## 9. Remaining blockers

- Actual serving Vercel deployment, captured `DATABASE_URL` version, endpoint and role are unverified.
- No Vercel/Neon read-only API token or CLI was available in this session.
- The runtime role has not been provisioned or verified in Production.
- `DATABASE_URL_UNPOOLED` may still expose an owner-valued credential to the serving function.
- The admission migration is not confirmed executed; private Direct credential injection remains unresolved.
- Recovery snapshot/RPO/protected-restore acceptance is not recorded.
- PR #1028 and PR #1029 remain unmerged; #1029 is stacked on #1028.
- Vercel build/prebuild production DB access has not been observed in the release window; CI build passed without a database.
- Production smoke and old-instance cutoff evidence do not yet exist.
- Global checkout remains blocked; no customer pilot is authorised.

## 10. GO / HOLD assessment

**HOLD** for:

- Production role provisioning/grants.
- Credential cutover.
- PR #1028 or #1029 merge/deployment.
- Checkout activation, permits, customer contact or pilot.

**GO** for:

- Read-only provider/deployment/database metadata collection by authorised operators.
- Local static/deployment-boundary tests and runbook review.
- Owner approval preparation.
- Execution of the already-approved migration by Codex, subject to the existing migration approval and receipt checks.

The platform is **not ready for a Production deployment or restricted-runtime cutover** until the serving identity/endpoint, role suitability, `DATABASE_URL_UNPOOLED` handling, migration state and recovery acceptance are verified and separately approved.
