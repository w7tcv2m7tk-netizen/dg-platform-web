#!/bin/sh
# DigitalGate Stage 2D — disposable local validation for dg_preflight_reader.
#
# This test never connects to Production. It creates a disposable PostgreSQL
# cluster, a representative synthetic DigitalGate catalog, the reader role and
# the proposed grants, then runs the independent verifier and the certified
# Stage 2C capture wrapper as the reader.
set -eu
umask 077

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
PG_BIN=${PG_BIN:-/opt/homebrew/opt/postgresql@18/bin}
export PATH="$PG_BIN:$PATH"

command -v initdb >/dev/null 2>&1 || { echo "FAIL: initdb not found" >&2; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "FAIL: psql not found" >&2; exit 1; }

TMP=$(mktemp -d "${TMPDIR:-/tmp}/dg-preflight-reader.XXXXXX")
PGDATA="$TMP/data"
PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
PW='stage2d-synthetic-only'

cleanup() {
  if [ -d "$PGDATA" ]; then
    pg_ctl -D "$PGDATA" stop -m fast >/dev/null 2>&1 || true
  fi
  if [ "${KEEP_TEST_DIR:-0}" = "1" ]; then
    printf 'Test directory retained: %s\n' "$TMP"
  else
    rm -rf "$TMP"
  fi
}
trap cleanup EXIT INT TERM

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  if [ -f "$TMP/postgres.log" ]; then
    printf '%s\n' '--- PostgreSQL log tail ---' >&2
    tail -20 "$TMP/postgres.log" >&2 || true
  fi
  exit 1
}

initdb -D "$PGDATA" -A trust -U owner >/dev/null
pg_ctl -D "$PGDATA" -o "-p $PORT -k $TMP" -l "$TMP/postgres.log" start >/dev/null
createdb -h 127.0.0.1 -p "$PORT" -U owner dg_preflight_test

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test \
  -v ON_ERROR_STOP=1 -f "$ROOT/scripts/test-fixtures/production-preflight-reader-fixture.sql" \
  >"$TMP/fixture.out" 2>&1 || fail "fixture creation failed"

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test \
  -v ON_ERROR_STOP=1 -f "$ROOT/docs/commerce/release-1025/production-preflight-reader-create.sql" \
  >"$TMP/role.out" 2>&1 || fail "reader role creation failed"
grep -q "dg_preflight_reader_created" "$TMP/role.out" \
  || fail "reader role creation marker missing"
last_commit_line=$(grep -n '^COMMIT$' "$TMP/role.out" | tail -1 | cut -d: -f1 || true)
marker_line=$(grep -n 'dg_preflight_reader_created' "$TMP/role.out" | tail -1 | cut -d: -f1 || true)
[ -n "$last_commit_line" ] && [ -n "$marker_line" ] && [ "$marker_line" -gt "$last_commit_line" ] \
  || fail "creation marker is not after COMMIT"
printf "PASS: creation marker is after COMMIT\n"
printf "PASS: SQL role creation without neon_superuser membership\n"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test \
  -v ON_ERROR_STOP=1 -c "ALTER ROLE dg_preflight_reader PASSWORD '$PW';" \
  >"$TMP/password.out" 2>&1 || fail "local synthetic password setup failed"

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "GRANT UPDATE (id) ON public.platform_subscriptions TO dg_preflight_reader;" >/dev/null
before_column=$(psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -qAt \
  -c "SELECT has_any_column_privilege('dg_preflight_reader','public.platform_subscriptions','UPDATE')::text")
[ "$before_column" = "true" ] || fail "test setup did not create a column-level grant"

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test \
  -v ON_ERROR_STOP=1 -f "$ROOT/docs/commerce/release-1025/production-preflight-reader-grants.sql" \
  >"$TMP/grants.out" 2>&1 || fail "grant SQL failed"
grep -q 'dg_preflight_reader_grants_applied' "$TMP/grants.out" \
  || fail "grant SQL completion marker missing"
