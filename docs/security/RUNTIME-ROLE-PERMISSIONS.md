# Restricted database runtime role — application-wide permissions

Status: **PASS for manifest, grant/denial verification and disposable rehearsal. HOLD for Production credential cutover.**

Base: PR #1028 commit `f1e199de7d77762183894fe7e0a8d4f72b50bb8c` on top of `main` `8d639743352b9e980afb7e156fc9ac9cff1308b2`.

No Production database, credential, role, Vercel or Stripe change was made. This branch prepares and tests the least-privilege runtime role; it does not authorise the Production cutover.

## Scope

The manifest covers every Prisma model table across all 19 manifest modules:

- Identity and tenancy
- CRM, tasks and automation
- Prospecting and acquisition
- Business Brain and AI Visibility
- AI gateway and local worker execution
- Websites, domains and content
- Commerce and payments
- Billing, subscriptions and entitlements
- Checkout attempts, gate and admission authority
- Industry Applications (accommodation, finance, commercial, property management, services)
- Partners and delivery
- Communications, Aida and support
- Platform API keys and referrals

The checked-in manifest is the source of truth:

- `scripts/security/runtime-role-manifest.json`
- `scripts/sql/runtime-role-grants.sql` (generated)
- `scripts/sql/runtime-role-verify.sql` (generated)

Run `npm run security:runtime-manifest` after a schema change. Run `npm run security:runtime-verify` to prove the manifest still covers the current schema and runtime code.

## Manifest result

- 83 application tables.
- 1 granted sequence: `support_messages_id_seq` (`USAGE`, `SELECT`).
- 2 explicitly denied sequences: `platform_checkout_admission_audit_id_seq` and `playing_with_neon_id_seq`.
- 2 explicitly excluded relations: `_prisma_migrations` and `playing_with_neon`.
- 5 application-owned functions, all trigger-only.
- Every table is classified by module and by privilege rationale; excluded objects are explicitly classified with zero runtime privileges.

`playing_with_neon` and its sequence are Neon sample/legacy objects not referenced by DigitalGate runtime code. They are explicitly excluded so the Production verifier can tolerate their presence without granting access. This is not a broad unknown-object allowance: any other unclassified public table or sequence still fails the verifier.

Most business tables receive table-level `SELECT`, `INSERT`, `UPDATE` and `DELETE` because Prisma relation traversal and normal module operations require them. Append-only/evidence and security-sensitive tables are narrower.

## Restricted objects

| Object | Runtime privilege |
|---|---|
| `platform_checkout_creation_gate` | `SELECT`; `UPDATE(last_admission_expires_at)` only |
| `platform_checkout_admissions` | `SELECT`; `UPDATE(attempt_id)` only |
| `platform_checkout_admission_audit` | `SELECT` only |
| `audit_logs` | `SELECT`, `INSERT` only |
| `growth_prospect_audits` | `SELECT`, `INSERT` only |
| `platform_subscription_events` | `SELECT`, `INSERT` only |
| `platform_referral_ledger` | `SELECT`, `INSERT` only |
| `partner_commission_events` | `SELECT`, `INSERT` only |
| `growth_prospect_engagements` | `SELECT`, `INSERT` only |
| `agent_actions` | `SELECT`, `INSERT` only |
| `stripe_webhook_receipts` | `SELECT`, `INSERT`, `UPDATE` |
| `ai_worker_provisioning_receipts` | `SELECT`, `INSERT`, `UPDATE` |
| `platform_checkout_attempts` | `SELECT`, `INSERT`, `UPDATE` |
| `platform_api_keys` | `SELECT`, `INSERT`, `UPDATE` |
| `platform_referrals` | `SELECT`, `INSERT`, `UPDATE` |
| `ai_worker_claim_receipts` | `SELECT`, `INSERT`, `DELETE` |
| `ai_inference_jobs`, `ai_accounting_outbox` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

## Preserved checkout boundaries

The runtime remains unable to:

- create or approve an admission permit;
- revoke or rewrite permit authority;
- change the global `blocked`, `subscription_webhooks_held` or `revision` gate controls;
- insert, update, delete or truncate admission audit evidence;
- execute the admission audit `SECURITY DEFINER` function;
- disable triggers;
- write the Prisma migration ledger;
- create, alter, drop or truncate persistent schema objects;
- create roles, alter role attributes or assume another role;
- grant database privileges or grant options;
- read `_prisma_migrations` or the explicitly excluded `playing_with_neon` relation/sequence.

