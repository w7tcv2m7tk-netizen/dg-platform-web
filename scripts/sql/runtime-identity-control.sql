-- SEPARATE CONTROL DATABASE ONLY. NOT an application migration.
-- No roles/credentials provisioned here. Local rehearsal supplies isolated roles.
-- Owner must explicitly set the following setting in an attended transaction.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='10s';
DO $$ BEGIN
  IF current_setting('dg.identity_control_setup',true) IS DISTINCT FROM 'approved_separate_control_database'
     OR current_database() NOT LIKE 'dg_identity_control%' THEN
    RAISE EXCEPTION 'control database setup not authorised';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','v','m','S','f')) THEN
    RAISE EXCEPTION 'control database must be empty';
  END IF;
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC',current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO dg_identity_executor,dg_identity_issuer',current_database());
END $$;
CREATE SCHEMA runtime_identity_control;
REVOKE ALL ON SCHEMA runtime_identity_control FROM PUBLIC;
CREATE TABLE runtime_identity_control.grants (
  id uuid PRIMARY KEY,
  digest text NOT NULL UNIQUE CHECK (digest ~ '^[a-f0-9]{64}$'),
  actor text NOT NULL CHECK (actor ~ '^user_[A-Za-z0-9]{1,100}$'),
  project text NOT NULL CHECK (project='prj_RzOMts2AdqpKtbAgZ72GLKs55AJ2'),
  deployment text NOT NULL CHECK (deployment ~ '^dpl_[A-Za-z0-9]{20,64}$'),
  revision text NOT NULL CHECK (revision ~ '^[a-f0-9]{40}$'),
  environment text NOT NULL CHECK (environment='production'),
  operation text NOT NULL DEFAULT 'runtime_database_identity' CHECK(operation='runtime_database_identity'),
  expected_role text NOT NULL CHECK (expected_role='dg_app_runtime'),
  expected_database text NOT NULL CHECK (expected_database ~ '^[A-Za-z_][A-Za-z0-9_-]{0,62}$'),
  endpoint text NOT NULL CHECK (endpoint='ep-bold-tree-a7bny92m'),
  neon_project text NOT NULL CHECK (neon_project='gentle-sky-35028642'),
  neon_branch text NOT NULL CHECK (neon_branch='br-old-shadow-a7ffezls'),
  provider_verified_at timestamptz NOT NULL,
  provider_receipt_sha256 text NOT NULL CHECK (provider_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  not_before timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at>not_before AND expires_at-not_before<=interval '15 minutes'),
  consumed_at timestamptz,
  revoked_at timestamptz,
  request_id uuid UNIQUE,
  CHECK ((consumed_at IS NULL)=(request_id IS NULL))
);
CREATE TABLE runtime_identity_control.audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL REFERENCES runtime_identity_control.grants(id),
  request_id uuid,
  actor text NOT NULL,
  project text NOT NULL,
  deployment text NOT NULL,
  revision text NOT NULL,
  operation text NOT NULL DEFAULT 'runtime_database_identity' CHECK(operation='runtime_database_identity'),
  event text NOT NULL CHECK (event IN ('issued','revoked','claimed','verified','denied','unavailable')),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(grant_id,event)
);
REVOKE ALL ON ALL TABLES IN SCHEMA runtime_identity_control FROM PUBLIC;
CREATE UNIQUE INDEX audit_one_final_outcome ON runtime_identity_control.audit(grant_id)
 WHERE event IN ('verified','denied','unavailable');

CREATE FUNCTION runtime_identity_control.immutable_audit() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'immutable audit'; END $$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE OR TRUNCATE ON runtime_identity_control.audit
FOR EACH STATEMENT EXECUTE FUNCTION runtime_identity_control.immutable_audit();
CREATE FUNCTION runtime_identity_control.owner_writes_only() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid=TG_RELID AND relowner=current_user::regrole) THEN
   RAISE EXCEPTION 'direct control write refused';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER owner_grant_writes BEFORE INSERT OR UPDATE OR DELETE ON runtime_identity_control.grants