last_commit_line=$(grep -n '^COMMIT$' "$TMP/grants.out" | tail -1 | cut -d: -f1 || true)
marker_line=$(grep -n 'dg_preflight_reader_grants_applied' "$TMP/grants.out" | tail -1 | cut -d: -f1 || true)
[ -n "$last_commit_line" ] && [ -n "$marker_line" ] && [ "$marker_line" -gt "$last_commit_line" ] \
  || fail "grants marker is not after COMMIT"
printf "PASS: grants marker is after COMMIT\n"
after_column=$(psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -qAt \
  -c "SELECT has_any_column_privilege('dg_preflight_reader','public.platform_subscriptions','UPDATE')::text")
[ "$after_column" = "false" ] || fail "grant SQL did not revoke the pre-existing column grant"
printf 'PASS: least-privilege grants applied and pre-existing column grant removed\n'

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test \
  -v ON_ERROR_STOP=1 -f "$ROOT/docs/commerce/release-1025/production-preflight-reader-verify.sql" \
  >"$TMP/verify.out" 2>&1 || fail "independent privilege verification failed"
grep -q 'dg_preflight_reader_verified' "$TMP/verify.out" \
  || fail "verification completion marker missing"
last_commit_line=$(grep -n '^COMMIT$' "$TMP/verify.out" | tail -1 | cut -d: -f1 || true)
marker_line=$(grep -n 'dg_preflight_reader_verified' "$TMP/verify.out" | tail -1 | cut -d: -f1 || true)
[ -n "$last_commit_line" ] && [ -n "$marker_line" ] && [ "$marker_line" -gt "$last_commit_line" ] \
  || fail "verification marker is not after COMMIT"
printf 'PASS: verification marker is after COMMIT\n'
printf 'PASS: independent privilege verification\n'
public_temp=$(psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -qAt \
  -c "SELECT has_database_privilege('dg_preflight_reader', current_database(), 'TEMP')::text")
printf 'OBSERVED: reader has PUBLIC TEMP baseline = %s (owner acceptance required)\n' "$public_temp"

PREFLIGHT_ENVIRONMENT=disposable-test \
PREFLIGHT_PROJECT=local-test \
PREFLIGHT_BRANCH=local-test \
PREFLIGHT_PGHOST=127.0.0.1 \
PREFLIGHT_PGPORT="$PORT" \
PREFLIGHT_EXPECTED_PGPORT="$PORT" \
PREFLIGHT_PGDATABASE=dg_preflight_test \
PREFLIGHT_PGUSER=dg_preflight_reader \
PGPASSWORD="$PW" \
PREFLIGHT_DEST_DIR="$TMP/capture" \
  sh "$ROOT/scripts/run-production-readonly-preflight-26.sh" \
  >"$TMP/wrapper.out" 2>&1 || fail "Stage 2C capture wrapper failed as dg_preflight_reader"

CAPTURE=$(find "$TMP/capture" -name '*.capture' -type f | head -1)
[ -n "$CAPTURE" ] || fail "Stage 2C capture file missing"
grep -q 'DG_PREFLIGHT_COMPLETE' "$CAPTURE" \
  || fail "Stage 2C completion marker missing"
grep -q 'dg_preflight_reader' "$CAPTURE" \
  || fail "Stage 2C capture does not identify the reader role"
printf 'PASS: complete Stage 2C capture ran as dg_preflight_reader\n'

reader_sql() {
  PGPASSWORD="$PW" psql -X -h 127.0.0.1 -p "$PORT" -U dg_preflight_reader \
    -d dg_preflight_test -v ON_ERROR_STOP=1 -qAt -c "$1"
}

expect_value() {
  label=$1
  query=$2
  expected=$3
  actual=$(reader_sql "$query" 2>/dev/null) || fail "$label query failed"
  if [ "$actual" = "$expected" ]; then
    printf 'PASS: %s = %s\n' "$label" "$expected"
  else
    fail "$label expected '$expected', got '$actual'"
  fi
}

expect_denied() {
  label=$1
  query=$2
  if reader_sql "$query" >/dev/null 2>&1; then
    fail "$label unexpectedly succeeded"
  else
    printf 'PASS: %s denied\n' "$label"
  fi
}

