import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { handleRemediate991Physical } from "../src/lib/remediate-991-physical.ts";
import { reviewedRemediationStatements, REMEDIATION_SHA256, CANONICAL_SHA256 } from "../src/lib/remediate-991-sql.ts";
import { PHYSICAL_991_OPERATION as operation, PHYSICAL_991_PATH as routePath,
  PHYSICAL_991_ORIGIN as origin, refusePhysical991, auditPhysical991, physical991AuthResponse } from "../src/lib/remediate-991-request.ts";

// Reject arbitrary inherited URLs before constructing any database client.
const local = new URL(process.env.DATABASE_URL);
assert.equal(local.hostname, "127.0.0.1");
assert.equal(local.pathname, "/dg_991_physical_test");
assert.notEqual(local.port, "5432");
assert.match(process.env.DG_PHYSICAL_TEST_MARKER, /^[a-f0-9-]{36}$/);
const prisma = new PrismaClient({ log: [], errorFormat: "minimal" });
const control = new PrismaClient({ log: [], errorFormat: "minimal" });
const artifact = readFileSync("scripts/sql/remediate-991-checks.sql", "utf8");
const migrationPath = "packages/database/prisma/migrations/20261007_ai_worker_provisioning_boundary/migration.sql";
const canonical = readFileSync(migrationPath, "utf8");
const observed = JSON.parse(readFileSync("scripts/sql/991-observed-constraints.json", "utf8"));
const catalogueQuery = readFileSync("scripts/sql/991-physical-catalogue.sql", "utf8").trim().replace(/;$/, "");
const { body, settings } = reviewedRemediationStatements();
let secret, events;
const hash = value => createHash("sha256").update(value).digest("hex");
const headers = () => ({ Origin: origin, "X-DG-Operation": operation, "X-DG-Remediate-991-Physical-Secret": secret });
const request = (extra = {}) => new Request(origin + routePath, { method: "POST", headers: headers(), ...extra });
const invoke = (req = request(), userId = "user_operator", db = prisma, audit = event => events.push(event)) =>
  handleRemediate991Physical(req, { userId: async () => userId, database: () => db, audit });
const catalogue = async () => (await prisma.$queryRawUnsafe(catalogueQuery))[0];
const full = async () => (await prisma.$queryRawUnsafe(`SELECT jsonb_build_object(
  'classes',(SELECT jsonb_agg(to_jsonb(c) ORDER BY oid) FROM pg_class c WHERE relnamespace IN ('public'::regnamespace,'unrelated'::regnamespace)),
  'attributes',(SELECT jsonb_agg(to_jsonb(a) ORDER BY attrelid,attnum) FROM pg_attribute a WHERE attrelid IN (SELECT oid FROM pg_class WHERE relnamespace IN ('public'::regnamespace,'unrelated'::regnamespace))),
  'constraints',(SELECT jsonb_agg(to_jsonb(c) ORDER BY oid) FROM pg_constraint c WHERE connamespace IN ('public'::regnamespace,'unrelated'::regnamespace)),
  'indexes',(SELECT jsonb_agg(to_jsonb(i) ORDER BY indexrelid) FROM pg_index i WHERE indrelid IN (SELECT oid FROM pg_class WHERE relnamespace IN ('public'::regnamespace,'unrelated'::regnamespace))),
  'rules',(SELECT jsonb_agg(to_jsonb(r) ORDER BY oid) FROM pg_rewrite r WHERE ev_class IN (SELECT oid FROM pg_class WHERE relnamespace IN ('public'::regnamespace,'unrelated'::regnamespace))),
  'history',(SELECT jsonb_agg(to_jsonb(m) ORDER BY id) FROM public._prisma_migrations m),
  'receipts',(SELECT jsonb_agg(to_jsonb(r) ORDER BY nonce) FROM public.ai_worker_provisioning_receipts r),
  'unrelated',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM unrelated.sentinel s)) AS snapshot`))[0].snapshot;