FOR EACH ROW EXECUTE FUNCTION runtime_identity_control.owner_writes_only();
CREATE TRIGGER owner_audit_inserts BEFORE INSERT ON runtime_identity_control.audit
FOR EACH ROW EXECUTE FUNCTION runtime_identity_control.owner_writes_only();

-- SESSION_USER cannot be forged by SET ROLE. Reject owner/elevated/membership
-- logins; the executor receives no table privileges, ownership or grant options.
CREATE FUNCTION runtime_identity_control.executor_safe() RETURNS boolean
LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT session_user='dg_identity_executor'
 AND EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=session_user AND rolcanlogin
   AND NOT (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit))
 AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname<>session_user
   AND (pg_catalog.pg_has_role(session_user,oid,'MEMBER') OR pg_catalog.pg_has_role(session_user,oid,'SET')))
 AND NOT pg_catalog.has_schema_privilege(session_user,'runtime_identity_control','CREATE')
 AND NOT pg_catalog.has_database_privilege(session_user,current_database(),'CREATE')
 AND NOT pg_catalog.has_database_privilege(session_user,current_database(),'TEMPORARY')
 AND NOT pg_catalog.has_schema_privilege(session_user,'public','CREATE')
 AND NOT pg_catalog.has_schema_privilege(session_user,'runtime_identity_control','USAGE WITH GRANT OPTION')
 AND NOT pg_catalog.has_function_privilege(session_user,'runtime_identity_control.issue(jsonb)','EXECUTE')
 AND NOT pg_catalog.has_function_privilege(session_user,'runtime_identity_control.revoke(uuid)','EXECUTE')
 AND NOT pg_catalog.has_function_privilege(session_user,'runtime_identity_control.claim(text,text,text,text,text,text,uuid)','EXECUTE WITH GRANT OPTION')
 AND NOT pg_catalog.has_function_privilege(session_user,'runtime_identity_control.finish(uuid,uuid,text)','EXECUTE WITH GRANT OPTION')
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND p.prosecdef
   AND pg_catalog.has_schema_privilege(session_user,n.oid,'USAGE')
   AND pg_catalog.has_function_privilege(session_user,p.oid,'EXECUTE')
   AND p.oid NOT IN (pg_catalog.to_regprocedure('runtime_identity_control.claim(text,text,text,text,text,text,uuid)'),
                    pg_catalog.to_regprocedure('runtime_identity_control.finish(uuid,uuid,text)')))
 AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='runtime_identity_control' AND p.proowner=session_user::regrole)
 AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='runtime_identity_control' AND (c.relowner=session_user::regrole
    OR pg_catalog.has_table_privilege(session_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR pg_catalog.has_any_column_privilege(session_user,c.oid,'SELECT,INSERT,UPDATE,REFERENCES')))
$$;

