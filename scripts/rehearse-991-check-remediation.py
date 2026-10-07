#!/usr/bin/env python3
"""Owns a fresh socket-only PostgreSQL 18 cluster. No env files or existing URLs."""
import argparse, hashlib, json, os, pathlib, shutil, subprocess, tempfile, time
ROOT = pathlib.Path(__file__).resolve().parents[1]
SHA = '55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d'
MIGRATION = 'packages/database/prisma/migrations/20261007_ai_worker_provisioning_boundary/migration.sql'
parser = argparse.ArgumentParser()
parser.add_argument('pg_bin', type=pathlib.Path)
parser.add_argument('--evidence', type=pathlib.Path, required=True)
args = parser.parse_args()
assert args.pg_bin.is_absolute()
env = {k: os.environ[k] for k in ['PATH','HOME','TMPDIR'] if k in os.environ}
env['LC_ALL'] = 'C'
def command(name, tail, **kw):
    return subprocess.run([str(args.pg_bin/name), *tail], env=env, cwd=ROOT, text=True, capture_output=True, timeout=40, **kw)
def checked(r):
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout
canonical = subprocess.run(['git','show',f'HEAD:{MIGRATION}'], cwd=ROOT, text=True, capture_output=True, check=True).stdout
assert hashlib.sha256(canonical.encode()).hexdigest() == SHA
assert (ROOT/MIGRATION).read_text() == canonical
query = (ROOT/'scripts/sql/991-physical-catalogue.sql').read_text().strip().removesuffix(';')
# Reference catalogue comes from independently executing the pinned Git migration,
# never from the existing Neon branch or from the remediation's expected literals.
expected_catalog = json.loads((ROOT/'docs/ai/991-rehearsal-results.json').read_text())['finalCatalogue']
observed = json.loads((ROOT/'scripts/sql/991-observed-constraints.json').read_text())
remediation = (ROOT/'scripts/sql/remediate-991-checks.sql').read_text()
owned = pathlib.Path(tempfile.mkdtemp(prefix='dg991-checks-'))
data = owned/'data'
results = {'postgres': checked(command('postgres',['--version'])).strip(), 'canonicalSha256':SHA,'cases':[]}
assert ' 18.' in results['postgres']
# Empty listen_addresses makes TCP connectivity impossible; owned Unix socket only.
def sql(s, db='variant', fail=False, checksum=SHA):
    r = command('psql',['-X','-h',str(owned),'-p','55491','-U','rehearsal','-d',db,'-v','ON_ERROR_STOP=1','-At', *(['-v',f'canonical_sha256={checksum}'] if checksum is not None else [])],input=s)
    if not fail: return checked(r)
    assert r.returncode != 0, 'Expected refusal'
    return r.stderr
