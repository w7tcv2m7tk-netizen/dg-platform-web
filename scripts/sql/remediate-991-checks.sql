-- SIX-DELTA REPLACEMENT; PREPARATION ONLY. Canonical Git file SHA-256 must be verified before execution:
-- 55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d
\set ON_ERROR_STOP on
-- Caller must verify canonical Git bytes before supplying this value.
-- Missing/mismatched values refuse before locks or DDL.
\if :{?canonical_sha256}
\else
\echo 'Missing verified canonical_sha256'
SELECT 1 / 0; -- deliberate error: ON_ERROR_STOP exits before BEGIN
\endif
SELECT :'canonical_sha256' = '55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d' AS checksum_ok \gset
\if :checksum_ok
\else
\echo 'Canonical checksum mismatch'
SELECT 1 / 0; -- deliberate error: ON_ERROR_STOP exits before BEGIN
\endif
BEGIN;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';
SET LOCAL idle_in_transaction_session_timeout = '5s';
SET LOCAL transaction_timeout = '25s';
DO $remediation$
DECLARE catalog record; incompatible bigint; before_state jsonb; after_state jsonb;
  -- PostgreSQL 18 NOT NULL objects: exact name, column key, definition and flags.
  -- ALTER TYPE may recreate created_at's object OID, never its logical identity.
  expected_not_null CONSTANT text[] := ARRAY[
    'ai_worker_provisioning_receipts_created_at_not_null:NOT NULL created_at:{8}:true:true:false:false:true:0:false',
    'ai_worker_provisioning_receipts_fingerprint_not_null:NOT NULL fingerprint:{2}:true:true:false:false:true:0:false',
    'ai_worker_provisioning_receipts_nonce_not_null:NOT NULL nonce:{1}:true:true:false:false:true:0:false',
    'ai_worker_provisioning_receipts_operation_not_null:NOT NULL operation:{4}:true:true:false:false:true:0:false',
    'ai_worker_provisioning_receipts_outcome_not_null:NOT NULL outcome:{5}:true:true:false:false:true:0:false',
    'ai_worker_provisioning_receipts_window_id_not_null:NOT NULL window_id:{3}:true:true:false:false:true:0:false'
  ]::text[];
