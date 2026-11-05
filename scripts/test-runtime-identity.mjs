import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseRuntimeIdentity, createRuntimeIdentityDiagnostic } from '../src/lib/runtime-identity.ts';
process.env.DG_COMMAND_CENTRE_ORG_IDS = 'operator';
function fixture(user = 'human', memberships = [{ organisationId: 'operator', role: 'owner' }]) {
  const calls = [];
  const tx = { $executeRaw: async sql => calls.push(sql.join('')), membership: { findMany: async args => { calls.push(args); return memberships; } },
    $queryRaw: async sql => { calls.push(sql.join('')); return [{ role: 'runtime', session_role: 'runtime', database: 'synthetic' }]; } };
  const deps = { userId: async () => user, revision: 'a'.repeat(40), database: () => ({ $transaction: async (fn, options) => { calls.push(options); return fn(tx); } }) };
  return { deps, calls, tx };
}
for (const user of [null, 'api_key:owner']) test(`rejects ${user} before database`, async () => {
  const f = fixture(user); f.deps.database = () => { throw Error('must not connect'); };
  assert.deepEqual(await diagnoseRuntimeIdentity(f.deps), { status: 'denied' });
});
for (const role of ['admin', 'member']) test(`rejects operator org ${role}`, async () => {
  const f = fixture('human', [{ organisationId: 'operator', role }]);
  assert.deepEqual(await diagnoseRuntimeIdentity(f.deps), { status: 'denied' });
  assert.ok(!f.calls.some(c => typeof c === 'string' && c.startsWith('SELECT')));
});
test('fresh authority each call, bounded read-only transaction and one fixed SELECT', async () => {
  const f = fixture(); assert.equal((await diagnoseRuntimeIdentity(f.deps)).status, 'ok');
  assert.deepEqual(f.calls[0], { maxWait: 1000, timeout: 4000 });
  assert.equal(f.calls[1], 'SET TRANSACTION READ ONLY');
  assert.equal(f.calls[4].take, 100);
  f.tx.membership.findMany = async () => [];
  assert.deepEqual(await diagnoseRuntimeIdentity(f.deps), { status: 'denied' });
});
test('redacts identifiers, revision and errors', async () => {
  const f = fixture(); f.deps.revision = 'https://secret';
  f.tx.$queryRaw = async () => [{ role: 'postgres://secret', session_role: 'x\nsecret', database: 'a'.repeat(64) }];
  assert.deepEqual(await diagnoseRuntimeIdentity(f.deps), { status: 'ok', role: '[redacted]', sessionRole: '[redacted]', database: '[redacted]', revision: '[unavailable]' });
  f.tx.$queryRaw = async () => { throw Error('postgres://secret'); };
  assert.deepEqual(await diagnoseRuntimeIdentity(f.deps), { status: 'unavailable' });
});
test('auth failures and malformed row counts fail closed', async () => {
 const f = fixture(); f.tx.$queryRaw = async () => [];
 assert.deepEqual(await diagnoseRuntimeIdentity(f.deps), { status: 'unavailable' });
 f.deps.userId = async () => { throw Error('secret'); };
 assert.deepEqual(await diagnoseRuntimeIdentity(f.deps), { status: 'unavailable' });
});
test('staff admitted; tenant owner denied; authority lookup errors redacted', async () => {
 const f = fixture('human', [{ organisationId: 'tenant', role: 'dg:staff' }]);
 assert.equal((await diagnoseRuntimeIdentity(f.deps)).status, 'ok');
 f.tx.membership.findMany = async () => [{ organisationId: 'tenant', role: 'owner' }];
 assert.deepEqual(await diagnoseRuntimeIdentity(f.deps), { status: 'denied' });
 f.tx.membership.findMany = async () => { throw Error('secret'); };
 assert.deepEqual(await diagnoseRuntimeIdentity(f.deps), { status: 'unavailable' });
});
test('old grant-free server action is retired', async () => {
 const { readFileSync } = await import('node:fs');
 const source=readFileSync('src/app/(shell)/command/runtime-identity/actions.ts','utf8');
 assert.match(source,/status: 'denied'/);assert.doesNotMatch(source,/@dg\/database|diagnoseRuntimeIdentity\(/);
});

function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
for (const phase of ['auth', 'acquisition', 'query']) test(`${phase} stall retains slot, denies late success and recovers`, async () => {
 const f = fixture(); const d = deferred(); let started = 0;
 if (phase === 'auth') f.deps.userId = async () => { started++; await d.promise; return 'human'; };
 if (phase === 'acquisition') f.deps.database = () => ({ $transaction: async fn => { started++; await d.promise; return fn(f.tx); } });
 if (phase === 'query') f.tx.$queryRaw = async () => { started++; await d.promise; return [{ role:'runtime', session_role:'runtime', database:'synthetic' }]; };
 const run = createRuntimeIdentityDiagnostic(10);
 assert.deepEqual(await run(f.deps), { status:'unavailable' });
 assert.deepEqual(await run(f.deps), { status:'unavailable' }); assert.equal(started, 1);
 let lateDatabaseCalls = 0;
 if (phase === 'auth') f.deps.database = () => { lateDatabaseCalls++; throw Error('late auth must not connect'); };
 d.resolve(); await new Promise(r => setImmediate(r));
 assert.equal(lateDatabaseCalls, 0);
 if (phase === 'acquisition') assert.equal(f.calls.length, 0, 'expired acquisition must not execute SQL');
 assert.equal((await run(fixture().deps)).status, 'ok');
});
test('shared logging routes both severities through safe structured sink', async () => {
 const { readFileSync } = await import('node:fs');
 const source = readFileSync('packages/database/src/index.ts','utf8');
 assert.match(source, /databaseLogger/); assert.match(source, /level: "warn"/); assert.match(source, /logger.operationFailure/);
 assert.doesNotMatch(source, /console\.\w+\([^)]*(message|error\.)/);
});