function withoutReplaced(snapshot) {
  const excluded = new Set(["nonce", "fingerprint", "window_id", "outcome"].map(c => `ai_worker_provisioning_receipts_${c}_check`));
  const receipt = snapshot.classes.find(c => c.relname === 'ai_worker_provisioning_receipts').oid;
  const window = snapshot.classes.find(c => c.relname === 'ai_worker_provisioning_window_idx').oid;
  const storage = new Set(['relfilenode','relpages','reltuples','relallvisible','relallfrozen','relfrozenxid','relminmxid','reltoastrelid']);
  return { ...snapshot,
    classes: snapshot.classes.map(c => Object.fromEntries(Object.entries(c).filter(([k]) => !storage.has(k) && !(c.relname==='ai_worker_provisioning_window_idx' && k==='oid')))).sort((a,b)=>a.relname.localeCompare(b.relname)),
    attributes: snapshot.attributes.filter(a => a.attrelid!==window && !(a.attrelid===receipt && ['created_at','completed_at'].includes(a.attname))),
    indexes: snapshot.indexes.filter(i=>i.indexrelid!==window),
    constraints: snapshot.constraints.filter(c => !excluded.has(c.conname)).map(c => c.conname==='ai_worker_provisioning_receipts_created_at_not_null' ? Object.fromEntries(Object.entries(c).filter(([k])=>k!=='oid')) : c).sort((a,b)=>a.conname.localeCompare(b.conname)),
  };
}
async function refused(response) {
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Location"), null);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(response.headers.get("X-DG-Request-ID"), /^[a-f0-9-]{36}$/);
  assert.deepEqual(await response.json(), { ok: false, operation });
}
async function unchangedRefusal(db = prisma) {
  const initial = await full();
  await refused(await invoke(request(), "user_operator", db));
  assert.deepEqual(await full(), initial);
}
function wrappedDatabase(execute) {
  return { $transaction: (fn, options) => prisma.$transaction(tx => fn(new Proxy(tx, {
    get(target, key) {
      if (key === "$executeRawUnsafe") return sql => execute(sql, target);
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  })), options) };
}
before(async () => {
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS db, host(inet_server_addr()) AS host,
    current_setting('dg.physical_test_cluster',true) AS marker,current_setting('server_version_num') AS version`;
  assert.equal(identity.db, "dg_991_physical_test"); assert.equal(identity.host, "127.0.0.1");
  assert.equal(identity.marker, process.env.DG_PHYSICAL_TEST_MARKER);
  assert.ok(+identity.version >= 180000 && +identity.version < 190000);
  assert.equal(hash(artifact), REMEDIATION_SHA256); assert.equal(hash(canonical), CANONICAL_SHA256);
});
beforeEach(async () => {
  process.env.NODE_ENV = "production"; process.env.VERCEL_ENV = "production";
  process.env.DG_REMEDIATE_991_PHYSICAL_OPERATION = operation;
  process.env.DG_COMMAND_CENTRE_ORG_IDS = "operator_org";
  delete process.env.AI_WORKER_PROVISIONING_ENABLED;
  delete process.env.DG_RECONCILE_991_OPERATION; delete process.env.DG_RECONCILE_991_SECRET_SHA256;
  secret = randomBytes(32).toString("hex"); events = [];
  process.env.DG_REMEDIATE_991_PHYSICAL_SECRET_SHA256 = hash(secret);
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS public.receipt_child CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS public.ai_worker_provisioning_receipts CASCADE');
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS public.ai_worker_pinned_name_unique');
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS unrelated CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE public._prisma_migrations, public.memberships, public.ai_worker_principals, public.ai_local_deployments, public.ai_local_recipient_approvals, public.ai_inference_jobs, public.ai_worker_claim_receipts, public.ai_accounting_outbox');
  for (const sql of canonical.replace(/^--.*$/gm, "").split(";").map(s => s.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(sql);
  for (const c of observed.filter(c => c.definition.startsWith("CHECK"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ${c.name}, ADD CONSTRAINT ${c.name} ${c.definition}`);
  }
  await prisma.$executeRawUnsafe("ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN created_at TYPE timestamp(3) USING (created_at AT TIME ZONE 'UTC'), ALTER COLUMN completed_at TYPE timestamp(3) USING (completed_at AT TIME ZONE 'UTC')");
  await prisma.$executeRaw`INSERT INTO public.memberships VALUES ('member1','operator_org','user_operator','owner','active')`;
  await prisma.$executeRaw`INSERT INTO public._prisma_migrations (id,checksum,migration_name,started_at,finished_at,logs,applied_steps_count)
    VALUES ('history1','unchanged','existing','2026-10-07 01:27:01.271473+00','2026-10-07 01:27:01.271474+00','untouched',7)`;
  await prisma.$executeRawUnsafe('CREATE SCHEMA unrelated');
  await prisma.$executeRawUnsafe('CREATE TABLE unrelated.sentinel(id int PRIMARY KEY, payload jsonb, stamp timestamptz)');
  await prisma.$executeRawUnsafe('CREATE INDEX sentinel_payload ON unrelated.sentinel USING gin(payload)');
  await prisma.$executeRawUnsafe('CREATE VIEW unrelated.sentinel_view AS SELECT * FROM unrelated.sentinel');
  await prisma.$executeRaw`INSERT INTO unrelated.sentinel VALUES (1,'{"unchanged":true}','2026-10-07 01:27:01.271473+00')`;
});
after(async () => { await Promise.all([prisma.$disconnect(), control.$disconnect()]); });

