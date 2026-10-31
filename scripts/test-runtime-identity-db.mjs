/** Own disposable cluster only. No ambient database/auth configuration is used. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { ownedPostgresTools } from './lib/owned-postgres-tools.mjs';
const pg = ownedPostgresTools({ argument: process.argv[2] });
const owned = mkdtempSync(path.join(tmpdir(), 'dg-identity-db-'));
const env = { PATH:process.env.PATH, HOME:owned, LANG:'C', TMPDIR:owned, PGPASSFILE:path.join(owned,'absent') };
const run = (tool,args) => { const r=spawnSync(path.join(pg,tool),args,{env,encoding:'utf8',timeout:30000}); if(r.status!==0) throw Error(`Disposable ${tool} failed`); return r.stdout; };
const server=createServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r)); const port=server.address().port; await new Promise(r=>server.close(r));
let started=false;
try {
 run('initdb',['-D',path.join(owned,'data'),'-U','synthetic','-A','trust','--encoding=UTF8','--locale=C']);
 run('pg_ctl',['-D',path.join(owned,'data'),'-l',path.join(owned,'postgres.log'),'-w','start','-o',`-h 127.0.0.1 -p ${port} -k ${owned}`]); started=true;
 run('createdb',['-h','127.0.0.1','-p',String(port),'-U','synthetic','dg_synthetic_identity']);
 for (const startupOnly of ['', 'missing_database']) {
 const child=spawnSync(process.execPath,['--experimental-strip-types','--import','./scripts/register-ts-resolver.mjs','scripts/test-runtime-identity-db-child.mjs'],{env:{...env,DG_IDENTITY_OWNED_PORT:String(port),DG_IDENTITY_STARTUP_ONLY:startupOnly},encoding:'utf8',timeout:180000});
 if(child.status!==0) { console.error('Disposable integration failed'); console.error(child.stdout); console.error('Child exit category:', child.error?.code ?? child.status ?? child.signal); throw Error('Integration failure'); }
 process.stdout.write(child.stdout);
 }
} finally {
 if(started) run('pg_ctl',['-D',path.join(owned,'data'),'-m','immediate','-w','stop']);
 rmSync(owned,{recursive:true,force:true});
}
