#!/bin/sh
# Operator wrapper for the reviewed 26-row Production read-only preflight.
# It never retries and never prints captured database output.
set -eu
umask 077

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
SQL_FILE=${PREFLIGHT_SQL_FILE:-"$ROOT/docs/commerce/release-1025/production-readonly-preflight-26.sql"}
DEST_DIR=${PREFLIGHT_DEST_DIR:-/private/operator/dg-production-preflight}
EXPECTED_SHA256="0dc408c5ca911a9edc31925ef2b11e3bbc2ebc8ecdb4696a232c85bdd41b29ce"

fail() {
  printf 'STOP: %s\n' "$1" >&2
  exit "${2:-1}"
}

[ -f "$SQL_FILE" ] || fail "reviewed SQL file is missing" 2
actual_sha=$(shasum -a 256 "$SQL_FILE" | awk '{print $1}')
[ "$actual_sha" = "$EXPECTED_SHA256" ] || fail "reviewed SQL SHA-256 mismatch" 2

install -d -m 700 "$DEST_DIR" || fail "private evidence directory cannot be created" 2
stamp=$(date -u +%Y%m%dT%H%M%SZ)
base="$DEST_DIR/$stamp-$$"
capture="$base.capture"
error_file="$base.error"
metadata="$base.metadata"

: > "$capture"
: > "$error_file"
chmod 600 "$capture" "$error_file" 2>/dev/null || true

set +e
env -u PGOPTIONS -u PGSERVICE -u PGSERVICEFILE -u PSQLRC -u PSQL_HISTORY -u DATABASE_URL \
  PGCONNECT_TIMEOUT=5 \
  psql -X -v ON_ERROR_STOP=1 -f "$SQL_FILE" >"$capture" 2>"$error_file"
status=$?
set -e

bytes=$(wc -c < "$capture" | tr -d ' ')
marker=false
if grep -q 'DG_PREFLIGHT_COMPLETE' "$capture"; then marker=true; fi

printf 'captured_at_utc=%s\nsql_file=%s\nsql_sha256=%s\nexit_status=%s\ncapture_bytes=%s\ncomplete_marker=%s\n' \
  "$stamp" "$SQL_FILE" "$actual_sha" "$status" "$bytes" "$marker" > "$metadata"
chmod 600 "$metadata" 2>/dev/null || true

if [ "$status" -ne 0 ]; then
  fail "SQL failed or was interrupted; no retry performed; inspect private error file" "$status"
fi
if [ "$marker" != true ]; then
  fail "capture is partial or lacks the completion marker; do not certify" 3
fi

printf 'PASS: read-only capture complete; output is private\n'
printf 'capture=%s\nmetadata=%s\n' "$capture" "$metadata"