test("exact artifact mechanically bound; all rehearsed settings/DO retained", () => {
  assert.equal(body, artifact.slice(artifact.indexOf('DO $remediation$'), artifact.lastIndexOf('\nCOMMIT;')));
  assert.equal(settings.length, 5);
  for (const setting of settings) assert.ok(artifact.includes(setting));
  assert.equal((body.match(/ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT/g) ?? []).length, 4);
  assert.equal(spawnSync(process.execPath, ['scripts/generate-remediate-991-sql.mjs','--check'], { encoding: 'utf8' }).status, 0);
});

test("variant converges exactly; six deltas only; operation/PK/index/table/rows/history/unrelated unchanged; replay refuses", async () => {
  const start = await full();
  const original = await prisma.$queryRaw`SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass AND contype<>'n' ORDER BY conname`;
  assert.deepEqual(original, observed.map(({name,definition}) => ({name,definition})).sort((a,b) => a.name.localeCompare(b.name)));
  const result = await invoke();
  assert.equal(result.status, 200); assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.equal(result.headers.get('Location'), null);
  assert.deepEqual(await result.json(), {ok:true,operation});
  const end = await full();
  assert.deepEqual(withoutReplaced(end), withoutReplaced(start));
  const changed = start.constraints.filter(c => !end.constraints.some(e => e.oid === c.oid)).map(c=>c.conname).sort();
  assert.deepEqual(changed, [...['fingerprint','nonce','outcome','window_id'].map(c=>`ai_worker_provisioning_receipts_${c}_check`),'ai_worker_provisioning_receipts_created_at_not_null'].sort());
  assert.deepEqual(await catalogue(), JSON.parse(readFileSync('docs/ai/991-rehearsal-results.json','utf8')).finalCatalogue);
  const [shape]=await prisma.$queryRawUnsafe(readFileSync('scripts/sql/991-receipt-shape.sql','utf8'));
  assert.deepEqual(shape.shape,JSON.parse(readFileSync('docs/ai/991-six-delta-rehearsal-results.json','utf8')).canonicalFullShape);
  assert.deepEqual(events.map(e => e.outcome), ['attempt','success']);
  assert.equal(events[0].actor, 'user_operator'); assert.equal(events[0].requestId,events[1].requestId);
  await unchangedRefusal();
});

