-- PREPARATION ONLY. Canonical Git file SHA-256 must be verified before execution:
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
BEGIN
  IF current_setting('server_version_num')::int NOT BETWEEN 180000 AND 189999 THEN
    RAISE EXCEPTION 'Requires PostgreSQL 18';
  END IF;
  -- ACCESS EXCLUSIVE is required by DROP CHECK; acquire it before checking rows.
  LOCK TABLE public.ai_worker_provisioning_receipts IN ACCESS EXCLUSIVE MODE;
  LOCK TABLE public.ai_worker_principals, public._prisma_migrations IN SHARE MODE;

  
    SELECT
      ARRAY(SELECT a.attname || ':' || format_type(a.atttypid,a.atttypmod) || ':'
        || a.attnotnull::text || ':' || COALESCE(pg_get_expr(d.adbin,d.adrelid), '')
        FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
        WHERE a.attrelid='public.ai_worker_provisioning_receipts'::regclass
          AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum) AS columns,
      ARRAY(SELECT pg_get_constraintdef(oid) FROM pg_constraint
        WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
          -- PostgreSQL 18 catalogs NOT NULL constraints; attnotnull above checks them.
          AND contype <> 'n'
          AND convalidated AND NOT condeferrable ORDER BY pg_get_constraintdef(oid)) AS constraints,
      ARRAY(SELECT pg_get_indexdef(i.indexrelid) FROM pg_index i
        WHERE i.indexrelid IN ('public.ai_worker_provisioning_receipts_pkey'::regclass,
          'public.ai_worker_provisioning_window_idx'::regclass, 'public.ai_worker_pinned_name_unique'::regclass)
          AND i.indisvalid AND i.indisready AND i.indislive ORDER BY pg_get_indexdef(i.indexrelid)) AS indexes,
      (SELECT count(*)=3 AND bool_and(relkind='r' AND relpersistence='p' AND NOT relrowsecurity)
        FROM pg_class WHERE oid IN ('public._prisma_migrations'::regclass,
          'public.ai_worker_provisioning_receipts'::regclass, 'public.ai_worker_principals'::regclass))
      AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public._prisma_migrations'::regclass AND NOT tgisinternal)
      AND NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class='public._prisma_migrations'::regclass) AS safe INTO catalog;
  IF catalog.safe IS DISTINCT FROM true OR catalog.columns IS DISTINCT FROM ARRAY['nonce:text:true:','fingerprint:text:true:','window_id:text:true:','operation:text:true:','outcome:text:true:','worker_id:text:false:','deployment_id:text:false:','created_at:timestamp with time zone:true:clock_timestamp()','completed_at:timestamp with time zone:false:']::text[]
    OR catalog.constraints IS DISTINCT FROM ARRAY['CHECK (((length(nonce) >= 16) AND (length(nonce) <= 128)))','CHECK (((length(window_id) >= 1) AND (length(window_id) <= 80)))','CHECK ((length(fingerprint) = 64))','CHECK ((operation = ANY (ARRAY[''provision''::text, ''recover''::text])))','CHECK ((outcome = ANY (ARRAY[''verified''::text, ''succeeded''::text, ''rejected''::text, ''mutation_failed''::text, ''window_closed''::text])))','PRIMARY KEY (nonce)']::text[]
    OR catalog.indexes IS DISTINCT FROM ARRAY['CREATE INDEX ai_worker_provisioning_window_idx ON public.ai_worker_provisioning_receipts USING btree (window_id, created_at)','CREATE UNIQUE INDEX ai_worker_pinned_name_unique ON public.ai_worker_principals USING btree (name) WHERE (name = ''dg-mac-1''::text)','CREATE UNIQUE INDEX ai_worker_provisioning_receipts_pkey ON public.ai_worker_provisioning_receipts USING btree (nonce)']::text[] THEN
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
    'relations',(SELECT jsonb_agg(to_jsonb(c) ORDER BY oid) FROM pg_class c WHERE oid IN
      ('public.ai_worker_provisioning_receipts'::regclass,'public.ai_worker_principals'::regclass)),
    'indexes',(SELECT jsonb_agg(to_jsonb(i) ORDER BY indexrelid) FROM pg_index i WHERE indrelid IN
      ('public.ai_worker_provisioning_receipts'::regclass,'public.ai_worker_principals'::regclass)),
    'untouched_constraints',(SELECT jsonb_agg(to_jsonb(c) ORDER BY oid) FROM pg_constraint c
      WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
      AND conname NOT IN ('ai_worker_provisioning_receipts_nonce_check','ai_worker_provisioning_receipts_fingerprint_check',
        'ai_worker_provisioning_receipts_window_id_check','ai_worker_provisioning_receipts_outcome_check')))
    INTO before_state;
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
      ARRAY(SELECT pg_get_constraintdef(oid) FROM pg_constraint
        WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
          -- PostgreSQL 18 catalogs NOT NULL constraints; attnotnull above checks them.
          AND contype <> 'n'
          AND convalidated AND NOT condeferrable ORDER BY pg_get_constraintdef(oid)) AS constraints,
      ARRAY(SELECT pg_get_indexdef(i.indexrelid) FROM pg_index i
        WHERE i.indexrelid IN ('public.ai_worker_provisioning_receipts_pkey'::regclass,
          'public.ai_worker_provisioning_window_idx'::regclass, 'public.ai_worker_pinned_name_unique'::regclass)
          AND i.indisvalid AND i.indisready AND i.indislive ORDER BY pg_get_indexdef(i.indexrelid)) AS indexes,
      (SELECT count(*)=3 AND bool_and(relkind='r' AND relpersistence='p' AND NOT relrowsecurity)
        FROM pg_class WHERE oid IN ('public._prisma_migrations'::regclass,
          'public.ai_worker_provisioning_receipts'::regclass, 'public.ai_worker_principals'::regclass))
      AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public._prisma_migrations'::regclass AND NOT tgisinternal)
      AND NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class='public._prisma_migrations'::regclass) AS safe INTO catalog;
  IF catalog.safe IS DISTINCT FROM true OR catalog.columns IS DISTINCT FROM ARRAY['nonce:text:true:','fingerprint:text:true:','window_id:text:true:','operation:text:true:','outcome:text:true:','worker_id:text:false:','deployment_id:text:false:','created_at:timestamp with time zone:true:clock_timestamp()','completed_at:timestamp with time zone:false:']::text[]
    OR catalog.constraints IS DISTINCT FROM ARRAY['CHECK ((fingerprint ~ ''^[a-f0-9]{64}$''::text))','CHECK ((nonce ~ ''^[a-f0-9]{64}$''::text))','CHECK ((operation = ANY (ARRAY[''provision''::text, ''recover''::text])))','CHECK ((outcome = ANY (ARRAY[''attempt''::text, ''succeeded''::text, ''duplicate''::text, ''identity_mismatch''::text, ''mutation_failed''::text, ''window_closed''::text])))','CHECK ((window_id ~ ''^[a-f0-9]{32}$''::text))','PRIMARY KEY (nonce)']::text[]
    OR catalog.indexes IS DISTINCT FROM ARRAY['CREATE INDEX ai_worker_provisioning_window_idx ON public.ai_worker_provisioning_receipts USING btree (window_id, created_at)','CREATE UNIQUE INDEX ai_worker_pinned_name_unique ON public.ai_worker_principals USING btree (name) WHERE (name = ''dg-mac-1''::text)','CREATE UNIQUE INDEX ai_worker_provisioning_receipts_pkey ON public.ai_worker_provisioning_receipts USING btree (nonce)']::text[] THEN
    RAISE EXCEPTION 'Catalogue does not match expected variant';
  END IF;
  SELECT jsonb_build_object(
    'rows',(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY nonce),'[]') FROM public.ai_worker_provisioning_receipts r),
    'history',(SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY id),'[]') FROM public._prisma_migrations m),
    'relations',(SELECT jsonb_agg(to_jsonb(c) ORDER BY oid) FROM pg_class c WHERE oid IN
      ('public.ai_worker_provisioning_receipts'::regclass,'public.ai_worker_principals'::regclass)),
    'indexes',(SELECT jsonb_agg(to_jsonb(i) ORDER BY indexrelid) FROM pg_index i WHERE indrelid IN
      ('public.ai_worker_provisioning_receipts'::regclass,'public.ai_worker_principals'::regclass)),
    'untouched_constraints',(SELECT jsonb_agg(to_jsonb(c) ORDER BY oid) FROM pg_constraint c
      WHERE conrelid='public.ai_worker_provisioning_receipts'::regclass
      AND conname NOT IN ('ai_worker_provisioning_receipts_nonce_check','ai_worker_provisioning_receipts_fingerprint_check',
        'ai_worker_provisioning_receipts_window_id_check','ai_worker_provisioning_receipts_outcome_check')))
    INTO after_state;
  IF before_state IS DISTINCT FROM after_state THEN RAISE EXCEPTION 'Preservation check failed'; END IF;
END
$remediation$;
COMMIT;
