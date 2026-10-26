-- Atomic, additive, no permits seeded. Deploy before admission-capable code.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='10s';
CREATE UNIQUE INDEX platform_checkout_attempts_id_organisation_id_key
 ON public.platform_checkout_attempts(id, organisation_id);
CREATE TABLE platform_checkout_admissions (
 id TEXT PRIMARY KEY, organisation_id TEXT NOT NULL, active_organisation_id TEXT,
 clerk_user_id TEXT NOT NULL, provider_scope TEXT NOT NULL,
 terms_hash TEXT NOT NULL, terms JSONB NOT NULL,
 expires_at TIMESTAMPTZ(6) NOT NULL, revoked_at TIMESTAMPTZ(6), revoked_by TEXT, revocation_reference TEXT, attempt_id TEXT,
 approved_by TEXT NOT NULL, approval_reference TEXT NOT NULL,
 created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT admission_scope CHECK (active_organisation_id IS NULL OR active_organisation_id=organisation_id),
 CONSTRAINT admission_revocation CHECK ((revoked_at IS NULL AND revoked_by IS NULL AND revocation_reference IS NULL) OR (revoked_at IS NOT NULL AND active_organisation_id IS NULL AND length(revoked_by)>0 AND length(revocation_reference)>0 AND revoked_by IS NOT NULL AND revocation_reference IS NOT NULL)),
 CONSTRAINT admission_evidence CHECK (length(approved_by)>0 AND length(approval_reference)>0 AND terms_hash ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX platform_checkout_admissions_active_organisation_id_key ON platform_checkout_admissions(active_organisation_id);
CREATE UNIQUE INDEX platform_checkout_admissions_attempt_id_key ON platform_checkout_admissions(attempt_id);
CREATE TABLE platform_checkout_admission_audit (
 id BIGSERIAL PRIMARY KEY, admission_id TEXT NOT NULL, action TEXT NOT NULL,
 evidence JSONB NOT NULL, created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX platform_checkout_admission_audit_admission_id_created_at_idx ON platform_checkout_admission_audit(admission_id,created_at);
ALTER TABLE public.platform_checkout_admissions ADD CONSTRAINT platform_checkout_admissions_attempt_owner_fkey
 FOREIGN KEY (attempt_id,organisation_id) REFERENCES public.platform_checkout_attempts(id,organisation_id)
 ON UPDATE RESTRICT ON DELETE RESTRICT;
REVOKE ALL ON public.platform_checkout_admissions, public.platform_checkout_admission_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.platform_checkout_admission_audit_id_seq FROM PUBLIC;
CREATE FUNCTION audit_platform_checkout_admission() RETURNS trigger LANGUAGE plpgsql
 SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Admission history cannot be deleted'; END IF;
 IF TG_OP='UPDATE' AND (
   (to_jsonb(NEW)-'attempt_id'-'revoked_at'-'active_organisation_id'-'revoked_by'-'revocation_reference') IS DISTINCT FROM
   (to_jsonb(OLD)-'attempt_id'-'revoked_at'-'active_organisation_id'-'revoked_by'-'revocation_reference') OR
   (OLD.attempt_id IS NOT NULL AND NEW.attempt_id IS DISTINCT FROM OLD.attempt_id) OR
   (OLD.revoked_at IS NOT NULL AND NEW IS DISTINCT FROM OLD) OR
   (NEW.active_organisation_id IS DISTINCT FROM OLD.active_organisation_id AND NEW.revoked_at IS NULL)
 ) THEN RAISE EXCEPTION 'Immutable admission authority'; END IF;
 INSERT INTO public.platform_checkout_admission_audit(admission_id,action,evidence)
 VALUES(NEW.id,TG_OP,jsonb_build_object('organisationId',NEW.organisation_id,'clerkUserId',NEW.clerk_user_id,
 'termsHash',NEW.terms_hash,'attemptId',NEW.attempt_id,'revokedAt',NEW.revoked_at,
 'approvedBy',NEW.approved_by,'approvalReference',NEW.approval_reference,'revokedBy',NEW.revoked_by,'revocationReference',NEW.revocation_reference));
 RETURN NEW;
END $$;
CREATE TRIGGER platform_checkout_admission_changes BEFORE INSERT OR UPDATE OR DELETE ON platform_checkout_admissions
 FOR EACH ROW EXECUTE FUNCTION audit_platform_checkout_admission();
CREATE FUNCTION preserve_checkout_admission_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Admission audit is append only'; END $$;
CREATE TRIGGER platform_checkout_admission_audit_immutable BEFORE UPDATE OR DELETE ON platform_checkout_admission_audit
 FOR EACH ROW EXECUTE FUNCTION preserve_checkout_admission_audit();

-- TRUNCATE does not invoke row DELETE triggers. Protect it explicitly.
CREATE TRIGGER platform_checkout_admission_no_truncate BEFORE TRUNCATE ON public.platform_checkout_admissions
 FOR EACH STATEMENT EXECUTE FUNCTION public.preserve_checkout_admission_audit();
CREATE TRIGGER platform_checkout_admission_audit_no_truncate BEFORE TRUNCATE ON public.platform_checkout_admission_audit
 FOR EACH STATEMENT EXECUTE FUNCTION public.preserve_checkout_admission_audit();
REVOKE ALL ON FUNCTION public.audit_platform_checkout_admission() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preserve_checkout_admission_audit() FROM PUBLIC;
COMMIT;