fixture = """
CREATE TABLE public.ai_worker_principals (id text PRIMARY KEY, name text NOT NULL);
CREATE TABLE public._prisma_migrations (id text PRIMARY KEY, checksum text NOT NULL,
 migration_name text NOT NULL, started_at timestamptz NOT NULL, finished_at timestamptz,
 logs text, rolled_back_at timestamptz, applied_steps_count int NOT NULL);
INSERT INTO public._prisma_migrations VALUES
 ('history1','original','20261007_ai_gateway_slice3_local_routine','2026-10-07 01:27:01.271473+00','2026-10-07 01:27:01.271473+00','',NULL,0),
 ('history2','unchanged','unrelated','2026-08-30 22:42:11.602284+00','2026-08-30 22:42:11.602284+00','original log',NULL,7);
CREATE TABLE public.ai_local_deployments(id text PRIMARY KEY);
CREATE TABLE public.ai_local_recipient_approvals(id text PRIMARY KEY);
CREATE TABLE public.ai_inference_jobs(id text PRIMARY KEY);
CREATE TABLE public.ai_worker_claim_receipts(id text PRIMARY KEY);
CREATE TABLE public.ai_accounting_outbox(id text PRIMARY KEY);
CREATE SCHEMA unrelated;
CREATE TABLE unrelated.sentinel(id int PRIMARY KEY, payload jsonb, stamp timestamptz);
CREATE INDEX sentinel_payload ON unrelated.sentinel USING gin(payload);
INSERT INTO unrelated.sentinel VALUES (1,'{"unchanged":true}','2026-10-07 01:27:01.271473+00');
CREATE VIEW unrelated.sentinel_view AS SELECT * FROM unrelated.sentinel;
"""
def quote(s): return "'"+s.replace("'","''")+"'"
def setup():
    sql('DROP DATABASE IF EXISTS variant;',db='postgres')
    sql('CREATE DATABASE variant;',db='postgres')
    sql(fixture+canonical)
    sql("ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN created_at TYPE timestamp(3) USING (created_at AT TIME ZONE 'UTC'), ALTER COLUMN completed_at TYPE timestamp(3) USING (completed_at AT TIME ZONE 'UTC');")
    for c in observed:
        if c['definition'].startswith('CHECK'):
            sql(f"ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT {c['name']}, ADD CONSTRAINT {c['name']} {c['definition']};")
    actual=json.loads(sql("SELECT json_agg(x ORDER BY name) FROM (SELECT conname AS name,pg_get_constraintdef(oid) AS definition,convalidated,condeferrable,condeferred,conislocal,coninhcount,conenforced FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass AND contype<>'n') x;"))
    assert [(x['name'],x['definition']) for x in actual] == sorted((x['name'],x['definition']) for x in observed)
    assert all(x['convalidated'] and x['conislocal'] and x['conenforced'] and not x['condeferrable'] and not x['condeferred'] and x['coninhcount']==0 for x in actual)
    return actual
row_sql = """INSERT INTO public.ai_worker_provisioning_receipts
(nonce,fingerprint,window_id,operation,outcome,worker_id,deployment_id,created_at,completed_at) VALUES
(repeat('a',64),repeat('b',64),repeat('c',32),'provision','succeeded','synthetic-worker','synthetic-deployment','2026-10-07 01:27:01.271473+00','2026-10-07 01:27:02.654321+00'),
(repeat('d',64),repeat('e',64),repeat('f',32),'recover','mutation_failed',NULL,NULL,'2026-10-07 01:27:01.271474+00',NULL);"""
def catalog(db='variant'):
    return json.loads(sql('SELECT row_to_json(q) FROM ('+query+') q;',db=db))
def shape(db='variant'):
    return json.loads(sql((ROOT/'scripts/sql/991-receipt-shape.sql').read_text(),db=db))
def dump():
    out=checked(command('pg_dump',['-h',str(owned),'-p','55491','-U','rehearsal','-d','variant','--no-owner','--no-privileges']))
    return '\n'.join(l for l in out.splitlines() if not l.startswith(('\\restrict','\\unrestrict')))