expect_value "current role" "SELECT current_user" "dg_preflight_reader"
expect_value "BYPASSRLS" "SELECT rolbypassrls::text FROM pg_roles WHERE rolname = current_user" "false"
expect_value "migration count" "SELECT count(*)::text FROM public._prisma_migrations" "26"
expect_value "subscription count" "SELECT count(*)::text FROM public.platform_subscriptions" "6"
expect_value "admission count" "SELECT count(*)::text FROM public.platform_checkout_admissions" "0"
expect_value "audit count" "SELECT count(*)::text FROM public.platform_checkout_admission_audit" "0"
expect_value "sequence last_value visibility" \
  "SELECT (last_value IS NULL)::text FROM pg_sequences WHERE sequencename = 'platform_checkout_admission_audit_id_seq'" \
  "true"

expect_denied "unrelated customer table SELECT" "SELECT * FROM public.contacts"
expect_denied "unrelated customer view SELECT" "SELECT * FROM public.customer_view"
expect_denied "unrelated RLS table SELECT" "SELECT * FROM public.rls_contacts"
expect_denied "target table INSERT" "INSERT INTO public.platform_subscriptions (id, organisation_id, status, entitlement) VALUES ('x','x','ACTIVE','FULL')"
expect_denied "target table UPDATE" "UPDATE public.platform_subscriptions SET status = 'ACTIVE' WHERE id = 'subscription-1'"
expect_denied "target table DELETE" "DELETE FROM public.platform_subscriptions WHERE id = 'subscription-1'"
expect_denied "target table TRUNCATE" "TRUNCATE public.platform_subscriptions"
expect_denied "schema CREATE" "CREATE TABLE public.should_not_exist (id int)"
expect_denied "sequence allocation" "SELECT nextval('public.platform_checkout_admission_audit_id_seq')"
expect_denied "SECURITY DEFINER function EXECUTE" "SELECT public.audit_platform_checkout_admission()"
expect_denied "owner role assumption" "SET ROLE owner"

# The independent verifier must fail closed when the reader is over-granted.
expect_verify_fail() {
  label=$1
  if psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test \
    -v ON_ERROR_STOP=1 -f "$ROOT/docs/commerce/release-1025/production-preflight-reader-verify.sql" \
    >"$TMP/verify-negative.out" 2>&1; then
    fail "verifier accepted over-granted state: $label"
  else
    printf 'PASS: verifier rejects %s\n' "$label"
  fi
}

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "GRANT SELECT ON public.contacts TO dg_preflight_reader;" >/dev/null
expect_verify_fail "unexpected unrelated-table SELECT"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "REVOKE SELECT ON public.contacts FROM dg_preflight_reader;" >/dev/null

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "GRANT USAGE ON SEQUENCE public.support_messages_id_seq TO dg_preflight_reader;" >/dev/null
expect_verify_fail "sequence allocation privilege"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "REVOKE USAGE ON SEQUENCE public.support_messages_id_seq FROM dg_preflight_reader;" >/dev/null

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "GRANT EXECUTE ON FUNCTION public.audit_platform_checkout_admission() TO dg_preflight_reader;" >/dev/null
expect_verify_fail "SECURITY DEFINER function EXECUTE"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "REVOKE EXECUTE ON FUNCTION public.audit_platform_checkout_admission() FROM dg_preflight_reader;" >/dev/null

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "GRANT UPDATE (id) ON public.platform_subscriptions TO dg_preflight_reader;" >/dev/null
expect_verify_fail "column-level write privilege"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "REVOKE UPDATE (id) ON public.platform_subscriptions FROM dg_preflight_reader;" >/dev/null

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;" >/dev/null
expect_verify_fail "RLS on a Stage 2C target table"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "ALTER TABLE public.platform_subscriptions DISABLE ROW LEVEL SECURITY;" >/dev/null

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "GRANT owner TO dg_preflight_reader;" >/dev/null
expect_verify_fail "role membership"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "REVOKE owner FROM dg_preflight_reader;" >/dev/null

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE dg_preflight_reader INHERIT;" >/dev/null
expect_verify_fail "INHERIT role attribute"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE dg_preflight_reader NOINHERIT;" >/dev/null

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "GRANT CREATE ON SCHEMA public TO dg_preflight_reader;" >/dev/null
expect_verify_fail "schema CREATE privilege"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "REVOKE CREATE ON SCHEMA public FROM dg_preflight_reader;" >/dev/null

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO dg_preflight_reader;" >/dev/null
expect_verify_fail "default ACL grant"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM dg_preflight_reader;" >/dev/null

