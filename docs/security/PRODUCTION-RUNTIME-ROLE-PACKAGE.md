# Production restricted runtime role — review and approval package

Status: **PROPOSED — not executed.**
Prepared: 27 October 2026
Target: DigitalGate Production, Neon `gentle-sky-35028642`, branch `br-old-shadow-a7ffezls`, database `neondb`.

This package is a review artefact. It does not authorise role creation, credential changes, Vercel changes, deployment, merge, checkout opening or admission.

## 1. Decision

Use **one non-owner LOGIN role**, `dg_app_runtime`, with direct object/column grants and **no role memberships**.

This supersedes the older proposal for a `NOLOGIN` permission group plus a separate login identity. That older topology would introduce a membership path, require different membership/allowlist verification, and is not used by the certified grants/verifier in PR #1029. The single-login design does not broaden privileges; it keeps the tested fail-closed no-membership boundary.

The role must:

- already be absent before creation;
- be `LOGIN`;
- be `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`;
- have no role memberships;
- own no public relation, function or schema;
- have no schema/database `CREATE`;
- have no migration-ledger or excluded-object access;
- receive only the reviewed manifest grants.

## 2. Verified facts and assumptions

Verified locally in this workstream:

- 83 manifest application tables.
- The manifest/verifier now explicitly excludes `_prisma_migrations` and `playing_with_neon` and denies `platform_checkout_admission_audit_id_seq` and `playing_with_neon_id_seq`.
- The verifier still rejects any other unknown public table or sequence.
- Source search found no runtime reference to `playing_with_neon` or its sequence.
- Static tests and disposable PostgreSQL tests passed.
- PR #1028 migration files were not modified.

Independently verified Production facts (operator-provided; not re-queried in this worktree):

- 26 finished migrations, zero unfinished.
- 85 public tables, including `_prisma_migrations` and `playing_with_neon`.
- Three public sequences: `support_messages_id_seq`, `platform_checkout_admission_audit_id_seq` and `playing_with_neon_id_seq`.
- `dg_app_runtime` does not yet exist.

Gate/admission counts are not freshly verified in this worktree; recheck `blocked`, hold, revision and admission/audit counts read-only at the execution window.

Assumptions requiring operator confirmation:

- The Production role name will be exactly `dg_app_runtime`, or the approved operator substitutes a different existing role deliberately.
- The runtime credential will use the approved pooled endpoint/database.
- The actual serving deployment credential is separately verified; this package does not prove it.
- No other runtime worker or integration has a separate owner-valued database binding.
- `playing_with_neon` and its sequence are not referenced by runtime code and must remain zero-privilege.

## 3. Exact preconditions

- [ ] Owner approves this package and the exact role name.
- [ ] PR #1028 migration is complete and the 26-row ledger is verified.
- [ ] Checkout gate is `blocked=true`; hold is `false`; no admission permit/audit rows.
- [ ] Target Neon project/branch/database are confirmed by an authorised operator.
- [ ] `dg_app_runtime` is absent.
- [ ] Manifest/verifier commit is fixed and hash-pinned.
- [ ] `playing_with_neon` and `playing_with_neon_id_seq` are confirmed excluded/denied.
- [ ] Owner approves private credential creation/installation.
- [ ] `DATABASE_URL_UNPOOLED` runtime exposure is reviewed; removal/replacement is separately approved before cutover.
- [ ] A rollback decision-maker and attended window are named.
- [ ] No other migration, role or ACL change runs concurrently.

## 4. Exact proposed steps

### Step 1 — Read-only preflight

Run the read-only Production preflight against the approved project/branch/database. Confirm:

- 26 finished migrations;
- 85 public tables and 3 public sequences as reported;
- `dg_app_runtime` absent;
- no unexpected role with the same name;
- checkout gate blocked;
- no permits/audit rows;
- no active conflicting locks.

### Step 2 — Create the role only

Use an owner/admin Direct connection with private credential injection:

```sh
psql -X -v ON_ERROR_STOP=1 -f scripts/sql/production-runtime-role-create.sql
```

The SQL:

- fails if the role already exists;
- creates one `LOGIN` role with `NOINHERIT` and no admin attributes;
- does not set a password;
- verifies the role attributes and absence of memberships;
- commits only on success.

**Approval:** separate owner approval for role creation.
**STOP:** role exists, attribute/membership mismatch, lock timeout or uncertainty.

### Step 3 — Install authentication privately

Set the role password/authentication only through the approved private provider or secret-store mechanism. Do not place a password in this SQL file, a command argument, shell history, a report, a source file or a chat message.

If using an interactive `psql` `\password dg_app_runtime`, first confirm server statement logging does not capture the credential. Otherwise use the provider's private secret-setting mechanism.

**Approval:** separate owner approval for private credential installation.
**STOP:** any credential disclosure or inability to install privately.

### Step 4 — Apply grants

Use the reviewed generated script with an owner/admin Direct connection:

```sh
psql -X -v ON_ERROR_STOP=1 -v runtime_role=dg_app_runtime -f scripts/sql/runtime-role-grants.sql
```

Require `runtime_role_grants_applied`.

**Approval:** separate owner approval for grants.
**STOP:** preflight/ownership/membership/unsafe-role failure.

