import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test, { after, before } from "node:test";
import { PrismaClient } from "@dg/database";
import { executeProvision } from "../packages/platform-core/src/ai/local-worker-provisioning.ts";

const pgBin = process.env.DG_CHECKOUT_PG_BIN || "/opt/homebrew/opt/postgresql@18/bin";
const databaseUrl = process.env.DATABASE_URL;
const control = new PrismaClient();
let runtime;
let url;

function psqlFile(file, role, login = url.username) {
  return spawnSync(path.join(pgBin, "psql"), [
    "-X",
    "-h", url.hostname,
    "-p", url.port,
    "-U", login,
    "-d", url.pathname.slice(1),
    "-v", "ON_ERROR_STOP=1",
    "-v", `runtime_role=${role}`,
    "-f", file,
  ], { encoding: "utf8", env: { PATH: process.env.PATH } });
}

before(async () => {
  url = new URL(databaseUrl ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.notEqual(url.port, "5432");
  assert.equal(url.username, "checkout_test");
  assert.equal(url.pathname, "/dg_checkout_test");
  const [identity] = await control.$queryRaw`SELECT current_setting('dg.checkout_test_cluster', true) AS marker, host(inet_server_addr()) AS host`;
  assert.equal(identity.marker, process.env.DG_CHECKOUT_DB_MARKER);
  assert.equal(identity.host, "127.0.0.1");
  await control.$executeRaw`CREATE ROLE runtime_permissions LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`;
  const grants = psqlFile("scripts/sql/runtime-role-grants.sql", "runtime_permissions");
  assert.equal(grants.status, 0, grants.stderr);
  await control.$executeRaw`CREATE TABLE IF NOT EXISTS public._prisma_migrations (id text)`;
  await control.$executeRaw`CREATE TABLE IF NOT EXISTS public.playing_with_neon (id bigserial PRIMARY KEY, name text)`;
  const verify = psqlFile("scripts/sql/runtime-role-verify.sql", "runtime_permissions");
  assert.equal(verify.status, 0, verify.stderr);
  const runtimeUrl = new URL(url);
  runtimeUrl.username = "runtime_permissions";
  runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const [me] = await runtime.$queryRaw`SELECT current_user, session_user`;
  assert.equal(me.current_user, "runtime_permissions");
  assert.equal(me.session_user, "runtime_permissions");
});

after(async () => {
  await runtime?.$disconnect();
  await control.$disconnect();
});

async function organisation(suffix) {
  return control.organisation.create({ data: { name: `Runtime ${suffix}`, slug: `runtime-${suffix}-${randomUUID()}` } });
}

test("legitimate provisioning inserts and completes under restricted columns; replay stays denied", async () => {
  const now=Date.now(), nonce="1".repeat(64), fingerprint="2".repeat(64), windowId="3".repeat(32);
  const request={operation:"provision",nonce,fingerprint,timestamp:now};
  const config={fingerprint,windowId,start:now-1000,end:now+60000};
  const result=await executeProvision(request,config,runtime);
  assert.ok(result.workerId); assert.ok(result.deploymentId);
  // Synthetic local worker credential is never printed or persisted outside this disposable DB.
  const receipt=await runtime.aiWorkerProvisioningReceipt.findUnique({where:{nonce}});
  assert.equal(receipt.outcome,"succeeded"); assert.equal(receipt.fingerprint,fingerprint);
  assert.equal(receipt.windowId,windowId); assert.equal(receipt.workerId,result.workerId);
  assert.ok(receipt.completedAt);
  assert.deepEqual(await executeProvision(request,config,runtime),{code:"replay"});
});

test("runtime can perform representative module operations", async () => {
  const org = await organisation("modules");
  const contact = await runtime.contact.create({ data: { organisationId: org.id, firstName: "Synthetic" } });
  await runtime.company.create({ data: { organisationId: org.id, name: "Synthetic Company" } });
  const task = await runtime.task.create({ data: { organisationId: org.id, title: "Synthetic task" } });
  await runtime.lead.create({ data: { organisationId: org.id, source: "synthetic", contactId: contact.id } });
  const website = await runtime.website.create({ data: { organisationId: org.id, name: "Synthetic Website", slug: `site-${randomUUID()}` } });
  await runtime.websitePage.create({ data: { websiteId: website.id, title: "Home", slug: "home" } });
  const product = await runtime.commerceProduct.create({ data: { organisationId: org.id, name: "Synthetic Product", unitAmountCents: 1000 } });
  const invoice = await runtime.commerceInvoice.create({ data: { organisationId: org.id, subtotalCents: 1000, totalCents: 1000, lineItems: [] } });
  const subscription = await runtime.platformSubscription.create({ data: { organisationId: org.id } });
  await runtime.platformSubscriptionEvent.create({ data: { organisationId: org.id, subscriptionId: subscription.id, type: "synthetic" } });
  await runtime.stripeWebhookReceipt.create({ data: { eventId: randomUUID(), eventType: "synthetic", organisationId: org.id } });
  await runtime.financeApplication.create({ data: { organisationId: org.id, title: "Synthetic finance application" } });
  await runtime.accommodationUnit.create({ data: { organisationId: org.id, title: "Synthetic unit" } });
  const partner = await runtime.partner.create({ data: { clerkUserId: `user_${randomUUID()}`, partnerType: "IMPLEMENTATION_PARTNER", referralCode: `ref-${randomUUID()}` } });
  const referral = await runtime.platformReferral.create({ data: { referrerOrganisationId: org.id, code: `code-${randomUUID()}` } });
  await runtime.platformReferralLedger.create({ data: { organisationId: org.id, referralId: referral.id, entryType: "synthetic", amountCents: 100 } });
  const project = await runtime.deliveryProject.create({ data: { referenceCode: `project-${randomUUID()}`, customerOrganisationId: org.id } });
  await runtime.deliveryMilestone.create({ data: { projectId: project.id, stageId: "launch", title: "Milestone", sortOrder: 1 } });
  const prospect = await runtime.growthProspect.create({ data: { businessName: "Synthetic Prospect" } });
  await runtime.growthProspectAudit.create({ data: { prospectId: prospect.id } });
  const conversation = await runtime.supportConversation.create({ data: { clerkUserId: `user_${randomUUID()}`, organisationId: org.id } });
  const message = await runtime.supportMessage.create({ data: { conversationId: conversation.id, senderRole: "customer", body: "Synthetic support message" } });
  assert.ok(message.id > 0);
  const sourceId = randomUUID();
  await runtime.$executeRaw`INSERT INTO business_knowledge_sources (id, organisation_id, source_type, title, updated_at) VALUES (${sourceId}, ${org.id}, 'synthetic', 'Synthetic source', clock_timestamp())`;
  const itemId = randomUUID();
  await runtime.$executeRaw`INSERT INTO business_knowledge_items (id, organisation_id, type, title, statement, updated_at) VALUES (${itemId}, ${org.id}, 'fact', 'Synthetic item', 'Synthetic statement', clock_timestamp())`;
  await runtime.$executeRaw`UPDATE business_knowledge_items SET status='approved', approved_at=clock_timestamp(), updated_at=clock_timestamp() WHERE id=${itemId}`;
  const workerId = randomUUID();
  const credentialHash = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  await runtime.aiWorkerPrincipal.create({ data: { id: workerId, name: `worker-${randomUUID()}`, credentialHash, credentialPrefix: "synthetic" } });
  const deploymentId = randomUUID();
  await runtime.aiLocalDeployment.create({ data: { id: deploymentId, name: `deployment-${randomUUID()}`, workerId, modelDigest: "a".repeat(64) } });
  const approvalId = randomUUID();
  await runtime.aiLocalRecipientApproval.create({ data: { id: approvalId, organisationId: org.id, deploymentId, approvedByActorType: "user", policyVersion: 1, classificationCeiling: "public" } });
  const jobId = randomUUID();
  await runtime.aiInferenceJob.create({ data: { id: jobId, organisationId: org.id, actorType: "user", actorId: "user_synthetic", correlationId: randomUUID(), task: "synthetic", taskVersion: 1, policyVersion: 1, classification: "public", executionLane: "local_routine", deploymentId, approvalId, idempotencyKey: randomUUID(), requestHash: "b".repeat(64), resultContract: "synthetic", resultContractVersion: 1, contextBudgetTokens: 100, maxOutputTokens: 100, deadlineAt: new Date(Date.now() + 3600000), expiresAt: new Date(Date.now() + 3600000) } });
  await runtime.$executeRaw`INSERT INTO ai_worker_provisioning_receipts (nonce,fingerprint,window_id,operation,outcome) VALUES (${"c".repeat(64)},${"d".repeat(64)},${"e".repeat(32)},'provision','attempt')`;
  await runtime.task.update({ where: { id: task.id }, data: { title: "Updated task" } });
  await runtime.task.delete({ where: { id: task.id } });
  assert.equal(await runtime.contact.count({ where: { organisationId: org.id } }), 1);
  assert.equal(await runtime.company.count({ where: { organisationId: org.id } }), 1);
  assert.equal(await runtime.lead.count({ where: { organisationId: org.id } }), 1);
  assert.equal(await runtime.websitePage.count({ where: { websiteId: website.id } }), 1);
  assert.equal(await runtime.commerceProduct.count({ where: { organisationId: org.id } }), 1);
  assert.equal(await runtime.commerceInvoice.count({ where: { organisationId: org.id } }), 1);
  assert.equal(await runtime.financeApplication.count({ where: { organisationId: org.id } }), 1);
  assert.equal(await runtime.accommodationUnit.count({ where: { organisationId: org.id } }), 1);
  assert.equal(await runtime.deliveryMilestone.count({ where: { projectId: project.id } }), 1);
  assert.equal(await runtime.growthProspectAudit.count({ where: { prospectId: prospect.id } }), 1);
  assert.equal(await runtime.platformReferralLedger.count({ where: { referralId: referral.id } }), 1);
  assert.equal(await runtime.aiInferenceJob.count({ where: { id: jobId } }), 1);
  assert.equal(await runtime.aiWorkerProvisioningReceipt.count({ where: { nonce: "c".repeat(64) } }), 1);
  assert.ok(product.id);
  assert.ok(invoice.id);
  assert.ok(partner.id);
});

test("tenant-scoped application queries remain isolated while the database role is not an RLS boundary", async () => {
  const first = await organisation("tenant-a");
  const second = await organisation("tenant-b");
  await runtime.contact.create({ data: { organisationId: first.id, firstName: "First" } });
  await runtime.contact.create({ data: { organisationId: second.id, firstName: "Second" } });
  assert.equal(await runtime.contact.count({ where: { organisationId: first.id } }), 1);
  assert.equal(await runtime.contact.count({ where: { organisationId: second.id } }), 1);
  assert.equal(await runtime.contact.count({ where: { organisationId: { in: [first.id, second.id] } } }), 2);
  assert.equal(await runtime.contact.count({ where: { organisationId: "nonexistent" } }), 0);
});

test("excluded Neon sample table and sequence remain zero-privilege", async () => {
  for (const statement of [
    "SELECT * FROM playing_with_neon",
    "INSERT INTO playing_with_neon (name) VALUES ('synthetic')",
    "UPDATE playing_with_neon SET name='synthetic'",
    "DELETE FROM playing_with_neon",
    "TRUNCATE playing_with_neon",
    "SELECT nextval('playing_with_neon_id_seq')",
  ]) await assert.rejects(runtime.$executeRawUnsafe(statement));
});

test("checkout admission and gate boundaries remain exact", async () => {
  const org = await organisation("checkout");
  const actor = `user_${randomUUID()}`;
  await control.membership.create({ data: { organisationId: org.id, clerkUserId: actor, role: "owner", status: "active" } });
  const attempt = await runtime.platformCheckoutAttempt.create({ data: { organisationId: org.id, currentOrganisationId: org.id, purchaseFingerprint: "synthetic", requestParameters: {}, idempotencyKey: randomUUID(), providerScope: "acct_synthetic:test:2025-02-24.acacia", replayUntil: new Date(Date.now() + 3600000), legacySessionIds: [] } });
  const admissionId = randomUUID();
  await control.platformCheckoutAdmission.create({ data: { id: admissionId, organisationId: org.id, activeOrganisationId: org.id, clerkUserId: actor, providerScope: "acct_synthetic:test:2025-02-24.acacia", termsHash: "f".repeat(64), terms: { synthetic: true }, expiresAt: new Date(Date.now() + 3600000), approvedBy: "synthetic-operator", approvalReference: "synthetic-approval" } });
  assert.equal(await runtime.platformCheckoutAdmission.count({ where: { id: admissionId } }), 1);
  assert.equal(await runtime.platformCheckoutAdmissionAudit.count({ where: { admissionId } }), 1);
  const bound = await runtime.$executeRaw`UPDATE platform_checkout_admissions SET attempt_id=${attempt.id} WHERE id=${admissionId}`;
  assert.equal(bound, 1);
  assert.equal(await runtime.platformCheckoutAdmissionAudit.count({ where: { admissionId } }), 2);
  const horizon = await runtime.$executeRaw`UPDATE platform_checkout_creation_gate SET last_admission_expires_at=clock_timestamp() WHERE id=1`;
  assert.equal(horizon, 1);
  await control.$executeRaw`UPDATE platform_checkout_creation_gate SET last_admission_expires_at=NULL WHERE id=1`;
  for (const statement of [
    `INSERT INTO platform_checkout_admissions (id, organisation_id, active_organisation_id, clerk_user_id, provider_scope, terms_hash, terms, expires_at, approved_by, approval_reference) VALUES ('${randomUUID()}', '${org.id}', '${org.id}', '${actor}', 'scope', '${"a".repeat(64)}', '{}', clock_timestamp() + interval '1 hour', 'operator', 'approval')`,
    `UPDATE platform_checkout_admissions SET terms_hash='${"b".repeat(64)}' WHERE id='${admissionId}'`,
    `UPDATE platform_checkout_admissions SET active_organisation_id=NULL, revoked_at=clock_timestamp(), revoked_by='forged', revocation_reference='forged' WHERE id='${admissionId}'`,
    `DELETE FROM platform_checkout_admissions WHERE id='${admissionId}'`,
    `SELECT nextval('platform_checkout_admission_audit_id_seq')`,
    `UPDATE platform_checkout_creation_gate SET blocked=false WHERE id=1`,
    `UPDATE platform_checkout_creation_gate SET subscription_webhooks_held=true WHERE id=1`,
    `UPDATE platform_checkout_creation_gate SET revision=99 WHERE id=1`,
    `INSERT INTO platform_checkout_admission_audit (admission_id, action, evidence) VALUES ('${admissionId}', 'forged', '{}')`,
    `UPDATE platform_checkout_admission_audit SET action='forged' WHERE admission_id='${admissionId}'`,
    `DELETE FROM platform_checkout_admission_audit WHERE admission_id='${admissionId}'`,
    `TRUNCATE platform_checkout_admission_audit`,
    `TRUNCATE platform_checkout_admissions`,
  ]) {
    await assert.rejects(runtime.$executeRawUnsafe(statement));
  }
  await assert.rejects(runtime.$queryRawUnsafe("SELECT * FROM _prisma_migrations"));
});

test("runtime cannot perform DDL, role changes or privilege changes", async () => {
  const [grantOption] = await runtime.$queryRaw`SELECT has_table_privilege(current_user,'organisations','SELECT WITH GRANT OPTION') AS table_grant, has_schema_privilege(current_user,'public','USAGE WITH GRANT OPTION') AS schema_grant, has_database_privilege(current_user,current_database(),'CONNECT WITH GRANT OPTION') AS database_grant`;
  assert.deepEqual(grantOption, { table_grant: false, schema_grant: false, database_grant: false });
  for (const statement of [
    "CREATE TABLE runtime_forbidden_table (id text)",
    "ALTER TABLE organisations ADD COLUMN runtime_forbidden_column text",
    "CREATE INDEX runtime_forbidden_index ON organisations(slug)",
    "DROP TABLE organisations",
    "SET ROLE checkout_test",
    "CREATE ROLE runtime_forbidden_role",
    "ALTER ROLE runtime_permissions SUPERUSER",
  ]) {
    let rejected = false;
    try {
      await runtime.$executeRawUnsafe(statement);
    } catch {
      rejected = true;
    }
    assert.equal(rejected, true, `runtime unexpectedly executed: ${statement}`);
  }
});


test("runtime cannot change PUBLIC privileges by GRANT", async () => {
  try {
    await runtime.$executeRawUnsafe("GRANT UPDATE ON organisations TO PUBLIC");
  } catch {}
  const [after] = await control.$queryRaw`SELECT has_table_privilege('public','organisations','UPDATE') AS public_update`;
  await control.$executeRaw`REVOKE UPDATE ON organisations FROM PUBLIC`;
  assert.equal(after.public_update, false);
});

test("grant preflight rejects owner, unknown, and inherited-privilege roles", async () => {
  for (const role of ["checkout_test", "unknown_runtime_role"]) {
    const result = psqlFile("scripts/sql/runtime-role-grants.sql", role);
    assert.notEqual(result.status, 0);
  }
  await control.$executeRaw`CREATE ROLE runtime_helper NOLOGIN NOINHERIT`;
  await control.$executeRaw`GRANT DELETE ON organisations TO runtime_helper`;
  await control.$executeRaw`GRANT runtime_helper TO runtime_permissions WITH INHERIT FALSE`;
  try {
    const result = psqlFile("scripts/sql/runtime-role-grants.sql", "runtime_permissions");
    assert.notEqual(result.status, 0);
    const verify = psqlFile("scripts/sql/runtime-role-verify.sql", "runtime_permissions");
    assert.notEqual(verify.status, 0);
  } finally {
    await control.$executeRaw`REVOKE runtime_helper FROM runtime_permissions`;
    await control.$executeRaw`REVOKE DELETE ON organisations FROM runtime_helper`;
    await control.$executeRaw`DROP ROLE runtime_helper`;
  }
});

test("verifier rejects missing or unexpected privileges and tables", async () => {
  await control.$executeRaw`REVOKE SELECT ON organisations FROM runtime_permissions`;
  try {
    const missing = psqlFile("scripts/sql/runtime-role-verify.sql", "runtime_permissions");
    assert.notEqual(missing.status, 0);
  } finally {
    await control.$executeRaw`GRANT SELECT ON organisations TO PUBLIC`;
  }
  await control.$executeRaw`GRANT TRUNCATE ON organisations TO runtime_permissions`;
  try {
    const extra = psqlFile("scripts/sql/runtime-role-verify.sql", "runtime_permissions");
    assert.notEqual(extra.status, 0);
  } finally {
    await control.$executeRaw`REVOKE TRUNCATE ON organisations FROM runtime_permissions`;
  }
  await control.$executeRaw`GRANT SELECT ON playing_with_neon TO runtime_permissions`;
  try {
    const excludedTable = psqlFile("scripts/sql/runtime-role-verify.sql", "runtime_permissions");
    assert.notEqual(excludedTable.status, 0);
  } finally {
    await control.$executeRaw`REVOKE SELECT ON playing_with_neon FROM runtime_permissions`;
  }
  await control.$executeRaw`GRANT USAGE ON SEQUENCE playing_with_neon_id_seq TO runtime_permissions`;
  try {
    const excludedSequence = psqlFile("scripts/sql/runtime-role-verify.sql", "runtime_permissions");
    assert.notEqual(excludedSequence.status, 0);
  } finally {
    await control.$executeRaw`REVOKE USAGE ON SEQUENCE playing_with_neon_id_seq FROM runtime_permissions`;
  }
  await control.$executeRaw`CREATE TABLE runtime_unexpected_table (id text)`;
  try {
    const unexpected = psqlFile("scripts/sql/runtime-role-verify.sql", "runtime_permissions");
    assert.notEqual(unexpected.status, 0);
  } finally {
    await control.$executeRaw`DROP TABLE runtime_unexpected_table`;
  }
  const final = psqlFile("scripts/sql/runtime-role-verify.sql", "runtime_permissions");
  assert.equal(final.status, 0, final.stderr);
});

// Each case commits a synthetic ACL change only in the owned local cluster;
// the verifier must reject it, and cleanup restores the original column ACL.
async function withUnexpectedColumnGrant({table,operation,columns,grantee="runtime_permissions",grantOption=false}, check) {
  assert.match(table,/^[a-z_]+$/); for(const column of columns)assert.match(column,/^[a-z_]+$/);
  const columnSql=columns.map(column=>`"${column}"`).join(",");
  const target=grantee==="PUBLIC"?"PUBLIC":'"runtime_permissions"';
  await control.$executeRawUnsafe(`GRANT ${operation}(${columnSql}) ON public."${table}" TO ${target}${grantOption?" WITH GRANT OPTION":""}`);
  try { await check(); }
  finally {await control.$executeRawUnsafe(`REVOKE ${operation}(${columnSql}) ON public."${table}" FROM ${target} CASCADE`);}
}

for(const grantee of ["runtime_permissions","PUBLIC"]) {
  for(const operation of ["SELECT","INSERT","UPDATE","REFERENCES"]) {
    test(`verifier rejects ${grantee} ${operation} on excluded ledger column`,async()=>{
      await withUnexpectedColumnGrant({table:"_prisma_migrations",operation,columns:["id"],grantee},async()=>{
        const result=psqlFile("scripts/sql/runtime-role-verify.sql","runtime_permissions");
        assert.notEqual(result.status,0);assert.match(result.stderr,/excluded column/);
      });
    });
  }
  for(const operation of ["INSERT","UPDATE","REFERENCES"]) {
    test(`verifier rejects ${grantee} ${operation} on audit column`,async()=>{
      await withUnexpectedColumnGrant({table:"platform_checkout_admission_audit",operation,columns:["evidence"],grantee},async()=>{
        const result=psqlFile("scripts/sql/runtime-role-verify.sql","runtime_permissions");
        assert.notEqual(result.status,0);assert.match(result.stderr,/unexpected column/);
      });
    });
  }
}

test("review counterexample: forged admission column INSERT is rejected before acceptance",async()=>{
  const columns=["id","organisation_id","active_organisation_id","clerk_user_id","provider_scope","terms_hash","terms","expires_at","approved_by","approval_reference"];
  await withUnexpectedColumnGrant({table:"platform_checkout_admissions",operation:"INSERT",columns},async()=>{
    const result=psqlFile("scripts/sql/runtime-role-verify.sql","runtime_permissions");
    assert.notEqual(result.status,0);assert.match(result.stderr,/unexpected column INSERT/);
    const identity=psqlFile("scripts/sql/runtime-identity-readonly.sql","runtime_permissions","runtime_permissions");
    assert.equal(identity.status,0,identity.stderr);
    const [authority]=await runtime.$queryRaw`SELECT has_table_privilege(current_user,'platform_checkout_admissions','INSERT') AS table_insert, has_any_column_privilege(current_user,'platform_checkout_admissions','INSERT') AS column_insert`;
    assert.deepEqual(authority,{table_insert:false,column_insert:true});
    // No admission is issued merely to test an unsafe role; acceptance stops first.
  });
  const org=await organisation("no-forged-admission");
  await assert.rejects(runtime.platformCheckoutAdmission.create({data:{id:randomUUID(),organisationId:org.id,clerkUserId:"synthetic",providerScope:"synthetic",termsHash:"a".repeat(64),terms:{},expiresAt:new Date(Date.now()+60000),approvedBy:"forged",approvalReference:"forged"}}));
});

test("review counterexample: PUBLIC INSERT cannot forge audit despite explicit ID",async()=>{
  await withUnexpectedColumnGrant({table:"platform_checkout_admission_audit",operation:"INSERT",columns:["id","admission_id","action","evidence"],grantee:"PUBLIC"},async()=>{
    const result=psqlFile("scripts/sql/runtime-role-verify.sql","runtime_permissions");
    assert.notEqual(result.status,0);assert.match(result.stderr,/unexpected column INSERT/);
  });
  await assert.rejects(runtime.$executeRaw`INSERT INTO platform_checkout_admission_audit(id,admission_id,action,evidence) VALUES (900000000,'synthetic','forged','{}')`);
});

for(const [table,operation,columns] of [
  ["organisations","SELECT",["id"]],
  ["ai_worker_provisioning_receipts","INSERT",["nonce"]],
  ["platform_checkout_admissions","UPDATE",["attempt_id"]],
  ["platform_checkout_creation_gate","UPDATE",["last_admission_expires_at"]],
]) test(`verifier rejects column grant option ${operation} on ${table}`,async()=>{
  await withUnexpectedColumnGrant({table,operation,columns,grantOption:true},async()=>{
    const result=psqlFile("scripts/sql/runtime-role-verify.sql","runtime_permissions");
    assert.notEqual(result.status,0);assert.match(result.stderr,/column grant option/);
  });
  // Restore the allowed base privilege removed with the grant option.
  const grants=psqlFile("scripts/sql/runtime-role-grants.sql","runtime_permissions");
  assert.equal(grants.status,0,grants.stderr);
});

for(const [column,value] of [["nonce","4".repeat(64)],["fingerprint","5".repeat(64)],["window_id","forged-window"],["operation","recover"],["created_at",new Date(0)]])
test(`review counterexample: provisioning identity ${column} cannot be rewritten`,async()=>{
  await assert.rejects(runtime.aiWorkerProvisioningReceipt.update({where:{nonce:"c".repeat(64)},data:{[column==="window_id"?"windowId":column==="created_at"?"createdAt":column]:value}}));
});

test("final exact-role verifier still passes after all negative cases",()=>{
  const result=psqlFile("scripts/sql/runtime-role-verify.sql","runtime_permissions");
  assert.equal(result.status,0,result.stderr);
});

for(const grantee of ["runtime_permissions","PUBLIC"]) for(const operation of ["SELECT","INSERT","UPDATE","REFERENCES"])
test(`verifier rejects ${grantee} ${operation} on excluded sample column`,async()=>{
  await withUnexpectedColumnGrant({table:"playing_with_neon",operation,columns:["id"],grantee},async()=>{
    const result=psqlFile("scripts/sql/runtime-role-verify.sql","runtime_permissions");
    assert.notEqual(result.status,0);assert.match(result.stderr,/excluded column/);
  });
});
for(const operation of ["SELECT","INSERT","UPDATE","REFERENCES"])
test(`verifier rejects excluded column ${operation} WITH GRANT OPTION`,async()=>{
  await withUnexpectedColumnGrant({table:"_prisma_migrations",operation,columns:["id"],grantOption:true},async()=>{
    assert.notEqual(psqlFile("scripts/sql/runtime-role-verify.sql","runtime_permissions").status,0);
  });
});
test("restored excluded column SELECT is denied and exact verifier passes",async()=>{
  await assert.rejects(runtime.$queryRaw`SELECT id FROM public._prisma_migrations`);
  await assert.rejects(runtime.$queryRaw`SELECT id FROM public.playing_with_neon`);
  const result=psqlFile("scripts/sql/runtime-role-verify.sql","runtime_permissions");assert.equal(result.status,0,result.stderr);
});