for (const [field,value] of [['nonce','x'.repeat(16)],['fingerprint','Z'.repeat(64)],['window_id','x'],['outcome','verified'],['outcome','rejected']]) {
  test(`incompatible ${field}/${value.slice(0,8)} refuses before DDL and preserves exact state`, async () => {
    await prisma.$executeRaw`INSERT INTO public.ai_worker_provisioning_receipts (nonce,fingerprint,window_id,operation,outcome)
      VALUES(repeat('a',64),repeat('b',64),repeat('c',32),'provision','succeeded')`;
    await prisma.$executeRawUnsafe(`UPDATE public.ai_worker_provisioning_receipts SET ${field}='${value}' WHERE nonce=repeat('a',64)`);
    await unchangedRefusal();
  });
}
for (const [name,ddl] of [
  ['timestamp type',"ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN completed_at TYPE timestamptz USING (completed_at AT TIME ZONE 'UTC')"],
  ['timestamp precision','ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN created_at TYPE timestamp(6)'],
  ['nullability','ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN completed_at SET NOT NULL'],
  ['extra column','ALTER TABLE public.ai_worker_provisioning_receipts ADD COLUMN unexpected text'],
  ['extra index','CREATE INDEX unexpected ON public.ai_worker_provisioning_receipts(outcome)'],
  ['operation','ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_operation_check; ALTER TABLE public.ai_worker_provisioning_receipts ADD CONSTRAINT ai_worker_provisioning_receipts_operation_check CHECK(operation=\'provision\')'],
  ['rule','CREATE RULE unexpected AS ON INSERT TO public.ai_worker_provisioning_receipts DO ALSO NOTIFY synthetic'],
  ['inheritance','CREATE TABLE public.receipt_child () INHERITS(public.ai_worker_provisioning_receipts)'],
  ['forced RLS','ALTER TABLE public.ai_worker_provisioning_receipts FORCE ROW LEVEL SECURITY'],
  ['policy','CREATE POLICY unexpected ON public.ai_worker_provisioning_receipts USING (true)'],
  ['text collation','ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN fingerprint TYPE text COLLATE \"C\"'],
  ['PK','ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_pkey'],
  ['name','ALTER TABLE public.ai_worker_provisioning_receipts RENAME CONSTRAINT ai_worker_provisioning_receipts_nonce_check TO wrong'],
  ['definition','ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_nonce_check; ALTER TABLE public.ai_worker_provisioning_receipts ADD CONSTRAINT ai_worker_provisioning_receipts_nonce_check CHECK(length(nonce)>10)'],
  ['index','DROP INDEX public.ai_worker_provisioning_window_idx; CREATE INDEX ai_worker_provisioning_window_idx ON public.ai_worker_provisioning_receipts(created_at,window_id)'],
  ['default','ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN created_at SET DEFAULT now()'],
  ['RLS','ALTER TABLE public.ai_worker_provisioning_receipts ENABLE ROW LEVEL SECURITY'],
  ['validation','ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_nonce_check; ALTER TABLE public.ai_worker_provisioning_receipts ADD CONSTRAINT ai_worker_provisioning_receipts_nonce_check CHECK(length(nonce)>=16 AND length(nonce)<=128) NOT VALID'],
  ['extra constraint','ALTER TABLE public.ai_worker_provisioning_receipts ADD CONSTRAINT unexpected CHECK(length(nonce)>0)'],
]) test(`catalogue drift ${name} refuses and preserves exact state`, async () => {
  for (const sql of ddl.split(';')) await prisma.$executeRawUnsafe(sql);
  await unchangedRefusal();
});