The runtime can read the gate/admission/audit tables, bind an unused permit to one attempt, and advance only `last_admission_expires_at`. Those are the existing approved runtime behaviours required by the checkout coordinator.

## Role policy and topology

The approved topology is **one non-owner LOGIN role** (`dg_app_runtime`) with direct object/column grants and **no role memberships**.

The older proposal for a `NOLOGIN` permission group plus a separate login identity is superseded for this cutover. It would introduce a membership path, require different membership/allowlist verification and is not used by the certified grants/verifier. The single-login design does not broaden privileges; it preserves the tested fail-closed no-membership boundary.

The separate reviewable Production role-creation and grants approval package is [PRODUCTION-RUNTIME-ROLE-PACKAGE.md](PRODUCTION-RUNTIME-ROLE-PACKAGE.md). It is proposed only and has not been executed.

The grants script requires:

- exactly one existing login role;
- no `SUPERUSER`, `CREATEROLE`, `CREATEDB`, `REPLICATION` or `BYPASSRLS`;
- no role memberships, including `NOINHERIT` and `SET ROLE` paths;
- no ownership or inherited ownership of a public relation, function or schema;
- no `CREATE` on schema `public`;
- no `CREATE` on the current database;
- no unexpected table, sequence or privilege;
- no grant option on any granted table, column, sequence, schema, database or function.

`TEMP` remains a PostgreSQL `PUBLIC` baseline privilege in the disposable database. It is not a persistent schema capability and is not used by the runtime; the verifier does not require a global `PUBLIC` revocation. The runtime cannot create persistent tables, indexes, functions or migrations.

## Operator-only exceptions

These paths cannot run under the restricted runtime and must retain separate owner/operator authority:

- `src/lib/remediate-991-physical.ts` — one-time #991 schema remediation uses `LOCK TABLE`, DDL and the migration ledger.
- `src/lib/remediate-991-sql.ts` and `src/lib/remediate-991-sql-generated.ts` — owner-only remediation SQL.
- `packages/platform-core/src/billing/legacy-app-entitlement-reconciliation.ts` — signed legacy billing repair path, run by an operator script with a separate privileged connection.

The smallest safe correction is to keep these operations out of the runtime credential, not to broaden the runtime role. The #991 route must remain disabled unless an owner-only operator connection is used.

## Verification commands

Static coverage and boundary checks:

```sh
npm run security:runtime-verify
npm run test:runtime-permissions
```

Disposable PostgreSQL 18 rehearsal (fresh random loopback cluster, synthetic data, destroyed afterwards):

```sh
npm run test:runtime-permissions-db
```

Equivalent explicit-bin invocation:

```sh
node scripts/run-checkout-compatibility-db-tests.mjs /opt/homebrew/opt/postgresql@18/bin permissions
```

Grant application (admin/owner connection; private credential injection required):

```sh
psql -X -v ON_ERROR_STOP=1 -v runtime_role=dg_app_runtime -f scripts/sql/runtime-role-grants.sql
```

Post-grant verification (admin connection):

```sh
psql -X -v ON_ERROR_STOP=1 -v runtime_role=dg_app_runtime -f scripts/sql/runtime-role-verify.sql
```

The verifier must be run with an administrator/owner connection. It creates only transaction-local temporary tables and does not change persistent state.

## Disposable rehearsal evidence

The rehearsal creates the full Prisma datamodel plus the certified checkout migrations in a fresh loopback PostgreSQL 18 cluster. It then:

- applies the manifest grants to a real non-owner login role;
- runs the exhaustive catalog verifier;
- performs representative CRM, commerce, billing, support, Business Brain, AI worker/job, partner/delivery, finance and accommodation operations as the runtime role;
- verifies tenant-scoped application queries return only the selected tenant while documenting that the database role is not an RLS boundary;
- verifies the runtime can read admissions/audit/gate, bind one attempt and advance the admission horizon;
- verifies it cannot create/authorise/revoke permits, mutate audit evidence, change gate controls, alter the migration ledger, perform DDL, change roles or acquire grant options;
- injects missing/extra table privileges, an unexpected public table, owner role, unknown role, inherited membership and helper-role escalation; the verifier and preflight reject each;
- stops and deletes the disposable cluster.

