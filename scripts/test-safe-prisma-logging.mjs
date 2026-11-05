import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { classifyDatabaseFailure, createSafeDatabaseLogger } from '../packages/database/src/safe-logging.ts';
const secret = 'postgresql://private_user:secret_password@private-host.invalid:5432/neondb?token=private_token SELECT private_column certificate_private';
const known = code => new Prisma.PrismaClientKnownRequestError(secret, {code,clientVersion:'6.19.3',meta:{sql:secret}});
for (const [code,category] of Object.entries({P1000:'authentication',P1001:'connection_unavailable',P1002:'connection_timeout',P1003:'database_missing',P1008:'operation_timeout',P1010:'access_denied',P1011:'tls',P1017:'connection_closed',P2002:'unique_constraint',P2003:'foreign_key',P2010:'raw_query_failure',P2021:'schema_missing',P2022:'schema_missing',P2024:'pool_timeout',P2025:'record_missing',P2028:'transaction_failure',P2034:'transaction_conflict'})) test(`allowlisted ${code}`,()=>assert.equal(classifyDatabaseFailure(known(code)),category));
test('initialization, validation and engine panic public classes',()=>{
 assert.equal(classifyDatabaseFailure(new Prisma.PrismaClientInitializationError(secret,'6.19.3','P1001')),'connection_unavailable');
 assert.equal(classifyDatabaseFailure(new Prisma.PrismaClientValidationError(secret,{clientVersion:'6.19.3'})),'validation');
 assert.equal(classifyDatabaseFailure(new Prisma.PrismaClientRustPanicError(secret,'6.19.3')),'engine_failure');
});
test('unsupported, spoofed, malicious getters and malformed errors remain unknown',()=>{
 for(const e of [null,undefined,secret,42,new Error(secret),{code:'P1000'},known('P9999'),new Proxy({}, {getPrototypeOf(){throw Error(secret);}})]) assert.equal(classifyDatabaseFailure(e),'unknown');
 const e=known('P1001');Object.defineProperty(e,'code',{get(){throw Error(secret);}});assert.equal(classifyDatabaseFailure(e),'unknown');
});
test('native payloads ignored, warning severity restored, exact output keys and no raw leakage',()=>{
 const events=[];const log=createSafeDatabaseLogger(e=>events.push(e));
 log.engineWarning({message:secret,target:secret,timestamp:secret});log.engineError({message:secret});log.operationFailure(known('P2002'));
 assert.deepEqual(events.map(e=>[e.severity,e.source,e.category]),[['warn','engine_unattributed','unknown'],['error','engine_unattributed','unknown'],['error','operation','unique_constraint']]);
 for(const e of events){assert.deepEqual(Object.keys(e).sort(),['category','event','eventId','severity','source','timestamp']);assert.match(e.eventId,/^[a-f0-9-]{36}$/);assert.ok(Number.isFinite(Date.parse(e.timestamp)));assert.ok(Object.isFrozen(e));}
 assert.doesNotMatch(JSON.stringify(events),/postgresql|private|secret|SELECT|certificate|stack|message|target|params|requestId|transactionId/);
 assert.equal(new Set(events.map(e=>e.eventId)).size,3);
});
test('concurrent diagnostic and checkout failures never fabricate request attribution',async()=>{
 const events=[];const log=createSafeDatabaseLogger(e=>events.push(e));
 await Promise.all(Array.from({length:20},(_,i)=>Promise.resolve().then(()=>{log.engineError({message:secret});log.operationFailure(known(i%2?'P2002':'P1001'));})));
 assert.equal(events.length,40);assert.equal(new Set(events.map(e=>e.eventId)).size,40);
 assert.equal(events.filter(e=>e.category==='unique_constraint').length,10);assert.equal(events.filter(e=>e.category==='connection_unavailable').length,10);
 assert.ok(events.every(e=>!('requestId' in e)&&!('transactionId' in e)));
});
test('sink failure neither exposes error nor replaces the original operation result',()=>{
 const log=createSafeDatabaseLogger(()=>{throw Error(secret);});assert.doesNotThrow(()=>log.engineError());assert.doesNotThrow(()=>log.operationFailure(known('P1000')));
});
