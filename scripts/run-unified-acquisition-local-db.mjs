/** Owns a disposable loopback database. Never loads dotenv or accepts a database URL. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
const pgBin = process.argv[2];
if (!pgBin || !path.isAbsolute(pgBin)) throw new Error('Pass the installed PostgreSQL bin directory');
const env = { ...process.env };
for (const key of Object.keys(env)) if (key.startsWith('PG') || /DATABASE_URL|DIRECT_URL|SHADOW_DATABASE_URL|ABR.*GUID|ABN_LOOKUP_GUID/.test(key)) delete env[key];
const run = (command, args, options = {}) => {
 const result = spawnSync(command, args, { env, stdio: 'inherit', ...options });
 if (result.error) throw result.error;
 if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status})`);
 return result;
};
const port = await new Promise((resolve, reject) => { const server = createServer(); server.on('error', reject); server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)); }); });
if (port === 5432) throw new Error('Refusing default port');
const owned = mkdtempSync(path.join(tmpdir(), 'dg-acquisition-pg-'));
const data = path.join(owned, 'data');
env.DATABASE_URL = `postgresql://acquisition_test@127.0.0.1:${port}/acquisition_test?connection_limit=20`;
env.DG_ACQUISITION_LOCAL_TEST = owned;
const psql = ['-X', '-h', '127.0.0.1', '-p', String(port), '-U', 'acquisition_test', '-d', 'acquisition_test', '-v', 'ON_ERROR_STOP=1', '--single-transaction'];
try {
 run(path.join(pgBin, 'initdb'), ['-D', data, '-U', 'acquisition_test', '-A', 'trust', '--encoding=UTF8', '--locale=C', '-L', path.resolve(pgBin, '../share/postgresql')]);
 run(path.join(pgBin, 'pg_ctl'), ['-D', data, '-l', path.join(owned, 'server.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${owned}`]);
 run(path.join(pgBin, 'createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'acquisition_test', 'acquisition_test']);
 // Pinned pre-change schema; apply the actual migration to it (not db push).
 const baseline = path.join(owned, 'baseline'); mkdirSync(path.join(baseline, 'models'), { recursive: true });
 for (const relative of ['schema.prisma', 'models/ai-visibility.prisma', 'models/business-brain.prisma']) {
   const result = run('git', ['show', `f26e3e4761e8af66707919589a5ee883bb5d3ef8:packages/database/prisma/${relative}`], { encoding: 'utf8', stdio: 'pipe' });
   writeFileSync(path.join(baseline, relative), result.stdout);
 }
 const sql = path.join(owned, 'baseline.sql');
 run('node_modules/.bin/prisma', ['migrate', 'diff', '--from-empty', '--to-schema-datamodel', baseline, '--script', '--output', sql]);
 run(path.join(pgBin, 'psql'), [...psql, '-f', sql]);
 run(path.join(pgBin, 'psql'), [...psql, '-f', 'scripts/fixtures/unified-acquisition-legacy.sql']);
 run(path.join(pgBin, 'psql'), [...psql, '-f', 'packages/database/prisma/migrations/20261020090000_unified_acquisition_identity/migration.sql']);
 run(process.execPath, ['--test', '--test-timeout=30000', 'scripts/test-unified-acquisition-local-db.mjs']);
} finally {
 if (existsSync(path.join(data, 'postmaster.pid'))) run(path.join(pgBin, 'pg_ctl'), ['-D', data, '-m', 'immediate', '-w', 'stop']);
 rmSync(owned, { recursive: true, force: true });
 console.log('Owned acquisition test cluster stopped and removed');
}