def preservation():
    # Preserve unrelated catalogue rows; normalize the six target deltas and
    # documented internal heap/index/NOT NULL rewrite consequences only.
    return sql("""SELECT jsonb_build_object(
 'classes',(SELECT jsonb_agg((CASE WHEN relname='ai_worker_provisioning_window_idx' THEN to_jsonb(c)-'oid' ELSE to_jsonb(c) END) - ARRAY['relfilenode','relpages','reltuples','relallvisible','relallfrozen','relfrozenxid','relminmxid','reltoastrelid'] ORDER BY relname) FROM pg_class c WHERE relnamespace IN ('public'::regnamespace,'unrelated'::regnamespace)),
 'attributes',(SELECT jsonb_agg(to_jsonb(a) ORDER BY attrelid,attnum) FROM pg_attribute a WHERE attrelid<>'public.ai_worker_provisioning_window_idx'::regclass AND NOT (attrelid='public.ai_worker_provisioning_receipts'::regclass AND attname IN ('created_at','completed_at')) AND attrelid IN (SELECT oid FROM pg_class WHERE relnamespace IN ('public'::regnamespace,'unrelated'::regnamespace))),
 'constraints',(SELECT jsonb_agg(CASE WHEN conname='ai_worker_provisioning_receipts_created_at_not_null' THEN to_jsonb(c)-'oid' ELSE to_jsonb(c) END ORDER BY conname) FROM pg_constraint c WHERE connamespace IN ('public'::regnamespace,'unrelated'::regnamespace) AND conname NOT IN ('ai_worker_provisioning_receipts_nonce_check','ai_worker_provisioning_receipts_fingerprint_check','ai_worker_provisioning_receipts_window_id_check','ai_worker_provisioning_receipts_outcome_check')),
 'indexes',(SELECT jsonb_agg(to_jsonb(i) ORDER BY indexrelid) FROM pg_index i WHERE indexrelid<>'public.ai_worker_provisioning_window_idx'::regclass AND indrelid IN (SELECT oid FROM pg_class WHERE relnamespace IN ('public'::regnamespace,'unrelated'::regnamespace))),
 'rules',(SELECT jsonb_agg(to_jsonb(r) ORDER BY oid) FROM pg_rewrite r WHERE ev_class IN (SELECT oid FROM pg_class WHERE relnamespace IN ('public'::regnamespace,'unrelated'::regnamespace))),
 'history',(SELECT jsonb_agg(to_jsonb(m) ORDER BY id) FROM public._prisma_migrations m),
 'receipts',(SELECT jsonb_agg(to_jsonb(r) ORDER BY nonce) FROM public.ai_worker_provisioning_receipts r),
 'unrelated',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM unrelated.sentinel s));""")
def record(name, **evidence):
    results['cases'].append(dict(name=name,passed=True,**evidence)); print('PASS',name,flush=True)
def refused_case(name, script=remediation, expected_error=None):
    before=dump(); identity=preservation(); error=sql(script,fail=True)
    assert dump()==before and preservation()==identity
    if expected_error: assert expected_error in error
    record(name,error=error.strip(),unchangedDumpSha256=hashlib.sha256(before.encode()).hexdigest())
