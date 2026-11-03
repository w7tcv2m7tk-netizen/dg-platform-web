import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertOwnedAcceptanceDatabase } from './lib/auth-acceptance-database.mjs';
const fixture = () => ({ databaseUrl: 'postgresql://checkout_test@127.0.0.1:23456/dg_checkout_test',
  marker: 'owned-synthetic-marker', expectedPort: '23456', query: async () => [{
    database: 'dg_checkout_test', host: '127.0.0.1', port: 23456, role: 'checkout_test', marker: 'owned-synthetic-marker',
  }] });
test('exact owned disposable identity is accepted', async () => { await assertOwnedAcceptanceDatabase(fixture()); });
for (const [name, change] of Object.entries({ missingMarker: { marker: '' }, missingPort: { expectedPort: '' },
  defaultPort: { expectedPort: '5432' }, badPort: { expectedPort: '99999' }, remote: { databaseUrl: 'postgresql://checkout_test@remote.invalid:23456/dg_checkout_test' },
  wrongPort: { databaseUrl: 'postgresql://checkout_test@127.0.0.1:23457/dg_checkout_test' },
  wrongDatabase: { databaseUrl: 'postgresql://checkout_test@127.0.0.1:23456/unowned' },
  wrongRole: { databaseUrl: 'postgresql://admin@127.0.0.1:23456/dg_checkout_test' }, malformed: { databaseUrl: 'invalid' } })) {
  test(`configuration ${name} rejects before connection`, async () => {
    let queries = 0;
    await assert.rejects(assertOwnedAcceptanceDatabase({ ...fixture(), ...change, query: async () => { queries++; } }), /Refusing unverified/);
    assert.equal(queries, 0);
  });
}
for (const [name, change] of Object.entries({ missingMarker: { marker: null }, wrongMarker: { marker: 'other' },
  wrongPort: { port: 23457 }, wrongDatabase: { database: 'unowned' }, wrongHost: { host: '192.0.2.1' }, wrongRole: { role: 'admin' } })) {
  test(`server ${name} rejects before mutation`, async () => {
    const input = fixture(); const [row] = await input.query(); let mutations = 0;
    await assert.rejects(async () => { await assertOwnedAcceptanceDatabase({ ...input, query: async () => [{ ...row, ...change }] }); mutations++; }, /Refusing unverified/);
    assert.equal(mutations, 0);
  });
}
test('query failure and ambiguous result refuse without raw errors', async () => {
  for (const query of [async () => { throw new Error('private-details'); }, async () => [], async () => [{}, {}]]) {
    await assert.rejects(assertOwnedAcceptanceDatabase({ ...fixture(), query }), error => error.message === 'Refusing unverified disposable authentication database');
  }
});
test('browser mutations and cleanup use the verified fixture boundary', () => {
  const source = readFileSync('scripts/test-auth-clerk-browser-acceptance.mjs', 'utf8');
  assert.ok(source.indexOf('await verifyDatabase();') < source.indexOf('chromium.launch'));
  assert.equal((source.match(/prisma\.membership\.update\(/g) ?? []).length, 1);
  assert.match(source, /const updateFixtureMembership = async status => \{\s*await verifyDatabase\(\);/);
  assert.match(source, /if \(membershipId\) await updateFixtureMembership\("active"\)/);
});