BEGIN
  IF current_setting('server_version_num')::int NOT BETWEEN 180000 AND 189999 THEN
    RAISE EXCEPTION 'Requires PostgreSQL 18';
  END IF;
  IF NOT pg_try_advisory_xact_lock(991, 20261008) THEN
    RAISE EXCEPTION 'Remediation already in progress';
  END IF;
  -- Fence all receipt writes before the mandatory empty-table gate and type DDL.
  LOCK TABLE public.ai_worker_provisioning_receipts IN ACCESS EXCLUSIVE MODE;
  LOCK TABLE public.ai_worker_principals, public.ai_local_deployments,
    public.ai_local_recipient_approvals, public.ai_inference_jobs,
    public.ai_worker_claim_receipts, public.ai_accounting_outbox,
    public._prisma_migrations IN SHARE MODE;
  IF (SELECT count(*)<>8 OR NOT bool_and(relkind='r' AND relpersistence='p' AND NOT relrowsecurity AND NOT relforcerowsecurity AND NOT relispartition)
      FROM pg_class WHERE oid IN ('public.ai_worker_provisioning_receipts'::regclass, 'public.ai_worker_principals'::regclass,
      'public.ai_local_deployments'::regclass,'public.ai_local_recipient_approvals'::regclass,
      'public.ai_inference_jobs'::regclass,'public.ai_worker_claim_receipts'::regclass,
      'public.ai_accounting_outbox'::regclass,'public._prisma_migrations'::regclass)) THEN
    RAISE EXCEPTION 'Unsafe safety/history relations';
  END IF;
  IF EXISTS (SELECT 1 FROM public.ai_worker_provisioning_receipts)
    OR EXISTS (SELECT 1 FROM public.ai_worker_principals)
    OR EXISTS (SELECT 1 FROM public.ai_local_deployments)
    OR EXISTS (SELECT 1 FROM public.ai_local_recipient_approvals)
    OR EXISTS (SELECT 1 FROM public.ai_inference_jobs)
    OR EXISTS (SELECT 1 FROM public.ai_worker_claim_receipts)
    OR EXISTS (SELECT 1 FROM public.ai_accounting_outbox) THEN
    RAISE EXCEPTION 'Requires zero receipt and worker execution state';
  END IF;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE migration_name IN (
    '20261007_ai_worker_provisioning_boundary',
    '20260901_stripe_connect_tenant_trust', '20260904_business_brain_knowledge',
    '20260910_aida_public_conversations', '20260913_ai_visibility_intelligence'))
    OR EXISTS (SELECT 1 FROM public._prisma_migrations
      WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Unexpected migration history state';
  END IF;


    SELECT
      ARRAY(SELECT a.attname || ':' || format_type(a.atttypid,a.atttypmod) || ':'
        || a.attnotnull::text || ':' || COALESCE(pg_get_expr(d.adbin,d.adrelid), '')
        FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
        WHERE a.attrelid='public.ai_worker_provisioning_receipts'::regclass
          AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum) AS columns,
      -- Bind each CHECK/PK name to its type, definition, column keys and flags.
      -- A definition multiset cannot detect permutations of repaired CHECK names.
      ARRAY(SELECT conname || ':' || contype::text || ':' || pg_get_constraintdef(oid) || ':' || conkey::text
        || ':' || convalidated::text || ':' || conenforced::text
        || ':' || condeferrable::text || ':' || condeferred::text
        || ':' || conislocal::text || ':' || coninhcount::text || ':' || connoinherit::text
        FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
          AND contype <> 'n' ORDER BY conname) AS constraints,
      ARRAY(SELECT conname || ':' || pg_get_constraintdef(oid) || ':' || conkey::text
        || ':' || convalidated::text || ':' || conenforced::text
        || ':' || condeferrable::text || ':' || condeferred::text
        || ':' || conislocal::text || ':' || coninhcount::text || ':' || connoinherit::text
        FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
          AND contype='n' ORDER BY conname) AS not_null_constraints,
      ARRAY(SELECT pg_get_indexdef(i.indexrelid) || ':clustered=' || i.indisclustered::text FROM pg_index i
        WHERE i.indexrelid IN ('public.ai_worker_provisioning_receipts_pkey'::regclass,
          'public.ai_worker_provisioning_window_idx'::regclass, 'public.ai_worker_pinned_name_unique'::regclass)
          AND i.indisvalid AND i.indisready AND i.indislive ORDER BY pg_get_indexdef(i.indexrelid)) AS indexes,
      (SELECT count(*)=3 AND bool_and(relkind='r' AND relpersistence='p' AND NOT relrowsecurity AND NOT relforcerowsecurity AND NOT relispartition)
        FROM pg_class WHERE oid IN ('public._prisma_migrations'::regclass,
          'public.ai_worker_provisioning_receipts'::regclass, 'public.ai_worker_principals'::regclass))
      AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public._prisma_migrations'::regclass AND NOT tgisinternal)
      AND NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class IN
        ('public._prisma_migrations'::regclass,'public.ai_worker_provisioning_receipts'::regclass,'public.ai_worker_principals'::regclass))
      AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.ai_worker_provisioning_receipts'::regclass)
      AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.ai_worker_principals'::regclass AND NOT tgisinternal)
      AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.ai_worker_provisioning_receipts'::regclass)
      AND NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid='public.ai_worker_provisioning_receipts'::regclass OR inhparent='public.ai_worker_provisioning_receipts'::regclass)
      AND (SELECT count(*)=2 FROM pg_index WHERE indrelid='public.ai_worker_provisioning_receipts'::regclass)
      AND NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.ai_worker_provisioning_receipts'::regclass AND attnum>0
        AND (attisdropped OR attidentity<>'' OR attgenerated<>'' OR attinhcount<>0 OR NOT attislocal OR attndims<>0 OR atthasmissing
          OR (atttypid='text'::regtype AND attcollation<>'pg_catalog."default"'::regcollation)))
      AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
        AND (NOT convalidated OR condeferrable OR condeferred OR NOT conislocal OR coninhcount<>0 OR NOT conenforced))
      AND (SELECT reloptions IS NULL AND relam=(SELECT oid FROM pg_am WHERE amname='heap') AND relreplident='d'
        FROM pg_class WHERE oid='public.ai_worker_provisioning_receipts'::regclass) AS safe INTO catalog;
  IF catalog.safe IS DISTINCT FROM true OR catalog.columns IS DISTINCT FROM ARRAY['nonce:text:true:','fingerprint:text:true:','window_id:text:true:','operation:text:true:','outcome:text:true:','worker_id:text:false:','deployment_id:text:false:','created_at:timestamp(3) without time zone:true:clock_timestamp()','completed_at:timestamp(3) without time zone:false:']::text[]
    OR catalog.not_null_constraints IS DISTINCT FROM expected_not_null
    OR catalog.constraints IS DISTINCT FROM ARRAY[
      'ai_worker_provisioning_receipts_fingerprint_check:c:CHECK ((length(fingerprint) = 64)):{2}:true:true:false:false:true:0:false',
      'ai_worker_provisioning_receipts_nonce_check:c:CHECK (((length(nonce) >= 16) AND (length(nonce) <= 128))):{1}:true:true:false:false:true:0:false',
      'ai_worker_provisioning_receipts_operation_check:c:CHECK ((operation = ANY (ARRAY[''provision''::text, ''recover''::text]))):{4}:true:true:false:false:true:0:false',
      'ai_worker_provisioning_receipts_outcome_check:c:CHECK ((outcome = ANY (ARRAY[''verified''::text, ''succeeded''::text, ''rejected''::text, ''mutation_failed''::text, ''window_closed''::text]))):{5}:true:true:false:false:true:0:false',
      'ai_worker_provisioning_receipts_pkey:p:PRIMARY KEY (nonce):{1}:true:true:false:false:true:0:true',
      'ai_worker_provisioning_receipts_window_id_check:c:CHECK (((length(window_id) >= 1) AND (length(window_id) <= 80))):{3}:true:true:false:false:true:0:false'
    ]::text[]
    OR catalog.indexes IS DISTINCT FROM ARRAY['CREATE INDEX ai_worker_provisioning_window_idx ON public.ai_worker_provisioning_receipts USING btree (window_id, created_at):clustered=false','CREATE UNIQUE INDEX ai_worker_pinned_name_unique ON public.ai_worker_principals USING btree (name) WHERE (name = ''dg-mac-1''::text):clustered=false','CREATE UNIQUE INDEX ai_worker_provisioning_receipts_pkey ON public.ai_worker_provisioning_receipts USING btree (nonce):clustered=false']::text[] THEN
    RAISE EXCEPTION 'Catalogue does not match expected variant';
  END IF;

  IF (SELECT array_agg(conname::text ORDER BY conname) FROM pg_constraint
      WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass AND contype<>'n')
      IS DISTINCT FROM ARRAY['ai_worker_provisioning_receipts_fingerprint_check','ai_worker_provisioning_receipts_nonce_check','ai_worker_provisioning_receipts_operation_check','ai_worker_provisioning_receipts_outcome_check','ai_worker_provisioning_receipts_pkey','ai_worker_provisioning_receipts_window_id_check']::text[]
    OR EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
      AND (NOT convalidated OR condeferrable OR condeferred OR NOT conislocal OR coninhcount<>0 OR NOT conenforced))
    OR EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid='public.ai_worker_provisioning_receipts'::regclass
       OR inhparent='public.ai_worker_provisioning_receipts'::regclass)
    OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid IN ('public.ai_worker_provisioning_receipts'::regclass,
       'public.ai_worker_principals'::regclass) AND NOT tgisinternal)
    OR EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class IN ('public.ai_worker_provisioning_receipts'::regclass,
       'public.ai_worker_principals'::regclass)) THEN RAISE EXCEPTION 'Unexpected catalogue state'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass AND conname='ai_worker_provisioning_receipts_fingerprint_check' AND contype='c' AND pg_get_constraintdef(oid)='CHECK ((length(fingerprint) = 64))') THEN RAISE EXCEPTION 'Constraint identity mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass AND conname='ai_worker_provisioning_receipts_nonce_check' AND contype='c' AND pg_get_constraintdef(oid)='CHECK (((length(nonce) >= 16) AND (length(nonce) <= 128)))') THEN RAISE EXCEPTION 'Constraint identity mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass AND conname='ai_worker_provisioning_receipts_operation_check' AND contype='c' AND pg_get_constraintdef(oid)='CHECK ((operation = ANY (ARRAY[''provision''::text, ''recover''::text])))') THEN RAISE EXCEPTION 'Constraint identity mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass AND conname='ai_worker_provisioning_receipts_outcome_check' AND contype='c' AND pg_get_constraintdef(oid)='CHECK ((outcome = ANY (ARRAY[''verified''::text, ''succeeded''::text, ''rejected''::text, ''mutation_failed''::text, ''window_closed''::text])))') THEN RAISE EXCEPTION 'Constraint identity mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass AND conname='ai_worker_provisioning_receipts_window_id_check' AND contype='c' AND pg_get_constraintdef(oid)='CHECK (((length(window_id) >= 1) AND (length(window_id) <= 80)))') THEN RAISE EXCEPTION 'Constraint identity mismatch'; END IF;
  SELECT count(*) INTO incompatible FROM public.ai_worker_provisioning_receipts
    WHERE (nonce ~ '^[a-f0-9]{64}$' AND fingerprint ~ '^[a-f0-9]{64}$'
      AND window_id ~ '^[a-f0-9]{32}$' AND operation IN ('provision','recover')
      AND outcome IN ('attempt','succeeded','duplicate','identity_mismatch','mutation_failed','window_closed')) IS NOT TRUE;
  IF incompatible<>0 THEN RAISE EXCEPTION 'Incompatible rows: %', incompatible; END IF;
  SELECT jsonb_build_object(
    'rows',(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY nonce),'[]') FROM public.ai_worker_provisioning_receipts r),
    'history',(SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY id),'[]') FROM public._prisma_migrations m),
    'relations',(SELECT jsonb_agg(to_jsonb(c) - ARRAY['relfilenode','relpages','reltuples','relallvisible','relallfrozen','relfrozenxid','relminmxid','reltoastrelid'] ORDER BY oid) FROM pg_class c WHERE oid IN
      ('public.ai_worker_provisioning_receipts'::regclass,'public.ai_worker_principals'::regclass)),
    'indexes',(SELECT jsonb_agg(jsonb_build_object('definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'clustered',i.indisclustered,'primary',i.indisprimary,'unique',i.indisunique) ORDER BY pg_get_indexdef(i.indexrelid)) FROM pg_index i WHERE indrelid IN
      ('public.ai_worker_provisioning_receipts'::regclass,'public.ai_worker_principals'::regclass)),
    'untouched_columns',(SELECT jsonb_agg(to_jsonb(a) ORDER BY attnum) FROM pg_attribute a WHERE attrelid='public.ai_worker_provisioning_receipts'::regclass AND attnum>0 AND attname NOT IN ('created_at','completed_at')),
    'untouched_constraints',(SELECT jsonb_agg(CASE WHEN conname='ai_worker_provisioning_receipts_created_at_not_null' THEN to_jsonb(c)-'oid' ELSE to_jsonb(c) END ORDER BY conname) FROM pg_constraint c
      WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
      AND conname NOT IN ('ai_worker_provisioning_receipts_nonce_check','ai_worker_provisioning_receipts_fingerprint_check',
        'ai_worker_provisioning_receipts_window_id_check','ai_worker_provisioning_receipts_outcome_check')))
    INTO before_state;
  -- No existing value may reach USING: ACCESS EXCLUSIVE + empty gate above.
  -- Explicit UTC is deterministic even when the connection timezone differs.
  -- Unqualified timestamptz matches the canonical migration's typmod (-1),
  -- with PostgreSQL datetime_precision=6; do not substitute timestamptz(3).
  ALTER TABLE public.ai_worker_provisioning_receipts
    ALTER COLUMN created_at TYPE timestamptz USING (created_at AT TIME ZONE 'UTC'),
    ALTER COLUMN completed_at TYPE timestamptz USING (completed_at AT TIME ZONE 'UTC');
  ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_nonce_check, ADD CONSTRAINT ai_worker_provisioning_receipts_nonce_check CHECK (nonce ~ '^[a-f0-9]{64}$');
  ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_fingerprint_check, ADD CONSTRAINT ai_worker_provisioning_receipts_fingerprint_check CHECK (fingerprint ~ '^[a-f0-9]{64}$');
  ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_window_id_check, ADD CONSTRAINT ai_worker_provisioning_receipts_window_id_check CHECK (window_id ~ '^[a-f0-9]{32}$');
  ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_outcome_check, ADD CONSTRAINT ai_worker_provisioning_receipts_outcome_check CHECK (outcome IN ('attempt','succeeded','duplicate','identity_mismatch','mutation_failed','window_closed'));


    SELECT
      ARRAY(SELECT a.attname || ':' || format_type(a.atttypid,a.atttypmod) || ':'
        || a.attnotnull::text || ':' || COALESCE(pg_get_expr(d.adbin,d.adrelid), '')
        FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
        WHERE a.attrelid='public.ai_worker_provisioning_receipts'::regclass
          AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum) AS columns,
      -- Bind each CHECK/PK name to its type, definition, column keys and flags.
      -- A definition multiset cannot detect permutations of repaired CHECK names.
      ARRAY(SELECT conname || ':' || contype::text || ':' || pg_get_constraintdef(oid) || ':' || conkey::text
        || ':' || convalidated::text || ':' || conenforced::text
        || ':' || condeferrable::text || ':' || condeferred::text
        || ':' || conislocal::text || ':' || coninhcount::text || ':' || connoinherit::text
        FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
          AND contype <> 'n' ORDER BY conname) AS constraints,
      ARRAY(SELECT conname || ':' || pg_get_constraintdef(oid) || ':' || conkey::text
        || ':' || convalidated::text || ':' || conenforced::text
        || ':' || condeferrable::text || ':' || condeferred::text
        || ':' || conislocal::text || ':' || coninhcount::text || ':' || connoinherit::text
        FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
          AND contype='n' ORDER BY conname) AS not_null_constraints,
      ARRAY(SELECT pg_get_indexdef(i.indexrelid) || ':clustered=' || i.indisclustered::text FROM pg_index i
        WHERE i.indexrelid IN ('public.ai_worker_provisioning_receipts_pkey'::regclass,
          'public.ai_worker_provisioning_window_idx'::regclass, 'public.ai_worker_pinned_name_unique'::regclass)
          AND i.indisvalid AND i.indisready AND i.indislive ORDER BY pg_get_indexdef(i.indexrelid)) AS indexes,
      (SELECT count(*)=3 AND bool_and(relkind='r' AND relpersistence='p' AND NOT relrowsecurity AND NOT relforcerowsecurity AND NOT relispartition)
        FROM pg_class WHERE oid IN ('public._prisma_migrations'::regclass,
          'public.ai_worker_provisioning_receipts'::regclass, 'public.ai_worker_principals'::regclass))
      AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public._prisma_migrations'::regclass AND NOT tgisinternal)
      AND NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class IN
        ('public._prisma_migrations'::regclass,'public.ai_worker_provisioning_receipts'::regclass,'public.ai_worker_principals'::regclass))
      AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.ai_worker_provisioning_receipts'::regclass)
      AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.ai_worker_principals'::regclass AND NOT tgisinternal)
      AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.ai_worker_provisioning_receipts'::regclass)
      AND NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid='public.ai_worker_provisioning_receipts'::regclass OR inhparent='public.ai_worker_provisioning_receipts'::regclass)
      AND (SELECT count(*)=2 FROM pg_index WHERE indrelid='public.ai_worker_provisioning_receipts'::regclass)
      AND NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.ai_worker_provisioning_receipts'::regclass AND attnum>0
        AND (attisdropped OR attidentity<>'' OR attgenerated<>'' OR attinhcount<>0 OR NOT attislocal OR attndims<>0 OR atthasmissing
          OR (atttypid='text'::regtype AND attcollation<>'pg_catalog."default"'::regcollation)))
      AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
        AND (NOT convalidated OR condeferrable OR condeferred OR NOT conislocal OR coninhcount<>0 OR NOT conenforced))
      AND (SELECT reloptions IS NULL AND relam=(SELECT oid FROM pg_am WHERE amname='heap') AND relreplident='d'
        FROM pg_class WHERE oid='public.ai_worker_provisioning_receipts'::regclass) AS safe INTO catalog;
  IF catalog.safe IS DISTINCT FROM true OR catalog.columns IS DISTINCT FROM ARRAY['nonce:text:true:','fingerprint:text:true:','window_id:text:true:','operation:text:true:','outcome:text:true:','worker_id:text:false:','deployment_id:text:false:','created_at:timestamp with time zone:true:clock_timestamp()','completed_at:timestamp with time zone:false:']::text[]
    OR catalog.not_null_constraints IS DISTINCT FROM expected_not_null
    OR catalog.constraints IS DISTINCT FROM ARRAY[
      'ai_worker_provisioning_receipts_fingerprint_check:c:CHECK ((fingerprint ~ ''^[a-f0-9]{64}$''::text)):{2}:true:true:false:false:true:0:false',
      'ai_worker_provisioning_receipts_nonce_check:c:CHECK ((nonce ~ ''^[a-f0-9]{64}$''::text)):{1}:true:true:false:false:true:0:false',
      'ai_worker_provisioning_receipts_operation_check:c:CHECK ((operation = ANY (ARRAY[''provision''::text, ''recover''::text]))):{4}:true:true:false:false:true:0:false',
      'ai_worker_provisioning_receipts_outcome_check:c:CHECK ((outcome = ANY (ARRAY[''attempt''::text, ''succeeded''::text, ''duplicate''::text, ''identity_mismatch''::text, ''mutation_failed''::text, ''window_closed''::text]))):{5}:true:true:false:false:true:0:false',
      'ai_worker_provisioning_receipts_pkey:p:PRIMARY KEY (nonce):{1}:true:true:false:false:true:0:true',
      'ai_worker_provisioning_receipts_window_id_check:c:CHECK ((window_id ~ ''^[a-f0-9]{32}$''::text)):{3}:true:true:false:false:true:0:false'
    ]::text[]
    OR catalog.indexes IS DISTINCT FROM ARRAY['CREATE INDEX ai_worker_provisioning_window_idx ON public.ai_worker_provisioning_receipts USING btree (window_id, created_at):clustered=false','CREATE UNIQUE INDEX ai_worker_pinned_name_unique ON public.ai_worker_principals USING btree (name) WHERE (name = ''dg-mac-1''::text):clustered=false','CREATE UNIQUE INDEX ai_worker_provisioning_receipts_pkey ON public.ai_worker_provisioning_receipts USING btree (nonce):clustered=false']::text[] THEN
    RAISE EXCEPTION 'Catalogue does not match expected variant';
  END IF;
  IF EXISTS (SELECT 1 FROM public.ai_worker_provisioning_receipts)
    OR (SELECT count(*) FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ai_worker_provisioning_receipts'
      AND column_name IN ('created_at','completed_at')
      AND data_type='timestamp with time zone' AND datetime_precision=6) <> 2 THEN
    RAISE EXCEPTION 'Final timestamp/empty-table postcondition failed';
  END IF;
  SELECT jsonb_build_object(
    'rows',(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY nonce),'[]') FROM public.ai_worker_provisioning_receipts r),
    'history',(SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY id),'[]') FROM public._prisma_migrations m),
    'relations',(SELECT jsonb_agg(to_jsonb(c) - ARRAY['relfilenode','relpages','reltuples','relallvisible','relallfrozen','relfrozenxid','relminmxid','reltoastrelid'] ORDER BY oid) FROM pg_class c WHERE oid IN
      ('public.ai_worker_provisioning_receipts'::regclass,'public.ai_worker_principals'::regclass)),
    'indexes',(SELECT jsonb_agg(jsonb_build_object('definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'clustered',i.indisclustered,'primary',i.indisprimary,'unique',i.indisunique) ORDER BY pg_get_indexdef(i.indexrelid)) FROM pg_index i WHERE indrelid IN
      ('public.ai_worker_provisioning_receipts'::regclass,'public.ai_worker_principals'::regclass)),
    'untouched_columns',(SELECT jsonb_agg(to_jsonb(a) ORDER BY attnum) FROM pg_attribute a WHERE attrelid='public.ai_worker_provisioning_receipts'::regclass AND attnum>0 AND attname NOT IN ('created_at','completed_at')),
    'untouched_constraints',(SELECT jsonb_agg(CASE WHEN conname='ai_worker_provisioning_receipts_created_at_not_null' THEN to_jsonb(c)-'oid' ELSE to_jsonb(c) END ORDER BY conname) FROM pg_constraint c
      WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
      AND conname NOT IN ('ai_worker_provisioning_receipts_nonce_check','ai_worker_provisioning_receipts_fingerprint_check',
        'ai_worker_provisioning_receipts_window_id_check','ai_worker_provisioning_receipts_outcome_check')))
    INTO after_state;
  IF before_state IS DISTINCT FROM after_state THEN RAISE EXCEPTION 'Preservation check failed'; END IF;
END
$remediation$;
COMMIT;
