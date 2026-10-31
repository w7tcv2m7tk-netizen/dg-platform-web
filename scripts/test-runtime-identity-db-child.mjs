import assert from 'node:assert/strict';
import { createRuntimeIdentityDiagnostic } from '../src/lib/runtime-identity.ts';
const port=process.env.DG_IDENTITY_OWNED_PORT;
if(!/^\d+$/.test(port??'') || Number(port)===5432) throw Error('Owned local port required');
// Fixed loopback address, synthetic user, owned database. No remote input.
const startupOnly=process.env.DG_IDENTITY_STARTUP_ONLY==='missing_database';
process.env.DATABASE_URL=`postgresql://synthetic@127.0.0.1:${port}/${startupOnly?'dg_synthetic_missing_database':'dg_synthetic_identity'}?connection_limit=2&pool_timeout=1&connect_timeout=2`;
process.env.DG_COMMAND_CENTRE_ORG_IDS='operator';
console.log('STAGE shared-client import');
const { prisma } = await import('../packages/database/src/index.ts');
const { PrismaClient } = await import('@prisma/client');
const admin=new PrismaClient({log:[]});
console.log('STAGE local database probes');
let count=0; const pass=name=>console.log(`PASS ${++count}: ${name}`);
const deps={userId:async()=> 'synthetic',database:()=>prisma,revision:'a'.repeat(40)};
if (startupOnly) {
 const logged=[];const original=console.error;console.error=(...args)=>logged.push(args);
 try {
  assert.deepEqual(await createRuntimeIdentityDiagnostic()(deps),{status:'unavailable'});
  assert.ok(logged.some(args=>args[0]?.category==='database_missing'));
  assert.doesNotMatch(JSON.stringify(logged),/postgresql|127\.0\.0\.1|synthetic|message|stack|params/);
  pass('cold transaction startup failure classified and sanitised');
 } finally {console.error=original; await admin.$disconnect();await prisma.$disconnect();}
} else try {
 await prisma.$executeRawUnsafe('CREATE TABLE memberships (id text PRIMARY KEY, organisation_id text, clerk_user_id text, role text, status text)');
 await prisma.$executeRawUnsafe("INSERT INTO memberships VALUES ('fixture','operator','synthetic','owner','active')");
 const direct = await prisma.membership.findMany({where:{clerkUserId:'synthetic',status:'active'},select:{organisationId:true,role:true},take:100}); assert.equal(direct.length,1);
 assert.equal((await createRuntimeIdentityDiagnostic()(deps)).status,'ok'); pass('shared checkout client identity and authority');
 await assert.rejects(prisma.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;await tx.$executeRawUnsafe("INSERT INTO memberships VALUES ('rejected','forbidden','synthetic','owner','active')");}));
 assert.equal(Number((await prisma.$queryRaw`SELECT count(*) AS n FROM memberships`)[0].n),1); pass('real PostgreSQL read-only rejects writes');
 await assert.rejects(prisma.$transaction(async tx=>{await tx.$executeRaw`SET LOCAL statement_timeout = '100ms'`;await tx.$queryRaw`SELECT pg_sleep(2)`;}));
 assert.equal((await createRuntimeIdentityDiagnostic()(deps)).status,'ok');pass('statement cancellation rolls back and pool recovers');
 let release,ready; const readyP=new Promise(r=>ready=r);const wait=new Promise(r=>release=r);
 const lock=admin.$transaction(async tx=>{await tx.$executeRaw`LOCK TABLE memberships IN ACCESS EXCLUSIVE MODE`;ready();await wait;},{timeout:10000});await readyP;
 assert.deepEqual(await createRuntimeIdentityDiagnostic()(deps),{status:'unavailable'});release();await lock;
 assert.equal((await createRuntimeIdentityDiagnostic()(deps)).status,'ok');pass('lock timeout fails closed and releases transaction');
 let free;const hold=new Promise(r=>free=r); let acquired=0, both;const bothP=new Promise(r=>both=r);
 const holders=[1,2].map(()=>prisma.$transaction(async()=>{if(++acquired===2)both();await hold;},{timeout:10000}));await bothP;
 assert.deepEqual(await createRuntimeIdentityDiagnostic()(deps),{status:'unavailable'});free();await Promise.all(holders);
 assert.equal((await createRuntimeIdentityDiagnostic()(deps)).status,'ok');pass('shared pool exhaustion bounded, recovery verified');
 await prisma.$executeRaw`DROP TABLE memberships`;
 const logged=[]; const previous=console.error; console.error=(...args)=>logged.push(args);
 try { const [result]=await Promise.all([createRuntimeIdentityDiagnostic()(deps),prisma.membership.findMany().catch(()=>undefined)]); assert.deepEqual(result,{status:'unavailable'}); } finally { console.error=previous; }
 assert.ok(logged.length>0); assert.ok(logged.every(args=>args.length===1 && args[0]?.event==='database_failure' && ['engine_unattributed','operation'].includes(args[0].source)));
 assert.ok(logged.filter(args=>args[0].category==='schema_missing').length>=2);
 assert.equal(new Set(logged.map(args=>args[0].eventId)).size,logged.length);
 assert.ok(logged.every(args=>!('requestId' in args[0]) && !('transactionId' in args[0])));
 assert.doesNotMatch(JSON.stringify(logged),/SELECT|postgresql|127\.0\.0\.1|synthetic|memberships|message|stack|params/);
 pass('database schema fault classified and redacted in actual Prisma logs');
} catch (error) { console.log('Failure class', error?.constructor?.name, 'code', /^[A-Z0-9]+$/.test(error?.code ?? '') ? error.code : 'unavailable'); process.exitCode=1; } finally { await admin.$disconnect(); await prisma.$disconnect(); }
