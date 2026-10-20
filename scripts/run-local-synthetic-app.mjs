/** Owns a new local cluster and a loopback-only Next dev server. No remote DB input. */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { lookup } from 'node:dns/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { assertEnvironmentPairingOrThrow } from './env-pairing.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [pgBin, credentialsPath] = process.argv.slice(2);
if (!pgBin || !path.isAbsolute(pgBin) || !credentialsPath || !path.isAbsolute(credentialsPath)) throw Error('Pass absolute PostgreSQL bin and existing Clerk test credential file paths');
for (const file of ['.env', '.env.local', '.env.development', '.env.development.local']) {
 if (existsSync(path.join(root,file))) throw Error('Remove ambient dotenv files from this isolated worktree before starting');
}
const addresses = await lookup('localhost', { all: true });
if (!addresses.length || addresses.some(({ address }) => !['127.0.0.1', '::1'].includes(address))) throw Error('localhost must resolve exclusively to loopback');
const credentials = parse(readFileSync(credentialsPath));
// Only the two explicitly named test credentials cross this boundary. Never spread dotenv/process.env.
const env = Object.fromEntries(['PATH','HOME','TMPDIR','LANG','LC_ALL'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
const freePort = () => new Promise((resolve,reject)=>{const server=createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
const dbPort=await freePort(), appPort=await freePort();
if(dbPort===5432 || dbPort===appPort) throw Error('Retry port allocation');
Object.assign(env,{NODE_ENV:'development',DG_LOCAL_SYNTHETIC:'1',DG_NEON_ENV:'development',DATABASE_URL:`postgresql://synthetic@127.0.0.1:${dbPort}/dg_synthetic_prospecting?connection_limit=6`,NEXT_PUBLIC_APP_URL:`http://localhost:${appPort}`,NEXT_PUBLIC_APP_HOST:'localhost',CLERK_SECRET_KEY:credentials.CLERK_SECRET_KEY,NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:credentials.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,NEXT_PUBLIC_CLERK_SIGN_IN_URL:'/login',NEXT_PUBLIC_CLERK_SIGN_UP_URL:'/signup/account',NEXT_TELEMETRY_DISABLED:'1'});
assertEnvironmentPairingOrThrow(env);
const owned=mkdtempSync(path.join(tmpdir(),'dg-synthetic-app-'));
const data=path.join(owned,'data');
const run=(command,args,extra={})=>{const result=spawnSync(command,args,{cwd:root,env,stdio:'inherit',...extra});if(result.error)throw result.error;if(result.status!==0)throw Error(`${path.basename(command)} failed (${result.status})`);return result;};
let child;
const signal=()=>child?.kill('SIGTERM');
process.on('SIGTERM',signal);process.on('SIGINT',signal);
try {
 run(path.join(pgBin,'initdb'),['-D',data,'-U','synthetic','-A','trust','--encoding=UTF8','--locale=C','-L',path.resolve(pgBin,'../share/postgresql')]);
 run(path.join(pgBin,'pg_ctl'),['-D',data,'-l',path.join(owned,'server.log'),'-w','start','-o',`-h 127.0.0.1 -p ${dbPort} -k ${owned}`]);
 run(path.join(pgBin,'createdb'),['-h','127.0.0.1','-p',String(dbPort),'-U','synthetic','dg_synthetic_prospecting']);
 const sql=path.join(owned,'schema.sql');
 run(path.join(root,'node_modules/.bin/prisma'),['migrate','diff','--from-empty','--to-schema-datamodel','packages/database/prisma','--script','--output',sql]);
 run(path.join(pgBin,'psql'),['-X','-h','127.0.0.1','-p',String(dbPort),'-U','synthetic','-d','dg_synthetic_prospecting','-v','ON_ERROR_STOP=1','--single-transaction','-f',sql],{stdio:'ignore'});
 // This private file contains local-only connection details, never auth secrets.
 writeFileSync(path.join(owned,'context.json'),JSON.stringify({origin:env.NEXT_PUBLIC_APP_URL,databaseUrl:env.DATABASE_URL,owned},null,2),{mode:0o600});
 console.log(`LOCAL_SYNTHETIC_ORIGIN=${env.NEXT_PUBLIC_APP_URL}`);
 console.log(`LOCAL_SYNTHETIC_CONTEXT=${path.join(owned,'context.json')}`);
 console.log('No Stripe, mail, messaging, AI, remote database or Production authentication credentials supplied. Clerk webhooks are not configured by this launcher.');
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','localhost','--port',String(appPort)],{cwd:root,env,stdio:'inherit'});
 await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,sig)=>code===0||sig?resolve():reject(Error(`Local server exited (${code})`)));});
} finally {
 process.off('SIGTERM',signal);process.off('SIGINT',signal);
 if(existsSync(path.join(data,'postmaster.pid')))run(path.join(pgBin,'pg_ctl'),['-D',data,'-m','immediate','-w','stop']);
 rmSync(owned,{recursive:true,force:true});
 console.log('Owned synthetic cluster stopped and removed');
}
