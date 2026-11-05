import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { ownedPostgresTools } from './lib/owned-postgres-tools.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'dg-pg-tool-discovery-'));
  const tools = name => {
    const directory = join(root, name); mkdirSync(directory);
    for (const file of ['initdb', 'pg_ctl', 'createdb', 'psql']) {
      writeFileSync(join(directory, file), 'synthetic executable fixture; never executed');
      chmodSync(join(directory, file), 0o700);
    }
    return directory;
  };
  try { run({ root, tools }); } finally { rmSync(root, { recursive: true, force: true }); }
}
test('explicit CI tool directory takes precedence over PG_BIN and PATH', () => fixture(({ tools }) => {
  const selected = tools('selected'), other = tools('other');
  assert.equal(ownedPostgresTools({ argument: selected, environment: { PG_BIN: other, PATH: other } }), realpathSync(selected));
}));
test('PG_BIN supports existing local installations without a platform-specific path', () => fixture(({ tools }) => {
  const selected = tools('selected');
  assert.equal(ownedPostgresTools({ environment: { PG_BIN: selected } }), realpathSync(selected));
}));
test('PATH discovery requires a complete executable toolset in one directory', () => fixture(({ root, tools }) => {
  const incomplete = join(root, 'incomplete'); mkdirSync(incomplete);
  writeFileSync(join(incomplete, 'initdb'), 'fixture'); chmodSync(join(incomplete, 'initdb'), 0o700);
  const selected = tools('complete');
  assert.equal(ownedPostgresTools({ environment: { PATH: [incomplete, selected].join(delimiter) } }), realpathSync(selected));
}));
test('invalid explicit selection fails closed instead of falling back', () => fixture(({ root, tools }) => {
  const selected = tools('complete');
  for (const argument of ['', 'relative/path', join(root, 'absent')]) {
    assert.throws(() => ownedPostgresTools({ argument, environment: { PG_BIN: selected, PATH: selected } }));
  }
  assert.throws(() => ownedPostgresTools({ environment: { PG_BIN: join(root, 'absent'), PATH: selected } }));
}));
test('missing or non-executable tools cannot select a cluster binary set', () => fixture(({ tools }) => {
  const selected = tools('complete'); chmodSync(join(selected, 'psql'), 0o600);
  assert.throws(() => ownedPostgresTools({ environment: { PG_BIN: selected } }));
  assert.throws(() => ownedPostgresTools({ environment: {} }));
}));
