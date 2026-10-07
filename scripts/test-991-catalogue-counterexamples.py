#!/usr/bin/env python3
"""Independent exact-SQL counterexamples; owns a socket-only PostgreSQL 18 cluster."""
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('pg_bin', type=pathlib.Path)
parser.add_argument('--evidence', type=pathlib.Path, required=True)
args = parser.parse_args()
assert args.pg_bin.is_absolute()
env = {k: os.environ[k] for k in ['PATH', 'HOME', 'TMPDIR'] if k in os.environ}
env['LC_ALL'] = 'C'
owned = pathlib.Path(tempfile.mkdtemp(prefix='dg991-counterexamples-'))
data = owned / 'data'
# No credential/service-file fallback, inherited URLs or TCP listener.
env['PGPASSFILE'] = str(owned / 'no-password-file')
env['PGSERVICEFILE'] = str(owned / 'no-service-file')


def run(name, tail, **kw):
    return subprocess.run([str(args.pg_bin / name), *tail], env=env, cwd=ROOT,
                          text=True, capture_output=True, timeout=40, **kw)


def checked(result):
    assert result.returncode == 0, result.stderr
    return result.stdout


canonical_sha = '55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d'
canonical = (ROOT / 'packages/database/prisma/migrations/20261007_ai_worker_provisioning_boundary/migration.sql').read_text()
remediation = (ROOT / 'scripts/sql/remediate-991-checks.sql').read_text()
reviewed_sha = re.search(r'REMEDIATION_SHA256 = "([a-f0-9]{64})"',
                         (ROOT / 'src/lib/remediate-991-sql.ts').read_text())[1]
assert hashlib.sha256(canonical.encode()).hexdigest() == canonical_sha
assert hashlib.sha256(remediation.encode()).hexdigest() == reviewed_sha
version = checked(run('postgres', ['--version'])).strip()
assert ' 18.' in version
results = {'postgres': version, 'remediationSha256': reviewed_sha,
           'canonicalSha256': canonical_sha, 'cases': []}


def sql(statement, db='variant'):
    return run('psql', ['-X', '-h', str(owned), '-p', '55492', '-U', 'counterexample',
                       '-d', db, '-At', '-v', 'ON_ERROR_STOP=1', '-v',
                       f'canonical_sha256={canonical_sha}'], input=statement)


fixture = """
CREATE TABLE public.ai_worker_principals(id text PRIMARY KEY, name text NOT NULL);
CREATE TABLE public.ai_local_deployments(id text PRIMARY KEY);
CREATE TABLE public.ai_local_recipient_approvals(id text PRIMARY KEY);
CREATE TABLE public.ai_inference_jobs(id text PRIMARY KEY);
CREATE TABLE public.ai_worker_claim_receipts(id text PRIMARY KEY);
CREATE TABLE public.ai_accounting_outbox(id text PRIMARY KEY);
CREATE TABLE public._prisma_migrations(id text PRIMARY KEY, migration_name text,
  finished_at timestamptz, rolled_back_at timestamptz);
INSERT INTO public._prisma_migrations VALUES ('sentinel','unchanged',now(),NULL);
"""


def setup():
    checked(sql('DROP DATABASE IF EXISTS variant;', 'postgres'))
    checked(sql('CREATE DATABASE variant;', 'postgres'))
    checked(sql(fixture + canonical))
    checked(sql("""ALTER TABLE public.ai_worker_provisioning_receipts
      ALTER COLUMN created_at TYPE timestamp(3) USING (created_at AT TIME ZONE 'UTC'),
      ALTER COLUMN completed_at TYPE timestamp(3) USING (completed_at AT TIME ZONE 'UTC');"""))
    for constraint in json.loads((ROOT / 'scripts/sql/991-observed-constraints.json').read_text()):
        if constraint['definition'].startswith('CHECK'):
            checked(sql(f"ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT {constraint['name']}, "
                        f"ADD CONSTRAINT {constraint['name']} {constraint['definition']};"))


def snapshot():
    dump = checked(run('pg_dump', ['-h', str(owned), '-p', '55492', '-U', 'counterexample',
                                  '-d', 'variant', '--no-owner', '--no-privileges']))
    # pg_dump generates random restriction markers, not catalogue differences.
    return '\n'.join(line for line in dump.splitlines()
                     if not line.startswith(('\\restrict', '\\unrestrict')))


def record(name, **details):
    results['cases'].append({'name': name, 'passed': True, **details})
    print('PASS', name, flush=True)


def refuses(name, statement):
    before = snapshot()
    result = sql(statement)
    assert result.returncode != 0
    assert 'Catalogue does not match expected variant' in result.stderr
    assert snapshot() == before, 'All DDL and injected drift must roll back'
    record(name, error=result.stderr.splitlines()[0],
           unchangedDumpSha256=hashlib.sha256(before.encode()).hexdigest())


# Independent fault DDL: no expected catalogue literals or rehearsal helpers.
def swap_checks(left, right):
    table = 'public.ai_worker_provisioning_receipts'
    prefix = 'ai_worker_provisioning_receipts_'
    return (f'ALTER TABLE {table} RENAME CONSTRAINT {prefix}{left}_check TO temporary_check; '
            f'ALTER TABLE {table} RENAME CONSTRAINT {prefix}{right}_check TO {prefix}{left}_check; '
            f'ALTER TABLE {table} RENAME CONSTRAINT temporary_check TO {prefix}{right}_check;\n')