test('nonempty compatible receipts refuse; no timestamp value converted', async()=>{
  await prisma.$executeRaw`INSERT INTO public.ai_worker_provisioning_receipts (nonce,fingerprint,window_id,operation,outcome)
    VALUES(repeat('a',64),repeat('b',64),repeat('c',32),'provision','succeeded')`;
  await unchangedRefusal();
});
for(const table of ['ai_worker_principals','ai_local_deployments','ai_local_recipient_approvals','ai_inference_jobs','ai_worker_claim_receipts','ai_accounting_outbox']) {
  test(`nonzero safety state ${table} refuses`,async()=>{
    await prisma.$executeRawUnsafe(`INSERT INTO public.${table} VALUES ('unexpected'${table==='ai_worker_principals'?",'unexpected'":''})`);
    await unchangedRefusal();
  });
}
for(const name of ['20261007_ai_worker_provisioning_boundary','20260901_stripe_connect_tenant_trust','20260904_business_brain_knowledge','20260910_aida_public_conversations','20260913_ai_visibility_intelligence']) {
  test(`unexpected history ${name} refuses`,async()=>{
    await prisma.$executeRaw`INSERT INTO public._prisma_migrations(id,checksum,migration_name,finished_at) VALUES('unexpected','checksum',${name},now())`;
    await unchangedRefusal();
  });
}
test('unfinished history refuses',async()=>{
  await prisma.$executeRaw`UPDATE public._prisma_migrations SET finished_at=NULL`;
  await unchangedRefusal();
});
test('timezone-independent precision six final catalogue',async()=>{
  const db=wrappedDatabase(async(sql,tx)=>{
    if(sql===body) await tx.$executeRawUnsafe("SET LOCAL timezone='Australia/Brisbane'");
    return tx.$executeRawUnsafe(sql);
  });
  assert.equal((await invoke(request(),'user_operator',db)).status,200);
  const columns=await prisma.$queryRaw`SELECT data_type,datetime_precision FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_worker_provisioning_receipts' AND column_name IN ('created_at','completed_at')`;
  assert.deepEqual(columns,[{data_type:'timestamp with time zone',datetime_precision:6},{data_type:'timestamp with time zone',datetime_precision:6}]);
});
for (const [key,value] of [['DG_REMEDIATE_991_PHYSICAL_OPERATION',undefined],['DG_REMEDIATE_991_PHYSICAL_OPERATION','reconcile_991'],
  ['NODE_ENV','development'],['VERCEL_ENV','preview'],['VERCEL_ENV',undefined],['AI_WORKER_PROVISIONING_ENABLED','true']]) {
  test(`activation refuses ${key}=${value} before auth/database`, async () => {
    if (value===undefined) delete process.env[key]; else process.env[key]=value;
    await refused(await handleRemediate991Physical(request(), {
      userId:()=>assert.fail('auth accessed'), database:()=>assert.fail('database accessed'), audit:e=>events.push(e),
    }));
  });
}
for (const id of [null,'api_key:operator','user_other']) test(`insufficient identity ${id}`, async () => {
  const start=await full(); await refused(await invoke(request(),id)); assert.deepEqual(await full(),start);
});
for (const [role,status,org] of [['admin','active','operator_org'],['owner','inactive','operator_org'],['owner','active','tenant']]) {
  test(`insufficient authority ${role}/${status}/${org}`, async()=>{
    await prisma.$executeRaw`UPDATE public.memberships SET role=${role},status=${status},organisation_id=${org}`;
    await unchangedRefusal();
  });
}
test('existing staff authority accepted without #993 enablement or session provisioning',async()=>{
  await prisma.$executeRaw`UPDATE public.memberships SET role='dg:staff',organisation_id='staff_org'`;
  assert.equal((await invoke()).status,200);assert.equal(await prisma.membership.count(),1);
});
for (const [name,extra] of [
  ['wrong secret',()=>({headers:{...headers(),'X-DG-Remediate-991-Physical-Secret':'b'.repeat(64)}})],
  ['malformed secret',()=>({headers:{...headers(),'X-DG-Remediate-991-Physical-Secret':'not-a-secret'}})],
  ['missing secret',()=>({headers:{Origin:origin,'X-DG-Operation':operation}})],
  ['wrong operation',()=>({headers:{...headers(),'X-DG-Operation':'reconcile_991'}})],
  ['wrong origin',()=>({headers:{...headers(),Origin:'https://evil.example'}})],
  ['API key',()=>({headers:{...headers(),'X-API-Key':'not-human'}})],
  ['body',()=>({body:'{}'})], ['empty stream body',()=>({body:''})],
]) test(`request ${name} refuses before auth/database`,async()=>{
  await refused(await handleRemediate991Physical(request(extra()), {userId:()=>assert.fail('auth accessed'),database:()=>assert.fail('database accessed'),audit:e=>events.push(e)}));
});
for (const url of [origin+routePath+'?x=1',origin+routePath+'?',origin+routePath+'/',origin+'/api/admin/reconcile-991','https://preview.example'+routePath]) {
  test(`wrong URL ${url} refuses`,async()=>{
    await refused(await invoke(new Request(url,{method:'POST',headers:headers()}),'user_operator',{$transaction:()=>assert.fail('database accessed')}));
  });
}
for (const method of ['GET','HEAD','OPTIONS','PUT','PATCH','DELETE','TRACE']) test(`unsupported ${method} fixed refusal`,async()=>{
  if(method==='TRACE') {
    // Fetch disallows constructing TRACE; middleware checks the same envelope.
    const fake={method:'TRACE',url:origin+routePath,body:null,headers:new Headers(headers())};
    await refused(await invoke(fake,'user_operator',{$transaction:()=>assert.fail('database accessed')}));
  } else await refused(await invoke(request({method}),'user_operator',{$transaction:()=>assert.fail('database accessed')}));
});
for(const value of ['', 'not-a-hash','A'.repeat(64)]) test(`bad configured secret hash ${value.slice(0,8)} refuses`,async()=>{
  process.env.DG_REMEDIATE_991_PHYSICAL_SECRET_SHA256=value;await unchangedRefusal();
});

