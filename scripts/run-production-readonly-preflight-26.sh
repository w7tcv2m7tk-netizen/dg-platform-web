#!/bin/sh
# Operator wrapper for the reviewed 26-row Production read-only preflight.
# It never retries and never prints captured database output.
set -eu
umask 077

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
SQL_FILE=${PREFLIGHT_SQL_FILE:-"$ROOT/docs/commerce/release-1025/production-readonly-preflight-26.sql"}
DEST_DIR=${PREFLIGHT_DEST_DIR:-/private/operator/dg-production-preflight}
EXPECTED_SHA256="8c9cd9a317be3d804b04e62d109cf77ac67c3d42291f52b084159ebf6310b063"

fail() {
  printf 'STOP: %s\n' "$1" >&2
  exit "${2:-1}"
}

# Production identity is fixed. The disposable-test branch is only for a local
# PostgreSQL cluster and may not target a non-loopback host or non-test database.
ENVIRONMENT=${PREFLIGHT_ENVIRONMENT:-production}
case "$ENVIRONMENT" in
  production)
    EXPECTED_PROJECT=gentle-sky-35028642
    EXPECTED_BRANCH=br-old-shadow-a7ffezls
    EXPECTED_PGHOST=ep-bold-tree-a7bny92m.ap-southeast-2.aws.neon.tech
    EXPECTED_PGPORT=5432
    EXPECTED_PGDATABASE=neondb
    ;;
  disposable-test)
    EXPECTED_PROJECT=local-test
    EXPECTED_BRANCH=local-test
    EXPECTED_PGHOST=127.0.0.1
    EXPECTED_PGPORT=${PREFLIGHT_EXPECTED_PGPORT:?disposable test port is required}
    EXPECTED_PGDATABASE=dg_preflight_test
    ;;
  *) fail "unsupported PREFLIGHT_ENVIRONMENT" 2 ;;
esac

# Every connection input must be explicit. No PGHOST/PGDATABASE/PGSERVICE
# defaults or inherited connection URL may silently select another target.
: "${PREFLIGHT_PROJECT:?PREFLIGHT_PROJECT is required}"
: "${PREFLIGHT_BRANCH:?PREFLIGHT_BRANCH is required}"
: "${PREFLIGHT_PGHOST:?PREFLIGHT_PGHOST is required}"
: "${PREFLIGHT_PGPORT:?PREFLIGHT_PGPORT is required}"
: "${PREFLIGHT_PGDATABASE:?PREFLIGHT_PGDATABASE is required}"
: "${PREFLIGHT_PGUSER:?PREFLIGHT_PGUSER is required}"

[ "$PREFLIGHT_PROJECT" = "$EXPECTED_PROJECT" ] || fail "connection project identity mismatch" 4
[ "$PREFLIGHT_BRANCH" = "$EXPECTED_BRANCH" ] || fail "connection branch identity mismatch" 4
[ "$PREFLIGHT_PGHOST" = "$EXPECTED_PGHOST" ] || fail "connection endpoint identity mismatch" 4
[ "$PREFLIGHT_PGPORT" = "$EXPECTED_PGPORT" ] || fail "connection port identity mismatch" 4
[ "$PREFLIGHT_PGDATABASE" = "$EXPECTED_PGDATABASE" ] || fail "connection database identity mismatch" 4
[ "$PREFLIGHT_PGUSER" != "neondb_owner" ] || fail "project owner role is not an approved operator role" 4

[ -n "${PGPASSWORD:-}" ] || [ -n "${PGPASSFILE:-}" ] || fail "approved private credential source is required"
[ -f "$SQL_FILE" ] || fail "reviewed SQL file is missing" 2
actual_sha=$(shasum -a 256 "$SQL_FILE" | awk '{print $1}')
[ "$actual_sha" = "$EXPECTED_SHA256" ] || fail "reviewed SQL SHA-256 mismatch" 2

install -d -m 700 "$DEST_DIR" || fail "private evidence directory cannot be created" 2
stamp=$(date -u +%Y%m%dT%H%M%SZ)
base="$DEST_DIR/$stamp-$$"
capture="$base.capture"
error_file="$base.error"
identity_error="$base.identity-error"
metadata="$base.metadata"

