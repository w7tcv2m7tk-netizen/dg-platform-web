#!/bin/sh
# Regression coverage for the Stage 2C preflight wrapper TLS environment.
# Uses a fake psql so it never connects to Production.
set -eu
umask 077

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d "${TMPDIR:-/tmp}/dg-preflight-tls.XXXXXX")

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT INT TERM

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

mkdir -p "$TMP/bin"
cat > "$TMP/bin/psql" <<'SH'
#!/bin/sh
printf '%s\t%s\t%s\n' \
  "${PGSSLMODE:-unset}" \
  "${PGSSLROOTCERT:-unset}" \
  "${PGCONNECT_TIMEOUT:-unset}" >> "$TLS_LOG"
case "$*" in
  *current_database*)
    printf '%s\t%s\n' "$PREFLIGHT_PGDATABASE" "$PREFLIGHT_PGUSER"
    exit 0
    ;;
  *" -f "*)
    printf 'COMMIT\nDG_PREFLIGHT_COMPLETE\n'
    exit 0
    ;;
  *)
    exit 1
    ;;
esac
SH
chmod 700 "$TMP/bin/psql"

run_case() {
  label=$1
  expected=$2
  shift 2
  TLS_LOG="$TMP/$label.tls"
  DEST="$TMP/$label-capture"
  if ! env PATH="$TMP/bin:$PATH" TLS_LOG="$TLS_LOG" PREFLIGHT_DEST_DIR="$DEST" "$@" \
    >"$TMP/$label.out" 2>&1; then
    cat "$TMP/$label.out" >&2
    fail "$label wrapper invocation failed"
  fi
  grep -q 'PASS: read-only capture complete' "$TMP/$label.out" \
    || fail "$label wrapper did not report PASS"
  [ -f "$TLS_LOG" ] || fail "$label psql environment was not captured"
  actual=$(awk -F '\t' '{print $1"|"$2"|"$3}' "$TLS_LOG" | sort -u)
  [ "$actual" = "$expected" ] \
    || fail "$label TLS environment was '$actual', expected '$expected'"
  printf 'PASS: %s TLS environment %s\n' "$label" "$expected"
}

run_case production 'verify-full|system|5' \
  PREFLIGHT_ENVIRONMENT=production \
  PREFLIGHT_PROJECT=gentle-sky-35028642 \
  PREFLIGHT_BRANCH=br-old-shadow-a7ffezls \
  PREFLIGHT_PGHOST=ep-bold-tree-a7bny92m.ap-southeast-2.aws.neon.tech \
  PREFLIGHT_PGPORT=5432 \
  PREFLIGHT_PGDATABASE=neondb \
  PREFLIGHT_PGUSER=dg_preflight_reader \
  PGPASSWORD=synthetic-only \
  PGSSLMODE=require \
  PGSSLROOTCERT=/inherited/sentinel \
  sh "$ROOT/scripts/run-production-readonly-preflight-26.sh"

run_case disposable-test 'disable|unset|5' \
  PREFLIGHT_ENVIRONMENT=disposable-test \
  PREFLIGHT_PROJECT=local-test \
  PREFLIGHT_BRANCH=local-test \
  PREFLIGHT_PGHOST=127.0.0.1 \
  PREFLIGHT_PGPORT=55470 \
  PREFLIGHT_EXPECTED_PGPORT=55470 \
  PREFLIGHT_PGDATABASE=dg_preflight_test \
  PREFLIGHT_PGUSER=dg_preflight_reader \
  PGPASSWORD=synthetic-only \
  PGSSLMODE=verify-full \
  PGSSLROOTCERT=/inherited/sentinel \
  sh "$ROOT/scripts/run-production-readonly-preflight-26.sh"

printf 'SUMMARY: PASS — production verify-full/system and disposable disable/unset\n'
