/** SQL-only failure rehearsal. Called only by the owned localhost DB runner. */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {once} from 'node:events';

export async function rehearseAdmissionMigration({pgBin,psql,env,root,marker}) {
  assert.match(marker,/^[0-9a-f-]{36}$/);
  assert.equal(new URL(env.DATABASE_URL).hostname,'127.0.0.1');
  const args=psql.filter(a=>a!=='--single-transaction');
  const executable=path.join(pgBin,'psql');
  const exec=(sql)=>spawnSync(executable,[...args,'-q','-t','-A'],{cwd:root,env,encoding:'utf8',input:sql,timeout:15000});
  const identity=exec("SELECT current_setting('dg.checkout_test_cluster',true)");
  assert.equal(identity.status,0);assert.equal(identity.stdout.trim(),marker);
  const migration=readFileSync(path.join(root,'packages/database/prisma/migrations/20261027_single_use_checkout_admission/migration.sql'),'utf8');
  assert.match(migration,/\bBEGIN;/);assert.match(migration,/COMMIT;\s*$/);
  const absent=()=>{const r=exec(`SELECT count(*) FROM (
    SELECT relname AS name FROM pg_class WHERE relnamespace='public'::regnamespace AND
      (relname LIKE 'platform_checkout_admission%' OR relname='platform_checkout_attempts_id_organisation_id_key')
    UNION ALL SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND
      proname IN ('audit_platform_checkout_admission','preserve_checkout_admission_audit')) s`);
    assert.equal(r.status,0);assert.equal(r.stdout.trim(),'0');};
  absent();
  const failed=exec(migration.replace('COMMIT;','SELECT 1/0;\nCOMMIT;'));
  assert.notEqual(failed.status,0);assert.match(failed.stderr,/division by zero/);absent();
  console.log('PASS admission migration mid-transaction failure rolls back all owned objects');
  // EOF before COMMIT closes the client connection: PostgreSQL rolls back DDL.
  const interrupted=exec(migration.replace(/COMMIT;\s*$/,''));
  assert.equal(interrupted.status,0);absent();
  console.log('PASS admission migration disconnect before COMMIT leaves no partial schema');
  const locker=spawn(executable,[...args,'-q','-t','-A'],{cwd:root,env,stdio:['pipe','pipe','pipe']});
  let lockErrors='';locker.stderr.on('data',b=>lockErrors+=b.toString());
  const ready=new Promise((resolve,reject)=>{
    let text='';const timer=setTimeout(()=>reject(Error('Disposable lock fixture failed to become ready')),5000);
    locker.stdout.on('data',b=>{text+=b.toString();if(text.includes('LOCK_READY')){clearTimeout(timer);resolve();}});
    locker.once('error',e=>{clearTimeout(timer);reject(e)});
    locker.once('exit',c=>{clearTimeout(timer);if(!text.includes('LOCK_READY'))reject(Error(`Lock fixture exited ${c}`))});
  });
  try {
    locker.stdin.write("BEGIN; LOCK TABLE public.platform_checkout_attempts IN ACCESS EXCLUSIVE MODE; SELECT 'LOCK_READY';\n");
    await ready;
    const timeout=exec(migration);assert.notEqual(timeout.status,0);assert.match(timeout.stderr,/lock timeout/);
  } finally {
    const exit=once(locker,'exit');locker.stdin.end('ROLLBACK;\n\\q\n');await exit;
  }
  assert.equal(lockErrors,'');absent();
  console.log('PASS admission migration lock timeout rolls back and releases transaction');
  const applied=exec(migration);assert.equal(applied.status,0,applied.stderr);
  const state=exec("SELECT count(*) FROM public.platform_checkout_admissions; SELECT count(*) FROM public.platform_checkout_admission_audit;");
  assert.equal(state.stdout.trim(),'0\n0');
  console.log('PASS admission migration approved retry after verified rollback creates empty authority/audit tables');
  const duplicate=exec(migration);assert.notEqual(duplicate.status,0);assert.match(duplicate.stderr,/already exists/);
  const after=exec("SELECT count(*) FROM public.platform_checkout_admissions; SELECT count(*) FROM public.platform_checkout_admission_audit;");
  assert.equal(after.status,0);assert.equal(after.stdout,state.stdout);
  console.log('PASS admission duplicate migration fails closed without changing tables');
}
