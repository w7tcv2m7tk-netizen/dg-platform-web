import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { handleRemediate991PhysicalAction, physical991ActionEnabled } from '../src/lib/remediate-991-physical.ts';
import { reviewedRemediationStatements } from '../src/lib/remediate-991-sql.ts';
import { PHYSICAL_991_OPERATION } from '../src/lib/remediate-991-request.ts';

const CONFIRM = 'REMEDIATE_991_PHYSICAL';
const { settings, body } = reviewedRemediationStatements();
let events;

function setEnabled() {
  process.env.NODE_ENV = 'production';
  process.env.VERCEL_ENV = 'production';
  process.env.DG_REMEDIATE_991_PHYSICAL_OPERATION = PHYSICAL_991_OPERATION;
  process.env.DG_COMMAND_CENTRE_ORG_IDS = 'operator_org';
  delete process.env.AI_WORKER_PROVISIONING_ENABLED;
}

function database({ authority = true, beforeBody, afterBody } = {}) {
  let committed = false;
  let lockHeld = false;
  let authorityReads = 0;
  const membership = { findMany: async () => {
    authorityReads++;
    const allowed = typeof authority === 'function' ? authority(authorityReads) : authority;
    return allowed ? [{ organisationId: 'operator_org', role: 'owner' }] : [];
  } };
  const tx = {
    membership,
    $queryRaw: async () => {
      if (lockHeld) return [{ acquired: false }];
      lockHeld = true;
      return [{ acquired: true }];
    },
    $executeRaw: async () => 1,
    $executeRawUnsafe: async sql => {
      if (settings.includes(sql)) return 1;
      assert.equal(sql, body, 'executor must use the pinned reviewed DO body');
      if (beforeBody) await beforeBody();
      if (committed) throw new Error('canonical precondition refuses replay');
      committed = true;
      if (afterBody) await afterBody();
      return 1;
    },
  };
  return {
    membership,
    get committed() { return committed; },
    get authorityReads() { return authorityReads; },
    async $transaction(run, options) {
      assert.deepEqual(options, { isolationLevel: 'ReadCommitted', maxWait: 2000, timeout: 25000 });
      try { return await run(tx); }
      finally { lockHeld = false; }
    },
  };
}

function invoke({ confirmation = CONFIRM, userId = 'user_operator', authority = true, db = database(), audit = e => events.push(e) } = {}) {
  return handleRemediate991PhysicalAction(confirmation, {
    userId: async () => userId,
    database: () => db,
    isCurrentPlatformOperator: async id => {
      assert.equal(id, userId);
      const memberships = await db.membership.findMany({ where: { clerkUserId: id, status: 'active' } });
      return authority && memberships.length > 0;
    },
    audit,
  });
}

beforeEach(() => {
  setEnabled();
  events = [];
});

test('unauthenticated access is refused before database creation or transaction', async () => {
  const result = await handleRemediate991PhysicalAction(CONFIRM, {
    userId: async () => null,
    database: () => assert.fail('database must not be created for unauthenticated access'),
    isCurrentPlatformOperator: async () => assert.fail('authority must not be checked without a user'),
    audit: e => events.push(e),
  });
  assert.equal(result, 'refused');
  assert.deepEqual(events.map(e => e.outcome), ['refused']);
});

test('non-operator access is refused before executor transaction', async () => {
  const db = database({ authority: false });
  assert.equal(await invoke({ db, authority: false }), 'refused');
  assert.equal(db.committed, false);
  assert.equal(events.some(e => e.outcome === 'attempt'), false);
});

test('operator authority revoked between preflight and transaction is refused', async () => {
  const db = database({ authority: n => n === 1 });
  assert.equal(await invoke({ db }), 'refused');
  assert.equal(db.committed, false);
  assert.equal(db.authorityReads, 2);
});

test('missing operation activation flag fails closed before authentication or database access', async () => {
  delete process.env.DG_REMEDIATE_991_PHYSICAL_OPERATION;
  assert.equal(physical991ActionEnabled(), false);
  const result = await handleRemediate991PhysicalAction(CONFIRM, {
    userId: async () => assert.fail('must fail before Clerk/database access'),
    database: () => assert.fail('must not create database client'),
    isCurrentPlatformOperator: async () => assert.fail('must not check authority'),
    audit: e => events.push(e),
  });
  assert.equal(result, 'refused');
});