## Production cutover procedure — separate approval required

1. Confirm the exact serving Vercel deployment and its captured `DATABASE_URL` version/endpoint/role. Do not substitute current project metadata for deployment proof.
2. Confirm the target Neon project/branch/endpoint and that the runtime role is an existing non-owner login role with no memberships.
3. Re-run the read-only Production preflight. Confirm the admission migration state and that the database is otherwise compatible with the manifest.
4. Apply `runtime-role-grants.sql` with the owner/admin direct connection and a private credential mechanism. Do not put credentials in shell arguments or logs.
5. Run `runtime-role-verify.sql` with the owner/admin connection. Require `runtime_role_verified`. Any missing/extra privilege, unexpected table/sequence, membership or ownership => STOP.
6. Privately change the Production `DATABASE_URL` to the approved runtime credential on the same pooled endpoint/database. Keep migration/approval credentials in operator tooling only.
7. Redeploy or restart the serving application under separate deployment approval. Verify `current_user`, `session_user`, endpoint classification and the absence of privileged reachability using the exact serving credential.
8. Run read-only smoke checks and representative module operations. Keep checkout globally blocked and issue no permit.
9. Verify old instances/invocations stop using the previous credential before declaring the cutover complete.
10. Record sanitised evidence: role name, endpoint classification, verifier result, deployment/source, timestamps and any errors. Never record URLs, passwords or tokens.

## Rollback

- Revert the application to the previous credential/deployment only under separate approval.
- Do not drop the runtime role or audit evidence as an automatic rollback.
- Revoke the runtime grants only if the role must be retired; review dependencies first.
- Preserve additive admission schema and audit history.
- Do not restore a database snapshot as a credential rollback. Snapshot restore is a separate last-resort operation with post-snapshot write loss.
- If old code resumes, it remains subject to the global checkout block and the existing admission controls.

## PASS/FAIL assessment

- **PASS**: manifest covers all 83 Prisma tables across 19 modules.
- **PASS**: `_prisma_migrations`, `playing_with_neon` and `playing_with_neon_id_seq` are explicitly excluded/denied with zero runtime privileges.
- **PASS**: generated grant and verification SQL are current.
- **PASS**: static verification rejects missing coverage, prohibited privileges, migration-ledger access, excluded-object grants and unclassified DDL.
- **PASS**: disposable PostgreSQL 18 rehearsal: 8/8 tests.
- **PASS**: representative operations across every major module.
- **PASS**: checkout admission/gate/audit boundaries, inherited membership, helper-role escalation, grant-option and DDL denial.
- **HOLD**: Production runtime role identity is not yet confirmed.
- **HOLD**: Production credential cutover, deployment and evidence capture require separate owner approval.
- **HOLD**: PR #1028 remains draft and unmerged; this branch is stacked on it.
- **HOLD**: a Production role with owner/privileged attributes or memberships must be remediated before cutover.

## Remaining risks

- The database role is not a tenant-isolation boundary. Application-level organisation scoping, membership checks and cross-tenant tests remain mandatory.
- Table-level CRUD on business tables is intentionally broad enough for Prisma relation traversal; adding a new table or module requires manifest regeneration and review.
- The disposable rehearsal reconstructs the Prisma datamodel plus certified checkout migrations. It does not reproduce every Production-only trigger, extension or legacy object. The Production verifier is the final catalog authority.
- Application-owned trigger functions remain trigger-only. PUBLIC execute on non-`SECURITY DEFINER` trigger functions is not a privilege escalation, but the admission audit definer function is explicitly denied.
- The #991 remediation and legacy reconciliation paths require separate owner authority; they are not part of the restricted runtime.
- The manifest assumes the application uses the single pooled `DATABASE_URL`. A separate privileged maintenance credential must not be exposed to the runtime.
- `DATABASE_URL_UNPOOLED` is configured as an encrypted/integration-managed Production variable, not a Secret/sensitive variable. It may be readable to authorized members/automation and can be read by any code in the serving function. Removing or replacing it with restricted authority requires separate approval and integration-sync review; it is not safe to leave an owner-valued binding accessible.
