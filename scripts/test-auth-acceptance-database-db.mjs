import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prisma } from '@dg/database';
import { assertOwnedAcceptanceDatabase } from './lib/auth-acceptance-database.mjs';
const input = () => ({ databaseUrl: process.env.DATABASE_URL,
  marker: process.env.DG_CHECKOUT_DB_MARKER,
  expectedPort: new URL(process.env.DATABASE_URL).port,
  query: () => prisma.$queryRaw`SELECT current_database() AS database,
    host(inet_server_addr()) AS host, inet_server_port() AS port,
    current_user AS role, current_setting('dg.checkout_test_cluster', true) AS marker`,
});
test('real disposable PostgreSQL connection matches all fixture identities', async () => {
  await assertOwnedAcceptanceDatabase(input());
});
test('wrong expected marker refuses real disposable connection', async () => {
  await assert.rejects(assertOwnedAcceptanceDatabase({ ...input(), marker: 'not-the-owned-marker' }), /Refusing unverified/);
});
test('missing marker cannot query or mutate a database', async () => {
  let queries = 0;
  await assert.rejects(assertOwnedAcceptanceDatabase({ ...input(), marker: '', query: async () => { queries++; } }), /Refusing unverified/);
  assert.equal(queries, 0);
});