test('concurrent invocation fails try-lock; exactly one succeeds; replay refuses',async()=>{
  let reached,release;
  const atBody=new Promise(resolve=>{reached=resolve;});const gate=new Promise(resolve=>{release=resolve;});
  const db=wrappedDatabase(async(sql,tx)=>{if(sql===body){reached();await gate;}return tx.$executeRawUnsafe(sql);});
  const first=invoke(request(),'user_operator',db);
  try{await atBody;await refused(await invoke());}finally{release();}
  assert.equal((await first).status,200);await unchangedRefusal();
});
test('bounded receipt lock contention refuses and preserves original state',async()=>{
  const start=await full();let elapsed;
  await control.$transaction(async tx=>{
    await tx.$executeRaw`LOCK TABLE public.ai_worker_provisioning_receipts IN ROW EXCLUSIVE MODE`;
    const time=performance.now();await refused(await invoke());elapsed=performance.now()-time;
  },{timeout:10000});
  assert.ok(elapsed>=1500 && elapsed<5000);assert.deepEqual(await full(),start);
});
test('forced failure after first DDL rolls back exact original state',async()=>{
  const end=body.indexOf(';',body.indexOf('  ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT'))+1;
  const forced=body.slice(0,end)+"\n RAISE EXCEPTION 'synthetic failure after first DDL';\n"+body.slice(end);
  await unchangedRefusal(wrappedDatabase((sql,tx)=>tx.$executeRawUnsafe(sql===body?forced:sql)));
});
test('forced final postcondition failure rolls back all six changes',async()=>{
  const tail=body.lastIndexOf("RAISE EXCEPTION 'Catalogue does not match expected variant'");
  const pos=body.lastIndexOf('IF catalog.safe',tail);
  const forced=body.slice(0,pos)+body.slice(pos).replace('IF catalog.safe IS DISTINCT FROM true','IF true OR catalog.safe IS DISTINCT FROM true');
  await unchangedRefusal(wrappedDatabase((sql,tx)=>tx.$executeRawUnsafe(sql===body?forced:sql)));
});
test('kill switch changed after DDL rolls back before commit',async()=>{
  await unchangedRefusal(wrappedDatabase(async(sql,tx)=>{
    const value=await tx.$executeRawUnsafe(sql);if(sql===body)delete process.env.DG_REMEDIATE_991_PHYSICAL_OPERATION;return value;
  }));
});
test('authority revoked before membership lock is rechecked',async()=>{
  let changed=false;
  const db={$transaction:(fn,opts)=>prisma.$transaction(tx=>fn(new Proxy(tx,{get(target,key){
    if(key==='$queryRaw')return async(...args)=>{const value=await target.$queryRaw(...args);
      if(!changed && String(args[0]).includes('pg_try_advisory')){changed=true;await control.$executeRaw`UPDATE public.memberships SET status='inactive'`;}
      return value;};
    const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }})),opts)};
  await unchangedRefusal(db);
});
test('safe responses/audit never leak secret, SQL, credentials or driver errors',async()=>{
  const sentinel='postgresql://synthetic_secret@never-connect.invalid/leak';
  await refused(await invoke(request(),'user_operator',{$transaction:()=>{throw new Error(sentinel+secret+body);}}));
  const output=JSON.stringify(events);
  for(const forbidden of [secret,sentinel,body,'DATABASE_URL','SELECT','CHECK'])assert.ok(!output.includes(forbidden));
  assert.deepEqual(events.map(e=>e.outcome),['attempt','refused']);
  for(const event of events){assert.deepEqual(Object.keys(event).sort(),['actor','operation','outcome','requestId','timestamp']);assert.ok(!Number.isNaN(Date.parse(event.timestamp)));}
  const logs=[];const saved=console.info;
  try{console.info=value=>logs.push(value);auditPhysical991(events[1]);await refused(refusePhysical991());}finally{console.info=saved;}
  assert.ok(!JSON.stringify(logs).includes(secret));
});
test('audit transport failure cannot turn committed success into refusal',async()=>{
  assert.equal((await invoke(request(),'user_operator',prisma,()=>{throw new Error('synthetic logger failure');})).status,200);
});