# Cross-schema SECURITY DEFINER functions must be rejected even though the
# grants package only revokes direct public-schema function grants.
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "CREATE SCHEMA extra; CREATE FUNCTION extra.sd() RETURNS void LANGUAGE sql SECURITY DEFINER AS 'SELECT'; REVOKE ALL ON FUNCTION extra.sd() FROM PUBLIC; GRANT EXECUTE ON FUNCTION extra.sd() TO dg_preflight_reader;" >/dev/null
expect_verify_fail "cross-schema SECURITY DEFINER function"
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "DROP SCHEMA extra CASCADE;" >/dev/null

# A failed precheck must abort before any privilege mutation.
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE dg_preflight_reader INHERIT;" >/dev/null
if psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test \
  -v ON_ERROR_STOP=1 -f "$ROOT/docs/commerce/release-1025/production-preflight-reader-grants.sql" \
  >"$TMP/precheck-failure.out" 2>&1; then
  fail "grant SQL accepted an unsafe INHERIT role"
fi
if grep -q 'dg_preflight_reader_grants_applied' "$TMP/precheck-failure.out"; then
  fail "failed precheck emitted the success marker"
fi
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE dg_preflight_reader NOINHERIT;" >/dev/null
allowed_still=$(psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -qAt \
  -c "SELECT has_table_privilege('dg_preflight_reader','public.platform_subscriptions','SELECT')::text")
[ "$allowed_still" = "true" ] || fail "failed precheck changed existing grants"
printf 'PASS: failed precheck rolled back without privilege change\n'

# A missing target table must abort the grant transaction and leave prior
# effective grants in place.
psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -c "DROP TABLE public.stripe_webhook_receipts;" >/dev/null
if psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test \
  -v ON_ERROR_STOP=1 -f "$ROOT/docs/commerce/release-1025/production-preflight-reader-grants.sql" \
  >"$TMP/missing-table-failure.out" 2>&1; then
  fail "grant SQL accepted a missing target table"
fi
if grep -q 'dg_preflight_reader_grants_applied' "$TMP/missing-table-failure.out"; then
  fail "missing-table failure emitted the success marker"
fi
allowed_still=$(psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -qAt \
  -c "SELECT has_table_privilege('dg_preflight_reader','public.platform_subscriptions','SELECT')::text")
[ "$allowed_still" = "true" ] || fail "missing-table failure did not roll back"
printf 'PASS: missing target table rolled back without privilege change\n'
if psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test \
  -v ON_ERROR_STOP=1 -f "$ROOT/docs/commerce/release-1025/production-preflight-reader-verify.sql" \
  >"$TMP/verify-missing-table.out" 2>&1; then
  fail "verifier accepted a missing approved table"
fi
printf 'PASS: verifier rejects a missing approved table\n'

psql -X -h 127.0.0.1 -p "$PORT" -U owner -d dg_preflight_test -v ON_ERROR_STOP=1 \
  -f "$ROOT/docs/commerce/release-1025/production-preflight-reader-rollback.sql" \
  >"$TMP/rollback.out" 2>&1 || fail "rollback SQL failed"
grep -q "dg_preflight_reader_access_revoked" "$TMP/rollback.out" \
  || fail "rollback revocation marker missing"
grep -q "dg_preflight_reader_dropped" "$TMP/rollback.out" \
  || fail "rollback drop marker missing"
printf "PASS: rollback revoked access and dropped the role\n"

printf 'SUMMARY: PASS — grants, verification, full Stage 2C capture and fail-closed negative controls\n'