try:
    checked(command('initdb',['-D',str(data),'-U','rehearsal','-A','trust','--encoding=UTF8','--locale=C','-L',str(args.pg_bin.resolve().parent/'share/postgresql')]))
    checked(command('pg_ctl',['-D',str(data),'-l',str(owned/'server.log'),'-w','start','-o',f"-c listen_addresses='' -p 55491 -k {owned} -c timezone=UTC"]))
    sql('CREATE DATABASE canonical;',db='postgres');sql(fixture+canonical,db='canonical')
    assert catalog('canonical')==expected_catalog
    results['canonicalFullShape']=shape('canonical')
    results['startingConstraints']=setup();results['startingCatalogue']=catalog();results['startingFullShape']=shape();record('A exact observed starting catalogue')
    for checksum in [None, 'incorrect']:
        before=dump();identity=preservation();error=sql(remediation,fail=True,checksum=checksum)
        assert dump()==before and preservation()==identity
        record('checksum refusal '+('missing' if checksum is None else 'mismatch'),error=error.strip() or 'psql exit 3 before transaction')
    history_digest_sql="SELECT md5(COALESCE(jsonb_agg(to_jsonb(m) ORDER BY id),'[]'::jsonb)::text) FROM public._prisma_migrations m;"
    results['beforeHistoryDigest']=sql(history_digest_sql).strip()
    before=preservation();sql(remediation)
    results['afterHistoryDigest']=sql(history_digest_sql).strip()
    assert results['beforeHistoryDigest']==results['afterHistoryDigest']
    assert preservation()==before and catalog()==catalog('canonical')==expected_catalog
    precision=json.loads(sql("SELECT json_agg(x ORDER BY column_name) FROM (SELECT column_name,data_type,datetime_precision,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_worker_provisioning_receipts' AND column_name IN ('created_at','completed_at')) x;"))
    assert all(x['datetime_precision']==6 and x['data_type']=='timestamp with time zone' for x in precision)
    assert shape()==shape('canonical')
    results['finalFullShape']=shape();results['finalCatalogue']=catalog();results['finalTimestampColumns']=precision
    record('exact empty Production variant converges all six deltas; canonical catalogue and preservation')
    refused_case('already-canonical repeated execution refuses')
    for zone in ['GMT','Australia/Brisbane','America/New_York']:
        setup();sql("SET timezone="+quote(zone)+";\n"+remediation)
        assert catalog()==expected_catalog
        record('session-timezone-independent empty conversion '+zone)
    setup();sql(row_sql);refused_case('nonempty canonical-compatible data refuses',expected_error='Requires zero')
    for field,value in [('nonce','x'*16),('fingerprint','Z'*64),('window_id','x'),('outcome','verified'),('outcome','rejected')]:
        setup();sql(row_sql);sql(f"UPDATE public.ai_worker_provisioning_receipts SET {field}={quote(value)} WHERE nonce=repeat('a',64);")
        refused_case('incompatible timestamp/data '+field+' '+value[:8],expected_error='Requires zero')
    drift_cases=[
      ('timestamp type', "ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN completed_at TYPE timestamptz USING (completed_at AT TIME ZONE 'UTC');"),
      ('timestamp precision', "ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN created_at TYPE timestamp(6);"),
      ('constraint identity', "ALTER TABLE public.ai_worker_provisioning_receipts RENAME CONSTRAINT ai_worker_provisioning_receipts_nonce_check TO changed_name;"),
      ('nonce check', "ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_nonce_check, ADD CONSTRAINT ai_worker_provisioning_receipts_nonce_check CHECK(length(nonce)>10);"),
      ('operation check', "ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_operation_check, ADD CONSTRAINT ai_worker_provisioning_receipts_operation_check CHECK(operation='provision');"),
      ('PK', "ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_pkey;"),
      ('index definition', "DROP INDEX public.ai_worker_provisioning_window_idx; CREATE INDEX ai_worker_provisioning_window_idx ON public.ai_worker_provisioning_receipts(created_at,window_id);"),
      ('extra index', "CREATE INDEX extra_receipt_idx ON public.ai_worker_provisioning_receipts(outcome);"),
      ('default', "ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN created_at SET DEFAULT now();"),
      ('nullability', "ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN completed_at SET NOT NULL;"),
      ('extra column', "ALTER TABLE public.ai_worker_provisioning_receipts ADD COLUMN unexpected text;"),
      ('RLS', "ALTER TABLE public.ai_worker_provisioning_receipts ENABLE ROW LEVEL SECURITY;"),
      ('forced RLS', "ALTER TABLE public.ai_worker_provisioning_receipts FORCE ROW LEVEL SECURITY;"),
      ('policy', "CREATE POLICY unexpected ON public.ai_worker_provisioning_receipts USING (true);"),
      ('inheritance', "CREATE TABLE public.receipt_child () INHERITS(public.ai_worker_provisioning_receipts);"),
      ('rule', "CREATE RULE unexpected AS ON INSERT TO public.ai_worker_provisioning_receipts DO ALSO NOTIFY synthetic;"),
      ('trigger', "CREATE FUNCTION public.unexpected_trigger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$; CREATE TRIGGER unexpected BEFORE INSERT ON public.ai_worker_provisioning_receipts FOR EACH ROW EXECUTE FUNCTION public.unexpected_trigger();"),
      ('unvalidated check', "ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_nonce_check; ALTER TABLE public.ai_worker_provisioning_receipts ADD CONSTRAINT ai_worker_provisioning_receipts_nonce_check CHECK(length(nonce)>=16 AND length(nonce)<=128) NOT VALID;"),
      ('history rule', "CREATE RULE history_rule AS ON INSERT TO public._prisma_migrations DO ALSO NOTIFY synthetic;"),
      ('#991 history present', "INSERT INTO public._prisma_migrations VALUES('unexpected','checksum','20261007_ai_worker_provisioning_boundary',now(),now(),'',NULL,0);"),
      ('unresolved history', "UPDATE public._prisma_migrations SET finished_at=NULL WHERE id='history1';"),
      ('older conflicting history', "INSERT INTO public._prisma_migrations VALUES('unexpected','checksum','20260901_stripe_connect_tenant_trust',now(),now(),'',NULL,0);"),
    ]
    for field in ['fingerprint','window_id','outcome']:
        drift_cases.append((field+' check',f"ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_{field}_check, ADD CONSTRAINT ai_worker_provisioning_receipts_{field}_check CHECK(length({field})>0);"))
    for name,drift in drift_cases:
        setup();sql(drift);refused_case('catalogue/history drift '+name)
    for table in ['ai_worker_principals','ai_local_deployments','ai_local_recipient_approvals','ai_inference_jobs','ai_worker_claim_receipts','ai_accounting_outbox']:
        setup();sql(f"INSERT INTO public.{table} VALUES ('unexpected'"+(",'unexpected'" if table=='ai_worker_principals' else '')+");")
        refused_case('nonzero safety state '+table,expected_error='Requires zero')
    setup()
    # Marker on stdout establishes lock acquisition, no scheduling guess.
    holder=subprocess.Popen([str(args.pg_bin/'psql'),'-X','-h',str(owned),'-p','55491','-U','rehearsal','-d','variant','-At','-v','ON_ERROR_STOP=1'],env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    holder.stdin.write("BEGIN; LOCK TABLE public.ai_worker_provisioning_receipts IN ROW EXCLUSIVE MODE; SELECT 'LOCKED';\n");holder.stdin.flush()
    while holder.stdout.readline().strip()!='LOCKED':
        assert holder.poll() is None
    before=dump();start=time.monotonic();error=sql(remediation,fail=True);elapsed=time.monotonic()-start
    assert 'lock timeout' in error and 1.5<elapsed<5
    holder.stdin.write('ROLLBACK;\n\\q\n');holder.stdin.flush();holder.communicate(timeout=5)
    assert dump()==before
    record('F bounded lock contention',elapsedSeconds=elapsed,error=error.strip())
    setup()
    first_end=remediation.index(';',remediation.index('  ALTER TABLE public.ai_worker_provisioning_receipts\n'))+1
    forced=remediation[:first_end]+"\n RAISE EXCEPTION 'synthetic failure after first replacement';\n"+remediation[first_end:]
    refused_case('G forced failure after timestamp DDL',forced,expected_error='synthetic failure after first replacement')
    setup();before=dump();identity=preservation()
    sql(remediation.replace('COMMIT;','ROLLBACK;'))
    assert dump()==before and preservation()==identity
    record('H explicit rollback restores original catalogue and data')
    # Force the final comparison to reject after all DDL.
    setup()
    tail=remediation.rfind("RAISE EXCEPTION 'Catalogue does not match expected variant'")
    pos=remediation.rfind('IF catalog.safe',0,tail)
    forced_post=remediation[:pos]+remediation[pos:].replace('IF catalog.safe IS DISTINCT FROM true','IF true OR catalog.safe IS DISTINCT FROM true',1)
    refused_case('postcondition mismatch rolls back all six changes',forced_post)
    record('canonical SHA and independently applied canonical full catalogue verified')
    results['passed']=True
finally:
    if (data/'postmaster.pid').exists(): checked(command('pg_ctl',['-D',str(data),'-m','immediate','-w','stop']))
    shutil.rmtree(owned);results['stoppedAndDestroyed']=True
    args.evidence.parent.mkdir(parents=True,exist_ok=True)
    args.evidence.write_text(json.dumps(results,indent=2)+'\n')
print('All',len(results['cases']),'rehearsal cases passed; owned cluster destroyed')