### Step 5 — Verify required and denied privileges

```sh
psql -X -v ON_ERROR_STOP=1 -v runtime_role=dg_app_runtime -f scripts/sql/runtime-role-verify.sql
```

Require `runtime_role_verified`.

The verifier must confirm:

- required table/column/sequence privileges, with effective SELECT/INSERT/UPDATE/REFERENCES and grant-option checks on every column of permitted and excluded relations;
- no admission `INSERT`, `DELETE`, `TRUNCATE` or audit mutation, including individual-column and PUBLIC grants;
- no gate control (`blocked`, hold, revision);
- no migration-ledger access;
- no access to `playing_with_neon` or `playing_with_neon_id_seq`;
- no unexpected table/sequence;
- no memberships, ownership, schema/database `CREATE` or grant options;
- no privileged reachable role.

**Approval:** verification evidence acceptance.
**STOP:** any mismatch; do not broaden grants.

### Step 6 — Optional read-only role connectivity proof

After private credential installation, use the exact runtime credential with the read-only identity SQL and the supplemental ownership/permission queries from the identity procedure. This proves the role can connect and has the intended effective permissions. It does not prove the historical serving deployment credential.

### Step 7 — Stop

Do not change Vercel `DATABASE_URL`, remove/alter `DATABASE_URL_UNPOOLED`, deploy, merge, open checkout or issue an admission in this package. Those require separate approvals.


## 5. `DATABASE_URL_UNPOOLED` runtime exposure

No value was retrieved. The configured Production metadata describes `DATABASE_URL_UNPOOLED` as an encrypted, integration-managed variable rather than a Secret/sensitive variable.

Implications:

- Encrypted/Config values are readable to authorized project members and automation; Secret values are write-only after saving.
- Any source code or dependency running in the serving function can read any environment variable injected at runtime, even if the current source does not reference `DATABASE_URL_UNPOOLED`.
- An integration-managed variable may be synchronized, rotated or re-added by the Neon/Vercel integration.
- Switching only `DATABASE_URL` to `dg_app_runtime` does not remove an owner-valued escape path if `DATABASE_URL_UNPOOLED` remains available to the runtime.

Required before cutover:

- Remove `DATABASE_URL_UNPOOLED` from runtime scope, or replace it with the same restricted runtime authority through a supported Neon/Vercel integration procedure.
- Confirm integration synchronisation ownership before changing any binding; do not reconnect integrations automatically.
- Verify the serving deployment's captured scope/metadata and runtime environment, without retrieving or displaying values.
- This removal/replacement requires separate owner approval and is not performed by this package.

## 6. Failure stops

- Role exists or name mismatch.
- Role is `SUPERUSER`, has `CREATEDB`/`CREATEROLE`/`REPLICATION`/`BYPASSRLS`, or cannot log in.
- Role has any membership, ownership or inherited ownership.
- Role has schema/database `CREATE`.
- Role has migration-ledger, `playing_with_neon`, gate-control, admission or audit privileges outside the manifest.
- Grants/verifier returns anything other than the required success markers.
- Any secret value appears in output, history, logs or reports.
- Wrong Neon endpoint/branch/database.
- Concurrent migration/role/ACL change or uncertain outcome.

## 7. Rollback

- If the role was created but grants were not applied: owner-approved `DROP ROLE dg_app_runtime` only after confirming no dependencies and no sessions.
- If grants were applied: revoke grants first, verify no application uses the role, then drop only under separate approval.
- If the role is in use, do not drop it; revert the credential/deployment under separate approval.
- Do not restore a database snapshot as a role/credential rollback.
- Preserve the migration schema, ledger and audit.
- Do not automatically restore an owner credential.

## 8. Owner approval checkpoints

1. Role creation SQL and exact role name.
2. Private authentication installation.
3. Grants script.
4. Verifier evidence.
5. Runtime credential/cutover and deployment — separate package.
6. Checkout/pilot — separate later gate.

## 9. Evidence required

- Role absence preflight.
- Role creation receipt.
- Role attributes/membership/ownership capture.
- Grants/verifier output.
- `playing_with_neon` zero-privilege proof.
- Sanitised timestamps, role name, endpoint classification and commit/hash references.
- No secrets.

## 10. Current assessment

**HOLD** for role creation, grants, credential installation and cutover. The package is reviewable, but the Production actions require separate owner approvals and a valid attended operator window.

## Targeted permission repair requirements

Use only the corrected generator/manifest/grants/verifier at the accepted correction head. The original #1032 head was rejected by independent review; passing its old CI is insufficient.

`ai_worker_provisioning_receipts` permits table SELECT, INSERT(nonce,fingerprint,window_id,operation,outcome), and UPDATE(outcome,worker_id,deployment_id,completed_at). Do not grant table-wide INSERT/UPDATE, identity changes or grant options. The source caller is `executeProvision`; its initial insert and completion update need exactly these columns. The existing owner-pinned provisioning API configuration guard is unchanged; a restricted serving role does not automatically authorise that operator-only endpoint.

The verifier rejects unexpected effective column privileges or grant options inherited from PUBLIC, even when table-level privilege functions return false. Manifest edits cannot add protected column permissions or change exclusions, functions, sequences or role policy without a reviewed source-policy change.