test('worker activation disables the action even when operation flag is present', async () => {
  process.env.AI_WORKER_PROVISIONING_ENABLED = 'true';
  assert.equal(await invoke({ db: { membership: { findMany: async () => assert.fail('must fail closed') } } }), 'refused');
});

test('missing and incorrect fixed confirmations are refused before auth or database access', async () => {
  for (const confirmation of [null, '', 'remediate_991_physical', 'REMEDIATE_991_PHYSICAL ']) {
    const result = await handleRemediate991PhysicalAction(confirmation, {
      userId: async () => assert.fail('confirmation is checked before auth'),
      database: () => assert.fail('confirmation is checked before database'),
      isCurrentPlatformOperator: async () => assert.fail('confirmation is checked before authority'),
      audit: e => events.push(e),
    });
    assert.equal(result, 'refused');
  }
});

test('action returns only fixed status and logs no credential or request input', async () => {
  const sentinel = 'never-log-this-remediation-secret';
  const logs = [];
  const actionSource = readFileSync('src/app/(shell)/command/remediate-991/actions.ts', 'utf8');
  const formSource = readFileSync('src/app/(shell)/command/remediate-991/Remediate991Form.tsx', 'utf8');
  assert.doesNotMatch(actionSource + formSource, /X-DG-Remediate-991-Physical-Secret|SECRET_SHA256|DATABASE_URL/);
  assert.match(formSource, /if \(result\)/, 'the form is removed after any outcome to prevent a UI replay');
  assert.equal(await invoke({ audit: e => logs.push(JSON.stringify(e)) }), 'success');
  assert.equal(JSON.stringify(logs).includes(sentinel), false);
  assert.deepEqual(events.map(e => e.outcome), []);
  assert.deepEqual(logs.map(JSON.parse).map(e => e.outcome), ['attempt', 'success']);
  assert.deepEqual(Object.keys(JSON.parse(logs[0])).sort(), ['actor', 'operation', 'outcome', 'requestId', 'timestamp']);
});

test('concurrent submissions cannot acquire the transaction lock twice', async () => {
  let release;
  let entered;
  const enteredBody = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  let committed = false;
  let lockHeld = false;
  const memberships = { findMany: async () => [{ organisationId: 'operator_org', role: 'owner' }] };
  const db = {
    membership: memberships,
    async $transaction(run) {
      try {
        return await run({
          membership: memberships,
          $queryRaw: async () => {
            if (lockHeld) return [{ acquired: false }];
            lockHeld = true;
            return [{ acquired: true }];
          },
          $executeRaw: async () => 1,
          $executeRawUnsafe: async sql => {
            if (settings.includes(sql)) return 1;
            assert.equal(sql, body);
            entered();
            await blocked;
            committed = true;
            return 1;
          },
        });
      } finally { lockHeld = false; }
    },
  };
  const first = invoke({ db });
  await enteredBody;
  const second = await invoke({ db });
  assert.equal(second, 'refused');
  release();
  assert.equal(await first, 'success');
  assert.equal(committed, true);
});

test('replay after success cannot apply the reviewed body a second time', async () => {
  const db = database();
  assert.equal(await invoke({ db }), 'success');
  const replay = await invoke({ db });
  assert.equal(replay, 'ambiguous');
  assert.equal(db.committed, true);
  assert.deepEqual(events.map(e => e.outcome), ['attempt', 'success', 'attempt', 'ambiguous']);
});

test('ambiguous completion is surfaced as STOP and no retry is performed', async () => {
  let attempts = 0;
  const db = database({ afterBody: async () => { throw new Error('simulated lost commit acknowledgement'); } });
  const result = await invoke({ db, audit: event => { if (event.outcome === 'attempt') attempts++; events.push(event); } });
  assert.equal(result, 'ambiguous');
  assert.equal(attempts, 1);
  assert.equal(db.committed, true);
});

test('server action never invokes the public HTTP route', async () => {
  const actionSource = readFileSync('src/app/(shell)/command/remediate-991/actions.ts', 'utf8');
  assert.doesNotMatch(actionSource, /fetch\s*\(|PHYSICAL_991_PATH|route\.ts|remediate-991-physical\/route/);
  assert.match(actionSource, /handleRemediate991PhysicalAction/);
});