: > "$capture"
: > "$error_file"
: > "$identity_error"
chmod 600 "$capture" "$error_file" "$identity_error" 2>/dev/null || true

# Explicit connection arguments override inherited defaults. Remove service
# files, options, target-session settings and connection URLs from the child.
if [ "$ENVIRONMENT" = production ]; then
  SSL_MODE=verify-full
else
  SSL_MODE=disable
fi
set -- env \
  -u PGHOST -u PGPORT -u PGUSER -u PGDATABASE -u PGHOSTADDR \
  -u PGOPTIONS -u PGSERVICE -u PGSERVICEFILE -u PSQLRC -u PSQL_HISTORY \
  -u DATABASE_URL -u PGTARGETSESSIONATTRS -u PGSSLMODE -u PGCONNECT_TIMEOUT \
  -u PGREQUIRESSL -u PGSSLROOTCERT -u PGSSLCERT -u PGSSLKEY -u PGSSLCRL \
  -u PGSSLCRLDIR -u PGSSLSNI -u PGCHANNELBINDING -u PGKRBSRVNAME \
  -u PGGSSENCMODE -u PGAPPNAME -u PGCLIENTENCODING -u PGGSSLIB \
  PGCONNECT_TIMEOUT=5 PGSSLMODE="$SSL_MODE"
if [ -n "${PGPASSWORD:-}" ]; then set -- "$@" "PGPASSWORD=$PGPASSWORD"; fi
if [ -n "${PGPASSFILE:-}" ]; then set -- "$@" "PGPASSFILE=$PGPASSFILE"; fi
set -- "$@" psql -X -h "$PREFLIGHT_PGHOST" -p "$PREFLIGHT_PGPORT" \
  -U "$PREFLIGHT_PGUSER" -d "$PREFLIGHT_PGDATABASE"

# Verify the actual database/role before opening the evidence transaction.
set +e
identity=$("$@" -qAt -v ON_ERROR_STOP=1 \
  -c "BEGIN READ ONLY; SELECT current_database() || E'\\t' || current_user; COMMIT;" \
  2>"$identity_error")
identity_status=$?
set -e
expected_identity=$(printf '%s\t%s' "$PREFLIGHT_PGDATABASE" "$PREFLIGHT_PGUSER")
if [ "$identity_status" -ne 0 ] || [ "$identity" != "$expected_identity" ]; then
  fail "connection database/role identity mismatch or connection failure" 4
fi

set +e
"$@" -v ON_ERROR_STOP=1 -f "$SQL_FILE" >"$capture" 2>"$error_file"
status=$?
set -e

bytes=$(wc -c < "$capture" | tr -d ' ')
marker=false
if grep -q 'DG_PREFLIGHT_COMPLETE' "$capture"; then
  marker=true
  last_commit_line=$(grep -n '^COMMIT$' "$capture" | tail -1 | cut -d: -f1 || true)
  marker_line=$(grep -n 'DG_PREFLIGHT_COMPLETE' "$capture" | tail -1 | cut -d: -f1 || true)
  if [ -z "$last_commit_line" ] || [ -z "$marker_line" ] || [ "$marker_line" -le "$last_commit_line" ]; then
    marker=false
  fi
fi

{
  printf 'captured_at_utc=%s\n' "$stamp"
  printf 'environment=%s\nproject=%s\nbranch=%s\ndatabase=%s\nrole=%s\n' \
    "$ENVIRONMENT" "$PREFLIGHT_PROJECT" "$PREFLIGHT_BRANCH" "$PREFLIGHT_PGDATABASE" "$PREFLIGHT_PGUSER"
  printf 'sql_file=%s\nsql_sha256=%s\nexit_status=%s\ncapture_bytes=%s\ncomplete_marker=%s\n' \
    "$SQL_FILE" "$actual_sha" "$status" "$bytes" "$marker"
} > "$metadata"
chmod 600 "$metadata" 2>/dev/null || true

if [ "$status" -ne 0 ]; then
  fail "SQL failed or was interrupted; no retry performed; inspect private error file" "$status"
fi
if [ "$marker" != true ]; then
  fail "capture is partial or lacks the final post-COMMIT completion marker; do not certify" 3
fi

printf 'PASS: read-only capture complete; output is private\n'
printf 'capture=%s\nmetadata=%s\n' "$capture" "$metadata"
