-- Separate additive migration. Does not issue checkout admissions or alter the gate.
-- Apply only after the admission migration; audit grants separately.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

CREATE FUNCTION public.lock_checkout_organisation_for_checkout(p_organisation_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  -- Same row lock as the original coordinator SELECT ... FOR UPDATE.
  -- Qualified name prevents caller-controlled search_path substitution.
  PERFORM 1
  FROM public.organisations
  WHERE id = p_organisation_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout organisation unavailable' USING ERRCODE = 'P0002';
  END IF;
END
$function$;

-- Functions have PUBLIC EXECUTE by default; explicitly close that access.
REVOKE ALL ON FUNCTION public.lock_checkout_organisation_for_checkout(text) FROM PUBLIC;
-- No EXECUTE grant here: a separately audited runtime role must be approved.
COMMIT;