-- Issuance is an offline approval authority, never a route or runtime capability.
CREATE FUNCTION runtime_identity_control.issue(p jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE g runtime_identity_control.grants;
BEGIN
 IF session_user<>'dg_identity_issuer' THEN RAISE EXCEPTION 'approval authority required'; END IF;
 IF (p->>'not_before')::timestamptz>clock_timestamp()+interval '15 minutes'
    OR (p->>'expires_at')::timestamptz<=clock_timestamp()
    OR (p->>'provider_verified_at')::timestamptz>clock_timestamp()
    OR (p->>'provider_verified_at')::timestamptz<clock_timestamp()-interval '15 minutes' THEN
   RAISE EXCEPTION 'invalid approval window';
 END IF;
 INSERT INTO runtime_identity_control.grants(id,digest,actor,project,deployment,revision,environment,
   expected_role,expected_database,endpoint,neon_project,neon_branch,provider_verified_at,
   provider_receipt_sha256,not_before,expires_at)
 VALUES ((p->>'id')::uuid,p->>'digest',p->>'actor',p->>'project',p->>'deployment',p->>'revision',p->>'environment',
   p->>'expected_role',p->>'expected_database',p->>'endpoint',p->>'neon_project',p->>'neon_branch',
   (p->>'provider_verified_at')::timestamptz,p->>'provider_receipt_sha256',
   (p->>'not_before')::timestamptz,(p->>'expires_at')::timestamptz) RETURNING * INTO g;
 INSERT INTO runtime_identity_control.audit(grant_id,actor,project,deployment,revision,event)
 VALUES(g.id,g.actor,g.project,g.deployment,g.revision,'issued');
 RETURN g.id;
END $$;

CREATE FUNCTION runtime_identity_control.claim(p_digest text,p_actor text,p_project text,
 p_deployment text,p_revision text,p_environment text,p_request uuid)
RETURNS SETOF runtime_identity_control.grants
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE g runtime_identity_control.grants;
BEGIN
 IF NOT runtime_identity_control.executor_safe() THEN RAISE EXCEPTION 'unsafe executor'; END IF;
 UPDATE runtime_identity_control.grants SET consumed_at=clock_timestamp(),request_id=p_request
 WHERE digest=p_digest AND actor=p_actor AND project=p_project AND deployment=p_deployment
   AND revision=p_revision AND environment=p_environment AND consumed_at IS NULL AND revoked_at IS NULL
   AND not_before<=clock_timestamp() AND expires_at>clock_timestamp()
   AND provider_verified_at<=clock_timestamp() AND provider_verified_at>clock_timestamp()-interval '15 minutes'
 RETURNING * INTO g;
 IF NOT FOUND THEN RETURN; END IF;
 INSERT INTO runtime_identity_control.audit(grant_id,request_id,actor,project,deployment,revision,event)
 VALUES(g.id,p_request,g.actor,g.project,g.deployment,g.revision,'claimed');
 RETURN NEXT g;
END $$;

CREATE FUNCTION runtime_identity_control.finish(p_id uuid,p_request uuid,p_outcome text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE g runtime_identity_control.grants;
BEGIN
 IF NOT runtime_identity_control.executor_safe() OR p_outcome NOT IN ('verified','denied','unavailable') THEN
   RAISE EXCEPTION 'invalid completion';
 END IF;
 SELECT * INTO STRICT g FROM runtime_identity_control.grants WHERE id=p_id AND request_id=p_request AND consumed_at IS NOT NULL;
 IF EXISTS(SELECT 1 FROM runtime_identity_control.audit WHERE grant_id=g.id AND event IN ('verified','denied','unavailable')) THEN
   RAISE EXCEPTION 'already completed';
 END IF;
 -- Lock the claimed grant so concurrent finalisations cannot append two outcomes.
 PERFORM 1 FROM runtime_identity_control.grants WHERE id=g.id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM runtime_identity_control.audit WHERE grant_id=g.id AND event IN ('verified','denied','unavailable')) THEN
   RAISE EXCEPTION 'already completed';
 END IF;
 INSERT INTO runtime_identity_control.audit(grant_id,request_id,actor,project,deployment,revision,event)
 VALUES(g.id,p_request,g.actor,g.project,g.deployment,g.revision,p_outcome);
 RETURN true;
END $$;

CREATE FUNCTION runtime_identity_control.revoke(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE g runtime_identity_control.grants;
BEGIN
 IF session_user<>'dg_identity_issuer' THEN RAISE EXCEPTION 'approval authority required'; END IF;
 UPDATE runtime_identity_control.grants SET revoked_at=clock_timestamp()
 WHERE id=p_id AND consumed_at IS NULL AND revoked_at IS NULL RETURNING * INTO g;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO runtime_identity_control.audit(grant_id,actor,project,deployment,revision,event)
 VALUES(g.id,g.actor,g.project,g.deployment,g.revision,'revoked');
 RETURN true;
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA runtime_identity_control FROM PUBLIC;
GRANT USAGE ON SCHEMA runtime_identity_control TO dg_identity_executor,dg_identity_issuer;
GRANT EXECUTE ON FUNCTION runtime_identity_control.claim(text,text,text,text,text,text,uuid),
 runtime_identity_control.finish(uuid,uuid,text) TO dg_identity_executor;
GRANT EXECUTE ON FUNCTION runtime_identity_control.issue(jsonb),runtime_identity_control.revoke(uuid) TO dg_identity_issuer;
COMMIT;