for(const [name,target] of [['remediation','scripts/sql/remediate-991-checks.sql'],['canonical',migrationPath],['generated','src/lib/remediate-991-sql-generated.ts']]) {
  test(`wrong ${name} artifact fails build/test binding`,()=>{
    const temp=mkdtempSync(path.join(tmpdir(),'dg991-binding-'));
    try{
      for(const rel of ['scripts/generate-remediate-991-sql.mjs','scripts/sql/remediate-991-checks.sql',migrationPath,'src/lib/remediate-991-sql-generated.ts']){
        const dest=path.join(temp,rel);mkdirSync(path.dirname(dest),{recursive:true});copyFileSync(rel,dest);
      }
      writeFileSync(path.join(temp,target),readFileSync(path.join(temp,target),'utf8')+'\n-- synthetic drift\n');
      const r=spawnSync(process.execPath,[path.join(temp,'scripts/generate-remediate-991-sql.mjs'),'--check'],{encoding:'utf8',env:{PATH:process.env.PATH}});
      assert.notEqual(r.status,0);
    }finally{rmSync(temp,{recursive:true,force:true});}
  });
}
test('server-only route uses Clerk session, separate authority, fixed unsupported verbs and no global connector/redirect/credential access',()=>{
  const route=readFileSync('src/app/api/admin/remediate-991-physical/route.ts','utf8');
  const core=readFileSync('src/lib/remediate-991-physical.ts','utf8');
  const middleware=readFileSync('src/middleware.ts','utf8');
  assert.match(route,/import "server-only"/);assert.match(core,/import "server-only"/);
  assert.match(route,/auth\(\{ acceptsToken: "session_token" \}\)/);
  assert.doesNotMatch(route+core,/process\.env\.(DATABASE_URL|DIRECT_URL)|@dg\/database|resolveActivePlatformSession|requirePlatformAuth|Response\.redirect|reconcile_991|captureException/);
  for(const verb of ['GET','HEAD','OPTIONS','PUT','PATCH','DELETE'])assert.ok(route.includes(`export const ${verb} = refusePhysical991`));
  assert.match(middleware,/if \(path === PHYSICAL_991_PATH\) \{\s*if \(!physical991Envelope\(req\)\) return refusePhysical991\(\)/);
  assert.match(middleware,/if \(req\.nextUrl\.pathname === PHYSICAL_991_PATH\) return;/);
});

test('Clerk handshake redirects/errors/rewrites become fixed safe middleware refusals', async()=>{
  const logs=[];const saved=console.info;
  try {
    console.info=value=>logs.push(value);
    for(const response of [Response.redirect('https://invalid.example',307),new Response(null,{status:401}),
      new Response(null,{headers:{'X-Middleware-Rewrite':'https://invalid.example'}}),new Response(null,{headers:{'X-Nextjs-Redirect':'/login'}})]) {
      await refused(physical991AuthResponse(response));
    }
    const next=new Response(null,{headers:{'X-Middleware-Next':'1'}});
    assert.equal(physical991AuthResponse(next),next);assert.equal(physical991AuthResponse(undefined),undefined);
    assert.equal(logs.length,4);
  } finally {console.info=saved;}
});