check_drifts = [
    ('nonce/fingerprint name swap', swap_checks('nonce', 'fingerprint')),
    ('window_id/outcome name swap', swap_checks('window_id', 'outcome')),
    ('nonce rebound to fingerprint', 'ALTER TABLE public.ai_worker_provisioning_receipts '
     'DROP CONSTRAINT ai_worker_provisioning_receipts_nonce_check, '
     "ADD CONSTRAINT ai_worker_provisioning_receipts_nonce_check CHECK (fingerprint ~ '^[a-f0-9]{64}$');\n"),
    ('window_id rebound to outcome', 'ALTER TABLE public.ai_worker_provisioning_receipts '
     'DROP CONSTRAINT ai_worker_provisioning_receipts_window_id_check, '
     "ADD CONSTRAINT ai_worker_provisioning_receipts_window_id_check CHECK (outcome ~ '^[a-f0-9]{32}$');\n"),
    ('additional CHECK', 'ALTER TABLE public.ai_worker_provisioning_receipts '
     'ADD CONSTRAINT unexpected_check CHECK (length(nonce)>0);\n'),
    ('NO INHERIT CHECK', 'ALTER TABLE public.ai_worker_provisioning_receipts '
     'DROP CONSTRAINT ai_worker_provisioning_receipts_nonce_check, '
     "ADD CONSTRAINT ai_worker_provisioning_receipts_nonce_check CHECK (nonce ~ '^[a-f0-9]{64}$') NO INHERIT;\n"),
]
for field in ['nonce', 'fingerprint', 'window_id', 'outcome']:
    check_drifts.append(('renamed ' + field + ' CHECK',
        f'ALTER TABLE public.ai_worker_provisioning_receipts RENAME CONSTRAINT '
        f'ai_worker_provisioning_receipts_{field}_check TO unexpected_check;\n'))


try:
    checked(run('initdb', ['-D', str(data), '-U', 'counterexample', '-A', 'trust',
                           '--encoding=UTF8', '--locale=C', '-L',
                           str(args.pg_bin.resolve().parent / 'share/postgresql')]))
    checked(run('pg_ctl', ['-D', str(data), '-l', str(owned / 'server.log'), '-w', 'start',
                          '-o', f"-c listen_addresses='' -p 55492 -k {owned} -c timezone=UTC"]))
    checked(sql('CREATE DATABASE canonical;', 'postgres'))
    checked(sql(fixture + canonical, 'canonical'))
    setup()
    checked(sql(remediation))
    shape_query = (ROOT / 'scripts/sql/991-receipt-shape.sql').read_text()
    assert json.loads(checked(sql(shape_query))) == json.loads(checked(sql(shape_query, 'canonical')))
    record('ordinary six-delta state equals fresh canonical PostgreSQL 18 reference')

    setup()
    checked(sql('ALTER TABLE public.ai_worker_provisioning_receipts RENAME CONSTRAINT '
                'ai_worker_provisioning_receipts_fingerprint_not_null TO unexpected_not_null;'))
    refuses('original renamed NOT NULL counterexample refuses unchanged reviewed SQL', remediation)
    setup()
    checked(sql('ALTER TABLE public.ai_worker_provisioning_receipts CLUSTER ON ai_worker_provisioning_window_idx;'))
    refuses('original CLUSTER counterexample refuses unchanged reviewed SQL', remediation)

    # Inject test-only drift after all six DDL statements, immediately before the
    # final SELECT. This never becomes a runtime artifact or a new repair delta.
    final_select = remediation.rfind('    SELECT\n      ARRAY(SELECT a.attname')
    assert final_select > remediation.index('ALTER COLUMN created_at TYPE timestamptz')
    for name, drift in [
        ('final NOT NULL identity drift rolls back',
         'ALTER TABLE public.ai_worker_provisioning_receipts RENAME CONSTRAINT '
         'ai_worker_provisioning_receipts_fingerprint_not_null TO unexpected_not_null;\n'),
        ('final CLUSTER drift rolls back',
         'ALTER TABLE public.ai_worker_provisioning_receipts CLUSTER ON ai_worker_provisioning_window_idx;\n'),
    ]:
        setup()
        refuses(name, remediation[:final_select] + drift + remediation[final_select:])
    mutation = remediation.index('  ALTER TABLE public.ai_worker_provisioning_receipts\n')
    trapped = remediation[:mutation] + "  RAISE EXCEPTION 'unexpected mutation reached';\n" + remediation[mutation:]
    for name, drift in check_drifts:
        setup()
        checked(sql(drift))
        refuses('starting CHECK identity ' + name + ' refuses before mutation', trapped)
        setup()
        refuses('final CHECK identity ' + name + ' rolls back all six deltas',
                remediation[:final_select] + drift + remediation[final_select:])
    results['passed'] = True
finally:
    if (data / 'postmaster.pid').exists():
        checked(run('pg_ctl', ['-D', str(data), '-m', 'immediate', '-w', 'stop']))
    shutil.rmtree(owned)
    results['stoppedAndDestroyed'] = True
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(results, indent=2) + '\n')
print('All', len(results['cases']), 'independent cases passed; owned cluster destroyed')
